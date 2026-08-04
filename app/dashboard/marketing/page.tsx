import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getGreeting } from '@/lib/greeting'
import Link from 'next/link'
import RegressionSummary from '@/components/analytics/RegressionSummary'
import { computeRegressionInsight } from '@/lib/insights/regression-insight'
import UploadHistory from '@/components/upload/UploadHistory'

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

const STRONG_ENGAGEMENT_PCT = 5
const AVERAGE_ENGAGEMENT_PCT = 2

type Accent = 'red' | 'green' | 'amber' | 'slate'
const accentStyles: Record<Accent, string> = {
  red:   'bg-red-500/10 text-red-400',
  green: 'bg-green-500/10 text-green-400',
  amber: 'bg-yellow-500/10 text-yellow-400',
  slate: 'bg-gray-100 text-gray-400',
}

function KpiCard({ label, value, sub, valueClass = 'text-gray-900', icon, accent = 'slate', sensitive = true }: {
  label: string
  value: React.ReactNode
  sub?: string
  valueClass?: string
  icon: React.ReactNode
  accent?: Accent
  sensitive?: boolean
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
        <p className={`text-kpi-value font-medium tracking-tight tabular ${sensitive ? 'sensitive' : ''} ${valueClass}`}>{value}</p>
        {sub && (
          <span className="inline-block mt-2 text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-0.5">
            {sub}
          </span>
        )}
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

export default async function MarketingDashboard() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') redirect('/login')

  const displayName = session.user.email?.split('@')[0] ?? 'there'

  const [
    adCount,
    adsWithInquiries,
    latestModel,
    recentUploads,
    totalUploads,
    postStats,
    adCoverage,
    categories,
    adHistory,
  ] = await Promise.all([
    prisma.ad.count(),
    prisma.ad.count({ where: { inquiries: { gt: 0 } } }),
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.uploadLog.findMany({
      orderBy: { uploaded_at: 'desc' },
      take: 5,
      include: { user: { select: { email: true } } },
    }),
    prisma.uploadLog.count(),
    prisma.facebookPost.aggregate({
      _avg: { engagement_rate: true },
      _count: { _all: true },
    }),
    prisma.ad.aggregate({
      _min: { reporting_starts: true },
      _max: { reporting_ends: true },
      _count: { _all: true },
    }),
    prisma.category.findMany({
      include: { ads: { select: { inquiries: true, amount_spent: true } } },
    }),
    prisma.ad.findMany({
      where: { inquiries: { not: null } },
      select: { reach: true, total_messaging_contacts: true, amount_spent: true },
    }),
  ])

  const regressionInsight = latestModel
    ? computeRegressionInsight(
        latestModel,
        adHistory.map(a => ({ reach: a.reach ?? 0, messaging: a.total_messaging_contacts ?? 0, amount_spent: a.amount_spent })),
      )
    : null

  const avgEngagement = postStats._avg.engagement_rate
  const postCount     = postStats._count._all
  const coverageMin   = adCoverage._min.reporting_starts
  const coverageMax   = adCoverage._max.reporting_ends

  const categoriesWithStats = categories
    .map(cat => ({
      name: cat.name,
      totalInquiries: cat.ads.reduce((s, a) => s + (a.inquiries ?? 0), 0),
      totalSpend: cat.ads.reduce((s, a) => s + a.amount_spent, 0),
      adCount: cat.ads.length,
    }))
    .filter(c => c.totalInquiries > 0)
    .sort((a, b) => b.totalInquiries - a.totalInquiries)

  const topCategory = categoriesWithStats[0] ?? null

  return (
    <div className="p-5 md:p-10 max-w-7xl mx-auto space-y-4">

      {/* Welcome */}
      <div className="pb-4 border-b border-gray-200/60">
        <h1 className="text-xl font-extrabold font-heading text-gray-900 tracking-tight">{getGreeting()}, {displayName}</h1>
        <p className="text-gray-400 text-sm mt-0.5">Monitor uploads, data health, and model status</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total Ads" value={adCount} accent="slate"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
        <KpiCard
          label="With Inquiries" value={adsWithInquiries} valueClass="text-green-600 dark:text-green-400" accent="green"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
        />
        <KpiCard
          label="Model Status"
          value={latestModel ? 'Trained' : 'Pending'}
          valueClass={latestModel ? 'text-green-400' : 'text-yellow-400'}
          accent={latestModel ? 'green' : 'amber'}
          sensitive={false}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
        />
        <KpiCard
          label="Avg Engagement"
          value={avgEngagement !== null ? `${avgEngagement.toFixed(2)}%` : '—'}
          sub={postCount > 0 ? `across ${postCount} posts` : undefined}
          valueClass="text-yellow-400"
          accent="amber"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
        />
      </div>

      {/* Data coverage strip */}
      {coverageMin && coverageMax && (
        <div className="bg-card rounded-2xl card-shadow px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2"
          style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">
            Data Coverage
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">{formatDate(coverageMin)}</span>
            <span className="text-gray-300">→</span>
            <span className="text-xs font-semibold text-gray-700">{formatDate(coverageMax)}</span>
          </div>
          <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-0.5">
            {adCoverage._count._all} ad records
          </span>
          <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-0.5">
            {totalUploads} total uploads
          </span>
        </div>
      )}

      {/* Top Category + Post Engagement */}
      {(topCategory || postCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {topCategory && (
            <div className="bg-card rounded-2xl card-shadow p-5"
              style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
              <SectionLabel>Top Category by Inquiries</SectionLabel>
              <div className="flex items-start justify-between gap-3 mb-4">
                <p className="text-sm font-bold text-gray-800">{topCategory.name}</p>
                <span className="flex-shrink-0 text-[10px] font-semibold bg-green-500/10 border border-green-500/30 text-green-400 rounded-full px-2.5 py-0.5">
                  Top Performer
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Inquiries</p>
                  <p className="sensitive text-xl font-bold text-gray-900">{topCategory.totalInquiries.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Ad Spend</p>
                  <p className="sensitive text-xl font-bold text-gray-900">{formatPhp(topCategory.totalSpend)}</p>
                </div>
                <div className="bg-green-500/10 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Ads</p>
                  <p className="sensitive text-xl font-bold text-green-400">{topCategory.adCount}</p>
                </div>
              </div>
              {categoriesWithStats.length > 1 && (
                <div className="space-y-1.5">
                  {categoriesWithStats.slice(0, 4).map((c, i) => {
                    const pct = topCategory.totalInquiries > 0
                      ? (c.totalInquiries / topCategory.totalInquiries) * 100
                      : 0
                    return (
                      <div key={c.name} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 w-3">{i + 1}</span>
                        <span className="text-[11px] text-gray-600 w-24 truncate">{c.name}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="sensitive text-[10px] text-gray-400 w-8 text-right">{c.totalInquiries}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {postCount > 0 && avgEngagement !== null && (
            <div className="bg-card rounded-2xl card-shadow p-5"
              style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
              <SectionLabel>Post Engagement Summary</SectionLabel>
              <div className="flex items-end gap-3 mb-4">
                <p className="sensitive text-4xl font-bold tracking-tight text-yellow-400">
                  {avgEngagement.toFixed(2)}%
                </p>
                <span className="text-[11px] text-gray-400 mb-1">avg engagement rate</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Posts</p>
                  <p className="sensitive text-xl font-bold text-gray-900">{postCount.toLocaleString()}</p>
                </div>
                <div className="bg-yellow-500/10 rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Quality</p>
                  <p className={`text-xl font-bold ${
                    avgEngagement >= STRONG_ENGAGEMENT_PCT ? 'text-green-400'
                    : avgEngagement >= AVERAGE_ENGAGEMENT_PCT ? 'text-yellow-400'
                    : 'text-red-400'
                  }`}>
                    {avgEngagement >= STRONG_ENGAGEMENT_PCT ? 'Strong' : avgEngagement >= AVERAGE_ENGAGEMENT_PCT ? 'Average' : 'Low'}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-3">
                Engagement rate = (reactions + comments + shares) / reach × 100. Strong ≥ {STRONG_ENGAGEMENT_PCT}%, Average {AVERAGE_ENGAGEMENT_PCT}–{STRONG_ENGAGEMENT_PCT}%, Low &lt; {AVERAGE_ENGAGEMENT_PCT}%.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="bg-card rounded-2xl card-shadow p-5"
        style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/marketing/upload"
            className="bg-primary hover:bg-primary/90 active:bg-primary/80 text-white rounded-full px-4 py-1.5 text-sm font-semibold transition-colors">
            Upload Data
          </Link>
          {[
            { label: 'Categorize Content', href: '/dashboard/marketing/categorize' },
            { label: 'Manage Keywords',    href: '/dashboard/marketing/keywords' },
          ].map(({ label, href }) => (
            <Link key={href} href={href}
              className="bg-card hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-red-200 hover:text-red-400 rounded-full px-4 py-1.5 text-sm font-medium transition-colors">
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Current model */}
      <div className="bg-card rounded-2xl card-shadow p-5"
        style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
        <SectionLabel>Current Model</SectionLabel>
        <RegressionSummary model={latestModel} insight={regressionInsight} />
      </div>

      {/* Recent uploads */}
      <div className="bg-card rounded-2xl card-shadow p-5"
        style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
        <SectionLabel>Recent Uploads</SectionLabel>
        <UploadHistory logs={recentUploads} />
      </div>

    </div>
  )
}
