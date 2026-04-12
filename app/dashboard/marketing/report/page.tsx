import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import { PrintButton } from '@/components/marketing/PrintButton'

function formatPHP(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value)
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date))
}

const TARGET_PERIODS = [
  { label: 'September 2025', year: 2025, month: 9 },
  { label: 'December 2025', year: 2025, month: 12 },
  { label: 'January 2026', year: 2026, month: 1 },
]

export default async function ReportPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    redirect('/login')
  }

  const [allAds, allPosts, latestModel, categories] = await Promise.all([
    prisma.ad.findMany({
      select: {
        reporting_starts: true,
        amount_spent: true,
        purchases: true,
        reach: true,
        impressions: true,
        link_clicks: true,
        category_id: true,
      },
    }),
    prisma.facebookPost.findMany({
      select: {
        publish_time: true,
        engagement_rate: true,
        reach: true,
        reactions: true,
        comments: true,
        shares: true,
        post_type: true,
        category_id: true,
      },
    }),
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.category.findMany(),
  ])

  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

  // Overall ad aggregates
  const totalSpend = allAds.reduce((s, a) => s + a.amount_spent, 0)
  const totalPurchases = allAds.reduce((s, a) => s + (a.purchases ?? 0), 0)
  const totalReach = allAds.reduce((s, a) => s + (a.reach ?? 0), 0)
  const totalImpressions = allAds.reduce((s, a) => s + a.impressions, 0)
  const totalLinkClicks = allAds.reduce((s, a) => s + (a.link_clicks ?? 0), 0)
  const adsWithPurchases = allAds.filter(a => a.purchases != null && a.purchases > 0)
  const cpa = adsWithPurchases.length > 0
    ? totalSpend / totalPurchases
    : null

  // Monthly breakdown
  const monthlyData = TARGET_PERIODS.map(({ label, year, month }) => {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    const ads = allAds.filter(a => {
      const d = new Date(a.reporting_starts)
      return d >= start && d <= end
    })
    return {
      period: label,
      spend: ads.reduce((s, a) => s + a.amount_spent, 0),
      purchases: ads.reduce((s, a) => s + (a.purchases ?? 0), 0),
      reach: ads.reduce((s, a) => s + (a.reach ?? 0), 0),
      ad_count: ads.length,
    }
  })

  // Post aggregates
  const avgEngagement = allPosts.length > 0
    ? allPosts.reduce((s, p) => s + p.engagement_rate, 0) / allPosts.length
    : 0
  const totalPostReach = allPosts.reduce((s, p) => s + p.reach, 0)

  // Category distribution for ads
  const adCatCounts: Record<string, number> = {}
  for (const ad of allAds) {
    const name = ad.category_id ? (catMap[ad.category_id] ?? 'Uncategorized') : 'Uncategorized'
    adCatCounts[name] = (adCatCounts[name] ?? 0) + 1
  }

  // Post category distribution
  const postCatCounts: Record<string, number> = {}
  for (const post of allPosts) {
    const name = post.category_id ? (catMap[post.category_id] ?? 'Uncategorized') : 'Uncategorized'
    postCatCounts[name] = (postCatCounts[name] ?? 0) + 1
  }

  const generatedAt = new Date()

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="print:hidden">
        <PageHeader
          title="Generate Report"
          description="Comprehensive marketing performance summary"
        />
      </div>

      {/* Print / export hint */}
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

        {/* Executive Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print-no-break">
          <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
            Executive Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Ad Spend', value: formatPHP(totalSpend), sub: '3-month period', color: 'text-red-700' },
              { label: 'Total Purchases', value: totalPurchases.toLocaleString(), sub: 'from ads', color: 'text-green-700' },
              { label: 'Total Ad Reach', value: totalReach.toLocaleString(), sub: 'unique people', color: 'text-purple-700' },
              { label: 'Cost per Purchase', value: cpa ? formatPHP(cpa) : '—', sub: 'avg CPA', color: 'text-amber-700' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print-no-break">
          <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
            Monthly Ad Performance
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {['Period', 'Ads Run', 'Total Spend', 'Purchases', 'Reach', 'ROAS (purchases / spend)'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyData.map(row => (
                <tr key={row.period} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.period}</td>
                  <td className="px-4 py-3 text-slate-600">{row.ad_count}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{formatPHP(row.spend)}</td>
                  <td className="px-4 py-3 text-green-700 font-semibold">{row.purchases}</td>
                  <td className="px-4 py-3 text-slate-600">{row.reach.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.spend > 0 ? (row.purchases / row.spend * 1000).toFixed(4) : '—'}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td className="px-4 py-3 text-slate-800">Total</td>
                <td className="px-4 py-3 text-slate-800">{allAds.length}</td>
                <td className="px-4 py-3 text-red-700">{formatPHP(totalSpend)}</td>
                <td className="px-4 py-3 text-green-700">{totalPurchases}</td>
                <td className="px-4 py-3 text-slate-800">{totalReach.toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-600">
                  {totalSpend > 0 ? (totalPurchases / totalSpend * 1000).toFixed(4) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Predictive Model */}
        {latestModel && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print-no-break">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Predictive Model (Simple Linear Regression)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-2">Regression Equation</p>
                <p className="font-mono text-base text-slate-800 bg-slate-50 rounded-lg px-4 py-3">
                  Purchases = {latestModel.intercept.toFixed(4)} + {latestModel.coefficient.toFixed(6)} × Amount Spent
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Interpretation: For every ₱1 increase in ad spend, approximately {(latestModel.coefficient * 1000).toFixed(3)} additional purchases are projected.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'R² (Explained Variance)', value: `${(latestModel.r_squared * 100).toFixed(2)}%` },
                  { label: 'Sample Size (n)', value: latestModel.n.toString() },
                  { label: 'Model Trained', value: formatDate(latestModel.trained_at) },
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

        {/* Organic Posts */}
        {allPosts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print-no-break">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Organic Post Performance
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Posts', value: allPosts.length.toLocaleString() },
                { label: 'Total Reach', value: totalPostReach.toLocaleString() },
                { label: 'Avg Engagement Rate', value: `${avgEngagement.toFixed(2)}%` },
                { label: 'Total Reactions', value: allPosts.reduce((s, p) => s + p.reactions, 0).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Category Mix */}
        {(Object.keys(adCatCounts).length > 0 || Object.keys(postCatCounts).length > 0) && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print-no-break">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Content Category Distribution
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-600 mb-3">Ads</h3>
                {Object.entries(adCatCounts).map(([cat, count]) => (
                  <div key={cat} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-sm text-slate-700">{cat}</span>
                    <span className="text-sm font-semibold text-slate-800">{count}</span>
                  </div>
                ))}
              </div>
              {allPosts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">Organic Posts</h3>
                  {Object.entries(postCatCounts).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-sm text-slate-700">{cat}</span>
                      <span className="text-sm font-semibold text-slate-800">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
            {latestModel && (
              <li className="flex gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                The regression model explains <strong>{(latestModel.r_squared * 100).toFixed(1)}%</strong> of variance in purchases.
                Consider adding non-spend predictors to improve accuracy.
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
                Overall link click-through rate: <strong>{((totalLinkClicks / totalImpressions) * 100).toFixed(2)}%</strong> ({totalLinkClicks.toLocaleString()} clicks / {totalImpressions.toLocaleString()} impressions)
              </li>
            )}
            {allAds.length === 0 && (
              <li className="flex gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                No ad data uploaded yet. Upload your Facebook Ads Manager CSVs to generate a complete report.
              </li>
            )}
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pt-4 pb-2">
          PC Merchandise DSS · Report generated {formatDate(generatedAt)} · Marketing Manager Dashboard
        </div>
      </div>
    </div>
  )
}
