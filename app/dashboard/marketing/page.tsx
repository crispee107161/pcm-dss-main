import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import RegressionSummary from '@/components/analytics/RegressionSummary'
import UploadHistory from '@/components/upload/UploadHistory'

type Accent = 'red' | 'green' | 'amber' | 'slate'

const accentStyles: Record<Accent, string> = {
  red:   'bg-red-50 text-red-500',
  green: 'bg-emerald-50 text-emerald-500',
  amber: 'bg-amber-50 text-amber-500',
  slate: 'bg-slate-100 text-slate-400',
}

function KpiCard({ label, value, valueClass = 'text-slate-900', icon, accent = 'slate' }: {
  label: string; value: React.ReactNode; valueClass?: string; icon: React.ReactNode; accent?: Accent
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 flex flex-col gap-3"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em]">{label}</p>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accentStyles[accent]}`}>
          {icon}
        </span>
      </div>
      <p className={`text-3xl font-bold tracking-tight tabular ${valueClass}`}>{value}</p>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em] whitespace-nowrap border-l-2 border-red-300/60 pl-2">{children}</p>
      <div className="flex-1 h-px bg-gradient-to-r from-red-100/70 to-transparent" />
    </div>
  )
}

export default async function MarketingDashboard() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') redirect('/login')

  const displayName = session.user.email?.split('@')[0] ?? 'there'

  const [adCount, adsWithPurchases, latestModel, recentUploads, totalUploads] = await Promise.all([
    prisma.ad.count(),
    prisma.ad.count({ where: { purchases: { gt: 0 } } }),
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.uploadLog.findMany({
      orderBy: { uploaded_at: 'desc' },
      take: 5,
      include: { user: { select: { email: true } } },
    }),
    prisma.uploadLog.count(),
  ])

  return (
    <div className="p-5 md:p-10 max-w-7xl mx-auto space-y-5">

      {/* Welcome */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-extrabold font-heading text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Monitor uploads, data health, and model status</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-400">Welcome back</p>
          <p className="text-sm font-bold text-slate-800">{displayName}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Ads"
          value={adCount}
          accent="slate"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
        <KpiCard
          label="With Purchases"
          value={adsWithPurchases}
          valueClass="text-red-600"
          accent="red"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
        />
        <KpiCard
          label="Model Status"
          value={latestModel ? 'Trained' : 'Pending'}
          valueClass={latestModel ? 'text-emerald-600' : 'text-amber-600'}
          accent={latestModel ? 'green' : 'amber'}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
        />
        <KpiCard
          label="Total Uploads"
          value={totalUploads}
          accent="slate"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
        />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}>
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/marketing/upload"
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-full px-4 py-1.5 text-sm font-semibold transition-colors">
            Upload Data
          </Link>
          {[
            { label: 'Categorize Content', href: '/dashboard/marketing/categorize' },
            { label: 'Manage Keywords',    href: '/dashboard/marketing/keywords' },
          ].map(({ label, href }) => (
            <Link key={href} href={href}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-red-200 hover:text-red-700 rounded-full px-4 py-1.5 text-sm font-medium transition-colors">
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Current model */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}>
        <SectionLabel>Current Model</SectionLabel>
        <RegressionSummary model={latestModel} />
      </div>

      {/* Recent uploads */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}>
        <SectionLabel>Recent Uploads</SectionLabel>
        <UploadHistory logs={recentUploads} />
      </div>

    </div>
  )
}
