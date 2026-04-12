import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'

function formatPHP(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

function formatDate(date: Date | null) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

function RankBadge({ rank }: { rank: number }) {
  const base = 'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold'
  if (rank === 1) return <span className={`${base} bg-amber-400 text-white`}>1</span>
  if (rank === 2) return <span className={`${base} bg-slate-300 text-slate-800`}>2</span>
  if (rank === 3) return <span className={`${base} bg-orange-300 text-white`}>3</span>
  return <span className={`${base} bg-slate-100 text-slate-500`}>{rank}</span>
}

interface RankRow {
  name: string
  adSetName: string
  value: number
  reportingStarts: Date | null
  reportingEnds: Date | null
}

function RankingTable({ rows, valueLabel, formatValue }: {
  rows: RankRow[]
  valueLabel: string
  formatValue: (v: number) => string
}) {
  if (rows.length === 0) {
    return <p className="text-slate-500 text-sm p-6">No data available. Upload an Ads CSV first.</p>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50">
          <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 w-10">#</th>
          <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Ad Name</th>
          <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Period</th>
          <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="hover:bg-slate-50 border-t border-slate-100">
            <td className="px-4 py-3"><RankBadge rank={i + 1} /></td>
            <td className="px-4 py-3">
              <div className="font-medium text-slate-800 text-sm max-w-xs truncate" title={row.name}>{row.name}</div>
              <div className="text-xs text-slate-400 truncate" title={row.adSetName}>{row.adSetName}</div>
            </td>
            <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
              {formatDate(row.reportingStarts)} – {formatDate(row.reportingEnds)}
            </td>
            <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatValue(row.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default async function OwnerCampaignRankingsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const [topSpend, topPurchases, topReach, totalAds, totalSpend] = await Promise.all([
    prisma.ad.findMany({
      orderBy: { amount_spent: 'desc' },
      take: 10,
      select: { ad_name: true, ad_set_name: true, amount_spent: true, reporting_starts: true, reporting_ends: true },
    }),
    prisma.ad.findMany({
      where: { purchases: { not: null } },
      orderBy: { purchases: 'desc' },
      take: 10,
      select: { ad_name: true, ad_set_name: true, purchases: true, reporting_starts: true, reporting_ends: true },
    }),
    prisma.ad.findMany({
      where: { reach: { not: null } },
      orderBy: { reach: 'desc' },
      take: 10,
      select: { ad_name: true, ad_set_name: true, reach: true, reporting_starts: true, reporting_ends: true },
    }),
    prisma.ad.count(),
    prisma.ad.aggregate({ _sum: { amount_spent: true } }),
  ])

  const bySpend: RankRow[] = topSpend.map(a => ({
    name: a.ad_name, adSetName: a.ad_set_name, value: a.amount_spent,
    reportingStarts: a.reporting_starts, reportingEnds: a.reporting_ends,
  }))
  const byPurchases: RankRow[] = topPurchases.map(a => ({
    name: a.ad_name, adSetName: a.ad_set_name, value: a.purchases ?? 0,
    reportingStarts: a.reporting_starts, reportingEnds: a.reporting_ends,
  }))
  const byReach: RankRow[] = topReach.map(a => ({
    name: a.ad_name, adSetName: a.ad_set_name, value: a.reach ?? 0,
    reportingStarts: a.reporting_starts, reportingEnds: a.reporting_ends,
  }))

  const totalSpendValue = totalSpend._sum.amount_spent ?? 0

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader title="Campaign Rankings" description="Top 10 ads ranked by spend, purchases, and reach" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Ads Tracked</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalAds}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Ad Spend</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{formatPHP(totalSpendValue)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 col-span-2 md:col-span-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Ads with Purchases</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{topPurchases.length > 0 ? `${topPurchases.length}+` : '0'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="text-lg">💸</span>
            <h2 className="font-semibold text-slate-800">Top by Spend</h2>
          </div>
          <RankingTable rows={bySpend} valueLabel="Amount Spent" formatValue={v => formatPHP(v)} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="text-lg">🛒</span>
            <h2 className="font-semibold text-slate-800">Top by Purchases</h2>
          </div>
          <RankingTable rows={byPurchases} valueLabel="Purchases" formatValue={v => v.toLocaleString()} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="text-lg">📡</span>
            <h2 className="font-semibold text-slate-800">Top by Reach</h2>
          </div>
          <RankingTable rows={byReach} valueLabel="Reach" formatValue={v => v.toLocaleString()} />
        </div>
      </div>
    </div>
  )
}
