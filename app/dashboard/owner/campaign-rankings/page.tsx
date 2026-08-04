import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import { manilaDayRange } from '@/lib/date-range'
import {
  rankByCostPerInquiry,
  rankByCtr,
  rankByCostPerClick,
  MIN_IMPRESSIONS_FOR_CTR,
  MIN_CLICKS_FOR_CPC,
  MIN_INQUIRIES_FOR_CPI,
} from '@/lib/stats/campaign-rankings'
import MethodologyNote from '@/components/analytics/MethodologyNote'

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

function RankingTable({ rows, valueLabel, formatValue }: {
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
              <td className="px-4 py-3"><RankBadge rank={i + 1} /></td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-800 text-sm max-w-xs truncate" title={row.name}>{row.name}</div>
                <div className="text-xs text-gray-400 truncate" title={row.adSetName}>{row.adSetName}</div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                {formatDate(row.reportingStarts)} – {formatDate(row.reportingEnds)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">{formatValue(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function OwnerCampaignRankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const { from, to } = await searchParams
  const range = manilaDayRange(from, to)
  const adWhere = range ? { reporting_starts: range } : {}

  const [topSpend, topInquiries, topReach, rankingPoolAds, totalAds, totalSpend, adsWithInquiries] = await Promise.all([
    prisma.ad.findMany({
      where: adWhere,
      orderBy: { amount_spent: 'desc' },
      take: 10,
      select: { ad_name: true, ad_set_name: true, amount_spent: true, reporting_starts: true, reporting_ends: true },
    }),
    prisma.ad.findMany({
      where: { ...adWhere, inquiries: { gt: 0 } },
      orderBy: { inquiries: 'desc' },
      take: 10,
      select: { ad_name: true, ad_set_name: true, inquiries: true, reporting_starts: true, reporting_ends: true },
    }),
    prisma.ad.findMany({
      where: { ...adWhere, reach: { not: null } },
      orderBy: { reach: 'desc' },
      take: 10,
      select: { ad_name: true, ad_set_name: true, reach: true, reporting_starts: true, reporting_ends: true },
    }),
    // Efficiency rankings (cost/inquiry, CTR, cost/click) are computed ratios,
    // which Prisma cannot `orderBy` — fetch the filtered pool and rank in JS.
    prisma.ad.findMany({
      where: adWhere,
      select: {
        ad_name: true, ad_set_name: true, amount_spent: true, impressions: true,
        link_clicks: true, inquiries: true, reporting_starts: true, reporting_ends: true,
      },
    }),
    prisma.ad.count({ where: adWhere }),
    prisma.ad.aggregate({ where: adWhere, _sum: { amount_spent: true } }),
    prisma.ad.count({ where: { ...adWhere, inquiries: { gt: 0 } } }),
  ])

  const bestCostPerInquiry: RankRow[] = rankByCostPerInquiry(rankingPoolAds).map(r => ({
    name: r.name, adSetName: r.adSetName, value: r.value,
    reportingStarts: r.reportingStarts, reportingEnds: r.reportingEnds,
  }))
  const bestCtr: RankRow[] = rankByCtr(rankingPoolAds).map(r => ({
    name: r.name, adSetName: r.adSetName, value: r.value,
    reportingStarts: r.reportingStarts, reportingEnds: r.reportingEnds,
  }))
  const bestCostPerClick: RankRow[] = rankByCostPerClick(rankingPoolAds).map(r => ({
    name: r.name, adSetName: r.adSetName, value: r.value,
    reportingStarts: r.reportingStarts, reportingEnds: r.reportingEnds,
  }))

  const bySpend: RankRow[] = topSpend.map(a => ({
    name: a.ad_name, adSetName: a.ad_set_name, value: a.amount_spent,
    reportingStarts: a.reporting_starts, reportingEnds: a.reporting_ends,
  }))
  const byInquiries: RankRow[] = topInquiries.map(a => ({
    name: a.ad_name, adSetName: a.ad_set_name, value: a.inquiries ?? 0,
    reportingStarts: a.reporting_starts, reportingEnds: a.reporting_ends,
  }))
  const byReach: RankRow[] = topReach.map(a => ({
    name: a.ad_name, adSetName: a.ad_set_name, value: a.reach ?? 0,
    reportingStarts: a.reporting_starts, reportingEnds: a.reporting_ends,
  }))

  const totalSpendValue = totalSpend._sum.amount_spent ?? 0

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader title="Campaign Rankings" description="Top 10 ads by volume (spend, inquiries, reach) and by efficiency (cost per inquiry, click-through rate, cost per click)" />
      <DateRangeFilter from={from} to={to} className="mb-6" />

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
          <p className="text-xs text-gray-500 uppercase tracking-wider">Ads with Inquiries</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{adsWithInquiries}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.12em] whitespace-nowrap">By Volume</p>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 items-start">
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </span>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Top by Spend</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <RankingTable rows={bySpend} valueLabel="Amount Spent" formatValue={v => formatPHP(v)} />
          <div className="px-5 pb-4">
            <MethodologyNote>
              From the &quot;Amount spent (PHP)&quot; column of each uploaded Facebook Ads CSV row, ranked
              highest first, top 10. Filtered by the date range above, applied to each ad&apos;s
              Reporting starts date.
            </MethodologyNote>
          </div>
        </div>
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </span>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Top by Inquiries</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <RankingTable rows={byInquiries} valueLabel="Inquiries" formatValue={v => v.toLocaleString()} />
          <div className="px-5 pb-4">
            <MethodologyNote>
              From the &quot;Purchases&quot; column of the Facebook Ads export, stored as inquiries. Only
              ads with at least 1 inquiry are included, ranked highest first, top 10. Filtered by
              the date range above, applied to each ad&apos;s Reporting starts date.
            </MethodologyNote>
          </div>
        </div>
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </span>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Top by Reach</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <RankingTable rows={byReach} valueLabel="Reach" formatValue={v => v.toLocaleString()} />
          <div className="px-5 pb-4">
            <MethodologyNote>
              From the &quot;Reach&quot; column — the number of unique accounts that saw the ad — ranked
              highest first, top 10. Filtered by the date range above, applied to each ad&apos;s
              Reporting starts date.
            </MethodologyNote>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.12em] whitespace-nowrap">By Efficiency</p>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 7h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" /></svg>
            </span>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Best Cost per Inquiry</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <RankingTable rows={bestCostPerInquiry} valueLabel="Cost / Inquiry" formatValue={v => formatPHP(v)} />
          <div className="px-5 pb-4">
            <MethodologyNote>
              Amount spent ÷ inquiries, per ad. Lower is better, so ranked ascending, top 10. Only
              ads with at least {MIN_INQUIRIES_FOR_CPI} inquiries are included — below that, a
              single lucky inquiry on tiny spend would otherwise top the list. Filtered by the date
              range above, applied to each ad&apos;s Reporting starts date.
            </MethodologyNote>
          </div>
        </div>
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </span>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Best Click-Through Rate</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <RankingTable rows={bestCtr} valueLabel="CTR" formatValue={v => `${(v * 100).toFixed(2)}%`} />
          <div className="px-5 pb-4">
            <MethodologyNote>
              Link clicks ÷ impressions, per ad. Higher is better, so ranked descending, top 10.
              Only ads with at least {MIN_IMPRESSIONS_FOR_CTR.toLocaleString()} impressions are
              included, to filter out small-sample noise. This is calculated from the stored
              columns, not Facebook&apos;s own reported CTR field, which isn&apos;t captured on
              upload. Filtered by the date range above, applied to each ad&apos;s Reporting starts
              date.
            </MethodologyNote>
          </div>
        </div>
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Best Cost per Click</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <RankingTable rows={bestCostPerClick} valueLabel="Cost / Click" formatValue={v => formatPHP(v)} />
          <div className="px-5 pb-4">
            <MethodologyNote>
              Amount spent ÷ link clicks, per ad. Lower is better, so ranked ascending, top 10.
              Only ads with at least {MIN_CLICKS_FOR_CPC} link clicks are included, to filter out
              small-sample noise. Filtered by the date range above, applied to each ad&apos;s
              Reporting starts date.
            </MethodologyNote>
          </div>
        </div>
      </div>
    </div>
  )
}
