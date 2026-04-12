import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import RegressionSummary from '@/components/analytics/RegressionSummary'
import UploadHistory from '@/components/upload/UploadHistory'

function KpiCard({
  label,
  value,
  valueClass = 'text-slate-900',
  icon,
}: {
  label: string
  value: React.ReactNode
  valueClass?: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">{label}</p>
        <span className="text-slate-300">{icon}</span>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${valueClass}`}>{value}</p>
    </div>
  )
}

export default async function MarketingDashboard() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    redirect('/login')
  }

  const displayName = session.user.email?.split('@')[0] ?? 'there'

  const [adCount, adsWithPurchases, latestModel, recentUploads, totalUploads] = await Promise.all([
    prisma.ad.count(),
    prisma.ad.count({ where: { purchases: { not: null } } }),
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.uploadLog.findMany({
      orderBy: { uploaded_at: 'desc' },
      take: 5,
      include: { user: { select: { email: true } } },
    }),
    prisma.uploadLog.count(),
  ])

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* Welcome */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Monitor uploads, data health, and model status</p>
        </div>
        <span className="text-sm text-slate-500 font-medium">
          Welcome back, <span className="text-slate-800 font-semibold">{displayName}</span>
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Ads"
          value={adCount}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <KpiCard
          label="With Purchases"
          value={adsWithPurchases}
          valueClass="text-red-600"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />
        <KpiCard
          label="Model Status"
          value={latestModel ? 'Trained' : 'Pending'}
          valueClass={latestModel ? 'text-emerald-600' : 'text-amber-600'}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        />
        <KpiCard
          label="Total Uploads"
          value={totalUploads}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          }
        />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/marketing/upload" className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-1.5 text-sm font-medium transition-colors">
            Upload Data
          </Link>
          <Link href="/dashboard/marketing/categorize" className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-4 py-1.5 text-sm font-medium transition-colors">
            Categorize Content
          </Link>
          <Link href="/dashboard/marketing/keywords" className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-4 py-1.5 text-sm font-medium transition-colors">
            Manage Keywords
          </Link>
        </div>
      </div>

      {/* Current model */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Current Model</p>
        <RegressionSummary model={latestModel} />
      </div>

      {/* Recent uploads */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Recent Uploads</p>
        <UploadHistory logs={recentUploads} />
      </div>

    </div>
  )
}
