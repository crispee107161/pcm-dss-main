import { prisma } from '@/lib/prisma'
import { STUDY_PERIOD_POST_WHERE, STUDY_PERIOD_AD_WHERE, STUDY_PERIOD_START, STUDY_PERIOD_END } from '@/lib/data/study-period'
import { manilaYearMonth, monthIndex, rowsInMonth, MANILA_MONTH_LABEL_FMT, type TargetMonth } from '@/lib/data/month-buckets'
import { PageHeader } from '@/components/nav/PageHeader'
import TrendCharts from '@/components/marketing/TrendCharts'
import { computeTrendInsight, type PeriodDataCompleteness } from '@/lib/insights/trend-insight'
import InsightHeader from '@/components/analytics/InsightHeader'

function formatPHP(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

// Derived from whatever months actually have ad or post data (Manila
// wall-clock, via manilaYearMonth — see lib/data/month-buckets.ts), rather
// than a fixed literal list — a hardcoded set silently excludes any month
// uploaded after the list was last updated (see lib/data/study-period.ts's
// STUDY_PERIOD_LABEL comment for the same "derive, don't hardcode"
// rationale), and using ad dates alone would drop post-only months. Both
// reporting_starts and reporting_ends are included so an ad row spanning a
// month boundary still marks every month it touches as covered.
function deriveTargetPeriods(dates: Date[]): TargetMonth[] {
  const seen = new Map<number, TargetMonth>()
  for (const d of dates) {
    const { year, month } = manilaYearMonth(d)
    const idx = monthIndex(year, month)
    if (!seen.has(idx)) {
      seen.set(idx, { label: MANILA_MONTH_LABEL_FMT.format(d), year, month })
    }
  }
  return Array.from(seen.entries())
    .sort(([a], [b]) => a - b)
    .map(([, period]) => period)
}

// Anchored to the declared study period (not just the span of uploaded
// data) so a dataset that only covers e.g. Jun-Jul 2026 still reports the
// other ten study-period months as missing, instead of going quiet because
// there's no gap *between* the two months that exist.
function missingMonthLabels(coveredIndices: Set<number>): string[] {
  const missing: string[] = []
  const start = manilaYearMonth(STUDY_PERIOD_START)
  const end = manilaYearMonth(STUDY_PERIOD_END)
  const startIdx = monthIndex(start.year, start.month)
  const endIdx = monthIndex(end.year, end.month)
  for (let idx = startIdx; idx <= endIdx; idx++) {
    if (coveredIndices.has(idx)) continue
    const year = Math.floor(idx / 12)
    const month = (idx % 12) + 1
    // Mid-month UTC instant so formatting with the Manila-zone label
    // formatter can never roll over into an adjacent month.
    missing.push(MANILA_MONTH_LABEL_FMT.format(new Date(Date.UTC(year, month - 1, 15))))
  }
  return missing
}

// docs/raven/Trend_Analysis_Corrections_and_Confidence_Decision.md §3.1 — a
// period only certifies as "fully present" when every ad row bucketed into
// it (by reporting_starts, matching adTrends' own bucketing above) also has
// its reporting_ends within that same calendar month. A row spanning a
// month boundary means this period's total is partly attributable to the
// row's other month too, not a clean single-month figure.
function isPeriodFullyPresent(monthAds: { reporting_ends: Date }[], year: number, month: number): boolean {
  if (monthAds.length === 0) return false
  return monthAds.every(a => {
    const end = manilaYearMonth(new Date(a.reporting_ends))
    return end.year === year && end.month === month
  })
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 text-xs">—</span>
  const up = value >= 0
  return (
    <span className={`text-xs font-medium ${up ? 'text-status-positive' : 'text-status-negative'}`}>
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(1)}% vs prev period
    </span>
  )
}

interface TrendAnalysisViewProps {
  emptyStateMessage: string
}

export default async function TrendAnalysisView({ emptyStateMessage }: TrendAnalysisViewProps) {
  const [allAds, allPosts] = await Promise.all([
    prisma.ad.findMany({
      where: STUDY_PERIOD_AD_WHERE,
      select: { reporting_starts: true, reporting_ends: true, amount_spent: true, total_messaging_contacts: true, reach: true },
    }),
    prisma.facebookPost.findMany({
      where: STUDY_PERIOD_POST_WHERE,
      select: { publish_time: true, engagement_rate: true, reach: true },
    }),
  ])

  const targetPeriods = deriveTargetPeriods([
    ...allAds.map(a => new Date(a.reporting_starts)),
    ...allAds.map(a => new Date(a.reporting_ends)),
    ...allPosts.map(p => new Date(p.publish_time)),
  ])

  const adTrends = targetPeriods.map(({ label, year, month }) => {
    const ads = rowsInMonth(allAds, a => new Date(a.reporting_starts), { label, year, month })
    const total_spend = ads.reduce((s, a) => s + a.amount_spent, 0)
    const total_inquiries = ads.reduce((s, a) => s + (a.total_messaging_contacts ?? 0), 0)
    const total_reach = ads.reduce((s, a) => s + (a.reach ?? 0), 0)
    const ad_count = ads.length
    return { period: label, total_spend, total_inquiries, total_reach, ad_count }
  })

  const postTrends = targetPeriods.map(({ label, year, month }) => {
    const posts = rowsInMonth(allPosts, p => new Date(p.publish_time), { label, year, month })
    const post_count = posts.length
    const avg_engagement_rate = post_count > 0 ? posts.reduce((s, p) => s + p.engagement_rate, 0) / post_count : 0
    const total_reach = posts.reduce((s, p) => s + p.reach, 0)
    return { period: label, post_count, avg_engagement_rate, total_reach }
  })

  const lastTwoPeriods = targetPeriods.slice(-2)
  const isConsecutive = lastTwoPeriods.length === 2
    && monthIndex(lastTwoPeriods[1].year, lastTwoPeriods[1].month) - monthIndex(lastTwoPeriods[0].year, lastTwoPeriods[0].month) === 1

  const periodCompleteness: PeriodDataCompleteness[] = targetPeriods.map(({ label, year, month }, i) => ({
    isFullyPresent: isPeriodFullyPresent(
      rowsInMonth(allAds, a => new Date(a.reporting_starts), { label, year, month }),
      year,
      month,
    ),
    hasAdRecords: adTrends[i].ad_count > 0,
    hasOrganicRecords: postTrends[i].post_count > 0,
  }))

  const insight = computeTrendInsight(adTrends, isConsecutive, periodCompleteness)

  const lastTwo = adTrends.slice(-2)
  const spendDelta = lastTwo.length === 2 && lastTwo[0].total_spend > 0
    ? ((lastTwo[1].total_spend - lastTwo[0].total_spend) / lastTwo[0].total_spend) * 100
    : null
  const inquiryDelta = lastTwo.length === 2 && lastTwo[0].total_inquiries > 0
    ? ((lastTwo[1].total_inquiries - lastTwo[0].total_inquiries) / lastTwo[0].total_inquiries) * 100
    : null

  const coveredMonthIndices = new Set(targetPeriods.map(p => monthIndex(p.year, p.month)))
  const missingMonths = missingMonthLabels(coveredMonthIndices)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader title="Trend Analysis" description="Period-over-period performance across paid ads and organic posts" />

      {missingMonths.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 mb-6 text-xs text-amber-700 dark:text-amber-300">
          Data is available for {targetPeriods.map(p => p.label).join(', ')} only. {missingMonths.join(', ')} {missingMonths.length === 1 ? 'is' : 'are'} not in the uploaded dataset.
        </div>
      )}

      {allAds.length === 0 ? (
        <div className="bg-card rounded-2xl card-shadow p-12 text-center text-gray-500 text-sm">
          {emptyStateMessage}
        </div>
      ) : (
        <>
          {insight && (
            <div className="bg-card rounded-2xl card-shadow p-6 mb-8">
              <InsightHeader
                confidence={insight.confidence}
                headline={insight.headline}
                detail={insight.detail}
                mathLabel="See the numbers behind this"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {adTrends.map(t => (
                    <div key={t.period} className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{t.period}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Spend</span>
                          <span className="font-semibold text-gray-800 text-sm">{formatPHP(t.total_spend)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Messaging Conversations</span>
                          <span className="font-semibold text-gray-800 text-sm">{t.total_inquiries}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Reach</span>
                          <span className="font-semibold text-gray-800 text-sm">{t.total_reach.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Ads</span>
                          <span className="font-semibold text-gray-800 text-sm">{t.ad_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {lastTwo.length === 2 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {lastTwo[0].period} → {lastTwo[1].period} · Spend
                      </p>
                      <DeltaBadge value={spendDelta} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {lastTwo[0].period} → {lastTwo[1].period} · Messaging Conversations
                      </p>
                      <DeltaBadge value={inquiryDelta} />
                    </div>
                  </div>
                )}
              </InsightHeader>
            </div>
          )}

          <TrendCharts adTrends={adTrends} postTrends={postTrends} />
        </>
      )}
    </div>
  )
}
