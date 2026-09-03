import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import { manilaDayRange } from '@/lib/date-range'
import { withStudyPeriodAd } from '@/lib/data/study-period'
import {
  rankByCostPerInquiry,
  rankByCtr,
  rankByCostPerClick,
  countEligibleForCostPerInquiry,
  countEligibleForCtr,
  countEligibleForCostPerClick,
  MIN_IMPRESSIONS_FOR_CTR,
  MIN_CLICKS_FOR_CPC,
  MIN_INQUIRIES_FOR_CPI,
} from '@/lib/stats/campaign-rankings'
import MethodologyNote from '@/components/analytics/MethodologyNote'
import { RankingTable, type RankRow } from '@/components/analytics/RankingTable'

function formatPHP(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

export default async function OwnerCampaignRankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const session = await requireSession()
  if (session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const { from, to } = await searchParams
  const range = manilaDayRange(from, to)
  // Scope_Call_Both_and_Clauses_Restored.md §2 — the date-range picker's own
  // window still ANDs with the declared study period rather than replacing it.
  const adWhere = withStudyPeriodAd(range ? { reporting_starts: range } : undefined)

  const TOP_N = 10

  const [topSpendCandidates, topInquiriesCandidates, topReachCandidates, rankingPoolAds, totalAds, totalSpend, adsWithInquiries] = await Promise.all([
    prisma.ad.findMany({
      where: adWhere,
      orderBy: { amount_spent: 'desc' },
      take: TOP_N,
      select: { ad_name: true, ad_set_name: true, amount_spent: true, reporting_starts: true, reporting_ends: true },
    }),
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
    // Efficiency rankings (cost/inquiry, CTR, cost/click) are computed ratios,
    // which Prisma cannot `orderBy` — fetch the full filtered set and rank in JS.
    prisma.ad.findMany({
      where: adWhere,
      select: {
        ad_name: true, ad_set_name: true, amount_spent: true, impressions: true,
        link_clicks: true, total_messaging_contacts: true, reporting_starts: true, reporting_ends: true,
      },
    }),
    prisma.ad.count({ where: adWhere }),
    prisma.ad.aggregate({ where: adWhere, _sum: { amount_spent: true } }),
    prisma.ad.count({ where: { ...adWhere, total_messaging_contacts: { gt: 0 } } }),
  ])

  // rankBy* already returns RankRow's exact shape (RankRow = RankedAd), so
  // no remapping is needed here — unlike bySpend/byInquiries/byReach below,
  // which do rename Prisma's snake_case selection into RankRow's fields.
  const bestCostPerInquiry: RankRow[] = rankByCostPerInquiry(rankingPoolAds)
  const bestCtr: RankRow[] = rankByCtr(rankingPoolAds)
  const bestCostPerClick: RankRow[] = rankByCostPerClick(rankingPoolAds)
  const eligibleForCostPerInquiry = countEligibleForCostPerInquiry(rankingPoolAds)
  const eligibleForCtr = countEligibleForCtr(rankingPoolAds)
  const eligibleForCostPerClick = countEligibleForCostPerClick(rankingPoolAds)

  const bySpend: RankRow[] = topSpendCandidates.map(a => ({
    name: a.ad_name, adSetName: a.ad_set_name, value: a.amount_spent,
    reportingStarts: a.reporting_starts, reportingEnds: a.reporting_ends,
  }))
  const byInquiries: RankRow[] = topInquiriesCandidates.map(a => ({
    name: a.ad_name, adSetName: a.ad_set_name, value: a.total_messaging_contacts ?? 0,
    reportingStarts: a.reporting_starts, reportingEnds: a.reporting_ends,
  }))
  const byReach: RankRow[] = topReachCandidates.map(a => ({
    name: a.ad_name, adSetName: a.ad_set_name, value: a.reach ?? 0,
    reportingStarts: a.reporting_starts, reportingEnds: a.reporting_ends,
  }))

  const totalSpendValue = totalSpend._sum.amount_spent ?? 0

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader title="Campaign Rankings" description="Top 10 ads by volume (spend, messaging conversations, reach) and by efficiency (cost per messaging conversation, click-through rate, cost per click)" />
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
          <p className="text-xs text-gray-500 uppercase tracking-wider">Ads with Messaging Conversations</p>
          <p className="text-2xl font-bold text-status-positive mt-1">{adsWithInquiries}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] whitespace-nowrap">By Volume</h2>
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
          <div className="px-5 pt-3 pb-4">
            <MethodologyNote>
              From the &quot;Amount spent (PHP)&quot; column of each uploaded Facebook Ads CSV row, ranked
              highest first, top 10. Filtered by the date range above, applied to each ad&apos;s
              Reporting starts date.
            </MethodologyNote>
          </div>
        </div>
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-status-positive/10 text-status-positive flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </span>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Top by Messaging Conversations</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <RankingTable rows={byInquiries} valueLabel="Messaging Conversations" formatValue={v => v.toLocaleString()} />
          <div className="px-5 pt-3 pb-4">
            <MethodologyNote>
              From the daily Facebook Ads export&apos;s &quot;Results&quot; column, counted only for rows
              where &quot;Result type&quot; is &quot;Messaging conversations started&quot; — Facebook&apos;s
              indicator that someone started a Messenger conversation after seeing the ad. Only ads
              with at least 1 messaging conversation are included, ranked highest first, top 10.
              Filtered by the date range above, applied to each ad&apos;s Reporting starts date.
            </MethodologyNote>
          </div>
        </div>
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-status-warning/10 text-status-warning flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </span>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Top by Reach</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <RankingTable rows={byReach} valueLabel="Reach" formatValue={v => v.toLocaleString()} />
          <div className="px-5 pt-3 pb-4">
            <MethodologyNote>
              From the &quot;Reach&quot; column — the number of unique accounts that saw the ad — ranked
              highest first, top 10. Filtered by the date range above, applied to each ad&apos;s
              Reporting starts date.
            </MethodologyNote>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] whitespace-nowrap">By Efficiency</h2>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 7h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" /></svg>
            </span>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Best Cost per Messaging Conversation</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <RankingTable rows={bestCostPerInquiry} valueLabel="Cost / Msg. Conv." formatValue={v => formatPHP(v)} />
          <div className="px-5 pt-3 pb-4">
            <MethodologyNote>
              Amount spent ÷ messaging conversations, per ad. Lower is better, so ranked ascending,
              top 10. Only ads with at least {MIN_INQUIRIES_FOR_CPI} messaging conversations are
              included — below that, a single lucky conversation on tiny spend would otherwise top
              the list. {eligibleForCostPerInquiry} ad{eligibleForCostPerInquiry === 1 ? '' : 's'} cleared
              that floor in the selected range. Filtered by the date range above, applied to each
              ad&apos;s Reporting starts date.
            </MethodologyNote>
          </div>
        </div>
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </span>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Best Click-Through Rate</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <RankingTable
            rows={bestCtr}
            valueLabel="CTR"
            formatValue={v => `${(v * 100).toFixed(2)}%`}
            emptyMessage="Link clicks aren't captured in Facebook's daily ads export, so CTR can't be calculated for current data."
          />
          <div className="px-5 pt-3 pb-4">
            <MethodologyNote>
              Link clicks ÷ impressions, per ad. Higher is better, so ranked descending, top 10.
              Only ads with at least {MIN_IMPRESSIONS_FOR_CTR.toLocaleString()} impressions are
              included, to filter out small-sample noise. {eligibleForCtr} ad{eligibleForCtr === 1 ? '' : 's'}{' '}
              cleared that floor in the selected range. This is calculated from the stored columns,
              not Facebook&apos;s own reported CTR field, which isn&apos;t captured on upload.
              Filtered by the date range above, applied to each ad&apos;s Reporting starts date.
            </MethodologyNote>
          </div>
        </div>
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Best Cost per Click</p>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <RankingTable
            rows={bestCostPerClick}
            valueLabel="Cost / Click"
            formatValue={v => formatPHP(v)}
            emptyMessage="Link clicks aren't captured in Facebook's daily ads export, so cost per click can't be calculated for current data."
          />
          <div className="px-5 pt-3 pb-4">
            <MethodologyNote>
              Amount spent ÷ link clicks, per ad. Lower is better, so ranked ascending, top 10.
              Only ads with at least {MIN_CLICKS_FOR_CPC} link clicks are included, to filter out
              small-sample noise. {eligibleForCostPerClick} ad{eligibleForCostPerClick === 1 ? '' : 's'}{' '}
              cleared that floor in the selected range. Filtered by the date range above, applied to
              each ad&apos;s Reporting starts date.
            </MethodologyNote>
          </div>
        </div>
      </div>
    </div>
  )
}
