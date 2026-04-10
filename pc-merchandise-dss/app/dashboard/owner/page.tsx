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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
        {icon}
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
    <div className="p-8 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {displayName}!</h1>
        <p className="text-slate-500 text-sm mt-1">High-level overview of Facebook marketing performance and ROI</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Total Ad Spend"
          value={formatPhp(totalSpend)}
          sub="all time"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Total Purchases"
          value={formatNumber(totalPurchases)}
          sub="attributed to ads"
          valueClass="text-red-700"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />
        <KpiCard
          label="Total Reach"
          value={formatNumber(totalReach)}
          sub="people reached"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Campaigns Tracked"
          value={adCount}
          sub="total ads"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* ROI summary */}
      {totalPurchases > 0 && (
        <div className="bg-zinc-950 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">ROI Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-zinc-400 text-sm">Average Cost Per Purchase</p>
              <p className="text-3xl font-bold text-white mt-1">{formatPhp(totalSpend / totalPurchases)}</p>
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Purchase Rate</p>
              <p className="text-3xl font-bold text-white mt-1">
                {totalReach > 0 ? ((totalPurchases / totalReach) * 100).toFixed(3) : '0'}%
              </p>
              <p className="text-xs text-zinc-500 mt-1">of reached audience</p>
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Ads with Purchases</p>
              <p className="text-3xl font-bold text-green-400 mt-1">{adsWithPurchases}</p>
              <p className="text-xs text-zinc-500 mt-1">of {adCount} total ads</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/owner/campaign-rankings" className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            Campaign Rankings
          </Link>
          <Link href="/dashboard/owner/trend-analysis" className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            Trend Analysis
          </Link>
          <Link href="/dashboard/owner/page-metrics" className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            Page Metrics
          </Link>
          <Link href="/dashboard/owner/simulation" className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            Budget Simulator
          </Link>
          <Link href="/dashboard/owner/report" className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            Generate Report
          </Link>
        </div>
      </div>

      {/* Follower snapshot */}
      {latestFollower && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Page Follower Snapshot</h2>
          <p className="text-4xl font-bold text-red-700">{formatNumber(latestFollower.followers)}</p>
          <p className="text-slate-400 text-xs mt-1">
            followers as of {new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(latestFollower.date))}
            {latestFollower.daily_change !== 0 && (
              <span className={`ml-2 font-medium ${latestFollower.daily_change > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {latestFollower.daily_change > 0 ? '+' : ''}{latestFollower.daily_change} that day
              </span>
            )}
          </p>
        </div>
      )}

      {/* Model summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Predictive Model Summary</h2>
        <RegressionSummary model={latestModel} />
      </div>
    </div>
  )
}
