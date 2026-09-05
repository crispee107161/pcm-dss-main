'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { detectCategoryFromText } from '@/lib/keywords/detect'
import { resolveCaption } from '@/lib/keywords/caption'
import { CATEGORY_NAME_TO_LABEL } from '@/lib/category-label'
import { recomputeQueueFlagReasons, isUnflaggedAgreed } from '@/lib/data/category-flags'
import { withStudyPeriod } from '@/lib/data/study-period'
import { EXCLUDE_GROUND_TRUTH } from '@/lib/categorize/content-filter'
import type { CategoryLabel } from '@/app/generated/prisma/client'

// Ads no longer carry a category (mvp.md §5.1 — content category → ad
// efficiency has no join key and is permanently out of scope). Categorisation
// is organic-post-only.

// docs/raven/Categorisation_Workflow_Consolidation.md §3 — Content Library and
// Categorisation Review are one screen now (Phase 4 of
// docs/raven/Consolidation_Plan_Checklist.md), reached via the same two
// routes with a `?filter=` query param. `/dashboard/owner/content` and
// `/dashboard/marketing/content` no longer render post data themselves
// (the latter just redirects), so there's nothing left to revalidate there.
function revalidateCategoryScreens() {
  revalidatePath('/dashboard/marketing/categorize')
  revalidatePath('/dashboard/owner/categorize')
}

const GENERIC_ERROR = 'Something went wrong. Please try again.'

// The one write path to category_final (Phase 4 §3.3 of the 22 Aug memo) —
// used by both the queue's ManagerActionCell and the non-queue filters'
// CategoryEditCell in components/marketing/ContentClient.tsx. Marketing
// Manager only (mvp.md §3 S3/S4 permission grid: MM is the only "Full" role).
export async function updatePostCategory(postId: number, label: CategoryLabel | null): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    return { error: 'Unauthorized' }
  }
  const userId = parseInt(session.user.id, 10)

  try {
    const previous = await prisma.facebookPost.findUnique({
      where: { id: postId },
      select: { category_final: true, category_final_source: true },
    })

    // Ground-truth rows are the external, blind-coded reference standard
    // FR-15's kappa study is measured against — this is the one write path
    // to category_final, so this is the one place that has to refuse. A
    // legitimate correction belongs in scripts/import-ground-truth.ts, not
    // an operational review action. Code review (2026-08-23) flagged that
    // nothing previously stopped this; there is a matching client-side
    // guard in CategoryEditCell (components/marketing/ContentClient.tsx),
    // but that's UX only — this check is what actually protects the data.
    if (previous?.category_final_source === 'MANUAL_GROUND_TRUTH') {
      return { error: 'This post is part of the locked ground-truth set and cannot be edited here.' }
    }

    // docs/raven/Content_Filters_Review.md §6.1 — distinguishes a triage
    // decision (previous.category_final was null: this is the row's first
    // assignment) from a later revision made from the All/Unassigned tabs
    // (previous.category_final was already set). Derived from the row's own
    // prior state rather than a caller-supplied flag, since ManagerActionCell
    // (queue) and CategoryEditCell (All/Unassigned) both call this same
    // function and only one of them is trusted to ever see an already-final
    // row in the first place.
    const isRevision = previous?.category_final != null
    await prisma.facebookPost.update({
      where: { id: postId },
      data: {
        category_final: label,
        category_final_source: label ? (isRevision ? 'MANUAL_CHANGE_AFTER_FINALISATION' : 'MANUAL_OVERRIDE') : null,
        category_final_assigned_by_id: label ? userId : null,
        category_final_assigned_at: label ? new Date() : null,
      },
    })

    await prisma.categoryAuditLog.create({
      data: { user_id: userId, action: 'OVERRIDE', facebook_post_id: postId, previous_category: previous?.category_final ?? null, new_category: label },
    })

    // docs/raven/Content_Second_Pass.md §4 code review — the queue's
    // category_flag_reasons is a snapshot, recomputed only when
    // category_keyword/category_llm change (see recomputeQueueFlagReasons's
    // doc comment). Un-finalizing a post here (label === null, "(None)" from
    // All/Unassigned) puts it back in the queue without touching that
    // snapshot, so a post finalized before the §4 DISAGREEMENT fix can
    // re-surface the exact contradictory flag pair the fix removed. Only
    // worth the cost on this path — a first assignment or revision can't
    // regress a snapshot that already reflects the post's current
    // suggestions.
    if (label === null) {
      await recomputeQueueFlagReasons()
    }

    revalidateCategoryScreens()
    return {}
  } catch {
    return { error: GENERIC_ERROR }
  }
}

export type AutoCategorizeResult = { ok: true; posts: number } | { ok: false; reason: string }

// ALG-04 — rule-based keyword suggestion (FR-12, method A). Writes only
// `category_keyword`, never `category_final`: FR-15 requires the two
// suggestion methods stored separately from the marketing manager's actual
// decision so they can be honestly compared later (step 10, ALG-06). Runs
// against every post still missing a keyword suggestion, independent of
// whether it already has a final category, since the comparison column is
// permanent, not a queue-clearing mechanism.
export async function autoCategorizeAll(): Promise<AutoCategorizeResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    return { ok: false, reason: 'Unauthorized' }
  }

  try {
    const [posts, keywordRows] = await Promise.all([
      prisma.facebookPost.findMany({
        where: withStudyPeriod({ category_keyword: null }),
        select: { id: true, title: true, description: true },
      }),
      prisma.keyword.findMany({ include: { category: true } }),
    ])

    const keywords = keywordRows
      .map((k) => {
        const label = CATEGORY_NAME_TO_LABEL[k.category.name]
        return label ? { word: k.word, label } : null
      })
      .filter((k): k is { word: string; label: CategoryLabel } => k !== null)

    // FR-07 version stamp (Six_Edits_and_Chat_Feature_Decision.md §3) — the
    // lexicon is DB-backed (prisma.keyword), not a static file with its own
    // version number, so the term count at run time is the version stamp.
    const lexiconTermCount = keywordRows.length

    await Promise.all(
      posts.map((post) => {
        const caption = resolveCaption(post.title, post.description)
        const { label } = detectCategoryFromText(caption, keywords)
        return prisma.facebookPost.update({
          where: { id: post.id },
          data: { category_keyword: label, category_keyword_lexicon_count: lexiconTermCount },
        })
      })
    )
    await recomputeQueueFlagReasons()

    revalidateCategoryScreens()
    return { ok: true, posts: posts.length }
  } catch {
    return { ok: false, reason: GENERIC_ERROR }
  }
}

export type BatchConfirmResult = { ok: true; confirmed: number } | { ok: false; reason: string }

// docs/raven/S4_Categorisation_Review_UI_Change.md §2.2 — "the agreed label
// IS the batch-confirm value" for posts where both methods agree and no
// other flag condition fired.
// `postIds` is client-supplied scope, not trust — it's ANDed onto the same
// eligibility query, so passing an arbitrary id list can only narrow the
// result, never confirm a post that wasn't already eligible.
export async function batchConfirmAgreed(postIds?: number[]): Promise<BatchConfirmResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    return { ok: false, reason: 'Unauthorized' }
  }

  try {
    const candidates = await prisma.facebookPost.findMany({
      where: {
        category_final: null,
        // Ground-truth rows never actually satisfy category_final: null (see
        // updatePostCategory's guard above), so this was safe by invariant
        // rather than by statement. Made explicit — code review, 2026-09-05
        // (docs/raven/Show_All_731_and_Chapter3_Wording.md §2.2) — now that
        // these rows are visible on the Manager's screen, matching the
        // explicit check every other write/read path in this file uses.
        ...EXCLUDE_GROUND_TRUTH,
        // Fails closed: an explicitly-passed empty array scopes to nothing,
        // not "everything" — only an omitted (undefined) postIds means
        // unscoped. An empty array reading as "no scope" would be a fail-open
        // default on a category-finalizing write.
        ...(postIds !== undefined ? { id: { in: postIds } } : {}),
      },
      select: { id: true, category_keyword: true, category_llm: true, category_flag_reasons: true },
    })
    const toConfirm = candidates.filter(isUnflaggedAgreed)

    const userId = parseInt(session.user.id, 10)
    const confirmedAt = new Date()

    await prisma.$transaction([
      ...toConfirm.map((post) =>
        prisma.facebookPost.update({
          where: { id: post.id },
          data: {
            category_final: post.category_keyword,
            category_final_source: 'ACCEPTED_SUGGESTION',
            category_final_assigned_by_id: userId,
            category_final_assigned_at: confirmedAt,
          },
        })
      ),
      ...(toConfirm.length > 0
        ? [
            prisma.categoryAuditLog.createMany({
              data: toConfirm.map((post) => ({
                user_id: userId, action: 'BATCH_CONFIRM' as const, facebook_post_id: post.id,
                // Query above filters on category_final: null, so every candidate's
                // previous value is always null here — stated explicitly rather than
                // read off the row so it doesn't read as if it might carry a value.
                previous_category: null, new_category: post.category_keyword,
              })),
            }),
          ]
        : []),
    ])

    revalidateCategoryScreens()
    return { ok: true, confirmed: toConfirm.length }
  } catch {
    return { ok: false, reason: GENERIC_ERROR }
  }
}
