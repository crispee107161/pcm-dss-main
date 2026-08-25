import { prisma } from '@/lib/prisma'
import { withStudyPeriod } from '@/lib/data/study-period'
import { resolveCaption } from '@/lib/keywords/caption'
import { computeFlagReasons } from '@/lib/categorize/flag-reasons'
import type { CategoryLabel, CategoryFlagReason } from '@/app/generated/prisma/client'

const ASSIGNABLE_LABELS: CategoryLabel[] = ['PRODUCT_SHOWCASE', 'PROMOTIONAL_OFFER', 'TESTIMONIAL', 'ENTERTAINMENT']

// Recomputes and persists category_flag_reasons for every post still
// awaiting a final category. Only needs calling when category_keyword or
// category_llm actually changes (actions/categorize.ts autoCategorizeAll,
// actions/classify-posts.ts runLlmClassification) — every flag condition is
// a pure function of a post's own fields (see computeFlagReasons), so
// finalising other posts can't change these. Flags are a snapshot, not a
// live read, per FacebookPost.category_flag_reasons's doc comment.
export async function recomputeQueueFlagReasons(): Promise<void> {
  const posts = await prisma.facebookPost.findMany({
    where: withStudyPeriod({ category_final: null }),
    select: {
      id: true,
      title: true,
      description: true,
      category_keyword: true,
      category_llm: true,
      category_flag_reasons: true,
    },
  })

  const toUpdate = posts.flatMap((post) => {
    const nextReasons = computeFlagReasons({
      categoryKeyword: post.category_keyword,
      categoryLlm: post.category_llm,
      caption: resolveCaption(post.title, post.description),
    })

    const changed =
      nextReasons.length !== post.category_flag_reasons.length ||
      nextReasons.some((reason, i) => reason !== post.category_flag_reasons[i])
    return changed ? [{ id: post.id, nextReasons }] : []
  })

  // A derived cache, not decision data paired with an audit-log row (unlike
  // the actions that call this) — no atomicity requirement, so this skips
  // $transaction, which was hitting Prisma's default interactive-transaction
  // timeout at queue scale. Grouped by identical reason-set (computeFlagReasons
  // has only 16 possible outputs) and issued as one updateMany per group,
  // rather than one update per row, to keep the statement count bounded as
  // the queue grows instead of fanning out hundreds of concurrent writes.
  const groups = new Map<string, { nextReasons: CategoryFlagReason[]; ids: number[] }>()
  for (const { id, nextReasons } of toUpdate) {
    const key = nextReasons.join(',')
    const group = groups.get(key)
    if (group) group.ids.push(id)
    else groups.set(key, { nextReasons, ids: [id] })
  }

  await Promise.all(
    Array.from(groups.values()).map(({ nextReasons, ids }) =>
      prisma.facebookPost.updateMany({ where: { id: { in: ids } }, data: { category_flag_reasons: nextReasons } })
    )
  )
}

export function isUnflaggedAgreed(post: {
  category_flag_reasons: CategoryFlagReason[]
  category_keyword: CategoryLabel | null
  category_llm: CategoryLabel | null
}): boolean {
  return (
    post.category_flag_reasons.length === 0 &&
    post.category_keyword !== null &&
    post.category_keyword === post.category_llm &&
    ASSIGNABLE_LABELS.includes(post.category_keyword)
  )
}
