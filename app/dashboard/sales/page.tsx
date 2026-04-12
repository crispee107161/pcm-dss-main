import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { computeSpearmanMatrix } from '@/lib/stats/spearman'
import CorrelationTable from '@/components/analytics/CorrelationTable'
import RegressionSummary from '@/components/analytics/RegressionSummary'
import WhatIfSimulator from '@/components/analytics/WhatIfSimulator'
import MonthlyKpiCards from '@/components/kpi/MonthlyKpiCards'
import { SpendPurchasesChart, ReachTrendChart } from '@/components/marketing/TrendCharts'
import { GenderPieChart, TerritoryChart } from '@/components/marketing/PageMetricsCharts'
import type { MonthlyKpi } from '@/types/index'

const TARGET_MONTHS = [
  { label: 'Sep 2025', year: 2025, month: 9 },
  { label: 'Dec 2025', year: 2025, month: 12 },
  { label: 'Jan 2026', year: 2026, month: 1 },
]

function formatPHP(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

function formatDate(date: Date | null) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

async function getMonthlyKpis(): Promise<MonthlyKpi[]> {
  const kpis: MonthlyKpi[] = []
  for (const target of TARGET_MONTHS) {
    const startDate = new Date(target.year, target.month - 1, 1)
    const endDate = new Date(target.year, target.month, 0, 23, 59, 59)
    const ads = await prisma.ad.findMany({
      where: { reporting_starts: { gte: startDate, lte: endDate } },
    })
    kpis.push({
      period: target.label,
      total_spend: ads.reduce((sum, a) => sum + a.amount_spent, 0),
      total_purchases: ads.reduce((sum, a) => sum + (a.purchases ?? 0), 0),
      total_reach: ads.reduce((sum, a) => sum + (a.reach ?? 0), 0),
      ad_count: ads.length,
    })
  }
  return kpis
}

function RankBadge({ rank }: { rank: number }) {
  const base = 'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold'
  if (rank === 1) return <span className={`${base} bg-amber-400 text-white`}>1</span>
  if (rank === 2) return <span className={`${base} bg-slate-300 text-slate-800`}>2</span>
  if (rank === 3) return <span className={`${base} bg-orange-300 text-white`}>3</span>
  return <span className={`${base} bg-slate-100 text-slate-500`}>{rank}</span>
}

export default async function SalesDashboard() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SALES_DIRECTOR') {
    redirect('/login')
  }

  const displayName = session.user.email?.split('@')[0] ?? 'there'

  const [monthlyKpis, spearmanRows, latestModel, allAds, allPosts, topSpend, topPurchases, genderData, territoryData] =
    await Promise.all([
      getMonthlyKpis(),
      computeSpearmanMatrix(),
      prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
      prisma.ad.findMany({
        select: { reporting_starts: true, amount_spent: true, purchases: true, reach: true },
      }),
      prisma.facebookPost.findMany({
        select: { publish_time: true, engagement_rate: true, reach: true },
      }),
      prisma.ad.findMany({
        orderBy: { amount_spent: 'desc' },
        take: 5,
        select: { ad_name: true, ad_set_name: true, amount_spent: true, reporting_starts: true, reporting_ends: true },
      }),
      prisma.ad.findMany({
        where: { purchases: { not: null } },
        orderBy: { purchases: 'desc' },
        take: 5,
        select: { ad_name: true, ad_set_name: true, purchases: true, reporting_starts: true, reporting_ends: true },
      }),
      prisma.followerGender.findMany(),
      prisma.followerTerritory.findMany(),
    ])

  // Build monthly ad trends for charts
  const adTrends = TARGET_MONTHS.map(({ label, year, month }) => {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    const ads = allAds.filter(a => {
      const d = new Date(a.reporting_starts)
      return d >= start && d <= end
    })
    const total_spend = ads.reduce((s, a) => s + a.amount_spent, 0)
    const total_purchases = ads.reduce((s, a) => s + (a.purchases ?? 0), 0)
    const total_reach = ads.reduce((s, a) => s + (a.reach ?? 0), 0)
    const ad_count = ads.length
    return { period: label, total_spend, total_purchases, total_reach, ad_count, avg_spend_per_ad: ad_count > 0 ? total_spend / ad_count : 0 }
  })

  // MoM deltas
  const lastTwo = adTrends.slice(-2)
  const spendDelta =
    lastTwo.length === 2 && lastTwo[0].total_spend > 0
      ? ((lastTwo[1].total_spend - lastTwo[0].total_spend) / lastTwo[0].total_spend) * 100
      : null
  const purchaseDelta =
    lastTwo.length === 2 && lastTwo[0].total_purchases > 0
      ? ((lastTwo[1].total_purchases - lastTwo[0].total_purchases) / lastTwo[0].total_purchases) * 100
      : null

  function DeltaBadge({ value }: { value: number | null }) {
    if (value === null) return <span className="text-slate-400 text-xs">—</span>
    const up = value >= 0
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5 border ${
        up
          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
          : 'bg-red-50 text-red-500 border-red-100'
      }`}>
        {up ? '▲' : '▼'} {Math.abs(value).toFixed(1)}% vs prev period
      </span>
    )
  }

  const topTerritory = [...territoryData].sort((a, b) => b.distribution - a.distribution)[0]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Campaign performance and What-If scenarios</p>
        </div>
        <span className="text-sm text-slate-500 font-medium">
          Welcome back, <span className="text-slate-800 font-semibold">{displayName}</span>
        </span>
      </div>

      {/* Monthly KPIs */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Monthly KPI Summary</p>
        <MonthlyKpiCards data={monthlyKpis} />
      </div>

      {/* MoM trend deltas */}
      {lastTwo.length === 2 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-wrap gap-6">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">
              {lastTwo[0].period} → {lastTwo[1].period} · Spend
            </p>
            <DeltaBadge value={spendDelta} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">
              {lastTwo[0].period} → {lastTwo[1].period} · Purchases
            </p>
            <DeltaBadge value={purchaseDelta} />
          </div>
        </div>
      )}

      {/* Trend charts */}
      {allAds.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Ad Spend vs. Purchases</p>
            <p className="text-xs text-slate-400 mb-4">Total spend (PHP) and resulting purchases per period</p>
            <SpendPurchasesChart data={adTrends} />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Ad Reach by Month</p>
            <p className="text-xs text-slate-400 mb-4">Total unique reach from paid ads</p>
            <ReachTrendChart data={adTrends} />
          </div>
        </div>
      )}

      {/* Campaign rankings */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Top by Spend */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Top Campaigns by Spend</p>
            <p className="text-xs text-slate-400 mt-1">Top 5 ads with highest budget allocation</p>
          </div>
          {topSpend.length === 0 ? (
            <p className="text-slate-500 text-sm p-5">No ad data. Upload an Ads CSV first.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3 w-10">#</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Ad Name</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Spend</th>
                </tr>
              </thead>
              <tbody>
                {topSpend.map((ad, i) => (
                  <tr key={i} className="hover:bg-slate-50 border-t border-slate-100">
                    <td className="px-4 py-3"><RankBadge rank={i + 1} /></td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 text-sm max-w-xs truncate" title={ad.ad_name}>{ad.ad_name}</div>
                      <div className="text-xs text-slate-400">{formatDate(ad.reporting_starts)} – {formatDate(ad.reporting_ends)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatPHP(ad.amount_spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top by Purchases */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Top Campaigns by Purchases</p>
            <p className="text-xs text-slate-400 mt-1">Top 5 ads that drove the most purchases</p>
          </div>
          {topPurchases.length === 0 ? (
            <p className="text-slate-500 text-sm p-5">No purchase data available.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3 w-10">#</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Ad Name</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Purchases</th>
                </tr>
              </thead>
              <tbody>
                {topPurchases.map((ad, i) => (
                  <tr key={i} className="hover:bg-slate-50 border-t border-slate-100">
                    <td className="px-4 py-3"><RankBadge rank={i + 1} /></td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 text-sm max-w-xs truncate" title={ad.ad_name}>{ad.ad_name}</div>
                      <div className="text-xs text-slate-400">{formatDate(ad.reporting_starts)} – {formatDate(ad.reporting_ends)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">{(ad.purchases ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Audience demographics */}
      {(genderData.length > 0 || territoryData.length > 0) && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Audience Demographics</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {genderData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Gender Distribution</p>
                <p className="text-xs text-slate-400 mb-4">Breakdown of followers by gender</p>
                <GenderPieChart data={genderData} />
              </div>
            )}
            {territoryData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Top Territories</p>
                <p className="text-xs text-slate-400 mb-4">
                  Audience reach by region
                  {topTerritory && (
                    <> — top market: <strong className="text-slate-600">{topTerritory.territory}</strong> ({(topTerritory.distribution * 100).toFixed(1)}%)</>
                  )}
                </p>
                <TerritoryChart data={territoryData} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Correlation analysis */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Spearman Correlation Analysis</p>
        <p className="text-xs text-slate-400 mb-4">
          Rank-order correlation between ad metrics and outcomes (–1 to +1). Values closer to ±1 indicate stronger relationships.
        </p>
        <CorrelationTable rows={spearmanRows} />
      </div>

      {/* Regression model */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Predictive Regression Model</p>
        <RegressionSummary model={latestModel} />
      </div>

      {/* What-If simulator */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">What-If Simulator</p>
        <p className="text-xs text-slate-400 mb-4">
          Enter a budget amount to predict how many purchases it may generate.
        </p>
        <WhatIfSimulator />
      </div>

    </div>
  )
}
