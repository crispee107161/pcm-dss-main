import { getGreeting } from '@/lib/greeting'
import { getDashboardOverview } from '@/lib/data/dashboard'
import { STUDY_PERIOD_LABEL } from '@/lib/data/study-period'
import { KpiCard, formatPhp, formatPhpPrecise, formatNumber } from '@/components/kpi/KpiCard'
import { SpendMessagingTrend } from '@/components/marketing/TrendCharts'
import { CpiDistributionChart, CategoryPerformanceChart, PostReachViewsTrendChart, PageFunnelChart } from '@/components/dashboard/DashboardCharts'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import UploadHistory from '@/components/upload/UploadHistory'
import AlertsStrip from '@/components/dashboard/AlertsStrip'
import { ExportLink } from '@/components/dashboard/ExportLink'
import type { Role } from '@/types/index'

interface DashboardOverviewProps {
  role: Role
  displayName: string
  from?: string
  to?: string
  all?: string
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
    </div>
  )
}

function AdTable({ title, subtitle, ads, emptyMessage }: {
  title: string
  subtitle: string
  ads: { ad_id: string; ad_name: string; ad_set_name: string; spend: number; messaging: number; cpi: number }[]
  emptyMessage: string
}) {
  return (
    <div className="bg-card rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
      <div className="p-5 pb-0">
        <SectionLabel>{title}</SectionLabel>
        <p className="text-xs text-muted-foreground -mt-3 mb-1">{subtitle}</p>
      </div>
      {ads.length === 0 ? (
        <p className="text-sm text-muted-foreground px-5 py-6">{emptyMessage}</p>
      ) : (
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-left px-5 py-2 w-8"><span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">#</span></TableHead>
              <TableHead className="text-left px-3 py-2"><span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Ad</span></TableHead>
              <TableHead className="text-right px-3 py-2"><span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Conv.</span></TableHead>
              <TableHead className="text-right px-3 py-2"><span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Cost / Conv.</span></TableHead>
              <TableHead className="text-right px-5 py-2"><span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Spend</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ads.map((ad, i) => (
              <TableRow key={ad.ad_id} className="border-t border-border hover:bg-secondary/50">
                <TableCell className="px-5 py-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold bg-secondary text-muted-foreground">{i + 1}</span>
                </TableCell>
                <TableCell className="px-3 py-3">
                  <div className="font-semibold text-foreground text-sm max-w-[160px] truncate" title={ad.ad_name}>{ad.ad_name}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[160px]">{ad.ad_set_name}</div>
                </TableCell>
                <TableCell className="sensitive px-3 py-3 text-right text-muted-foreground tabular text-xs">{formatNumber(ad.messaging)}</TableCell>
                <TableCell className="px-3 py-3 text-right"><span className="sensitive font-semibold text-foreground tabular text-xs">{formatPhpPrecise(ad.cpi)}</span></TableCell>
                <TableCell className="sensitive px-5 py-3 text-right font-semibold text-foreground tabular">{formatPhp(ad.spend)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export default async function DashboardOverview({ role, displayName, from, to, all }: DashboardOverviewProps) {
  const data = await getDashboardOverview(from, to, all === '1')
  const isTeam = role === 'MARKETING_TEAM'
  const categorizeHref = role === 'BUSINESS_OWNER' ? '/dashboard/owner/categorize' : '/dashboard/marketing/categorize'
  const reportHref = role === 'BUSINESS_OWNER' ? '/dashboard/owner/report' : '/dashboard/marketing/report'

  const { kpis } = data

  return (
    <div className="p-5 md:p-7 md:px-8 md:pb-12 max-w-[1440px] mx-auto space-y-[22px]">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-extrabold font-heading text-foreground tracking-tight">
            {getGreeting()}, {displayName}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Facebook content performance &amp; advertising efficiency overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeFilter from={from} to={to} anchor={data.dataAnchor} />
          {!isTeam && <ExportLink href={reportHref} />}
        </div>
      </div>

      <AlertsStrip
        uncategorizedCount={data.alerts.uncategorizedCount}
        missingMonths={data.alerts.missingMonths}
        spendNoResultAds={data.alerts.spendNoResultAds}
        categorizeHref={categorizeHref}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-[18px]">
        <KpiCard
          label="Total Ad Spend" value={formatPhp(kpis.spend.value)} sub={data.periodLabel}
          delta={kpis.spend.delta} deltaLabel={data.deltaWindowLabel ?? undefined} invertSentiment
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <KpiCard
          label="Inquiries Generated" value={formatNumber(kpis.inquiries.value)} sub={data.periodLabel}
          delta={kpis.inquiries.delta} deltaLabel={data.deltaWindowLabel ?? undefined}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
        />
        <KpiCard
          label="Median Cost / Inquiry"
          value={kpis.medianCpi.value !== null ? formatPhpPrecise(kpis.medianCpi.value) : '—'}
          sub={kpis.medianCpi.iqr ? `IQR ${formatPhpPrecise(kpis.medianCpi.iqr.q1)} – ${formatPhpPrecise(kpis.medianCpi.iqr.q3)} (n=${kpis.medianCpi.n}) — no minimum spend filter` : `n=${kpis.medianCpi.n} — no minimum spend filter`}
          note={kpis.medianCpi.value !== null ? 'Half of ads this period cost less than this per inquiry, half cost more.' : undefined}
          delta={kpis.medianCpi.delta} deltaLabel={data.deltaWindowLabel ?? undefined} invertSentiment
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-3m-6 0a3 3 0 106 0m-6 0a3 3 0 016 0M9 13h6" /></svg>}
        />
        <KpiCard
          label="Median Organic Engagement"
          value={kpis.medianEngagement.value !== null ? `${kpis.medianEngagement.value.toFixed(2)}%` : '—'}
          sub={`n=${kpis.medianEngagement.n} posts`}
          note={kpis.medianEngagement.value !== null ? 'Half of posts this period perform above this rate, half below.' : undefined}
          delta={kpis.medianEngagement.delta} deltaLabel={data.deltaWindowLabel ?? undefined}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
        />
        <KpiCard
          label="Posts Published"
          value={formatNumber(kpis.posts.total)}
          sub={`${kpis.posts.categorized} categorised · ${kpis.posts.uncategorized} pending`}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
        />
      </div>

      {/* Spend & Messaging trend */}
      <div className="bg-card rounded-2xl p-5" style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
        {data.monthlyTrend.length > 0 ? (
          <>
            <SpendMessagingTrend
              data={data.monthlyTrend}
              heading={<SectionLabel>Spend, Inquiries &amp; Reach Trend (last 3 months)</SectionLabel>}
              showReach
            />
            <p className="text-[11px] text-muted-foreground mt-3">Always shows the last 3 months of uploaded data, independent of the period selector above.</p>
          </>
        ) : (
          <>
            <SectionLabel>Spend &amp; Inquiries Trend</SectionLabel>
            <p className="text-sm text-muted-foreground py-10 text-center">Not enough monthly data yet.</p>
          </>
        )}
      </div>

      {/* CPI distribution (ad metric) paired with an organic, non-category
          chart — never place this beside the content-category chart below.
          Content category → ad efficiency has no join key and is
          permanently out of scope (mvp.md §5.1); putting the two charts
          side by side would visually assert a relationship the four
          places documenting that constraint spent effort establishing does
          not exist (docs/raven/FR16_Caveat_Demographics_Gap_and_FR18_Decisions.md §3). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] items-stretch">
        <div className="bg-card rounded-2xl p-5 flex flex-col" style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
          <SectionLabel>Cost-per-Inquiry Distribution</SectionLabel>
          <p className="text-xs text-muted-foreground -mt-3 mb-3">Per-ad CPI, {data.periodLabel} — histogram and box plot of the same population as the KPI above. Computed per advertisement per month with no minimum expenditure filter, unlike the study-wide analysis.</p>
          <CpiDistributionChart data={data.cpiDistribution} />
        </div>
        <div className="bg-card rounded-2xl p-5 flex flex-col" style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
          <SectionLabel>Organic Reach &amp; Views Trend</SectionLabel>
          <p className="text-xs text-muted-foreground -mt-3 mb-3">Always shows the last 3 months of uploaded post data, independent of the period selector above.</p>
          <div className="flex-1 min-h-0">
            <PostReachViewsTrendChart data={data.postReachViewsTrend} />
          </div>
        </div>
      </div>

      {/* Content-category performance (organic) paired with the page-visit
          funnel (organic) — see the note above for why this never shares a
          row with an ad-efficiency chart. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] items-stretch">
        <div className="bg-card rounded-2xl p-5 flex flex-col" style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
          <SectionLabel>Performance by Content Category</SectionLabel>
          <p className="text-xs text-muted-foreground -mt-3 mb-3">Median organic engagement rate, {data.periodLabel} — n labelled per bar since sample sizes differ.</p>
          <div className="flex-1 min-h-[240px]">
            <CategoryPerformanceChart data={data.categoryPerformance} />
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5" style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
          <SectionLabel>Follows per 100 Page Visits</SectionLabel>
          <p className="text-xs text-muted-foreground -mt-3 mb-3">Full study period ({STUDY_PERIOD_LABEL}) — visits, follows, and the ratio, monthly, independent of the period selector above.</p>
          <PageFunnelChart data={data.pageFunnelTrend} />
        </div>
      </div>

      {/* Top / bottom ads by CPI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] items-start">
        <AdTable
          title="Most Efficient Ads"
          subtitle={`Lowest cost per inquiry, ${data.periodLabel} — lower is better.`}
          ads={data.topAds}
          emptyMessage="No ads with enough inquiries to rank in this period."
        />
        <AdTable
          title="Least Efficient Ads"
          subtitle={`Highest cost per inquiry, ${data.periodLabel} — these advertisements cost the most per conversation started.`}
          ads={data.bottomAds}
          emptyMessage="Not enough ranked ads yet to show a bottom list."
        />
      </div>

      {/* Recent uploads */}
      <div className="bg-card rounded-2xl p-5" style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
        <SectionLabel>Recent Uploads</SectionLabel>
        <UploadHistory logs={data.recentUploads} />
      </div>

    </div>
  )
}
