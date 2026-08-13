import type { ReactNode } from 'react'
import type { ReportData } from '@/lib/reports/report-data'
import { PrintButton } from '@/components/marketing/PrintButton'
import { CsvExportButton } from '@/components/reports/CsvExportButton'
import { AutoPrint } from '@/components/reports/AutoPrint'
import { PageHeader } from '@/components/nav/PageHeader'
import {
  ReportHeader, ReportSection, ReportMetricRow, ReportFooter,
  reportTh, reportThRight, reportTd, reportTdRight, reportTotalRow,
} from '@/components/reports/ReportPrimitives'

export type ReportRole = 'owner' | 'marketing'
export type ReportVariant = 'screen' | 'print'

const ROLE_META: Record<ReportRole, { title: string; footerLabel: string; description: string }> = {
  owner: {
    title: 'Business Performance Report',
    footerLabel: 'Business Owner Dashboard',
    description: 'Business performance summary, drawn from the same figures shown on the analytics screens',
  },
  marketing: {
    title: 'Marketing Performance Report',
    footerLabel: 'Marketing Manager Dashboard',
    description: 'Marketing performance summary, drawn from the same figures shown on the analytics screens',
  },
}

function formatPHP(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value)
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date))
}

function formatPValue(p: number) {
  return p < 0.001 ? '< 0.001' : p.toFixed(3)
}

function Section({ variant, title, children, noBreak = false }: { variant: ReportVariant; title: string; children: ReactNode; noBreak?: boolean }) {
  if (variant === 'print') {
    return <ReportSection title={title} noBreak={noBreak}>{children}</ReportSection>
  }
  return (
    <div className={`bg-card rounded-2xl card-shadow p-6 ${noBreak ? 'print-no-break' : ''}`}>
      <h2 className="report-heading text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">{title}</h2>
      {children}
    </div>
  )
}

function Caveat({ variant, label, children }: { variant: ReportVariant; label: string; children: ReactNode }) {
  return (
    <p className={`text-xs mt-3 ${variant === 'print' ? 'text-neutral-500' : 'text-gray-500'}`}>
      <span className="font-semibold">{label}:</span> {children}
    </p>
  )
}

function MetricGrid({ variant, items }: {
  variant: ReportVariant
  items: Array<{ label: string; value: string; sub?: string }>
}) {
  if (variant === 'print') return <ReportMetricRow items={items} />
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map(({ label, value, sub }) => (
        <div key={label} className="bg-secondary rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold mt-1 text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      ))}
    </div>
  )
}

interface ReportViewProps {
  variant: ReportVariant
  role: ReportRole
  data: ReportData
  // mvp.md §3 S9: MARKETING_TEAM sees Reports but cannot export (View only).
  canExport?: boolean
}

export default function ReportView({ variant, role, data, canExport = true }: ReportViewProps) {
  const meta = ROLE_META[role]
  const isPrint = variant === 'print'
  const th = isPrint ? reportTh : 'text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-3 py-3 bg-gray-50'
  const thRight = isPrint ? reportThRight : `${th.replace('text-left', 'text-right')}`
  const td = isPrint ? reportTd : 'px-3 py-2.5 text-gray-700 border-t border-gray-100'
  const tdRight = isPrint ? reportTdRight : `${td} text-right`
  const totalRow = isPrint ? reportTotalRow : 'border-t-2 border-gray-200 bg-gray-50 font-semibold'

  const { overview, budgetReallocation, adSetRows, postTypeRows, watchThrough, analysis, correlationInterpretation, categoryDistributionDisplay, lifecycle, funnelTotals, followsPer100Visits } = data
  const totalReach = overview.monthlyTrend.reduce((s, r) => s + r.total_reach, 0)

  const body = (
    <div id="report-content" className={isPrint ? 'max-w-3xl mx-auto p-8 md:p-12 print:p-0 space-y-8' : 'space-y-6 print:space-y-8'}>
      {isPrint ? (
        <ReportHeader
          title={`PC Merchandise — ${meta.title}`}
          periodLabel={overview.periodLabel}
          generatedLabel={`Generated ${formatDate(data.generatedAt)}`}
        />
      ) : (
        <div className="bg-gradient-to-r from-neutral-800 to-neutral-600 rounded-2xl p-8 text-white">
          <h1 className="text-2xl font-bold">PC Merchandise — {meta.title}</h1>
          <p className="text-neutral-300 mt-1 text-sm">Generated: {formatDate(data.generatedAt)} · {overview.periodLabel}</p>
        </div>
      )}

      <Section variant={variant} title="Executive Summary" noBreak>
        <MetricGrid variant={variant} items={[
          { label: 'Total Ad Spend', value: formatPHP(overview.kpis.spend.value) },
          { label: 'Total Messaging Conversations', value: overview.kpis.inquiries.value.toLocaleString() },
          { label: 'Total Ad Reach', value: totalReach.toLocaleString(), sub: 'unique people, monthly sum' },
          { label: 'Median Cost per Conversation', value: overview.kpis.medianCpi.value !== null ? formatPHP(overview.kpis.medianCpi.value) : '—', sub: `n=${overview.kpis.medianCpi.n}` },
        ]} />
      </Section>

      <Section variant={variant} title="Content Library">
        <MetricGrid variant={variant} items={[
          { label: 'Median Organic Engagement Rate', value: overview.kpis.medianEngagement.value !== null ? `${overview.kpis.medianEngagement.value.toFixed(2)}%` : '—', sub: `n=${overview.kpis.medianEngagement.n}` },
          { label: 'Posts Categorized', value: overview.kpis.posts.categorized.toLocaleString() },
          { label: 'Posts Uncategorized', value: overview.kpis.posts.uncategorized.toLocaleString() },
          { label: 'Total Posts', value: overview.kpis.posts.total.toLocaleString() },
        ]} />
      </Section>

      <Section variant={variant} title="Monthly Ad Performance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={isPrint ? undefined : 'bg-gray-50'}>
                <th className={th}>Period</th>
                <th className={`${thRight} hidden sm:table-cell`}>Ads Run</th>
                <th className={thRight}>Total Spend</th>
                <th className={thRight}>Messaging Conversations</th>
                <th className={`${thRight} hidden sm:table-cell`}>Reach</th>
                <th className={`${thRight} hidden sm:table-cell`}>CPI</th>
              </tr>
            </thead>
            <tbody>
              {overview.monthlyTrend.map(row => (
                <tr key={row.period} className={isPrint ? undefined : 'hover:bg-gray-50'}>
                  <td className={`${td} font-medium`}>{row.period}</td>
                  <td className={`${tdRight} hidden sm:table-cell`}>{row.ad_count}</td>
                  <td className={`${tdRight} font-medium`}>{formatPHP(row.total_spend)}</td>
                  <td className={`${tdRight} font-semibold`}>{row.total_inquiries}</td>
                  <td className={`${tdRight} hidden sm:table-cell`}>{row.total_reach.toLocaleString()}</td>
                  <td className={`${tdRight} hidden sm:table-cell`}>{row.total_inquiries > 0 ? formatPHP(row.total_spend / row.total_inquiries) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {overview.topAds.length > 0 && (
        <Section variant={variant} title="Top Ads by Cost per Messaging Conversation">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isPrint ? undefined : 'bg-gray-50'}>
                  <th className={th}>#</th>
                  <th className={th}>Ad Name</th>
                  <th className={thRight}>Spend</th>
                  <th className={thRight}>Messaging Conversations</th>
                  <th className={thRight}>CPI</th>
                </tr>
              </thead>
              <tbody>
                {overview.topAds.slice(0, 10).map((ad, i) => (
                  <tr key={ad.ad_id} className={isPrint ? undefined : 'hover:bg-gray-50'}>
                    <td className={td}>{i + 1}</td>
                    <td className={`${td} font-medium max-w-[200px] truncate`}>{ad.ad_name}</td>
                    <td className={tdRight}>{formatPHP(ad.spend)}</td>
                    <td className={`${tdRight} font-semibold`}>{ad.messaging}</td>
                    <td className={tdRight}>{formatPHP(ad.cpi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section variant={variant} title="Budget Reallocation">
        <MetricGrid variant={variant} items={budgetReallocation.quartiles.map((q) => ({
          label: `Q${q.quartile} (n=${q.n})`,
          value: q.cpi > 0 ? formatPHP(q.cpi) : '—',
          sub: `${formatPHP(q.spend)} spend, ${q.inquiries} conversations`,
        }))} />
        {budgetReallocation.n > 0 && (
          <p className={`text-sm mt-4 ${isPrint ? 'text-neutral-700' : 'text-gray-700'}`}>
            Q4&apos;s {formatPHP(budgetReallocation.q4Spend)} spend produced {budgetReallocation.q4Inquiries} conversations;
            the same spend at Q1&apos;s rate would have generated {Math.round(budgetReallocation.counterfactualInquiries)} conversations
            based on recorded results — a retrospective comparison, not a forecast.
          </p>
        )}
        <Caveat variant={variant} label="Method">
          Messaging ads with spend ≥ {formatPHP(budgetReallocation.minSpendThreshold)} (n={budgetReallocation.n}), ranked by cost per
          messaging conversation and split into four equal-size groups. The minimum-spend filter guards against regression to the
          mean — an unfiltered split would put low-volume, noisy-CPI ads in the worst quartile regardless of quality.
        </Caveat>
      </Section>

      <Section variant={variant} title="Ad Set &amp; Campaign Ranking">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={isPrint ? undefined : 'bg-gray-50'}>
                <th className={th}>Ad Set</th>
                <th className={`${thRight} hidden sm:table-cell`}>Ads</th>
                <th className={thRight}>Spend</th>
                <th className={thRight}>Messaging Conversations</th>
                <th className={thRight}>CPI</th>
              </tr>
            </thead>
            <tbody>
              {adSetRows.map((row) => (
                <tr key={row.id} className={isPrint ? undefined : 'hover:bg-gray-50'}>
                  <td className={`${td} font-medium max-w-[220px] truncate`}>
                    {row.name}{row.lowConfidence ? <span className="text-xs text-status-warning ml-1">(low confidence)</span> : null}
                  </td>
                  <td className={`${tdRight} hidden sm:table-cell`}>{row.adCount}</td>
                  <td className={tdRight}>{formatPHP(row.spend)}</td>
                  <td className={`${tdRight} font-semibold`}>{row.inquiries}</td>
                  <td className={tdRight}>{row.cpi !== null ? formatPHP(row.cpi) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Caveat variant={variant} label="Confounding caveat">
          Ad sets and campaigns ran in different periods with different targeting, so this compares what happened, not a
          controlled test — a well-performing group may reflect the season as much as the content.
        </Caveat>
      </Section>

      <Section variant={variant} title="Post Type Performance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={isPrint ? undefined : 'bg-gray-50'}>
                <th className={th}>Post Type</th>
                <th className={`${thRight} hidden sm:table-cell`}>n</th>
                <th className={thRight}>Median Reach</th>
                <th className={thRight}>Median Engagement Rate</th>
                <th className={`${thRight} hidden sm:table-cell`}>Median Views</th>
              </tr>
            </thead>
            <tbody>
              {postTypeRows.map((row) => (
                <tr key={row.postType} className={isPrint ? undefined : 'hover:bg-gray-50'}>
                  <td className={`${td} font-medium`}>{row.postType}</td>
                  <td className={`${tdRight} hidden sm:table-cell`}>{row.n}</td>
                  <td className={tdRight}>{row.medianReach.toLocaleString()}</td>
                  <td className={`${tdRight} font-semibold`}>{row.medianEngagementRate.toFixed(2)}%</td>
                  <td className={`${tdRight} hidden sm:table-cell`}>{row.medianViews !== null ? row.medianViews.toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {watchThrough && (
          <p className={`text-sm mt-4 ${isPrint ? 'text-neutral-700' : 'text-gray-700'}`}>
            Watch-through rate: median {(watchThrough.medianRate * 100).toFixed(1)}% (n={watchThrough.n}), correlated with engagement
            rate at rho={watchThrough.correlationWithEngagement.rho.toFixed(3)} (p={formatPValue(watchThrough.correlationWithEngagement.p)}).
          </p>
        )}
        <Caveat variant={variant} label="Confounding caveat">
          Meta distributes reels differently from photos, so this reflects both content quality and algorithmic distribution —
          read it as a trade-off between formats, never as a ranking of &quot;which content is better.&quot;
        </Caveat>
      </Section>

      <Section variant={variant} title="Analysis">
        <div className="space-y-4">
          <div>
            <p className={`text-sm font-semibold ${isPrint ? 'text-neutral-900' : 'text-gray-800'}`}>Ranking comparison — Views vs. engagement rate</p>
            <p className={`text-sm ${isPrint ? 'text-neutral-700' : 'text-gray-700'}`}>
              Spearman rho={analysis.ranking.rho.toFixed(3)} (n={analysis.ranking.n}, p={formatPValue(analysis.ranking.p)}
              {analysis.ranking.excludedNullViews > 0 ? `; ${analysis.ranking.excludedNullViews} post(s) with blank Views excluded` : ''}).
              {analysis.ranking.overlaps.map((o) => ` Top-${o.k}% overlap: ${(o.overlapFraction * 100).toFixed(0)}% (${o.overlapCount}/${o.topCount}).`).join('')}
            </p>
          </div>

          <div>
            <p className={`text-sm font-semibold ${isPrint ? 'text-neutral-900' : 'text-gray-800'}`}>Correlation — ad engagement rate vs. cost per inquiry</p>
            <p className={`text-sm ${isPrint ? 'text-neutral-700' : 'text-gray-700'}`}>
              {analysis.correlation.method === 'PEARSON' ? 'Pearson' : 'Spearman'} method selected by distributional test.
              {' '}{correlationInterpretation.summary}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isPrint ? undefined : 'bg-gray-50'}>
                  <th className={th}>Category</th>
                  <th className={`${thRight} hidden sm:table-cell`}>n</th>
                  <th className={thRight}>Median Views</th>
                  <th className={thRight}>Median Engagement Rate</th>
                </tr>
              </thead>
              <tbody>
                {categoryDistributionDisplay.map((row) => (
                  <tr key={row.category} className={isPrint ? undefined : 'hover:bg-gray-50'}>
                    <td className={`${td} font-medium`}>{row.label}</td>
                    <td className={`${tdRight} hidden sm:table-cell`}>{row.n}</td>
                    <td className={tdRight}>{row.views.median !== null ? row.views.median.toLocaleString() : '—'}</td>
                    <td className={`${tdRight} font-semibold`}>{row.engagementRate.median.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {lifecycle && (
        <Section variant={variant} title="Ad Lifecycle">
          <div className="space-y-3">
            <p className={`text-sm ${isPrint ? 'text-neutral-700' : 'text-gray-700'}`}>
              Single-month ads: {lifecycle.singleMonthComparison.singleMonth.cpi !== null ? formatPHP(lifecycle.singleMonthComparison.singleMonth.cpi) : '—'} CPI
              (n={lifecycle.singleMonthComparison.singleMonth.n}) vs. ads run {lifecycle.singleMonthComparison.longRun.thresholdMonths}+ months:{' '}
              {lifecycle.singleMonthComparison.longRun.cpi !== null ? formatPHP(lifecycle.singleMonthComparison.longRun.cpi) : '—'} CPI
              (n={lifecycle.singleMonthComparison.longRun.n}), based on recorded results.
            </p>
            {lifecycle.frequencyDiagnostic && (
              <p className={`text-sm ${isPrint ? 'text-neutral-700' : 'text-gray-700'}`}>
                Frequency vs. CPI: rho={lifecycle.frequencyDiagnostic.correlationWithCpi.rho.toFixed(3)}
                (n={lifecycle.frequencyDiagnostic.n}, p={formatPValue(lifecycle.frequencyDiagnostic.correlationWithCpi.p)}),
                median frequency {lifecycle.frequencyDiagnostic.medianFrequency.toFixed(2)}x.
              </p>
            )}
          </div>
          <Caveat variant={variant} label="Survivorship-bias guard">
            Cohort curves (not shown here — see the Analysis screen) restrict each point to ads that survived long enough to
            reach it, so early-killed ads don&apos;t silently drop out of later points.
          </Caveat>
        </Section>
      )}

      <Section variant={variant} title="Page Visits and Follows">
        <MetricGrid variant={variant} items={[
          { label: 'Total Page Visits', value: funnelTotals.visits.toLocaleString() },
          { label: 'Total New Follows', value: funnelTotals.follows.toLocaleString() },
          { label: 'Follows per 100 Visits', value: followsPer100Visits !== null ? followsPer100Visits.toFixed(2) : '—' },
        ]} />
        <Caveat variant={variant} label="Not a conversion rate">
          Visits and follows are two independently-collected daily series with no per-user link — a person can follow
          without visiting the page tracked here, and vice versa. This is not a funnel or a conversion rate.
        </Caveat>
      </Section>

      <Section variant={variant} title="Key Takeaways">
        <ul className={`space-y-2 text-sm ${isPrint ? 'text-neutral-700' : 'text-gray-700'}`}>
          {overview.kpis.medianCpi.value !== null && (
            <li className="flex gap-2">
              <span className={isPrint ? 'text-neutral-400 mt-0.5' : 'text-primary mt-0.5'}>•</span>
              Median cost per messaging conversation across the period: <strong className={isPrint ? 'text-neutral-900' : ''}>{formatPHP(overview.kpis.medianCpi.value)}</strong> (n={overview.kpis.medianCpi.n}).
            </li>
          )}
          {budgetReallocation.n > 0 && (
            <li className="flex gap-2">
              <span className={isPrint ? 'text-neutral-400 mt-0.5' : 'text-primary mt-0.5'}>•</span>
              Reallocating a portion of Q4 spend toward Q1&apos;s rate would have generated an estimated {Math.round(budgetReallocation.additionalInquiries)} additional conversations, based on recorded results.
            </li>
          )}
          <li className="flex gap-2">
            <span className={isPrint ? 'text-neutral-400 mt-0.5' : 'text-primary mt-0.5'}>•</span>
            {correlationInterpretation.summary}
          </li>
          {overview.kpis.medianEngagement.value !== null && (
            <li className="flex gap-2">
              <span className={isPrint ? 'text-neutral-400 mt-0.5' : 'text-primary mt-0.5'}>•</span>
              Organic posts had a median engagement rate of <strong className={isPrint ? 'text-neutral-900' : ''}>{overview.kpis.medianEngagement.value.toFixed(2)}%</strong> (n={overview.kpis.medianEngagement.n}).
            </li>
          )}
          {followsPer100Visits !== null && (
            <li className="flex gap-2">
              <span className={isPrint ? 'text-neutral-400 mt-0.5' : 'text-primary mt-0.5'}>•</span>
              <strong className={isPrint ? 'text-neutral-900' : ''}>{followsPer100Visits.toFixed(2)}</strong> follows per 100 page visits over the recorded period.
            </li>
          )}
        </ul>
      </Section>

      {isPrint ? (
        <ReportFooter>
          PC Merchandise DSS · Report generated {formatDate(data.generatedAt)} · {meta.footerLabel}
        </ReportFooter>
      ) : (
        <div className="text-center text-xs text-gray-400 pt-4 pb-2">
          PC Merchandise DSS · Report generated {formatDate(data.generatedAt)} · {meta.footerLabel}
        </div>
      )}
    </div>
  )

  if (isPrint) {
    return (
      <div className="print-report-light bg-white min-h-screen">
        <AutoPrint />
        {body}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="print:hidden">
        <PageHeader title={meta.title} description={meta.description} />
      </div>
      {canExport && (
        <div className="flex justify-end gap-3 mb-6 print:hidden">
          <CsvExportButton role={role} />
          <PrintButton role={role} />
        </div>
      )}
      {body}
    </div>
  )
}
