import { prisma } from '@/lib/prisma'
import { STUDY_PERIOD_POST_WHERE, withStudyPeriodAd, STUDY_PERIOD_AD_WHERE } from '@/lib/data/study-period'
import { getDashboardOverview } from '@/lib/data/dashboard'
import { loadAnalysisScreenData, loadAdLifecycleData } from '@/lib/data/analysis'
import { computeBudgetReallocation, MIN_SPEND_THRESHOLD_PHP, type BudgetReallocationResult } from '@/lib/stats/budget-reallocation'
import { rankByAdSet, type GroupRankingRow } from '@/lib/stats/ad-set-ranking'
import { computePostTypePerformance, type PostTypeRow } from '@/lib/stats/post-type-performance'
import { computeWatchThrough, type WatchThroughResult } from '@/lib/stats/watch-through'
import { interpretCorrelation, type CorrelationInterpretation } from '@/lib/stats/interpret'
import { CATEGORY_LABEL_DISPLAY } from '@/lib/category-label'

export interface ReportOptions {
  // FR-27 lifecycle diagnostics are owner-facing only (mvp.md §4.5), unlike
  // the rest of this report which both Owner and Marketing Manager see.
  role: 'owner' | 'marketing'
}

export async function buildReportData({ role }: ReportOptions) {
  const [overview, budgetAds, adSetAds, posts, analysis, lifecycle] = await Promise.all([
    getDashboardOverview(undefined, undefined, true),
    prisma.ad.findMany({
      where: withStudyPeriodAd({ total_messaging_contacts: { not: null } }),
      select: { ad_id: true, ad_name: true, ad_set_name: true, amount_spent: true, total_messaging_contacts: true },
    }),
    prisma.ad.findMany({
      where: STUDY_PERIOD_AD_WHERE,
      select: {
        ad_id: true, ad_set_id: true, ad_set_name: true, campaign_id: true, campaign_name: true,
        amount_spent: true, total_messaging_contacts: true,
      },
    }),
    prisma.facebookPost.findMany({
      where: STUDY_PERIOD_POST_WHERE,
      select: { post_type: true, reach: true, engagement_rate: true, views: true, duration_sec: true, avg_seconds_viewed: true },
    }),
    loadAnalysisScreenData(),
    role === 'owner' ? loadAdLifecycleData() : Promise.resolve(null),
  ])

  const budgetReallocation: BudgetReallocationResult = computeBudgetReallocation(budgetAds, MIN_SPEND_THRESHOLD_PHP)
  const adSetRows: GroupRankingRow[] = rankByAdSet(adSetAds)
  const postTypeRows: PostTypeRow[] = computePostTypePerformance(posts)
  const watchThroughEligible = posts.filter((p) => p.duration_sec !== null && p.avg_seconds_viewed !== null)
  const watchThrough: WatchThroughResult | null = watchThroughEligible.length > 0 ? computeWatchThrough(posts) : null
  const correlationInterpretation: CorrelationInterpretation = interpretCorrelation(
    analysis.correlation.coefficient, analysis.correlation.n, analysis.correlation.p,
  )

  const funnelTotals = overview.pageFunnelTrend.reduce(
    (acc, row) => ({ visits: acc.visits + row.visits, follows: acc.follows + row.follows }),
    { visits: 0, follows: 0 },
  )
  const followsPer100Visits = funnelTotals.visits > 0 ? (funnelTotals.follows / funnelTotals.visits) * 100 : null

  const categoryDistributionDisplay = analysis.categoryDistribution.map((row) => ({
    ...row,
    label: CATEGORY_LABEL_DISPLAY[row.category] ?? row.category,
  }))

  return {
    generatedAt: new Date(),
    overview,
    budgetReallocation,
    adSetRows,
    postTypeRows,
    watchThrough,
    analysis,
    correlationInterpretation,
    categoryDistributionDisplay,
    lifecycle,
    funnelTotals,
    followsPer100Visits,
  }
}

export type ReportData = Awaited<ReturnType<typeof buildReportData>>
