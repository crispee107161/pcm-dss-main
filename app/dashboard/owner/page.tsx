import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import RegressionSummary from '@/components/analytics/RegressionSummary'
import FollowerSparkline from '@/components/analytics/FollowerSparkline'

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-PH').format(n)
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

const UPLOAD_TYPE_LABELS: Record<string, string> = {
  ADS_CSV:              'Ads Data',
  POSTS_CSV:            'Posts Data',
  PAGE_METRIC_CSV:      'Page Metrics',
  FOLLOWER_HISTORY_CSV: 'Follower History',
  PAGE_VIEWERS_CSV:     'Page Viewers',
  DEMOGRAPHICS_CSV:     'Demographics',
}

type Accent = 'red' | 'green' | 'amber' | 'slate'
const accentStyles: Record<Accent, string> = {
  red:   'bg-red-500/10 text-red-400',
  green: 'bg-green-500/10 text-green-400',
  amber: 'bg-yellow-500/10 text-yellow-400',
  slate: 'bg-gray-100 text-gray-400',
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null
  const up = delta >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold rounded-full px-2 py-0.5 border ml-1 ${
      up ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
    }`}>
      {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
    </span>
  )
}

function KpiCard({ label, value, sub, delta, valueClass = 'text-gray-900', icon, accent = 'slate' }: {
  label: string
  value: React.ReactNode
  sub?: string
  delta?: number | null
  valueClass?: string
  icon: React.ReactNode
  accent?: Accent
}) {
  return (
    <div className="bg-card rounded-2xl card-shadow p-5 flex flex-col gap-3"
      style={{ boxShadow: '0 1px 3px rgba(255,255,255,0.06), 0 4px 16px rgba(255,255,255,0.04)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">{label}</p>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accentStyles[accent]}`}>
          {icon}
        </span>
      </div>
      <div>
        <p className={`text-3xl font-bold tracking-tight tabular ${valueClass}`}>{value}</p>
        <div className="flex items-center mt-2 flex-wrap gap-1">
          {sub && (
            <span className="inline-block text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-0.5">
              {sub}
            </span>
          )}
          {delta !== undefined && <DeltaBadge delta={delta} />}
          {delta !== undefined && delta !== null && (
            <span className="text-[10px] text-gray-400">vs last wk</span>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] whitespace-nowrap border-l-2 border-red-300/60 pl-2">{children}</p>
      <div className="flex-1 h-px bg-gradient-to-r from-red-100/70 to-transparent" />
    </div>
  )
}

export default async function OwnerDashboard() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') redirect('/login')

  const displayName = session.user.email?.split('@')[0] ?? 'there'

  // Anchor date for week-over-week (relative to the most recent ad, not today)
  const latestAdDate = await prisma.ad.findFirst({
    select: { reporting_ends: true },
    orderBy: { reporting_ends: 'desc' },
  })
  const anchor = latestAdDate?.reporting_ends ?? new Date()
  const weekAgo = new Date(anchor.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(anchor.getTime() - 14 * 24 * 60 * 60 * 1000)

  const [
    adCount,
    adsWithPurchases,
    latestModel,
    totalSpendAgg,
    totalPurchasesAgg,
    totalReachAgg,
    latestFollower,
    topCampaign,
    lastUpload,
    follower7dRaw,
    thisWeekAgg,
    lastWeekAgg,
  ] = await Promise.all([
    prisma.ad.count(),
    prisma.ad.count({ where: { purchases: { gt: 0 } } }),
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.ad.aggregate({ _sum: { amount_spent: true } }),
    prisma.ad.aggregate({ _sum: { purchases: true } }),
    prisma.ad.aggregate({ _sum: { reach: true } }),
    prisma.followerHistory.findFirst({ orderBy: { date: 'desc' } }),
    prisma.ad.findFirst({
      where: { purchases: { gt: 0 }, amount_spent: { gt: 0 } },
      orderBy: [
        { cost_per_result: { sort: 'asc', nulls: 'last' } },
        { purchases: 'desc' },
      ],
    }),
    prisma.uploadLog.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { uploaded_at: 'desc' },
    }),
    prisma.followerHistory.findMany({
      orderBy: { date: 'desc' },
      take: 7,
    }),
    prisma.ad.aggregate({
      _sum: { amount_spent: true, purchases: true },
      where: { reporting_ends: { gte: weekAgo, lte: anchor } },
    }),
    prisma.ad.aggregate({
      _sum: { amount_spent: true, purchases: true },
      where: { reporting_ends: { gte: twoWeeksAgo, lt: weekAgo } },
    }),
  ])

  const totalSpend     = totalSpendAgg._sum.amount_spent ?? 0
  const totalPurchases = totalPurchasesAgg._sum.purchases ?? 0
  const totalReach     = totalReachAgg._sum.reach ?? 0

  // Week-over-week deltas
  const thisWeekSpend     = thisWeekAgg._sum.amount_spent ?? 0
  const thisWeekPurchases = thisWeekAgg._sum.purchases ?? 0
  const lastWeekSpend     = lastWeekAgg._sum.amount_spent ?? 0
  const lastWeekPurchases = lastWeekAgg._sum.purchases ?? 0
  const spendDelta        = calcDelta(thisWeekSpend, lastWeekSpend)
  const purchasesDelta    = calcDelta(thisWeekPurchases, lastWeekPurchases)

  // Follower sparkline data (ascending order for chart)
  const follower7d       = [...follower7dRaw].reverse()
  const followerNetChange7d = follower7dRaw.reduce((sum, f) => sum + f.daily_change, 0)
  const sparklineData    = follower7d.map(f => ({
    date: new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(f.date)),
    followers: f.followers,
  }))

  // Top campaign cost per purchase
  const topCampaignCpp = topCampaign && topCampaign.purchases && topCampaign.purchases > 0
    ? topCampaign.amount_spent / topCampaign.purchases
    : null

  return (
    <div className="p-5 md:p-10 max-w-7xl mx-auto space-y-5">

      {/* Welcome */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200/60">
        <div>
          <h1 className="text-xl font-extrabold font-heading text-gray-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Facebook marketing performance &amp; ROI overview</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-400">Welcome back</p>
          <p className="text-sm font-bold text-gray-800">{displayName}</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Ad Spend" value={formatPhp(totalSpend)} sub="all time"
          delta={spendDelta}
          valueClass="text-gray-900" accent="red"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <KpiCard
          label="Total Purchases" value={formatNumber(totalPurchases)} sub="from ads"
          delta={purchasesDelta}
          valueClass="text-red-600" accent="red"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
        />
        <KpiCard
          label="Total Reach" value={formatNumber(totalReach)} sub="people reached"
          accent="amber"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <KpiCard
          label="Campaigns" value={adCount} sub="total ads"
          accent="slate"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
      </div>

      {/* ROI summary */}
      {totalPurchases > 0 && (
        <div className="rounded-2xl p-6"
          style={{ background: 'linear-gradient(135deg, #1c0808 0%, #111111 60%, #0d0d0d 100%)', boxShadow: '0 4px 24px rgba(255,255,255,0.12)' }}>
          <div className="flex items-center justify-between mb-6">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.12em]">ROI Summary</p>
            <span className="text-xs text-gray-500 bg-white/5 rounded-full px-3 py-1 border border-white/8">All time</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/8">
            <div className="pb-5 md:pb-0 md:pr-6">
              <p className="text-[11px] text-gray-500 mb-2">Avg. Cost Per Purchase</p>
              <p className="text-3xl font-bold tracking-tight text-white">{formatPhp(totalSpend / totalPurchases)}</p>
            </div>
            <div className="py-5 md:py-0 md:px-6">
              <p className="text-[11px] text-gray-500 mb-2">Purchase Rate</p>
              <p className="text-3xl font-bold tracking-tight text-white">
                {totalReach > 0 ? ((totalPurchases / totalReach) * 100).toFixed(3) : '0'}%
              </p>
              <p className="text-[11px] text-gray-600 mt-1.5">of reached audience</p>
            </div>
            <div className="pt-5 md:pt-0 md:pl-6">
              <p className="text-[11px] text-gray-500 mb-2">Ads with Purchases</p>
              <p className="text-3xl font-bold tracking-tight text-red-400">{adsWithPurchases}</p>
              <p className="text-[11px] text-gray-600 mt-1.5">of {adCount} total ads</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick navigation + Follower sparkline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-card rounded-2xl card-shadow p-5"
          style={{ boxShadow: '0 1px 3px rgba(255,255,255,0.06), 0 4px 16px rgba(255,255,255,0.04)' }}>
          <SectionLabel>Quick Navigation</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/owner/campaign-rankings"
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-full px-4 py-1.5 text-sm font-semibold transition-colors">
              Campaign Rankings
            </Link>
            {[
              { label: 'Trend Analysis',        href: '/dashboard/owner/trend-analysis' },
              { label: 'Page Metrics',          href: '/dashboard/owner/page-metrics' },
              { label: 'Budget Simulator',      href: '/dashboard/owner/simulation' },
              { label: 'Category Performance',  href: '/dashboard/owner/category-performance' },
              { label: 'Generate Report',       href: '/dashboard/owner/report' },
            ].map(({ label, href }) => (
              <Link key={href} href={href}
                className="bg-card hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-red-200 hover:text-red-400 rounded-full px-4 py-1.5 text-sm font-medium transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>

        {latestFollower && (
          <div className="bg-card rounded-2xl card-shadow p-5"
            style={{ boxShadow: '0 1px 3px rgba(255,255,255,0.06), 0 4px 16px rgba(255,255,255,0.04)' }}>
            <FollowerSparkline
              data={sparklineData}
              currentCount={latestFollower.followers}
              netChange7d={followerNetChange7d}
              asOfDate={new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(latestFollower.date))}
            />
          </div>
        )}
      </div>

      {/* Top Campaign + Last Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {topCampaign && (
          <div className="bg-card rounded-2xl card-shadow p-5"
            style={{ boxShadow: '0 1px 3px rgba(255,255,255,0.06), 0 4px 16px rgba(255,255,255,0.04)' }}>
            <SectionLabel>Top Performing Campaign</SectionLabel>
            <div className="flex items-start justify-between gap-3 mb-4">
              <p className="text-sm font-bold text-gray-800 leading-snug line-clamp-2">
                {topCampaign.ad_name}
              </p>
              <span className="flex-shrink-0 text-[10px] font-semibold bg-green-500/10 border border-green-500/30 text-green-400 rounded-full px-2.5 py-0.5">
                Best ROI
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Purchases</p>
                <p className="text-xl font-bold text-gray-900">{formatNumber(topCampaign.purchases ?? 0)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Ad Spend</p>
                <p className="text-xl font-bold text-gray-900">{formatPhp(topCampaign.amount_spent)}</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Cost / Purchase</p>
                <p className="text-xl font-bold text-green-400">
                  {topCampaignCpp !== null ? formatPhp(topCampaignCpp) : '—'}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-3">
              {new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(topCampaign.reporting_starts))}
              {' – '}
              {new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(topCampaign.reporting_ends))}
            </p>
          </div>
        )}

        {lastUpload && (
          <div className="bg-card rounded-2xl card-shadow p-5"
            style={{ boxShadow: '0 1px 3px rgba(255,255,255,0.06), 0 4px 16px rgba(255,255,255,0.04)' }}>
            <SectionLabel>Last Data Upload</SectionLabel>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {UPLOAD_TYPE_LABELS[lastUpload.upload_type] ?? lastUpload.upload_type}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 font-mono truncate max-w-[200px]">
                  {lastUpload.filename}
                </p>
              </div>
              <span className="flex-shrink-0 text-[10px] font-semibold bg-green-500/10 border border-green-500/30 text-green-400 rounded-full px-2.5 py-0.5">
                Success
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">When</p>
                <p className="text-base font-bold text-gray-900">{timeAgo(lastUpload.uploaded_at)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Inserted</p>
                <p className="text-base font-bold text-gray-900">{formatNumber(lastUpload.records_inserted)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Updated</p>
                <p className="text-base font-bold text-gray-900">{formatNumber(lastUpload.records_updated)}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-3">
              {new Intl.DateTimeFormat('en-PH', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              }).format(new Date(lastUpload.uploaded_at))}
            </p>
          </div>
        )}
      </div>

      {/* Model summary */}
      <div className="bg-card rounded-2xl card-shadow p-5"
        style={{ boxShadow: '0 1px 3px rgba(255,255,255,0.06), 0 4px 16px rgba(255,255,255,0.04)' }}>
        <SectionLabel>Predictive Model Summary</SectionLabel>
        <RegressionSummary model={latestModel} />
      </div>

    </div>
  )
}
