import { median } from './descriptive'

export interface PostForTypePerformance {
  post_type: string
  reach: number
  engagement_rate: number
  // Nullable — the handful of posts with a genuinely blank Views export
  // cell (see FR-19/ALG-07) are excluded from the median rather than
  // treated as 0.
  views: number | null
}

export interface PostTypeRow {
  postType: string
  n: number
  medianReach: number
  medianEngagementRate: number
  // Null when every post in the group has a blank Views cell — render as
  // "—", never 0 (ALG-09's null-vs-zero edge case applies here too).
  medianViews: number | null
}

// A row's ranking is not trustworthy below this sample size — mvp.md §4.5
// singles out the Links row (n=1) as needing an explicit footnote, not a
// silently equal-weighted ranking slot.
export const MIN_N_FOR_CONFIDENCE = 3

// FR-29 — median reach / engagement rate / views per post type, sorted by
// post count descending so the dominant formats (photos, videos) lead the
// table. Median, not sum-then-divide (ALG-09 governs ratio aggregation like
// CPI; this is a per-post distribution comparison instead).
export function computePostTypePerformance(posts: PostForTypePerformance[]): PostTypeRow[] {
  const byType = new Map<string, PostForTypePerformance[]>()
  for (const post of posts) {
    const group = byType.get(post.post_type)
    if (group) {
      group.push(post)
    } else {
      byType.set(post.post_type, [post])
    }
  }

  return Array.from(byType.entries())
    .map(([postType, group]) => {
      const definedViews = group.map(p => p.views).filter((v): v is number => v !== null)
      return {
        postType,
        n: group.length,
        medianReach: median(group.map(p => p.reach)),
        medianEngagementRate: median(group.map(p => p.engagement_rate)),
        medianViews: definedViews.length > 0 ? median(definedViews) : null,
      }
    })
    .sort((a, b) => b.n - a.n)
}

// FR-18/22 — a plain-language callout naming the highest-engagement and
// lowest-views formats, restricted to rows with a stable estimate
// (n >= MIN_N_FOR_CONFIDENCE). When the same format tops one measure and
// trails the other, states it as a single contrast rather than two
// separate sentences, since that's the more informative reading (e.g.
// reels: highest engagement, lowest views).
export function describePostTypePerformance(rows: PostTypeRow[]): string | null {
  const eligible = rows.filter(r => r.n >= MIN_N_FOR_CONFIDENCE)
  if (eligible.length < 2) return null

  const byEngagement = [...eligible].sort((a, b) => b.medianEngagementRate - a.medianEngagementRate)
  const bestEngagement = byEngagement[0]

  const withViews = eligible.filter(r => r.medianViews !== null)
  const byViews = [...withViews].sort((a, b) => a.medianViews! - b.medianViews!)
  const lowestViews = byViews[0]

  if (lowestViews && lowestViews.postType === bestEngagement.postType) {
    return `${bestEngagement.postType} has the highest median engagement rate (${bestEngagement.medianEngagementRate.toFixed(2)}%) but the lowest median views (${lowestViews.medianViews!.toLocaleString()}) — engagement and reach don't move together here.`
  }

  const engagementSentence = `${bestEngagement.postType} has the highest median engagement rate (${bestEngagement.medianEngagementRate.toFixed(2)}%)`
  if (!lowestViews) return `${engagementSentence}.`
  return `${engagementSentence}; ${lowestViews.postType} has the lowest median views (${lowestViews.medianViews!.toLocaleString()}).`
}
