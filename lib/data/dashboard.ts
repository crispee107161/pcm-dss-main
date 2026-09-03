import { prisma } from '@/lib/prisma'
import { withStudyPeriod, STUDY_PERIOD_POST_WHERE, STUDY_PERIOD_AD_WHERE, STUDY_PERIOD_PAGE_METRIC_WHERE, withStudyPeriodAd } from '@/lib/data/study-period'
import { manilaDayRange, priorEqualWindow, diffDaysInclusive, lastCompleteMonth, toISODate, type DateRangeWhere } from '@/lib/date-range'
import { manilaYearMonth, monthKey, distinctMonths, rowsInMonth, MANILA_MONTH_LABEL_FMT } from '@/lib/data/month-buckets'
import { median, iqr, type Iqr } from '@/lib/stats/descriptive'
import { MIN_INQUIRIES_FOR_CPI } from '@/lib/stats/campaign-rankings'
import { CATEGORY_LABEL_DISPLAY } from '@/lib/category-label'
import type { UploadLog, CategoryLabel } from '@/app/generated/prisma/client'

function fmtShort(d: Date): string {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
}

const ASSIGNABLE_CATEGORY_LABELS: CategoryLabel[] = ['PRODUCT_SHOWCASE', 'PROMOTIONAL_OFFER', 'TESTIMONIAL', 'ENTERTAINMENT']

export interface RankedAd {
  ad_id: string
  ad_name: string
  ad_set_name: string
  spend: number
  messaging: number
  cpi: number
}

export interface DashboardOverview {
  // ISO date of the most recent ad in the dataset — passed to
  // DateRangeFilter so its presets ("Last 3 months" etc.) anchor to the data
  // instead of the wall clock (see date-range.ts's lastCompleteMonth).
  dataAnchor: string
  periodLabel: string
  deltaWindowLabel: string | null
  deltaReliable: boolean
  kpis: {
    spend: { value: number; delta: number | null }
    inquiries: { value: number; delta: number | null }
    medianCpi: { value: number | null; n: number; iqr: Iqr | null; delta: number | null }
    medianEngagement: { value: number | null; n: number; delta: number | null }
    posts: { categorized: number; uncategorized: number; total: number }
  }
  topAds: RankedAd[]
  bottomAds: RankedAd[]
  monthlyTrend: { period: string; total_spend: number; total_inquiries: number; total_reach: number; ad_count: number }[]
  // Per-ad CPI values for the current period (same population as
  // kpis.medianCpi) — charted as a histogram/box plot, not just the median.
  cpiDistribution: number[]
  categoryPerformance: { category: CategoryLabel; label: string; medianEngagement: number; n: number }[]
  // Organic post reach/views, last 3 months with post data — a companion
  // series to monthlyTrend's ad-side numbers, same "last 3 months" convention.
  postReachViewsTrend: { period: string; total_reach: number; total_views: number }[]
  // FR-30: full monthly range (not the last-3 convention above) — the
  // verified reference figure in mvp.md §4.5 is a 12-month total.
  pageFunnelTrend: { period: string; visits: number; follows: number; ratioPer100: number | null }[]
  recentUploads: (UploadLog & { user: { email: string } })[]
  alerts: {
    uncategorizedCount: number
    missingMonths: string[]
    spendNoResultAds: { name: string; spend: number }[]
  }
}

// Sums spend/messaging per ad_id first, then computes one CPI per ad — never
// per raw row. A monthly-export ad can have up to 12 rows (one per upload),
// so ranking or medianing raw rows treats each month as an independent ad
// and produces a different (wrong) population. Verified against mvp.md §8's
// reference figure this way: n=187, median ₱21.39 across the full dataset.
function aggregateAdsById(ads: { ad_id: string; ad_name: string; ad_set_name: string; amount_spent: number; total_messaging_contacts: number | null }[]) {
  const perAd = new Map<string, { ad_name: string; ad_set_name: string; spend: number; messaging: number }>()
  for (const ad of ads) {
    const existing = perAd.get(ad.ad_id) ?? { ad_name: ad.ad_name, ad_set_name: ad.ad_set_name, spend: 0, messaging: 0 }
    perAd.set(ad.ad_id, {
      ad_name: ad.ad_name,
      ad_set_name: ad.ad_set_name,
      spend: existing.spend + ad.amount_spent,
      messaging: existing.messaging + (ad.total_messaging_contacts ?? 0),
    })
  }
  return perAd
}

interface ResolvedPeriod {
  periodLabel: string
  curWindow: DateRangeWhere
  priorWindow: DateRangeWhere | null
  deltaWindowLabel: string | null
}

// Resolves the effective period from URL params: explicit from/to, the
// `all=1` sentinel (DateRangeFilter's "All time" — see its comment on why
// this needs a marker distinct from "no params yet"), or — when neither is
// present — the spec default of the last complete month of *data*, not of
// the wall clock (mvp.md §4.1; the dataset is a fixed historical window, see
// §4.7, so a wall-clock default would usually resolve to empty).
function resolvePeriod(from: string | undefined, to: string | undefined, all: boolean, dataAnchor: Date): ResolvedPeriod {
  if (all) {
    return { periodLabel: 'All time', curWindow: {}, priorWindow: null, deltaWindowLabel: null }
  }

  let effectiveFrom = from
  let effectiveTo = to

  if (!effectiveFrom || !effectiveTo) {
    const defaults = lastCompleteMonth(dataAnchor)
    effectiveFrom = defaults.from
    effectiveTo = defaults.to
  }

  // Both effectiveFrom/effectiveTo are always valid ISO day strings here
  // (either passed in or freshly computed above), so manilaDayRange never
  // returns null in this branch.
  const curWindow = manilaDayRange(effectiveFrom, effectiveTo)!
  const prior = priorEqualWindow(effectiveFrom, effectiveTo)
  const priorWindow = manilaDayRange(prior.from, prior.to)!
  const windowDays = diffDaysInclusive(effectiveFrom, effectiveTo)

  return {
    periodLabel: `${fmtShort(new Date(`${effectiveFrom}T00:00:00`))} – ${fmtShort(new Date(`${effectiveTo}T00:00:00`))}`,
    curWindow,
    priorWindow,
    deltaWindowLabel: `vs prior ${windowDays} day${windowDays === 1 ? '' : 's'} (ending ${fmtShort(new Date(`${prior.to}T00:00:00`))})`,
  }
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

export async function getDashboardOverview(from: string | undefined, to: string | undefined, all: boolean): Promise<DashboardOverview> {
  const latestAdForAnchor = await prisma.ad.findFirst({
    where: STUDY_PERIOD_AD_WHERE,
    select: { reporting_ends: true },
    orderBy: { reporting_ends: 'desc' },
  })
  const dataAnchor = latestAdForAnchor?.reporting_ends ?? new Date()

  const period = resolvePeriod(from, to, all, dataAnchor)
  const { curWindow, priorWindow, periodLabel, deltaWindowLabel } = period

  // `{}` (all-time) omits the where clause entirely rather than passing
  // `{ reporting_ends: {} }` — an empty scalar filter isn't the same no-op
  // in every Prisma provider, so don't rely on it matching everything.
  // Scope_Call_Both_and_Clauses_Restored.md §2 — every ad query the
  // dashboard runs is now ANDed with STUDY_PERIOD_AD_WHERE, so "all time"
  // here means the full study period, not the full ingested range.
  const curAdWhere = withStudyPeriodAd(all ? undefined : { reporting_ends: curWindow })
  const priorAdWhere = priorWindow ? withStudyPeriodAd({ reporting_ends: priorWindow }) : null
  const curPostWhere = withStudyPeriod(all ? undefined : { publish_time: curWindow })
  const priorPostWhere = priorWindow ? withStudyPeriod({ publish_time: priorWindow }) : null

  const [
    earliestAd,
    curAdRows,
    priorAdRows,
    curPosts,
    priorPosts,
    postCategoryCounts,
    recentUploads,
    allAdsForGaps,
    allPostsForTrend,
    allPageMetrics,
  ] = await Promise.all([
    prisma.ad.findFirst({ where: STUDY_PERIOD_AD_WHERE, select: { reporting_starts: true }, orderBy: { reporting_starts: 'asc' } }),
    prisma.ad.findMany({
      where: curAdWhere,
      select: { ad_id: true, ad_name: true, ad_set_name: true, amount_spent: true, total_messaging_contacts: true },
    }),
    priorAdWhere
      ? prisma.ad.findMany({
          where: priorAdWhere,
          select: { ad_id: true, ad_name: true, ad_set_name: true, amount_spent: true, total_messaging_contacts: true },
        })
      : Promise.resolve([]),
    prisma.facebookPost.findMany({ where: curPostWhere, select: { engagement_rate: true, category_final: true } }),
    priorPostWhere
      ? prisma.facebookPost.findMany({ where: priorPostWhere, select: { engagement_rate: true } })
      : Promise.resolve([]),
    prisma.facebookPost.groupBy({ by: ['category_final'], where: STUDY_PERIOD_POST_WHERE, _count: { _all: true } }),
    prisma.uploadLog.findMany({ orderBy: { uploaded_at: 'desc' }, take: 5, include: { user: { select: { email: true } } } }),
    prisma.ad.findMany({
      where: STUDY_PERIOD_AD_WHERE,
      select: { ad_id: true, ad_name: true, ad_set_name: true, amount_spent: true, total_messaging_contacts: true, reach: true, reporting_starts: true },
    }),
    prisma.facebookPost.findMany({ where: STUDY_PERIOD_POST_WHERE, select: { publish_time: true, reach: true, views: true } }),
    prisma.pageMetricDaily.findMany({ where: STUDY_PERIOD_PAGE_METRIC_WHERE, select: { date: true, visits: true, follows: true } }),
  ])

  // A "vs prior period" delta is only meaningful when the prior window falls
  // entirely within the range the uploaded data actually covers — otherwise
  // a wide filter sums a near-empty sliver against a full current window and
  // produces an arithmetically correct but meaningless percentage.
  const earliestAdDate = earliestAd?.reporting_starts ?? null
  const deltaReliable = Boolean(!all && earliestAdDate && priorWindow?.gte && earliestAdDate <= priorWindow.gte)

  const curSpend = curAdRows.reduce((s, a) => s + a.amount_spent, 0)
  const curInquiries = curAdRows.reduce((s, a) => s + (a.total_messaging_contacts ?? 0), 0)
  const priorSpend = priorAdRows.reduce((s, a) => s + a.amount_spent, 0)
  const priorInquiries = priorAdRows.reduce((s, a) => s + (a.total_messaging_contacts ?? 0), 0)

  const curPerAd = aggregateAdsById(curAdRows)
  const priorPerAd = aggregateAdsById(priorAdRows)

  const curCpiPopulation = [...curPerAd.values()].filter(a => a.messaging > 0).map(a => a.spend / a.messaging)
  const priorCpiPopulation = [...priorPerAd.values()].filter(a => a.messaging > 0).map(a => a.spend / a.messaging)
  const medianCpiValue = curCpiPopulation.length > 0 ? median(curCpiPopulation) : null
  const medianCpiPrior = priorCpiPopulation.length > 0 ? median(priorCpiPopulation) : null
  const cpiDelta = deltaReliable && medianCpiValue !== null && medianCpiPrior !== null ? calcDelta(medianCpiValue, medianCpiPrior) : null

  const curRates = curPosts.map(p => p.engagement_rate)
  const priorRates = priorPosts.map(p => p.engagement_rate)
  const medianEngagementValue = curRates.length > 0 ? median(curRates) : null
  const medianEngagementPrior = priorRates.length > 0 ? median(priorRates) : null
  const engagementDelta = deltaReliable && medianEngagementValue !== null && medianEngagementPrior !== null ? calcDelta(medianEngagementValue, medianEngagementPrior) : null

  const categorizedInPeriod = curPosts.filter(p => p.category_final !== null).length

  const rankedAds: RankedAd[] = [...curPerAd.entries()]
    .filter(([, a]) => a.messaging >= MIN_INQUIRIES_FOR_CPI)
    .map(([ad_id, a]) => ({ ad_id, ad_name: a.ad_name, ad_set_name: a.ad_set_name, spend: a.spend, messaging: a.messaging, cpi: a.spend / a.messaging }))
    .sort((a, b) => a.cpi - b.cpi)

  const topAds = rankedAds.slice(0, 10)
  const bottomAds = rankedAds.length > 10 ? rankedAds.slice(-10).reverse() : []

  // Alerts are global data-health signals, not scoped to the period filter —
  // an uncategorised backlog or a coverage gap in month 3 shouldn't
  // disappear just because the user is looking at month 9.
  const uncategorizedCount = postCategoryCounts.find(c => c.category_final === null)?._count._all ?? 0

  const allPerAd = aggregateAdsById(allAdsForGaps)
  const spendNoResultAds = [...allPerAd.values()]
    .filter(a => a.spend > 0 && a.messaging === 0)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)
    .map(a => ({ name: a.ad_name, spend: a.spend }))

  // Last 3 distinct months present in the ad data, independent of the period
  // filter above — same "always last 3 months" convention the owner
  // dashboard used before this rework.
  const adMonths = distinctMonths(allAdsForGaps, a => a.reporting_starts, 3)

  const monthlyTrend = adMonths.map(target => {
    const monthAds = rowsInMonth(allAdsForGaps, a => a.reporting_starts, target)
    return {
      period: target.label,
      total_spend: monthAds.reduce((s, a) => s + a.amount_spent, 0),
      total_inquiries: monthAds.reduce((s, a) => s + (a.total_messaging_contacts ?? 0), 0),
      total_reach: monthAds.reduce((s, a) => s + (a.reach ?? 0), 0),
      ad_count: monthAds.length,
    }
  })

  // Every assignable category is kept, n=0 included — dropping empty
  // categories made "Promotional Offer" (for example) disappear from the
  // chart entirely instead of showing it had no posts this period
  // (docs/raven/Executive_Dashboard_Review.md B6).
  const categoryPerformance = ASSIGNABLE_CATEGORY_LABELS.map(category => {
    const rates = curPosts.filter(p => p.category_final === category).map(p => p.engagement_rate)
    return { category, label: CATEGORY_LABEL_DISPLAY[category], medianEngagement: rates.length > 0 ? median(rates) : 0, n: rates.length }
  })

  // Organic reach/views, same "last 3 months" convention as monthlyTrend
  // above but bucketed off post publish dates rather than ad reporting dates
  // — the two datasets don't necessarily share the same latest month.
  const postMonths = distinctMonths(allPostsForTrend, p => p.publish_time, 3)
  const postReachViewsTrend = postMonths.map(target => {
    const monthPosts = rowsInMonth(allPostsForTrend, p => p.publish_time, target)
    return {
      period: target.label,
      total_reach: monthPosts.reduce((s, p) => s + p.reach, 0),
      total_views: monthPosts.reduce((s, p) => s + (p.views ?? 0), 0),
    }
  })

  // FR-30 (mvp.md §4.5): full monthly range, not the last-3 convention —
  // the reference figure (389,577 visits / 11,386 follows) is a 12-month total.
  const pageMetricMonths = distinctMonths(allPageMetrics, m => m.date)
  const pageFunnelTrend = pageMetricMonths.map(target => {
    const monthRows = rowsInMonth(allPageMetrics, m => m.date, target)
    const visits = monthRows.reduce((s, m) => s + (m.visits ?? 0), 0)
    const follows = monthRows.reduce((s, m) => s + (m.follows ?? 0), 0)
    return { period: target.label, visits, follows, ratioPer100: visits > 0 ? (follows / visits) * 100 : null }
  })

  const coveredMonths = new Set(allAdsForGaps.map(a => monthKey(new Date(a.reporting_starts))))
  const missingMonths: string[] = []
  if (earliestAdDate) {
    const latestAd = allAdsForGaps.reduce((max, a) => (a.reporting_starts > max ? a.reporting_starts : max), earliestAdDate)
    const start = manilaYearMonth(earliestAdDate)
    const stop = manilaYearMonth(latestAd)
    // UTC-noon anchor for each candidate month — far enough from both the
    // Manila and UTC day boundaries that formatting it back through the
    // Manila-anchored formatter always resolves to the intended month.
    let year = start.year
    let month = start.month
    while (year < stop.year || (year === stop.year && month <= stop.month)) {
      const cursor = new Date(Date.UTC(year, month - 1, 1, 12))
      const key = `${year}-${String(month).padStart(2, '0')}`
      if (!coveredMonths.has(key)) {
        missingMonths.push(MANILA_MONTH_LABEL_FMT.format(cursor))
      }
      month += 1
      if (month > 12) { month = 1; year += 1 }
    }
  }

  return {
    dataAnchor: toISODate(dataAnchor),
    periodLabel,
    deltaWindowLabel: deltaReliable ? deltaWindowLabel : null,
    deltaReliable,
    kpis: {
      spend: { value: curSpend, delta: deltaReliable ? calcDelta(curSpend, priorSpend) : null },
      inquiries: { value: curInquiries, delta: deltaReliable ? calcDelta(curInquiries, priorInquiries) : null },
      medianCpi: { value: medianCpiValue, n: curCpiPopulation.length, iqr: curCpiPopulation.length > 0 ? iqr(curCpiPopulation) : null, delta: cpiDelta },
      medianEngagement: { value: medianEngagementValue, n: curRates.length, delta: engagementDelta },
      posts: { categorized: categorizedInPeriod, uncategorized: curPosts.length - categorizedInPeriod, total: curPosts.length },
    },
    topAds,
    bottomAds,
    monthlyTrend,
    cpiDistribution: curCpiPopulation,
    categoryPerformance,
    postReachViewsTrend,
    pageFunnelTrend,
    recentUploads,
    alerts: { uncategorizedCount, missingMonths, spendNoResultAds },
  }
}

