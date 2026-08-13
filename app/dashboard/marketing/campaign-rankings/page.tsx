import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'

function formatPHP(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

function formatDate(date: Date | null) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

function RankBadge({ rank }: { rank: number }) {
  const base = 'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold'
  if (rank === 1) return <span className={`${base} bg-yellow-400 text-white`}>1</span>
  if (rank === 2) return <span className={`${base} bg-gray-300 text-gray-800`}>2</span>
  if (rank === 3) return <span className={`${base} bg-orange-600 text-white`}>3</span>
  return <span className={`${base} bg-gray-100 text-gray-500`}>{rank}</span>
}

interface RankRow {
  name: string
  adSetName: string
  value: number
  reportingStarts: Date | null
  reportingEnds: Date | null
}

function RankingTable({
  rows,
  valueLabel,
  formatValue,
}: {
  rows: RankRow[]
  valueLabel: string
  formatValue: (v: number) => string
}) {
  if (rows.length === 0) {
    return <p className="text-gray-500 text-sm p-6">No data available. Upload an Ads CSV first.</p>
  }
  return (
    <div className="table-scroll rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-10">#</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Ad Name</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Period</th>
            <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 border-t border-gray-100">
              <td className="px-4 py-3">
                <RankBadge rank={i + 1} />
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-800 text-sm max-w-xs truncate" title={row.name}>
                  {row.name}
                </div>
                <div className="text-xs text-gray-400 truncate" title={row.adSetName}>
                  {row.adSetName}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                {formatDate(row.reportingStarts)} – {formatDate(row.reportingEnds)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                {formatValue(row.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function CampaignRankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    redirect('/login')
  }

  const { from, to } = await searchParams
  const dateFilter = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to   ? { lte: new Date(to)   } : {}),
  }
  const hasDateFilter = Boolean(from || to)
  const adWhere = hasDateFilter ? { reporting_starts: dateFilter } : {}

  const TOP_N = 10

  const [topSpendCandidates, topInquiriesCandidates, topReachCandidates, totalAds, totalSpend, adsWithInquiries] = await Promise.all([
    prisma.ad.findMany({
      where: adWhere,
      orderBy: { amount_spent: 'desc' },
      take: TOP_N,
      select: { ad_name: true, ad_set_name: true, amount_spent: true, reporting_starts: true, reporting_ends: true },
    }),
    // total_messaging_contacts, not the deprecated `inquiries` field — this
    // export has no "Purchases" column, so `inquiries` is permanently null
    // (see DV-PIVOT-PLAN.md). Querying it here always returned an empty table.
    prisma.ad.findMany({
      where: { ...adWhere, total_messaging_contacts: { gt: 0 } },
      orderBy: { total_messaging_contacts: 'desc' },
      take: TOP_N,
      select: { ad_name: true, ad_set_name: true, total_messaging_contacts: true, reporting_starts: true, reporting_ends: true },
    }),
    prisma.ad.findMany({
      where: { ...adWhere, reach: { not: null } },
      orderBy: { reach: 'desc' },
      take: TOP_N,
      select: { ad_name: true, ad_set_name: true, reach: true, reporting_starts: true, reporting_ends: true },
    }),
    prisma.ad.count({ where: adWhere }),
    prisma.ad.aggregate({ where: adWhere, _sum: { amount_spent: true } }),
    prisma.ad.count({ where: { ...adWhere, total_messaging_contacts: { gt: 0 } } }),
  ])

  const bySpend: RankRow[] = topSpendCandidates.map(a => ({
    name: a.ad_name,
    adSetName: a.ad_set_name,
    value: a.amount_spent,
    reportingStarts: a.reporting_starts,
    reportingEnds: a.reporting_ends,
  }))

  const byInquiries: RankRow[] = topInquiriesCandidates.map(a => ({
    name: a.ad_name,
    adSetName: a.ad_set_name,
    value: a.total_messaging_contacts ?? 0,
    reportingStarts: a.reporting_starts,
    reportingEnds: a.reporting_ends,
  }))

  const byReach: RankRow[] = topReachCandidates.map(a => ({
    name: a.ad_name,
    adSetName: a.ad_set_name,
    value: a.reach ?? 0,
    reportingStarts: a.reporting_starts,
    reportingEnds: a.reporting_ends,
  }))

  const totalSpendValue = totalSpend._sum.amount_spent ?? 0

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Campaign Rankings"
        description="Top 10 ads ranked by spend, messaging conversations, and reach"
      />
      <DateRangeFilter from={from} to={to} className="mb-6" />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-2xl card-shadow p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Ads Tracked</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalAds}</p>
        </div>
        <div className="bg-card rounded-2xl card-shadow p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Ad Spend</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{formatPHP(totalSpendValue)}</p>
        </div>
        <div className="bg-card rounded-2xl card-shadow p-5 col-span-2 md:col-span-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Ads with Messaging Conversations</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{adsWithInquiries}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* By Spend */}
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-lg">💸</span>
            <h2 className="font-semibold text-gray-800">Top by Spend</h2>
          </div>
          <RankingTable
            rows={bySpend}
            valueLabel="Amount Spent"
            formatValue={v => formatPHP(v)}
          />
        </div>

        {/* By Messaging Conversations */}
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-lg">💬</span>
            <h2 className="font-semibold text-gray-800">Top by Messaging Conversations</h2>
          </div>
          <RankingTable
            rows={byInquiries}
            valueLabel="Messaging Conversations"
            formatValue={v => v.toLocaleString()}
          />
        </div>

        {/* By Reach */}
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-lg">📡</span>
            <h2 className="font-semibold text-gray-800">Top by Reach</h2>
          </div>
          <RankingTable
            rows={byReach}
            valueLabel="Reach"
            formatValue={v => v.toLocaleString()}
          />
        </div>
      </div>
    </div>
  )
}
