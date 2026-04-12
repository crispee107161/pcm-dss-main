import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import RegressionSummary from '@/components/analytics/RegressionSummary'

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-PH').format(n)
}

function KpiCard({
  label,
  value,
  sub,
  valueClass = 'text-slate-900',
  icon,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  valueClass?: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">{label}</p>
        <span className="text-slate-300">{icon}</span>
      </div>
      <div>
        <p className={`text-2xl font-bold tracking-tight ${valueClass}`}>{value}</p>
        {sub && (
          <span className="inline-block mt-2 text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-0.5">
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}

export default async function OwnerDashboard() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const displayName = session.user.email?.split('@')[0] ?? 'there'

  const [adCount, adsWithPurchases, latestModel, totalSpendAgg, totalPurchasesAgg, totalReachAgg, latestFollower] =
    await Promise.all([
      prisma.ad.count(),
      prisma.ad.count({ where: { purchases: { gt: 0 } } }),
      prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
      prisma.ad.aggregate({ _sum: { amount_spent: true } }),
      prisma.ad.aggregate({ _sum: { purchases: true } }),
      prisma.ad.aggregate({ _sum: { reach: true } }),
      prisma.followerHistory.findFirst({ orderBy: { date: 'desc' } }),
    ])

  const totalSpend = totalSpendAgg._sum.amount_spent ?? 0
  const totalPurchases = totalPurchasesAgg._sum.purchases ?? 0
  const totalReach = totalReachAgg._sum.reach ?? 0

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">

      {/* Welcome */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Facebook marketing performance &amp; ROI overview</p>
        </div>
        <span className="text-sm text-slate-500 font-medium">
          Welcome back, <span className="text-slate-800 font-semibold">{displayName}</span>
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Ad Spend"
          value={formatPhp(totalSpend)}
          sub="all time"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Total Purchases"
          value={formatNumber(totalPurchases)}
          sub="attributed to ads"
          valueClass="text-red-600"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />
        <KpiCard
          label="Total Reach"
          value={formatNumber(totalReach)}
          sub="people reached"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Campaigns Tracked"
          value={adCount}
          sub="total ads"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* ROI summary */}
      {totalPurchases > 0 && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">ROI Summary</p>
            <span className="text-xs text-slate-500 bg-slate-700/50 rounded-full px-3 py-1 border border-slate-700">All time</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700/60 gap-0">
            <div className="pb-5 md:pb-0 md:pr-6">
              <p className="text-xs text-slate-500 mb-2">Avg. Cost Per Purchase</p>
              <p className="text-3xl font-bold tracking-tight text-white">{formatPhp(totalSpend / totalPurchases)}</p>
            </div>
            <div className="py-5 md:py-0 md:px-6">
              <p className="text-xs text-slate-500 mb-2">Purchase Rate</p>
              <p className="text-3xl font-bold tracking-tight text-white">
                {totalReach > 0 ? ((totalPurchases / totalReach) * 100).toFixed(3) : '0'}%
              </p>
              <p className="text-xs text-slate-600 mt-1.5">of reached audience</p>
            </div>
            <div className="pt-5 md:pt-0 md:pl-6">
              <p className="text-xs text-slate-500 mb-2">Ads with Purchases</p>
              <p className="text-3xl font-bold tracking-tight text-red-400">{adsWithPurchases}</p>
              <p className="text-xs text-slate-600 mt-1.5">of {adCount} total ads</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick navigation + Follower snapshot side by side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Quick navigation — spans 2 cols */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Quick Navigation</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/owner/campaign-rankings"
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            >
              Campaign Rankings
            </Link>
            <Link
              href="/dashboard/owner/trend-analysis"
              className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            >
              Trend Analysis
            </Link>
            <Link
              href="/dashboard/owner/page-metrics"
              className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            >
              Page Metrics
            </Link>
            <Link
              href="/dashboard/owner/simulation"
              className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            >
              Budget Simulator
            </Link>
            <Link
              href="/dashboard/owner/report"
              className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            >
              Generate Report
            </Link>
          </div>
        </div>

        {/* Follower snapshot — spans 1 col */}
        {latestFollower && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col justify-between">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Page Followers</p>
            <div>
              <p className="text-3xl font-bold tracking-tight text-red-600 mt-3">
                {formatNumber(latestFollower.followers)}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-0.5">
                  as of {new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(latestFollower.date))}
                </span>
                {latestFollower.daily_change !== 0 && (
                  <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${
                    latestFollower.daily_change > 0
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-red-50 text-red-500 border border-red-100'
                  }`}>
                    {latestFollower.daily_change > 0 ? '+' : ''}{latestFollower.daily_change}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Model summary */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Predictive Model Summary</p>
        <RegressionSummary model={latestModel} />
      </div>

    </div>
  )
}