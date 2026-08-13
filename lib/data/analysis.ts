import { prisma } from '@/lib/prisma'
import { computeRankingComparison, type RankingComparisonResult } from '@/lib/stats/ranking-comparison'
import { computeCategoryDistribution, type CategoryDistributionRow } from '@/lib/stats/category-distribution'
import { selectCorrelation, type CorrelationSelectionResult } from '@/lib/stats/correlation-selection'
import { computeAdLifecycle, type AdLifecycleResult } from '@/lib/stats/ad-lifecycle'

export interface AnalysisScreenData {
  ranking: RankingComparisonResult // FR-19 / ALG-07
  categoryDistribution: CategoryDistributionRow[] // FR-20
  correlation: CorrelationSelectionResult // FR-21 / ALG-08
}

// S7 Analysis screen (mvp.md §4.4). FR-19/20 run on organic posts, FR-21
// runs entirely on ads data — they're independent populations queried in
// parallel. FR-21's result is persisted to CorrelationAssumptionRun on every
// load (ALG-08: "persist the assumption-test result and chosen method") —
// cheap at n~187 and an audit trail of every run is more defensible for a
// graded requirement than a single overwritten row.
export async function loadAnalysisScreenData(): Promise<AnalysisScreenData> {
  const [posts, ads] = await Promise.all([
    prisma.facebookPost.findMany({
      select: { views: true, engagement_rate: true, category_final: true },
    }),
    prisma.ad.findMany({
      select: { ad_id: true, amount_spent: true, total_messaging_contacts: true, reach: true, post_engagements: true },
    }),
  ])

  const ranking = computeRankingComparison(
    posts.map(p => ({ views: p.views, organic_engagement_rate: p.engagement_rate }))
  )
  const categoryDistribution = computeCategoryDistribution(
    posts.map(p => ({ views: p.views, organic_engagement_rate: p.engagement_rate, category_final: p.category_final }))
  )
  const correlation = selectCorrelation(ads)

  await prisma.correlationAssumptionRun.create({
    data: {
      n: correlation.n,
      method: correlation.method,
      coefficient: correlation.coefficient,
      p_value: correlation.p,
      shapiro_x_w: correlation.shapiroX.W,
      shapiro_x_p: correlation.shapiroX.p,
      shapiro_y_w: correlation.shapiroY.W,
      shapiro_y_p: correlation.shapiroY.p,
    },
  })

  return { ranking, categoryDistribution, correlation }
}

// FR-27 — Owner-facing month-of-life cohort curves, loaded separately from
// the rest of S7 since only the Owner route renders this section (mvp.md
// §4.5 explicitly scopes FR-27 as Owner-facing, unlike the rest of S7 which
// both Owner and Marketing Manager see in full).
export async function loadAdLifecycleData(): Promise<AdLifecycleResult> {
  const [lifecycleRows, frequencyRows] = await Promise.all([
    prisma.ad.findMany({
      select: { ad_id: true, reporting_starts: true, amount_spent: true, total_messaging_contacts: true },
    }),
    prisma.ad.findMany({
      select: { frequency: true, amount_spent: true, total_messaging_contacts: true },
    }),
  ])

  return computeAdLifecycle(lifecycleRows, frequencyRows)
}
