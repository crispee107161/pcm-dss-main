// Lightweight, dependency-free insight generators for the Page Metrics
// dashboard. Each chart on that page shows raw numbers; these functions turn
// the same numbers into a one-line "what's happening" headline + detail,
// following the existing lib/insights/{forecast,trend}-insight.ts pattern
// (headline/detail strings, no external stats library).

export interface MetricInsight {
  headline: string
  detail: string
}

const MIN_POINTS_FOR_TREND = 4

/** Average of the first vs. second half of a series — the simplest signal
 *  that doesn't need a full regression, matching computeTrendInsight's
 *  period-over-period approach applied to a daily series instead. */
function splitHalves(values: number[]): { firstHalf: number; secondHalf: number } | null {
  if (values.length < MIN_POINTS_FOR_TREND) return null
  const mid = Math.floor(values.length / 2)
  const firstHalf = values.slice(0, mid).reduce((s, v) => s + v, 0) / mid
  const secondHalf = values.slice(mid).reduce((s, v) => s + v, 0) / (values.length - mid)
  return { firstHalf, secondHalf }
}

function pctChange(from: number, to: number): number | null {
  if (from === 0) return null
  return ((to - from) / from) * 100
}

function directionWord(pct: number, flatThreshold = 5): 'up' | 'down' | 'flat' {
  if (pct > flatThreshold) return 'up'
  if (pct < -flatThreshold) return 'down'
  return 'flat'
}

/** Like directionWord, but for signed values (e.g. daily_change) where a
 *  percent change is meaningless across a sign crossing — pctChange(-10, 5)
 *  gives -150%, which directionWord would read as "down" despite the series
 *  improving. Falls back to a direct comparison whenever the halves don't
 *  share a sign. */
function signedDirectionWord(firstHalf: number, secondHalf: number): 'up' | 'down' | 'flat' {
  const sameSign = (firstHalf >= 0) === (secondHalf >= 0)
  if (sameSign) {
    const pct = pctChange(firstHalf, secondHalf)
    if (pct !== null) return directionWord(pct)
  }
  if (secondHalf === firstHalf) return 'flat'
  return secondHalf > firstHalf ? 'up' : 'down'
}

export interface DailyActivityPoint {
  follows: number | null
  interactions: number | null
  link_clicks: number | null
  views: number | null
  visits: number | null
}

/** Daily Page Activity chart: which of follows/interactions/visits moved the most. */
export function computeDailyActivityInsight(daily: DailyActivityPoint[]): MetricInsight | null {
  const metrics: { key: 'Follows' | 'Interactions' | 'Visits'; values: number[] }[] = [
    { key: 'Follows', values: daily.map(d => d.follows ?? 0) },
    { key: 'Interactions', values: daily.map(d => d.interactions ?? 0) },
    { key: 'Visits', values: daily.map(d => d.visits ?? 0) },
  ]

  const deltas = metrics
    .map(m => {
      const halves = splitHalves(m.values)
      if (!halves) return null
      const pct = pctChange(halves.firstHalf, halves.secondHalf)
      return pct === null ? null : { key: m.key, pct }
    })
    .filter((d): d is { key: 'Follows' | 'Interactions' | 'Visits'; pct: number } => d !== null)

  if (deltas.length === 0) return null

  const biggest = deltas.reduce((a, b) => (Math.abs(b.pct) > Math.abs(a.pct) ? b : a))
  const dir = directionWord(biggest.pct)

  if (dir === 'flat') {
    return {
      headline: 'Daily activity is holding steady across the period',
      detail: 'Follows, interactions, and visits are all moving within a normal range with no clear trend.',
    }
  }

  const others = deltas.filter(d => d.key !== biggest.key)
  const detail = others.length > 0
    ? `${others.map(o => `${o.key.toLowerCase()} ${directionWord(o.pct) === 'flat' ? 'held steady' : `${directionWord(o.pct)} ${Math.abs(o.pct).toFixed(0)}%`}`).join(', ')} over the same period.`
    : 'The remaining daily metrics moved less over the same period.'

  return {
    headline: `${biggest.key} ${dir} ${Math.abs(biggest.pct).toFixed(0)}% from the start to the end of this period`,
    detail,
  }
}

export interface ViewsClicksPoint {
  views: number | null
  link_clicks: number | null
}

/** Page Views & Link Clicks chart: is the click-through rate improving. */
export function computeViewsClicksInsight(daily: ViewsClicksPoint[]): MetricInsight | null {
  const totalViews = daily.reduce((s, d) => s + (d.views ?? 0), 0)
  const totalClicks = daily.reduce((s, d) => s + (d.link_clicks ?? 0), 0)
  if (totalViews === 0) return null

  const overallCtr = (totalClicks / totalViews) * 100

  const ctrSeries = daily
    .filter(d => (d.views ?? 0) > 0)
    .map(d => ((d.link_clicks ?? 0) / (d.views ?? 1)) * 100)
  const halves = splitHalves(ctrSeries)

  if (!halves) {
    return {
      headline: `Viewers clicked a link ${overallCtr.toFixed(1)}% of the time this period`,
      detail: 'Upload more days of data to see whether the click-through rate is trending up or down.',
    }
  }

  const pct = pctChange(halves.firstHalf, halves.secondHalf)
  if (pct === null) return null
  const dir = directionWord(pct, 10)

  const headline = dir === 'flat'
    ? `Click-through rate is steady around ${overallCtr.toFixed(1)}% this period`
    : `Click-through rate is trending ${dir}, ${Math.abs(pct).toFixed(0)}% from the start to the end of this period`

  return {
    headline,
    detail: `Viewers clicked a link ${overallCtr.toFixed(1)}% of the time on average across the ${daily.length} days shown.`,
  }
}

export interface FollowerPoint {
  followers: number
  daily_change: number
}

/** Follower Growth chart: net change and whether growth is speeding up or slowing down. */
export function computeFollowerGrowthInsight(history: FollowerPoint[]): MetricInsight | null {
  if (history.length < 2) return null

  const net = history.at(-1)!.followers - history[0].followers
  const netWord = net > 0 ? 'gained' : net < 0 ? 'lost' : 'kept'
  const netAbs = Math.abs(net)

  const changes = history.map(d => d.daily_change)
  const halves = splitHalves(changes)

  const headline = `The page ${netWord} ${netAbs.toLocaleString()} follower${netAbs === 1 ? '' : 's'} over this period`

  if (!halves) {
    return { headline, detail: `Average daily change was ${(net / (history.length - 1)).toFixed(1)} followers/day.` }
  }

  const dir = signedDirectionWord(halves.firstHalf, halves.secondHalf)
  const detail = dir === 'flat'
    ? `Daily growth has been fairly consistent throughout the period.`
    : `Daily growth is ${dir} — averaging ${halves.firstHalf.toFixed(1)}/day early on vs. ${halves.secondHalf.toFixed(1)}/day more recently.`

  return { headline, detail }
}

export interface ViewerPoint {
  new_viewers: number
  returning_viewers: number
}

/** Page Viewers chart: new vs. returning mix and whether loyalty is improving. */
export function computeViewerMixInsight(viewers: ViewerPoint[]): MetricInsight | null {
  const totalNew = viewers.reduce((s, d) => s + d.new_viewers, 0)
  const totalReturning = viewers.reduce((s, d) => s + d.returning_viewers, 0)
  const total = totalNew + totalReturning
  if (total === 0) return null

  const returnRate = (totalReturning / total) * 100
  const dominant = totalReturning >= totalNew ? 'returning' : 'new'

  const rateSeries = viewers
    .filter(d => d.new_viewers + d.returning_viewers > 0)
    .map(d => (d.returning_viewers / (d.new_viewers + d.returning_viewers)) * 100)
  const halves = splitHalves(rateSeries)

  const headline = `${dominant === 'returning' ? 'Returning' : 'New'} viewers make up most of the audience this period (${returnRate.toFixed(0)}% return rate)`

  if (!halves) {
    return { headline, detail: `${totalNew.toLocaleString()} new and ${totalReturning.toLocaleString()} returning viewers were recorded.` }
  }

  const pct = pctChange(halves.firstHalf, halves.secondHalf)
  const detail = pct === null
    ? `${totalNew.toLocaleString()} new and ${totalReturning.toLocaleString()} returning viewers were recorded.`
    : directionWord(pct) === 'flat'
      ? 'The new-vs-returning mix has stayed fairly constant across the period.'
      : `Repeat visits are becoming ${directionWord(pct) === 'up' ? 'more' : 'less'} common — the return rate moved from ${halves.firstHalf.toFixed(0)}% to ${halves.secondHalf.toFixed(0)}%.`

  return { headline, detail }
}

export interface GenderPoint {
  gender: string
  distribution: number
}

/** Gender Distribution chart: which segment leads and by how much. */
export function computeGenderInsight(genderData: GenderPoint[]): MetricInsight | null {
  if (genderData.length === 0) return null
  const sorted = [...genderData].sort((a, b) => b.distribution - a.distribution)
  const top = sorted[0]
  const runnerUp = sorted[1]

  const headline = `${top.gender} followers are the largest audience segment at ${(top.distribution * 100).toFixed(0)}%`
  const detail = runnerUp
    ? `${runnerUp.gender} followers follow at ${(runnerUp.distribution * 100).toFixed(0)}%. This is a current snapshot and does not change with the date filter.`
    : 'This is a current snapshot and does not change with the date filter.'

  return { headline, detail }
}

export interface TerritoryPoint {
  territory: string
  distribution: number
}

/** Top Territories chart: which region leads. */
export function computeTerritoryInsight(territoryData: TerritoryPoint[]): MetricInsight | null {
  if (territoryData.length === 0) return null
  const sorted = [...territoryData].sort((a, b) => b.distribution - a.distribution)
  const top = sorted[0]
  const restShare = sorted.slice(1).reduce((s, t) => s + t.distribution, 0)

  return {
    headline: `${top.territory} is the top follower location at ${(top.distribution * 100).toFixed(0)}%`,
    detail: `The other ${sorted.length - 1} location${sorted.length - 1 === 1 ? '' : 's'} shown make up the remaining ${(restShare * 100).toFixed(0)}%. This is a current snapshot and does not change with the date filter.`,
  }
}

export interface PostTypeRow {
  post_type: string
  _count: { id: number }
  _avg: { engagement_rate: number | null }
}

/** Performance by Post Type table: which format performs best. */
export function computePostTypeInsight(typeBreakdown: PostTypeRow[]): MetricInsight | null {
  if (typeBreakdown.length === 0) return null
  const byEngagement = [...typeBreakdown].sort((a, b) => (b._avg.engagement_rate ?? 0) - (a._avg.engagement_rate ?? 0))
  const best = byEngagement[0]
  const mostPosted = [...typeBreakdown].sort((a, b) => b._count.id - a._count.id)[0]

  const headline = `${best.post_type} posts get the best engagement, averaging ${(best._avg.engagement_rate ?? 0).toFixed(2)}%`

  const detail = mostPosted.post_type === best.post_type
    ? `${mostPosted.post_type} is also the most-used format (${mostPosted._count.id} posts) this period.`
    : `${mostPosted.post_type} is posted most often (${mostPosted._count.id} posts), but converts less attention per post than ${best.post_type}.`

  return { headline, detail }
}
