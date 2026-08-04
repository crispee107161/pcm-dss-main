import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getGreeting } from '@/lib/greeting'
import RegressionSummary from '@/components/analytics/RegressionSummary'
import { computeRegressionInsight } from '@/lib/insights/regression-insight'
import FollowerSparkline from '@/components/analytics/FollowerSparkline'
import { SpendInquiriesChart } from '@/components/marketing/TrendCharts'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

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
    <span className={`sensitive inline-flex items-center gap-0.5 text-[10px] font-bold rounded-full px-2 py-0.5 border ml-1 ${
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
      style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">{label}</p>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accentStyles[accent]}`}>
          {icon}
        </span>
      </div>
      <div>
        <p className={`sensitive text-kpi-value font-medium tracking-tight tabular ${valueClass}`}>{value}</p>
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
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] whitespace-nowrap">{children}</p>
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
    adsWithInquiries,
    latestModel,
    totalSpendAgg,
    totalInquiriesAgg,
    totalReachAgg,
    latestFollower,
    topCampaigns,
    lastUpload,
    follower7dRaw,
    thisWeekAgg,
    lastWeekAgg,
    adHistory,
  ] = await Promise.all([
    prisma.ad.count(),
    prisma.ad.count({ where: { inquiries: { gt: 0 } } }),
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.ad.aggregate({ _sum: { amount_spent: true } }),
    prisma.ad.aggregate({ _sum: { inquiries: true } }),
    prisma.ad.aggregate({ _sum: { reach: true } }),
    prisma.followerHistory.findFirst({ orderBy: { date: 'desc' } }),
    // Ranked in JS below by computed cost-per-inquiry (amount_spent / inquiries) —
    // `cost_per_result` is a different Facebook metric (cost per generic "result",
    // not per inquiry) and would rank differently than the CPI this table displays.
    prisma.ad.findMany({
      where: { inquiries: { gt: 0 }, amount_spent: { gt: 0 } },
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
      _sum: { amount_spent: true, inquiries: true },
      where: { reporting_ends: { gte: weekAgo, lte: anchor } },
    }),
    prisma.ad.aggregate({
      _sum: { amount_spent: true, inquiries: true },
      where: { reporting_ends: { gte: twoWeeksAgo, lt: weekAgo } },
    }),
    prisma.ad.findMany({
      select: { reach: true, total_messaging_contacts: true, amount_spent: true, reporting_starts: true, inquiries: true },
      orderBy: { reporting_starts: 'desc' },
    }),
  ])

  const regressionInsight = latestModel
    ? computeRegressionInsight(
        latestModel,
        adHistory.map(a => ({ reach: a.reach ?? 0, messaging: a.total_messaging_contacts ?? 0, amount_spent: a.amount_spent })),
      )
    : null

  const totalSpend     = totalSpendAgg._sum.amount_spent ?? 0
  const totalInquiries = totalInquiriesAgg._sum.inquiries ?? 0
  const totalReach     = totalReachAgg._sum.reach ?? 0

  // Week-over-week deltas
  const thisWeekSpend     = thisWeekAgg._sum.amount_spent ?? 0
  const thisWeekInquiries = thisWeekAgg._sum.inquiries ?? 0
  const lastWeekSpend     = lastWeekAgg._sum.amount_spent ?? 0
  const lastWeekInquiries = lastWeekAgg._sum.inquiries ?? 0
  const spendDelta        = calcDelta(thisWeekSpend, lastWeekSpend)
  const inquiriesDelta    = calcDelta(thisWeekInquiries, lastWeekInquiries)

  // Follower sparkline data (ascending order for chart)
  const follower7d       = [...follower7dRaw].reverse()
  const followerNetChange7d = follower7dRaw.reduce((sum, f) => sum + f.daily_change, 0)
  const sparklineData    = follower7d.map(f => ({
    date: new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(f.date)),
    followers: f.followers,
  }))

  // Rank by computed cost-per-inquiry (query guarantees inquiries > 0 and
  // amount_spent > 0, so cpi is always a positive finite number here) and
  // take the 5 most efficient — the bar for each row is relative to the best.
  const topCampaignsWithCpi = topCampaigns
    .map(ad => ({ ...ad, cpi: ad.amount_spent / ad.inquiries! }))
    .sort((a, b) => a.cpi - b.cpi)
    .slice(0, 5)
  const bestCpi = topCampaignsWithCpi[0]?.cpi ?? null

  // Monthly spend/inquiries trend (last 3 distinct months present in the ad data).
  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`
  const seenMonths = new Set<string>()
  const targetMonths: { label: string; year: number; month: number }[] = []
  for (const { reporting_starts } of adHistory) {
    const d = new Date(reporting_starts)
    const key = monthKey(d)
    if (!seenMonths.has(key)) {
      seenMonths.add(key)
      targetMonths.push({
        label: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(d),
        year: d.getFullYear(),
        month: d.getMonth() + 1,
      })
      if (targetMonths.length === 3) break
    }
  }
  targetMonths.reverse()

  const monthlyTrend = targetMonths.map(({ label, year, month }) => {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    const monthAds = adHistory.filter(a => {
      const d = new Date(a.reporting_starts)
      return d >= start && d <= end
    })
    return {
      period: label,
      total_spend: monthAds.reduce((s, a) => s + a.amount_spent, 0),
      total_inquiries: monthAds.reduce((s, a) => s + (a.inquiries ?? 0), 0),
      total_reach: monthAds.reduce((s, a) => s + (a.reach ?? 0), 0),
      ad_count: monthAds.length,
    }
  })

  return (
    <div className="p-5 md:p-10 max-w-7xl mx-auto space-y-4">

      {/* Welcome */}
      <div className="pb-4 border-b border-gray-200/60">
        <h1 className="text-xl font-extrabold font-heading text-gray-900 tracking-tight">{getGreeting()}, {displayName}</h1>
        <p className="text-gray-400 text-sm mt-0.5">Facebook content performance & advertising efficiency overview</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total Ad Spend" value={formatPhp(totalSpend)} sub="all time"
          delta={spendDelta}
          valueClass="text-gray-900" accent="red"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <KpiCard
          label="Total Inquiries" value={formatNumber(totalInquiries)} sub="from ads"
          delta={inquiriesDelta}
          valueClass="text-green-600 dark:text-green-400" accent="green"
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

      {/* Efficiency summary */}
      {totalInquiries > 0 && (
        <div className="rounded-2xl p-6 bg-card card-shadow">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.12em]">Efficiency Summary</p>
            <span className="text-xs text-gray-500 bg-secondary rounded-full px-3 py-1 border border-gray-100">All time</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="pb-5 md:pb-0 md:pr-6">
              <p className="text-[11px] text-gray-500 mb-2">Avg. Cost Per Inquiry</p>
              <p className="sensitive text-3xl font-bold tracking-tight text-foreground">{formatPhp(totalSpend / totalInquiries)}</p>
            </div>
            <div className="py-5 md:py-0 md:px-6">
              <p className="text-[11px] text-gray-500 mb-2">Inquiry Rate</p>
              <p className="sensitive text-3xl font-bold tracking-tight text-foreground">
                {totalReach > 0 && totalInquiries > 0 ? `1 / ${Math.round(totalReach / totalInquiries).toLocaleString()}` : '—'}
              </p>
              <p className="text-[11px] text-gray-600 mt-1.5">people reached per inquiry</p>
            </div>
            <div className="pt-5 md:pt-0 md:pl-6">
              <p className="text-[11px] text-gray-500 mb-2">Ads with Inquiries</p>
              <p className="sensitive text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">{adsWithInquiries}</p>
              <p className="text-[11px] text-gray-600 mt-1.5">of {adCount} total ads</p>
            </div>
          </div>
        </div>
      )}

      {/* Spend & Inquiries trend + Follower sparkline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 bg-card rounded-2xl card-shadow p-5 flex flex-col"
          style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
          <SectionLabel>Spend &amp; Inquiries Trend</SectionLabel>
          {monthlyTrend.length > 0 ? (
            <SpendInquiriesChart data={monthlyTrend} />
          ) : (
            <p className="text-sm text-gray-400 py-10 text-center">Not enough monthly data yet.</p>
          )}
        </div>

        {latestFollower && (
          <div className="bg-card rounded-2xl card-shadow p-5"
            style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
            <FollowerSparkline
              data={sparklineData}
              currentCount={latestFollower.followers}
              netChange7d={followerNetChange7d}
              asOfDate={new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(latestFollower.date))}
            />
          </div>
        )}
      </div>

      {/* Top Campaigns + Last Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {topCampaignsWithCpi.length > 0 && (
          <div className="bg-card rounded-2xl card-shadow overflow-hidden"
            style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
            <div className="p-5 pb-0">
              <SectionLabel>Top Campaigns</SectionLabel>
            </div>
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="text-left px-5 py-2 w-8">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">#</span>
                  </TableHead>
                  <TableHead className="text-left px-3 py-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Campaign</span>
                  </TableHead>
                  <TableHead className="text-right px-3 py-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Spend</span>
                  </TableHead>
                  <TableHead className="text-right px-5 py-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Cost / Inquiry</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCampaignsWithCpi.map((ad, i) => (
                  <TableRow key={ad.id} className="border-t border-gray-100 hover:bg-secondary/50">
                    <TableCell className="px-5 py-3 text-gray-400 text-xs">{i + 1}</TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="font-semibold text-gray-800 text-sm max-w-[160px] truncate" title={ad.ad_name}>
                        {ad.ad_name}
                      </div>
                      <div className="text-xs text-gray-400 truncate max-w-[160px]">{ad.ad_set_name}</div>
                    </TableCell>
                    <TableCell className="sensitive px-3 py-3 text-right font-semibold text-gray-700 tabular">
                      {formatPhp(ad.amount_spent)}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-crimson-500"
                            style={{ width: `${bestCpi !== null ? Math.min(100, (bestCpi / ad.cpi) * 100) : 100}%` }}
                          />
                        </div>
                        <span className="sensitive font-semibold text-gray-700 tabular text-xs">{formatPhp(ad.cpi)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {lastUpload && (
          <div className="bg-card rounded-2xl card-shadow p-5"
            style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">When</p>
                <p className="text-base font-bold text-gray-900">{timeAgo(lastUpload.uploaded_at)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Added</p>
                <p className="sensitive text-base font-bold text-gray-900">{formatNumber(lastUpload.records_inserted)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Changed</p>
                <p className="sensitive text-base font-bold text-gray-900">{formatNumber(lastUpload.records_updated)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Unchanged</p>
                <p className="sensitive text-base font-bold text-gray-900">{formatNumber(lastUpload.records_unchanged)}</p>
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
        style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
        <SectionLabel>Predictive Model Summary</SectionLabel>
        <RegressionSummary model={latestModel} insight={regressionInsight} />
      </div>

    </div>
  )
}
