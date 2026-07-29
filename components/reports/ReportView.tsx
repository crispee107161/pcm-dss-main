import type { ReactNode } from 'react'
import type { ReportData } from '@/lib/reports/report-data'
import { PrintButton } from '@/components/marketing/PrintButton'
import { AutoPrint } from '@/components/reports/AutoPrint'
import { PageHeader } from '@/components/nav/PageHeader'
import LaggedCorrelationPanel from '@/components/analytics/LaggedCorrelationPanel'
import RegressionSummary from '@/components/analytics/RegressionSummary'
import { MovingAverageForecastChart } from '@/components/marketing/PageMetricsCharts'
import AIInsightCard from '@/components/analytics/AIInsightCard'
import InsightHeader from '@/components/analytics/InsightHeader'
import {
  ReportHeader, ReportSection, ReportMetricRow, ReportFooter,
  reportTh, reportThRight, reportTd, reportTdRight, reportTotalRow,
} from '@/components/reports/ReportPrimitives'

export type ReportRole = 'owner' | 'marketing' | 'sales'
export type ReportVariant = 'screen' | 'print'

const ROLE_META: Record<ReportRole, { title: string; footerLabel: string; description: string }> = {
  owner: {
    title: 'Business Performance Report',
    footerLabel: 'Business Owner Dashboard',
    description: 'Comprehensive business performance summary with forecasts and model insights',
  },
  marketing: {
    title: 'Marketing Performance Report',
    footerLabel: 'Marketing Manager Dashboard',
    description: 'Comprehensive marketing performance summary with forecasts and model insights',
  },
  sales: {
    title: 'Sales Performance Report',
    footerLabel: 'Sales Director Dashboard',
    description: 'Sales performance and campaign effectiveness summary with forecasts and model insights',
  },
}

function formatPHP(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value)
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date))
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

function MetricGrid({ variant, items }: {
  variant: ReportVariant
  items: Array<{ label: string; value: string; sub?: string; tone?: 'positive' | 'negative' | 'neutral' }>
}) {
  if (variant === 'print') return <ReportMetricRow items={items} />
  const colorFor = (tone?: string) =>
    tone === 'positive' ? 'text-green-400' : tone === 'negative' ? 'text-red-400' : 'text-gray-900'
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map(({ label, value, sub, tone }) => (
        <div key={label} className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          <p className={`text-xl font-bold mt-1 ${colorFor(tone)}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      ))}
    </div>
  )
}

interface ReportViewProps {
  variant: ReportVariant
  role: ReportRole
  data: ReportData
}

export default function ReportView({ variant, role, data }: ReportViewProps) {
  const meta = ROLE_META[role]
  const isPrint = variant === 'print'
  const th = isPrint ? reportTh : 'text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3 bg-gray-50'
  const thRight = isPrint ? reportThRight : `${th.replace('text-left', 'text-right')}`
  const td = isPrint ? reportTd : 'px-3 py-2.5 text-gray-700 border-t border-gray-100'
  const tdRight = isPrint ? reportTdRight : `${td} text-right`
  const totalRow = isPrint ? reportTotalRow : 'border-t-2 border-gray-200 bg-gray-50 font-semibold'

  const body = (
    <div id="report-content" className={isPrint ? 'max-w-3xl mx-auto p-8 md:p-12 print:p-0 space-y-8' : 'space-y-6 print:space-y-8'}>
      {isPrint ? (
        <ReportHeader
          title={`PC Merchandise — ${meta.title}`}
          periodLabel="Data Period: Sep 2025 – Jan 2026"
          generatedLabel={`Generated ${formatDate(data.generatedAt)}`}
        />
      ) : (
        <div className="bg-gradient-to-r from-red-700 to-red-500 rounded-2xl p-8 text-white">
          <h1 className="text-2xl font-bold">PC Merchandise — {meta.title}</h1>
          <p className="text-red-100 mt-1 text-sm">Generated: {formatDate(data.generatedAt)} · Data Period: Sep 2025 – Jan 2026</p>
        </div>
      )}

      <Section variant={variant} title="Executive Summary" noBreak>
        <MetricGrid variant={variant} items={[
          { label: 'Total Ad Spend', value: formatPHP(data.totalSpend), sub: '3-month period', tone: 'negative' },
          { label: 'Total Purchases', value: data.totalPurchases.toLocaleString(), sub: 'from ads', tone: 'positive' },
          { label: 'Total Ad Reach', value: data.totalReach.toLocaleString(), sub: 'unique people', tone: 'neutral' },
          { label: 'Cost per Purchase', value: data.cpa ? formatPHP(data.cpa) : '—', sub: 'avg CPA', tone: 'neutral' },
        ]} />
      </Section>

      {data.top5Ads.length > 0 && (
        <Section variant={variant} title="Top 5 Ads by Purchases">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isPrint ? undefined : 'bg-gray-50'}>
                  <th className={th}>#</th>
                  <th className={th}>Ad Name</th>
                  <th className={`${th} hidden sm:table-cell`}>Period</th>
                  <th className={thRight}>Spend</th>
                  <th className={thRight}>Purchases</th>
                  <th className={`${thRight} hidden sm:table-cell`}>CPA</th>
                </tr>
              </thead>
              <tbody>
                {data.top5Ads.map((ad, i) => {
                  const pur = ad.purchases ?? 0
                  return (
                    <tr key={i} className={isPrint ? undefined : 'hover:bg-gray-50'}>
                      <td className={td}>{i + 1}</td>
                      <td className={`${td} font-medium max-w-[200px] truncate`}>{ad.ad_name}</td>
                      <td className={`${td} text-xs whitespace-nowrap hidden sm:table-cell`}>{formatDate(ad.reporting_starts)}</td>
                      <td className={tdRight}>{formatPHP(ad.amount_spent)}</td>
                      <td className={`${tdRight} text-green-600 font-semibold`}>{pur}</td>
                      <td className={`${tdRight} hidden sm:table-cell`}>{pur > 0 ? formatPHP(ad.amount_spent / pur) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section variant={variant} title="Time-Lagged Correlation">
        <LaggedCorrelationPanel data={data.lagData} disclosure="always" tone={isPrint ? 'print' : 'app'} />
      </Section>

      <Section variant={variant} title="Monthly Ad Performance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={isPrint ? undefined : 'bg-gray-50'}>
                <th className={th}>Period</th>
                <th className={`${thRight} hidden sm:table-cell`}>Ads Run</th>
                <th className={thRight}>Total Spend</th>
                <th className={thRight}>Purchases</th>
                <th className={`${thRight} hidden sm:table-cell`}>Reach</th>
                <th className={`${thRight} hidden sm:table-cell`}>CPA</th>
              </tr>
            </thead>
            <tbody>
              {data.monthlyData.map(row => (
                <tr key={row.period} className={isPrint ? undefined : 'hover:bg-gray-50'}>
                  <td className={`${td} font-medium`}>{row.period}</td>
                  <td className={`${tdRight} hidden sm:table-cell`}>{row.ad_count}</td>
                  <td className={`${tdRight} font-medium`}>{formatPHP(row.spend)}</td>
                  <td className={`${tdRight} text-green-600 font-semibold`}>{row.purchases}</td>
                  <td className={`${tdRight} hidden sm:table-cell`}>{row.reach.toLocaleString()}</td>
                  <td className={`${tdRight} hidden sm:table-cell`}>{row.purchases > 0 ? formatPHP(row.spend / row.purchases) : '—'}</td>
                </tr>
              ))}
              {(() => {
                const mSpend = data.monthlyData.reduce((s, r) => s + r.spend, 0)
                const mPurchases = data.monthlyData.reduce((s, r) => s + r.purchases, 0)
                const mReach = data.monthlyData.reduce((s, r) => s + r.reach, 0)
                const mCount = data.monthlyData.reduce((s, r) => s + r.ad_count, 0)
                return (
                  <tr className={totalRow}>
                    <td className={td}>Total</td>
                    <td className={`${tdRight} hidden sm:table-cell`}>{mCount}</td>
                    <td className={`${tdRight} text-red-600`}>{formatPHP(mSpend)}</td>
                    <td className={`${tdRight} text-green-600`}>{mPurchases}</td>
                    <td className={`${tdRight} hidden sm:table-cell`}>{mReach.toLocaleString()}</td>
                    <td className={`${tdRight} hidden sm:table-cell`}>{mPurchases > 0 ? formatPHP(mSpend / mPurchases) : '—'}</td>
                  </tr>
                )
              })()}
            </tbody>
          </table>
        </div>
      </Section>

      {data.latestModel && (
        <Section variant={variant} title="Predictive Model">
          <RegressionSummary model={data.latestModel} insight={data.regressionInsight} disclosure="always" tone={isPrint ? 'print' : 'app'} />
        </Section>
      )}

      {data.dailyMetricsCount >= 7 && data.forecastInsight && (
        <Section variant={variant} title="7-Day Page Views Forecast">
          <InsightHeader
            headline={data.forecastInsight.headline}
            detail={data.forecastInsight.detail}
            disclosure="always"
            tone={isPrint ? 'print' : 'app'}
            mathLabel="See the model behind this"
          >
            <p className={`text-xs ${isPrint ? 'text-neutral-500' : 'text-gray-500'}`}>
              Model: {data.viewsForecast.method === 'holt-winters' ? 'Holt-Winters triple exponential smoothing (trend + weekly seasonality)' : 'Holt linear (double exponential smoothing) — upload more data to enable the full seasonal model'}.
              Current level: {data.viewsForecast.lastLevel.toLocaleString()} views/day.
            </p>
          </InsightHeader>
          <div className="mt-4">
            <MovingAverageForecastChart data={data.forecastChartData} />
          </div>
        </Section>
      )}

      {data.hasOrganicPosts && (
        <Section variant={variant} title="Organic Post Engagement">
          <MetricGrid variant={variant} items={[
            { label: 'Total Posts', value: data.postCount.toLocaleString() },
            { label: 'Total Reach', value: data.totalPostReach.toLocaleString() },
            { label: 'Avg Engagement Rate', value: `${data.avgEngagement.toFixed(2)}%` },
            { label: 'Total Reactions', value: data.totalReactions.toLocaleString() },
          ]} />
        </Section>
      )}

      {Object.keys(data.adCatCounts).length > 0 && (
        <Section variant={variant} title="Ad Content Category Distribution">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(data.adCatCounts).map(([cat, count]) => (
              <div key={cat} className={`flex justify-between items-center py-1.5 border-b ${isPrint ? 'border-neutral-100' : 'border-gray-50'}`}>
                <span className={`text-sm ${isPrint ? 'text-neutral-700' : 'text-gray-700'}`}>{cat}</span>
                <span className={`text-sm font-semibold ${isPrint ? 'text-neutral-900' : 'text-gray-800'}`}>{count}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {!isPrint && (
        <AIInsightCard data={{
          totalSpend: data.totalSpend,
          totalPurchases: data.totalPurchases,
          totalReach: data.totalReach,
          cpa: data.cpa,
          bestLag: data.lagData.best_lag,
          bestMetric: data.lagData.best_metric,
          bestR: data.lagData.best_r,
          rSquared: data.latestModel?.r_squared ?? null,
          isMLR: data.latestModel?.coef_reach != null,
          rse: data.latestModel?.residual_std_error ?? null,
          n: data.latestModel?.n ?? null,
          forecastBaseline: data.dailyMetricsCount >= 7 ? data.viewsForecast.lastLevel : null,
          avgEngagement: data.hasOrganicPosts ? data.avgEngagement : null,
        }} />
      )}

      <Section variant={variant} title="Key Takeaways">
        <ul className={`space-y-2 text-sm ${isPrint ? 'text-neutral-700' : 'text-gray-700'}`}>
          {data.allAdsCount === 0 && (
            <li className="flex gap-2">
              <span className={isPrint ? 'text-neutral-400 mt-0.5' : 'text-red-400 mt-0.5'}>•</span>
              No ad data available yet. The Marketing Manager needs to upload Facebook Ads Manager CSV data.
            </li>
          )}
          {data.cpa && (
            <li className="flex gap-2">
              <span className={isPrint ? 'text-neutral-400 mt-0.5' : 'text-red-400 mt-0.5'}>•</span>
              Average cost per purchase across all campaigns: <strong className={isPrint ? 'text-neutral-900' : ''}>{formatPHP(data.cpa)}</strong>
            </li>
          )}
          {data.lagData.has_data && (
            <li className="flex gap-2">
              <span className={isPrint ? 'text-neutral-400 mt-0.5' : 'text-red-400 mt-0.5'}>•</span>
              {data.lagData.best_r !== null && data.lagData.best_metric
                ? <>Purchases peak <strong className={isPrint ? 'text-neutral-900' : ''}>{data.lagData.best_lag} day{data.lagData.best_lag !== 1 ? 's' : ''}</strong> after ad metrics change — strongest driver is {data.lagData.best_metric.toLowerCase()}.</>
                : 'No clear time-lag pattern found yet between ad metrics and purchases.'}
            </li>
          )}
          {data.regressionInsight && (
            <li className="flex gap-2">
              <span className={isPrint ? 'text-neutral-400 mt-0.5' : 'text-red-400 mt-0.5'}>•</span>
              {data.regressionInsight.headline}.
            </li>
          )}
          {data.hasOrganicPosts && (
            <li className="flex gap-2">
              <span className={isPrint ? 'text-neutral-400 mt-0.5' : 'text-red-400 mt-0.5'}>•</span>
              Organic posts averaged <strong className={isPrint ? 'text-neutral-900' : ''}>{data.avgEngagement.toFixed(2)}%</strong> engagement across {data.postCount} posts.
            </li>
          )}
          {data.totalImpressions > 0 && data.totalLinkClicks > 0 && (
            <li className="flex gap-2">
              <span className={isPrint ? 'text-neutral-400 mt-0.5' : 'text-red-400 mt-0.5'}>•</span>
              Overall link click-through rate: <strong className={isPrint ? 'text-neutral-900' : ''}>{((data.totalLinkClicks / data.totalImpressions) * 100).toFixed(2)}%</strong>
            </li>
          )}
          {data.forecastInsight && (
            <li className="flex gap-2">
              <span className={isPrint ? 'text-neutral-400 mt-0.5' : 'text-red-400 mt-0.5'}>•</span>
              {data.forecastInsight.headline}.
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
      <div className="flex justify-end mb-6 print:hidden">
        <PrintButton role={role} />
      </div>
      {body}
    </div>
  )
}
