import { prisma } from '@/lib/prisma'
import { STUDY_PERIOD_POST_WHERE } from '@/lib/data/study-period'
import type { CategoryLabel } from '@/app/generated/prisma/client'

export const CATEGORY_PERFORMANCE_ASSIGNABLE_LABELS: CategoryLabel[] = [
  'PRODUCT_SHOWCASE',
  'PROMOTIONAL_OFFER',
  'TESTIMONIAL',
  'ENTERTAINMENT',
]

export interface CategoryPerformanceRow {
  label: CategoryLabel
  post_count: number
  total_reach: number
  avg_engagement: number | null
}

export interface CategoryPerformanceData {
  rows: CategoryPerformanceRow[]
  total_posts: number
  uncategorized_posts: number
}

// FR-17a. Ads no longer carry a category (mvp.md §5.1 — content category →
// ad efficiency has no join key and is permanently out of scope). This
// report is organic-post-only.
export async function loadCategoryPerformanceData(): Promise<CategoryPerformanceData> {
  const allPosts = await prisma.facebookPost.findMany({
    where: STUDY_PERIOD_POST_WHERE,
    select: { category_final: true, reach: true, reactions: true, comments: true, shares: true },
  })

  const rows = CATEGORY_PERFORMANCE_ASSIGNABLE_LABELS.map(label => {
    const posts = allPosts.filter(p => p.category_final === label)
    const post_count = posts.length
    const total_reach = posts.reduce((s, p) => s + p.reach, 0)
    // ALG-09: sum-then-divide, never the mean of per-post rates — otherwise a
    // handful of high-reach, low-engagement posts get equal weight against
    // low-reach, high-engagement outliers and the category average drifts.
    const total_engagements = posts.reduce((s, p) => s + p.reactions + p.comments + p.shares, 0)
    const avg_engagement = total_reach > 0 ? (total_engagements / total_reach) * 100 : null

    return { label, post_count, total_reach, avg_engagement }
  })

  const uncategorized_posts = allPosts.filter(p => p.category_final === null).length

  return { rows, total_posts: allPosts.length, uncategorized_posts }
}
