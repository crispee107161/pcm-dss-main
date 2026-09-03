// Deterministic, template-based plain-language interpretation sentences for
// Executive Dashboard charts (FR-18). No LLM call: a sentence stating a
// figure has to be reproducible and must recompute from the same numbers
// the chart plots (docs/dashboard/Dashboard_Plain_Language_and_Notation.md
// §1.2). Every function here is a pure string builder over already-computed
// chart data, so it can be called from a server or client component.

import type { Iqr } from '@/lib/stats/descriptive'

function formatPhp0(v: number): string {
  return `₱${Math.round(v).toLocaleString()}`
}

function pluralize(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}

function wasWerePublished(n: number): string {
  return n === 1 ? 'was published' : 'were published'
}

function pctChange(from: number, to: number): number {
  if (from === 0) return to === 0 ? 0 : Infinity
  return ((to - from) / from) * 100
}

// ── Cost-per-inquiry distribution ────────────────────────────────────────

// Below this many ads, a quartile split puts roughly one ad per bucket, so
// the spread it implies isn't a real distribution.
const MIN_ADS_FOR_DISTRIBUTION = 4

export function interpretCpiDistribution(cpiValues: number[], iqrStats: Iqr | null, periodLabel: string): string {
  const n = cpiValues.length
  if (n === 0) return `No advertisements ran in ${periodLabel}.`
  if (n < MIN_ADS_FOR_DISTRIBUTION || !iqrStats) {
    return `Only ${pluralize(n, 'advertisement')} ran in ${periodLabel}, too few to describe a distribution.`
  }

  const min = Math.min(...cpiValues)
  const max = Math.max(...cpiValues)
  const ratio = min > 0 ? max / min : null
  // Below ~1.5x, "about 1 times the cheapest" reads as a rounding artifact
  // rather than a finding worth stating.
  const ratioClause = ratio !== null && ratio >= 1.5 ? `, and the most expensive cost about ${Math.round(ratio)} times the cheapest` : ''

  return `Every advertisement that ran in ${periodLabel}, grouped by what it cost per inquiry. Half cost between ${formatPhp0(iqrStats.q1)} and ${formatPhp0(iqrStats.q3)}${ratioClause}.`
}

// ── Follows per 100 page visits ──────────────────────────────────────────

const RATIO_STEADY_THRESHOLD = 0.05

export function interpretFollowsRatio(trend: { period: string; ratioPer100: number | null }[]): string {
  const withRatio = trend.filter((t): t is { period: string; ratioPer100: number } => t.ratioPer100 !== null)

  if (withRatio.length === 0) return 'Not enough monthly data yet to describe a trend.'
  if (withRatio.length === 1) {
    return `The ratio is about ${withRatio[0].ratioPer100.toFixed(1)} follows per 100 visits, with only one month of data so a trend can't be described yet.`
  }

  const first = withRatio[0]
  const last = withRatio[withRatio.length - 1]
  const delta = last.ratioPer100 - first.ratioPer100

  const trendClause = Math.abs(delta) < RATIO_STEADY_THRESHOLD
    ? `The ratio has held steady around ${first.ratioPer100.toFixed(1)} follows per 100 visits over this period`
    : `The ratio has ${delta > 0 ? 'risen' : 'fallen'} from about ${first.ratioPer100.toFixed(1)} follows per 100 visits to about ${last.ratioPer100.toFixed(1)}, so a ${delta > 0 ? 'larger' : 'smaller'} share of visitors now follow the page`

  return `${trendClause}. Visits and follows are counted separately with no link between individual visitors and follows, so this is not a conversion rate.`
}

// ── Performance by content category ──────────────────────────────────────

export function interpretCategoryPerformance(
  categories: { label: string; medianEngagement: number; n: number }[],
  periodLabel: string,
  lowConfidenceN: number,
): string {
  const withPosts = categories.filter(c => c.n > 0)
  if (withPosts.length === 0) return `No categorised posts in ${periodLabel}.`

  const top = [...withPosts].sort((a, b) => b.medianEngagement - a.medianEngagement)[0]
  const mostReliable = [...withPosts].sort((a, b) => b.n - a.n)[0]

  const clauses: string[] = [`Median engagement rate for ${periodLabel} posts in each category.`]

  if (top.label === mostReliable.label) {
    clauses.push(`${top.label} posts earned the highest rate and is also the most reliable comparison at ${pluralize(top.n, 'post')}.`)
  } else {
    clauses.push(`${top.label} posts earned the highest rate but only ${pluralize(top.n, 'post')} ${wasWerePublished(top.n)}, while ${mostReliable.label} is the most reliable comparison at ${pluralize(mostReliable.n, 'post')}.`)
  }

  const lowConfidence = withPosts.find(c => c.n < lowConfidenceN && c.label !== top.label && c.label !== mostReliable.label)
  if (lowConfidence) {
    clauses.push(`${lowConfidence.label} rests on ${pluralize(lowConfidence.n, 'post')} and is shown dimmed for that reason.`)
  }

  return clauses.join(' ')
}

// ── Organic reach & views trend ──────────────────────────────────────────

type Direction = 'risen' | 'fallen' | 'held steady'

function directionWord(change: number): Direction {
  if (!Number.isFinite(change)) return 'risen' // rose from a zero base
  if (Math.abs(change) < 3) return 'held steady'
  return change > 0 ? 'risen' : 'fallen'
}

export function interpretReachViewsTrend(trend: { period: string; total_reach: number; total_views: number }[]): string {
  if (trend.length < 2) return 'Not enough monthly data yet to describe a trend.'

  const first = trend[0]
  const last = trend[trend.length - 1]
  const reachDir = directionWord(pctChange(first.total_reach, last.total_reach))
  const viewsDir = directionWord(pctChange(first.total_views, last.total_views))

  let leveledClause = ''
  if (trend.length >= 3) {
    const priorToLast = trend[trend.length - 2]
    const recentReachChange = Math.abs(pctChange(priorToLast.total_reach, last.total_reach))
    const recentViewsChange = Math.abs(pctChange(priorToLast.total_views, last.total_views))
    const movedOverall = reachDir !== 'held steady' || viewsDir !== 'held steady'
    if (movedOverall && recentReachChange < 10 && recentViewsChange < 10) {
      leveledClause = ' and then levelled off'
    }
  }

  const openingClause = `Total reach and total views on posts published in each of the last ${pluralize(trend.length, 'month')}.`

  if (reachDir === viewsDir) {
    const bodyClause = reachDir === 'held steady'
      ? 'Both have held steady over this period'
      : `Both ${reachDir} from ${first.period} to ${last.period}${leveledClause}`
    return `${openingClause} ${bodyClause}.`
  }

  const reachClause = reachDir === 'held steady' ? 'Reach has held steady' : `Reach has ${reachDir}`
  const viewsClause = viewsDir === 'held steady' ? 'views have held steady' : `views have ${viewsDir}`
  return `${openingClause} ${reachClause} while ${viewsClause} over the same period.`
}

// ── Spend vs. messaging conversations compare-trend (§2) ────────────────

const COMPARE_STEADY_THRESHOLD_PCT = 5
const REACH_EXCLUDED_THRESHOLD_PCT = 50

export interface SpendMessagingCompareResult {
  finding: string
  reachExcludedNote: string | null
}

// pctChange returns Infinity when the base value is 0 (rising off a true
// zero isn't a percentage), which a bare Math.round would render as the
// literal string "Infinity%" in a caption. Callers get null instead and
// fall back to qualitative wording ("risen from none").
function pctChangeOrNull(from: number, to: number): number | null {
  const change = pctChange(from, to)
  return Number.isFinite(change) ? change : null
}

function changeClause(from: number, to: number, subject: string, plural: boolean): string {
  const has = plural ? 'have' : 'has'
  const change = pctChangeOrNull(from, to)
  if (change === null) return to > 0 ? `${subject} ${has} risen from none` : `${subject} ${has} stayed at zero`
  if (Math.abs(change) < COMPARE_STEADY_THRESHOLD_PCT) return `${subject} ${has} stayed level`
  return `${subject} ${has} ${change > 0 ? 'risen' : 'fallen'} about ${Math.abs(Math.round(change))}%`
}

export function interpretSpendMessagingCompare(
  rows: { period: string; total_spend: number; total_inquiries: number; total_reach: number }[],
  // The period buildIndexedData actually rebased everything to (the first
  // period where every plotted series is non-zero, not necessarily
  // rows[0]) — comparing from rows[0] instead let this sentence quote a
  // different "base" month than the chart it's captioning.
  basePeriod: string,
  includeReachNote: boolean,
): SpendMessagingCompareResult {
  const base = rows.find(r => r.period === basePeriod) ?? rows[0]
  const last = rows[rows.length - 1]
  if (rows.length < 2 || base === last) {
    return { finding: 'Not enough monthly data yet to compare trends.', reachExcludedNote: null }
  }

  const spendClause = changeClause(base.total_spend, last.total_spend, 'Spend', false)
  const messagingClause = changeClause(base.total_inquiries, last.total_inquiries, 'conversations', true)

  let costClause = ''
  const baseCpi = base.total_inquiries > 0 ? base.total_spend / base.total_inquiries : null
  const lastCpi = last.total_inquiries > 0 ? last.total_spend / last.total_inquiries : null
  if (baseCpi !== null && lastCpi !== null) {
    const cpiChange = pctChangeOrNull(baseCpi, lastCpi)
    if (cpiChange !== null && Math.abs(cpiChange) >= COMPARE_STEADY_THRESHOLD_PCT) {
      costClause = `, so each conversation is costing ${cpiChange > 0 ? 'more' : 'less'} than it did in ${base.period}`
    }
  }

  const finding = `${spendClause} while ${messagingClause}${costClause}.`

  let reachExcludedNote: string | null = null
  if (includeReachNote) {
    const reachChange = pctChangeOrNull(base.total_reach, last.total_reach)
    reachExcludedNote = reachChange !== null && reachChange > REACH_EXCLUDED_THRESHOLD_PCT
      ? `Reach is excluded from this comparison because it grew about ${Math.round(reachChange)}% over the same period, which would compress the other two lines.`
      : null
  }

  return { finding, reachExcludedNote }
}
