import { median, quantile } from './descriptive'
import type { CategoryLabel } from '@/app/generated/prisma/client'

export interface PostForCategoryDistribution {
  category_final: CategoryLabel | null
  views: number | null
  organic_engagement_rate: number
}

export interface CategoryDistributionRow {
  category: CategoryLabel
  n: number
  views: { median: number | null; q1: number | null; q3: number | null }
  engagementRate: { median: number; q1: number; q3: number }
}

// FR-20 — distribution (not just a single average) of Views and
// organic_engagement_rate per category, n shown per category since a
// category like Entertainment may be sparse and a median of a handful of
// posts isn't a stable estimate. Uncategorised posts (category_final null,
// or the explicit UNCLASSIFIED label) are grouped separately rather than
// silently dropped, so the "how much is still unlabelled" signal isn't lost.
export function computeCategoryDistribution(posts: PostForCategoryDistribution[]): CategoryDistributionRow[] {
  const byCategory = new Map<CategoryLabel, PostForCategoryDistribution[]>()
  for (const post of posts) {
    const label = post.category_final ?? 'UNCLASSIFIED'
    const group = byCategory.get(label)
    if (group) group.push(post)
    else byCategory.set(label, [post])
  }

  return Array.from(byCategory.entries())
    .map(([category, group]) => {
      const definedViews = group.map(p => p.views).filter((v): v is number => v !== null)
      const engagementRates = group.map(p => p.organic_engagement_rate)
      return {
        category,
        n: group.length,
        views: {
          median: definedViews.length > 0 ? median(definedViews) : null,
          q1: definedViews.length > 0 ? quantile(definedViews, 0.25) : null,
          q3: definedViews.length > 0 ? quantile(definedViews, 0.75) : null,
        },
        engagementRate: {
          median: median(engagementRates),
          q1: quantile(engagementRates, 0.25),
          q3: quantile(engagementRates, 0.75),
        },
      }
    })
    .sort((a, b) => b.n - a.n)
}
