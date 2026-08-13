'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { detectCategoryFromText } from '@/lib/keywords/detect'
import { resolveCaption } from '@/lib/keywords/caption'
import { CATEGORY_NAME_TO_LABEL } from '@/lib/category-label'
import type { CategoryLabel } from '@/app/generated/prisma/client'

// Ads no longer carry a category (mvp.md §5.1 — content category → ad
// efficiency has no join key and is permanently out of scope). Categorisation
// is organic-post-only.

function revalidateCategoryScreens() {
  revalidatePath('/dashboard/marketing/categorize')
  revalidatePath('/dashboard/marketing/content')
  revalidatePath('/dashboard/owner/categorize')
  revalidatePath('/dashboard/owner/content')
}

// S3 Content Library + direct S4 override — Marketing Manager only (mvp.md
// §3 S3/S4 permission grid: MM is the only "Full" role on both screens).
// Setting the final label directly supersedes any pending team proposal, so
// it's cleared here rather than left stale.
export async function updatePostCategory(postId: number, label: CategoryLabel | null): Promise<void> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    throw new Error('Unauthorized')
  }
  const userId = parseInt(session.user.id, 10)

  const previous = await prisma.facebookPost.findUnique({ where: { id: postId }, select: { category_final: true } })

  await prisma.facebookPost.update({
    where: { id: postId },
    data: {
      category_final: label,
      category_pending: null,
      category_pending_by: null,
      category_final_source: label ? 'MANUAL_OVERRIDE' : null,
      category_final_assigned_by_id: label ? userId : null,
      category_final_assigned_at: label ? new Date() : null,
    },
  })

  await prisma.categoryAuditLog.create({
    data: { user_id: userId, action: 'OVERRIDE', facebook_post_id: postId, previous_category: previous?.category_final ?? null, new_category: label },
  })

  revalidateCategoryScreens()
}

// FormData-compatible version for use with form action + .bind()
export async function updatePostCategoryForm(postId: number, formData: FormData): Promise<void> {
  const raw = formData.get('categoryLabel')
  const label = raw && raw !== '' ? (raw as CategoryLabel) : null
  await updatePostCategory(postId, label)
}

// S4 Categorisation Review — MARKETING_TEAM proposes a label for a post still
// awaiting a final category. Never touches category_final (mvp.md §3 item 2:
// "Team members may propose a change; it stays pending until accepted").
export async function proposePostCategory(postId: number, label: CategoryLabel): Promise<void> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_TEAM') {
    throw new Error('Unauthorized')
  }

  const userId = parseInt(session.user.id, 10)
  await prisma.facebookPost.update({
    where: { id: postId },
    data: { category_pending: label, category_pending_by: userId },
  })

  await prisma.categoryAuditLog.create({
    data: { user_id: userId, action: 'PROPOSE', facebook_post_id: postId, new_category: label },
  })

  revalidateCategoryScreens()
}

export async function proposePostCategoryForm(postId: number, formData: FormData): Promise<void> {
  const raw = formData.get('categoryLabel')
  if (!raw || raw === '') throw new Error('Select a category before proposing')
  await proposePostCategory(postId, raw as CategoryLabel)
}

// S4 — Marketing Manager accepts a pending team proposal, copying it into
// category_final and clearing the pending fields.
export async function acceptPendingCategory(postId: number): Promise<void> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    throw new Error('Unauthorized')
  }

  const post = await prisma.facebookPost.findUnique({
    where: { id: postId },
    select: { category_pending: true, category_final: true },
  })
  if (!post?.category_pending) {
    throw new Error('No pending proposal on this post')
  }

  await prisma.facebookPost.update({
    where: { id: postId },
    data: {
      category_final: post.category_pending,
      category_pending: null,
      category_pending_by: null,
      category_final_source: 'ACCEPTED_SUGGESTION',
      category_final_assigned_by_id: parseInt(session.user.id, 10),
      category_final_assigned_at: new Date(),
    },
  })

  await prisma.categoryAuditLog.create({
    data: {
      user_id: parseInt(session.user.id, 10), action: 'ACCEPT', facebook_post_id: postId,
      previous_category: post.category_final, new_category: post.category_pending,
    },
  })

  revalidateCategoryScreens()
}

// S4 — Marketing Manager rejects a pending proposal without finalising it,
// returning the post to the plain uncategorised queue.
export async function rejectPendingCategory(postId: number): Promise<void> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    throw new Error('Unauthorized')
  }

  const post = await prisma.facebookPost.findUnique({ where: { id: postId }, select: { category_pending: true } })

  await prisma.facebookPost.update({
    where: { id: postId },
    data: { category_pending: null, category_pending_by: null },
  })

  await prisma.categoryAuditLog.create({
    data: {
      user_id: parseInt(session.user.id, 10), action: 'REJECT', facebook_post_id: postId,
      previous_category: post?.category_pending ?? null, new_category: null,
    },
  })

  revalidateCategoryScreens()
}

// S4 bulk accept — every post currently carrying a pending proposal.
export async function bulkAcceptPendingCategories(): Promise<{ accepted: number }> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    throw new Error('Unauthorized')
  }

  const pendingPosts = await prisma.facebookPost.findMany({
    where: { category_pending: { not: null } },
    select: { id: true, category_pending: true, category_final: true },
  })
  const userId = parseInt(session.user.id, 10)

  const acceptedAt = new Date()
  await Promise.all(
    pendingPosts.map((post) =>
      prisma.facebookPost.update({
        where: { id: post.id },
        data: {
          category_final: post.category_pending,
          category_pending: null,
          category_pending_by: null,
          category_final_source: 'ACCEPTED_SUGGESTION',
          category_final_assigned_by_id: userId,
          category_final_assigned_at: acceptedAt,
        },
      })
    )
  )

  if (pendingPosts.length > 0) {
    await prisma.categoryAuditLog.createMany({
      data: pendingPosts.map((post) => ({
        user_id: userId, action: 'BULK_ACCEPT' as const, facebook_post_id: post.id,
        previous_category: post.category_final, new_category: post.category_pending,
      })),
    })
  }

  revalidateCategoryScreens()
  return { accepted: pendingPosts.length }
}

// ALG-04 — rule-based keyword suggestion (FR-12, method A). Writes only
// `category_keyword`, never `category_final`: FR-15 requires the two
// suggestion methods stored separately from the marketing manager's actual
// decision so they can be honestly compared later (step 10, ALG-06). Runs
// against every post still missing a keyword suggestion, independent of
// whether it already has a final category, since the comparison column is
// permanent, not a queue-clearing mechanism.
export async function autoCategorizeAll(): Promise<{ posts: number }> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    throw new Error('Unauthorized')
  }

  const [posts, keywordRows] = await Promise.all([
    prisma.facebookPost.findMany({
      where: { category_keyword: null },
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

  await Promise.all(
    posts.map((post) => {
      const caption = resolveCaption(post.title, post.description)
      const { label } = detectCategoryFromText(caption, keywords)
      return prisma.facebookPost.update({ where: { id: post.id }, data: { category_keyword: label } })
    })
  )

  revalidateCategoryScreens()
  return { posts: posts.length }
}
