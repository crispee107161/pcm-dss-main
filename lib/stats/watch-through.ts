import { median, quantile } from './descriptive'
import { rankArray, pearsonCorrelation } from './spearman'
import { studentTPValue } from './normal-dist'

export interface PostForWatchThrough {
  duration_sec: number | null
  avg_seconds_viewed: number | null
  engagement_rate: number
}

export interface WatchThroughResult {
  n: number
  // Capped at 1.0 (100%) for display — a replay/loop can push raw seconds
  // viewed past the clip's duration, which isn't a meaningful ">100% of the
  // video watched" claim (mvp.md §4.8's FR-28 risk mitigation).
  medianRate: number
  q1Rate: number
  q3Rate: number
  outlierCount: number // posts whose raw (uncapped) rate exceeded 100%
  correlationWithEngagement: { n: number; rho: number; p: number }
}

// FR-28 — watch_through_rate = Average Seconds viewed / Duration (sec),
// computable only for posts with both fields present and a positive
// duration (Duration (sec) <= 0 is guarded upstream in validate-posts.ts,
// arriving here as null already). Reports the correlation with engagement
// rate live rather than hardcoding mvp.md's illustrative rho=0.363 — that
// figure is a snapshot of a smaller/older dataset and this recomputes it
// against whatever is actually in the database.
export function computeWatchThrough(posts: PostForWatchThrough[]): WatchThroughResult {
  const eligible = posts.filter(
    (p): p is PostForWatchThrough & { duration_sec: number; avg_seconds_viewed: number } =>
      p.duration_sec !== null && p.avg_seconds_viewed !== null
  )
  const n = eligible.length
  if (n === 0) {
    throw new Error('computeWatchThrough: no posts with both Duration (sec) and Average Seconds viewed')
  }

  const rawRates = eligible.map(p => p.avg_seconds_viewed / p.duration_sec)
  const displayRates = rawRates.map(r => Math.min(r, 1))
  const outlierCount = rawRates.filter(r => r > 1).length

  const engagementRates = eligible.map(p => p.engagement_rate)
  const rankedRates = rankArray(displayRates) as number[]
  const rankedEngagement = rankArray(engagementRates) as number[]
  const rho = n >= 3 ? pearsonCorrelation(rankedRates, rankedEngagement) : 0
  const t = n >= 3 && Math.abs(rho) < 1 ? (rho * Math.sqrt(n - 2)) / Math.sqrt(1 - rho * rho) : Infinity
  const p = n >= 3 && Number.isFinite(t) ? studentTPValue(t, n - 2) : 1

  return {
    n,
    medianRate: median(displayRates),
    q1Rate: quantile(displayRates, 0.25),
    q3Rate: quantile(displayRates, 0.75),
    outlierCount,
    correlationWithEngagement: { n, rho, p },
  }
}
