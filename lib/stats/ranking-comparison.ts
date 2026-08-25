import { rankArray, pearsonCorrelation } from './spearman'
import { studentTPValue } from './normal-dist'

export interface PostForRankingComparison {
  views: number | null
  organic_engagement_rate: number
  reach: number
}

export interface OverlapResult {
  k: 10 | 20
  topCount: number
  overlapCount: number
  overlapFraction: number
}

export interface RankingComparisonResult {
  n: number
  excludedNullViews: number
  rho: number
  p: number
  overlaps: OverlapResult[]
  // FR-09 (Scope_Call_Both_and_Clauses_Restored.md §5) — Views vs. Reach,
  // same eligible population as the Views/engagement-rate figure above
  // (reach is a non-null column, so this never excludes further). Explains
  // *why* Views and engagement rate rank posts differently: view count is
  // very nearly a restatement of audience size.
  viewsReachRho: number
  viewsReachP: number
}

// ALG-07 (FR-19) — Spearman rank correlation between Views and
// organic_engagement_rate, plus top-10%/20% overlap between the two
// rankings. Ties use average ranking (rankArray, shared with spearman.ts) —
// Views has repeated values in the low range. The 1 post with a null Views
// is excluded explicitly rather than sorted as 0 or +Infinity, which would
// corrupt both the correlation and the overlap.
export function computeRankingComparison(posts: PostForRankingComparison[]): RankingComparisonResult {
  const eligible = posts.filter((p): p is PostForRankingComparison & { views: number } => p.views !== null)
  const n = eligible.length
  const excludedNullViews = posts.length - n

  if (n < 3) {
    throw new Error('computeRankingComparison: fewer than 3 posts with a non-null Views value')
  }

  const views = eligible.map(p => p.views)
  const engagementRate = eligible.map(p => p.organic_engagement_rate)

  const rankedViews = rankArray(views) as number[]
  const rankedEngagement = rankArray(engagementRate) as number[]
  const rho = pearsonCorrelation(rankedViews, rankedEngagement)
  const t = Math.abs(rho) >= 1 ? Infinity : (rho * Math.sqrt(n - 2)) / Math.sqrt(1 - rho * rho)
  const p = Number.isFinite(t) ? studentTPValue(t, n - 2) : 0

  const reach = eligible.map(p => p.reach)
  const rankedReach = rankArray(reach) as number[]
  const viewsReachRho = pearsonCorrelation(rankedViews, rankedReach)
  const viewsReachT = Math.abs(viewsReachRho) >= 1 ? Infinity : (viewsReachRho * Math.sqrt(n - 2)) / Math.sqrt(1 - viewsReachRho * viewsReachRho)
  const viewsReachP = Number.isFinite(viewsReachT) ? studentTPValue(viewsReachT, n - 2) : 0

  const byViewsDesc = [...eligible].sort((a, b) => b.views - a.views)
  const byEngagementDesc = [...eligible].sort((a, b) => b.organic_engagement_rate - a.organic_engagement_rate)

  const overlaps: OverlapResult[] = [10, 20].map(k => {
    const topCount = Math.ceil((n * k) / 100)
    const topViewsSet = new Set(byViewsDesc.slice(0, topCount))
    const overlapCount = byEngagementDesc.slice(0, topCount).filter(post => topViewsSet.has(post)).length
    return { k: k as 10 | 20, topCount, overlapCount, overlapFraction: overlapCount / topCount }
  })

  return { n, excludedNullViews, rho, p, overlaps, viewsReachRho, viewsReachP }
}
