import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import { PrintButton } from '@/components/marketing/PrintButton'
import LaggedCorrelationPanel from '@/components/analytics/LaggedCorrelationPanel'
import { computeLaggedCorrelations } from '@/lib/stats/laggedCorrelation'
import { computeHoltWintersForecast } from '@/lib/stats/forecast'
import { MovingAverageForecastChart } from '@/components/marketing/PageMetricsCharts'
import AIInsightCard from '@/components/analytics/AIInsightCard'

function formatPHP(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value)
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date))
}

const TARGET_PERIODS = [
  { label: 'September 2025', year: 2025, month: 9 },
  { label: 'December 2025', year: 2025, month: 12 },
  { label: 'January 2026',  year: 2026, month: 1  },
]

export default async function ReportPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') redirect('/login')

  const [allAds, allPosts, latestModel, categories, dailyMetrics, lagData] = await Promise.all([
    prisma.ad.findMany({
      select: {
        ad_name: true,
        reporting_starts: true, reporting_ends: true,
        amount_spent: true, purchases: true,
        reach: true, impressions: true, link_clicks: true, category_id: true,
      },
    }),
    prisma.facebookPost.findMany({
      select: {
        publish_time: true, engagement_rate: true, reach: true,
        reactions: true, comments: true, shares: true, post_type: true, category_id: true,
      },
    }),
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.category.findMany(),
    prisma.pageMetricDaily.findMany({ orderBy: { date: 'asc' } }),
    computeLaggedCorrelations(),
  ])

  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

  // Overall ad aggregates
  const totalSpend     = allAds.reduce((s, a) => s + a.amount_spent, 0)
  const totalPurchases = allAds.reduce((s, a) => s + (a.purchases ?? 0), 0)
  const totalReach     = allAds.reduce((s, a) => s + (a.reach ?? 0), 0)
  const totalImpressions  = allAds.reduce((s, a) => s + a.impressions, 0)
  const totalLinkClicks   = allAds.reduce((s, a) => s + (a.link_clicks ?? 0), 0)
  const cpa = totalPurchases > 0 ? totalSpend / totalPurchases : null

  // Top 5 ads by purchases
  const top5Ads = [...allAds]
    .filter(a => (a.purchases ?? 0) > 0)
    .sort((a, b) => (b.purchases ?? 0) - (a.purchases ?? 0))
    .slice(0, 5)

  // Monthly breakdown
  const monthlyData = TARGET_PERIODS.map(({ label, year, month }) => {
    const start = new Date(year, month - 1, 1)
    const end   = new Date(year, month, 0, 23, 59, 59)
    const ads   = allAds.filter(a => {
      const d = new Date(a.reporting_starts)
      return d >= start && d <= end
    })
    return {
      period: label,
      spend:     ads.reduce((s, a) => s + a.amount_spent, 0),
      purchases: ads.reduce((s, a) => s + (a.purchases ?? 0), 0),
      reach:     ads.reduce((s, a) => s + (a.reach ?? 0), 0),
      ad_count:  ads.length,
    }
  })

  // Organic post aggregates
  const avgEngagement  = allPosts.length > 0
    ? allPosts.reduce((s, p) => s + p.engagement_rate, 0) / allPosts.length
    : 0
  const totalPostReach = allPosts.reduce((s, p) => s + p.reach, 0)

  // Category breakdown
  const adCatCounts: Record<string, number> = {}
  for (const ad of allAds) {
    const name = ad.category_id ? (catMap[ad.category_id] ?? 'Uncategorized') : 'Uncategorized'
    adCatCounts[name] = (adCatCounts[name] ?? 0) + 1
  }

  // Page views forecast (FR-22)
  const viewsForecast = computeHoltWintersForecast(
    dailyMetrics.map(d => ({ date: d.date, value: d.views })),
    7, 7
  )
  const forecastChartData = [
    ...viewsForecast.history.slice(-21).map(h => ({
      date: h.date.slice(5), value: h.value, ma: h.ma,
      forecast: undefined as number | undefined,
    })),
    ...viewsForecast.forecast.map(f => ({
      date: f.date.slice(5),
      value: undefined as number | undefined,
      ma: undefined as number | undefined,
      forecast: f.forecastValue,
    })),
  ]

  // MLR equation
  const isMLR = latestModel?.coef_reach != null
  const s = (v: number) => (v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4))
  const equation = latestModel
    ? isMLR
      ? `Purchases = ${latestModel.intercept.toFixed(4)} ${s(latestModel.coef_reach!)}·log(1+Reach) ${s(latestModel.coef_messaging!)}·log(1+Msgs) ${s(latestModel.coef_amount_spent!)}·log(1+Spend)`
      : `Purchases = ${latestModel.intercept.toFixed(4)} + ${latestModel.coefficient.toFixed(6)} × Amount Spent`
    : null

  const generatedAt = new Date()

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="print:hidden">
        <PageHeader title="Executive Summary Report" description="FR-23 — comprehensive marketing performance summary with forecasts and model insights" />
      </div>

      <div className="flex justify-end mb-6 print:hidden">
        <PrintButton />
      </div>

      <div id="report-content" className="space-y-6 print:space-y-8">

        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 to-red-500 rounded-2xl p-8 text-white">
          <h1 className="text-2xl font-bold">PC Merchandise — Marketing Performance Report</h1>
          <p className="text-red-100 mt-1 text-sm">
            Generated: {formatDate(generatedAt)} · Data Period: Sep 2025 – Jan 2026
          </p>
        </div>

        {/* Executive Summary KPIs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print-no-break">
          <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Executive Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Ad Spend',    value: formatPHP(totalSpend),               sub: '3-month period',  color: 'text-red-700' },
              { label: 'Total Purchases',   value: totalPurchases.toLocaleString(),      sub: 'from ads',        color: 'text-green-700' },
              { label: 'Total Ad Reach',    value: totalReach.toLocaleString(),          sub: 'unique people',   color: 'text-purple-700' },
              { label: 'Cost per Purchase', value: cpa ? formatPHP(cpa) : '—',          sub: 'avg CPA',         color: 'text-amber-700' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Ads by Purchases */}
        {top5Ads.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print-no-break">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Top 5 Ads by Purchases</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-3">#</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-3">Ad Name</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-3 hidden sm:table-cell">Period</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-3">Spend</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-3">Purchases</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-3 hidden sm:table-cell">CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {top5Ads.map((ad, i) => {
                    const pur = ad.purchases ?? 0
                    const adCpa = pur > 0 ? ad.amount_spent / pur : null
                    return (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-slate-500 font-medium">{i + 1}</td>
                        <td className="px-3 py-2.5 text-slate-800 font-medium max-w-[200px] truncate">{ad.ad_name}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap hidden sm:table-cell">
                          {formatDate(ad.reporting_starts)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">{formatPHP(ad.amount_spent)}</td>
                        <td className="px-3 py-2.5 text-green-700 font-semibold">{pur}</td>
                        <td className="px-3 py-2.5 text-slate-600 hidden sm:table-cell">{adCpa ? formatPHP(adCpa) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Best Lag Correlation */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print-no-break">
          <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
            Time-Lagged Correlation (FR-19)
          </h2>
          <LaggedCorrelationPanel data={lagData} />
        </div>

        {/* Monthly Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print-no-break">
          <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Monthly Ad Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Period</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Ads Run</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Total Spend</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Purchases</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Reach</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">CPA</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(row => (
                  <tr key={row.period} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.period}</td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{row.ad_count}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{formatPHP(row.spend)}</td>
                    <td className="px-4 py-3 text-green-700 font-semibold">{row.purchases}</td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{row.reach.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                      {row.purchases > 0 ? formatPHP(row.spend / row.purchases) : '—'}
                    </td>
                  </tr>
                ))}
                {(() => {
                  const mSpend = monthlyData.reduce((s, r) => s + r.spend, 0)
                  const mPurchases = monthlyData.reduce((s, r) => s + r.purchases, 0)
                  const mReach = monthlyData.reduce((s, r) => s + r.reach, 0)
                  const mCount = monthlyData.reduce((s, r) => s + r.ad_count, 0)
                  return (
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                      <td className="px-4 py-3 text-slate-800">Total</td>
                      <td className="px-4 py-3 text-slate-800 hidden sm:table-cell">{mCount}</td>
                      <td className="px-4 py-3 text-red-700">{formatPHP(mSpend)}</td>
                      <td className="px-4 py-3 text-green-700">{mPurchases}</td>
                      <td className="px-4 py-3 text-slate-800 hidden sm:table-cell">{mReach.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                        {mPurchases > 0 ? formatPHP(mSpend / mPurchases) : '—'}
                      </td>
                    </tr>
                  )
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Predictive Model */}
        {latestModel && equation && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print-no-break">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Predictive Model ({isMLR ? 'Multiple Linear Regression, log-transformed' : 'Simple Linear Regression'}) — FR-20
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-2">Regression Equation</p>
                <p className="font-mono text-sm text-slate-800 bg-slate-50 rounded-lg px-4 py-3 break-all">{equation}</p>
                {isMLR && (
                  <p className="text-xs text-slate-400 mt-2">
                    Log(1+x) transformation applied to all predictors to model diminishing returns.
                  </p>
                )}
              </div>
              <div className="space-y-3">
                {[
                  { label: 'R² (Explained Variance)', value: `${(latestModel.r_squared * 100).toFixed(2)}%` },
                  { label: 'Residual Std Error (RSE)', value: latestModel.residual_std_error != null ? latestModel.residual_std_error.toFixed(4) : '—' },
                  { label: '80% Prediction Interval width', value: latestModel.residual_std_error != null ? `±${(latestModel.residual_std_error * 1.2816).toFixed(2)} purchases` : '—' },
                  { label: 'Sample Size (n)', value: latestModel.n.toString() },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center bg-slate-50 rounded-lg px-4 py-2">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="font-semibold text-slate-800 text-sm">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 7-Day Page Views Forecast */}
        {dailyMetrics.length >= 7 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print-no-break">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              7-Day Page Views Forecast (FR-22)
            </h2>
            <p className="text-sm text-slate-500 mb-1">
              Holt-Winters level: <strong>{viewsForecast.lastLevel.toLocaleString()} views/day</strong>. Next 7 days shown as orange dots.
            </p>
            <p className="text-xs text-slate-400 mb-4">
              {viewsForecast.method === 'holt-winters'
                ? 'Triple exponential smoothing (α=0.3, β=0.1, γ=0.3, period=7) — captures trend and weekly seasonality.'
                : 'Double exponential smoothing (Holt linear) — upload more data to enable seasonal model.'}
            </p>
            <MovingAverageForecastChart data={forecastChartData} />
          </div>
        )}

        {/* Organic Posts */}
        {allPosts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print-no-break">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Organic Post Engagement (FR-24 — descriptive only, no sales linkage)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Posts',         value: allPosts.length.toLocaleString() },
                { label: 'Total Reach',         value: totalPostReach.toLocaleString() },
                { label: 'Avg Engagement Rate', value: `${avgEngagement.toFixed(2)}%` },
                { label: 'Total Reactions',     value: allPosts.reduce((s, p) => s + p.reactions, 0).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Limitation: Organic post analysis is restricted to engagement metrics. No daily POS data is available to correlate posts with sales.
            </p>
          </div>
        )}

        {/* Content Categories */}
        {Object.keys(adCatCounts).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print-no-break">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Ad Content Category Distribution</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(adCatCounts).map(([cat, count]) => (
                <div key={cat} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-sm text-slate-700">{cat}</span>
                  <span className="text-sm font-semibold text-slate-800">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insights */}
        <AIInsightCard data={{
          totalSpend,
          totalPurchases,
          totalReach,
          cpa,
          bestLag: lagData.best_lag,
          bestMetric: lagData.best_metric,
          bestR: lagData.best_r,
          rSquared: latestModel?.r_squared ?? null,
          isMLR,
          rse: latestModel?.residual_std_error ?? null,
          forecastBaseline: dailyMetrics.length >= 7 ? viewsForecast.lastLevel : null,
          avgEngagement: allPosts.length > 0 ? avgEngagement : null,
        }} />

        {/* Key Insights */}
        <div className="bg-slate-900 rounded-2xl p-6 print-no-break">
          <h2 className="text-lg font-bold text-white mb-3">Key Insights</h2>
          <ul className="space-y-2 text-sm text-zinc-300">
            {cpa && (
              <li className="flex gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Average cost per purchase across all campaigns: <strong>{formatPHP(cpa)}</strong>
              </li>
            )}
            {lagData.best_r !== null && lagData.best_metric && (
              <li className="flex gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Purchases peak <strong>{lagData.best_lag} day{lagData.best_lag !== 1 ? 's' : ''}</strong> after ad metrics are recorded.
                Strongest predictor: {lagData.best_metric} (r = {lagData.best_r.toFixed(4)}).
              </li>
            )}
            {latestModel && (
              <li className="flex gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                The {isMLR ? 'MLR' : 'regression'} model explains <strong>{(latestModel.r_squared * 100).toFixed(1)}%</strong> of variance in purchases
                {isMLR && latestModel.residual_std_error != null
                  ? ` with ±${(latestModel.residual_std_error * 1.2816).toFixed(1)}-purchase 80% prediction interval.`
                  : '.'}
              </li>
            )}
            {allPosts.length > 0 && (
              <li className="flex gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Organic posts achieved an average engagement rate of <strong>{avgEngagement.toFixed(2)}%</strong> across {allPosts.length} posts.
              </li>
            )}
            {totalImpressions > 0 && totalLinkClicks > 0 && (
              <li className="flex gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Overall link click-through rate: <strong>{((totalLinkClicks / totalImpressions) * 100).toFixed(2)}%</strong>
              </li>
            )}
            {viewsForecast.forecast.length > 0 && (
              <li className="flex gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                7-day page views forecast baseline: <strong>{viewsForecast.lastLevel.toLocaleString()} views/day</strong> (Holt-Winters level).
              </li>
            )}
          </ul>
        </div>

        <div className="text-center text-xs text-slate-400 pt-4 pb-2">
          PC Merchandise DSS · Report generated {formatDate(generatedAt)} · Marketing Manager Dashboard
        </div>
      </div>
    </div>
  )
}
