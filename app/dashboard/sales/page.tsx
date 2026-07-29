import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { computeSpearmanMatrix } from '@/lib/stats/spearman'
import { computeHealthScores } from '@/lib/stats/health-score'
import SalesDashboardTabs from '@/components/analytics/SalesDashboardTabs'
import { computeRegressionInsight } from '@/lib/insights/regression-insight'
import { getGreeting } from '@/lib/greeting'
import type { MonthlyKpi } from '@/types/index'

async function getRecentTargetMonths(): Promise<{ label: string; year: number; month: number }[]> {
  const dates = await prisma.ad.findMany({
    select: { reporting_starts: true },
    orderBy: { reporting_starts: 'desc' },
  })

  const seen = new Set<string>()
  const months: { label: string; year: number; month: number }[] = []

  for (const { reporting_starts } of dates) {
    const d = new Date(reporting_starts)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!seen.has(key)) {
      seen.add(key)
      months.push({
        label: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(d),
        year: d.getFullYear(),
        month: d.getMonth() + 1,
      })
      if (months.length === 3) break
    }
  }

  return months.reverse()
}

async function getMonthlyKpis(
  targetMonths: { label: string; year: number; month: number }[]
): Promise<MonthlyKpi[]> {
  const kpis: MonthlyKpi[] = []
  for (const target of targetMonths) {
    const startDate = new Date(target.year, target.month - 1, 1)
    const endDate = new Date(target.year, target.month, 0, 23, 59, 59)
    const ads = await prisma.ad.findMany({
      where: { reporting_starts: { gte: startDate, lte: endDate } },
    })
    kpis.push({
      period: target.label,
      total_spend: ads.reduce((s, a) => s + a.amount_spent, 0),
      total_purchases: ads.reduce((s, a) => s + (a.purchases ?? 0), 0),
      total_reach: ads.reduce((s, a) => s + (a.reach ?? 0), 0),
      ad_count: ads.length,
    })
  }
  return kpis
}

export default async function SalesDashboard() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SALES_DIRECTOR') redirect('/login')

  const displayName = session.user.email?.split('@')[0] ?? 'there'

  const targetMonths = await getRecentTargetMonths()

  const [monthlyKpis, spearmanRows, latestModel, allAds, topSpend, topPurchases, genderData, territoryData, allAdsForHealth] =
    await Promise.all([
      getMonthlyKpis(targetMonths),
      computeSpearmanMatrix(),
      prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
      prisma.ad.findMany({
        select: { reporting_starts: true, amount_spent: true, purchases: true, reach: true, total_messaging_contacts: true },
      }),
      prisma.ad.findMany({
        orderBy: { amount_spent: 'desc' },
        take: 5,
        select: { ad_name: true, ad_set_name: true, amount_spent: true, reporting_starts: true, reporting_ends: true },
      }),
      prisma.ad.findMany({
        where: { purchases: { gt: 0 } },
        orderBy: { purchases: 'desc' },
        take: 5,
        select: { ad_name: true, ad_set_name: true, purchases: true, reporting_starts: true, reporting_ends: true },
      }),
      prisma.followerGender.findMany(),
      prisma.followerTerritory.findMany(),
      prisma.ad.findMany({
        select: { id: true, ad_name: true, ad_set_name: true, amount_spent: true, purchases: true, reach: true, reporting_starts: true, reporting_ends: true },
      }),
    ])

  const scoredAds = computeHealthScores(allAdsForHealth)

  const adTrends = targetMonths.map(({ label, year, month }) => {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    const ads = allAds.filter(a => {
      const d = new Date(a.reporting_starts)
      return d >= start && d <= end
    })
    const total_spend     = ads.reduce((s, a) => s + a.amount_spent, 0)
    const total_purchases = ads.reduce((s, a) => s + (a.purchases ?? 0), 0)
    const total_reach     = ads.reduce((s, a) => s + (a.reach ?? 0), 0)
    const ad_count        = ads.length
    return { period: label, total_spend, total_purchases, total_reach, ad_count, avg_spend_per_ad: ad_count > 0 ? total_spend / ad_count : 0 }
  })

  const lastTwo = adTrends.slice(-2)
  const spendDelta =
    lastTwo.length === 2 && lastTwo[0].total_spend > 0
      ? ((lastTwo[1].total_spend - lastTwo[0].total_spend) / lastTwo[0].total_spend) * 100
      : null
  const purchaseDelta =
    lastTwo.length === 2 && lastTwo[0].total_purchases > 0
      ? ((lastTwo[1].total_purchases - lastTwo[0].total_purchases) / lastTwo[0].total_purchases) * 100
      : null

  const serialisedTopSpend = topSpend.map(a => ({
    ...a,
    reporting_starts: a.reporting_starts?.toISOString() ?? null,
    reporting_ends:   a.reporting_ends?.toISOString()   ?? null,
  }))

  const serialisedTopPurchases = topPurchases.map(a => ({
    ...a,
    reporting_starts: a.reporting_starts?.toISOString() ?? null,
    reporting_ends:   a.reporting_ends?.toISOString()   ?? null,
  }))

  const serialisedScoredAds = scoredAds.map(a => ({
    ...a,
    reporting_starts: new Date(a.reporting_starts).toISOString(),
    reporting_ends:   new Date(a.reporting_ends).toISOString(),
  }))

  const serialisedModel = latestModel
    ? { ...latestModel, trained_at: latestModel.trained_at.toISOString() }
    : null

  const regressionInsight = latestModel
    ? computeRegressionInsight(
        latestModel,
        allAds.map(a => ({ reach: a.reach ?? 0, messaging: a.total_messaging_contacts ?? 0, amount_spent: a.amount_spent })),
      )
    : null

  return (
    <SalesDashboardTabs
      displayName={displayName}
      greeting={getGreeting()}
      monthlyKpis={monthlyKpis}
      adTrends={adTrends}
      spendDelta={spendDelta}
      purchaseDelta={purchaseDelta}
      topSpend={serialisedTopSpend}
      topPurchases={serialisedTopPurchases}
      genderData={genderData}
      territoryData={territoryData}
      scoredAds={serialisedScoredAds as any}
      spearmanRows={spearmanRows}
      latestModel={serialisedModel}
      regressionInsight={regressionInsight}
    />
  )
}
