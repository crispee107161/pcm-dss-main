import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import TrendCharts from '@/components/marketing/TrendCharts'
import { computeTrendInsight } from '@/lib/insights/trend-insight'
import InsightHeader from '@/components/analytics/InsightHeader'

function formatPHP(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

const TARGET_PERIODS = [
  { label: 'Sep 2025', year: 2025, month: 9 },
  { label: 'Dec 2025', year: 2025, month: 12 },
  { label: 'Jan 2026', year: 2026, month: 1 },
]

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1)
}

function missingMonthLabels(): string[] {
  const missing: string[] = []
  for (let i = 0; i < TARGET_PERIODS.length - 1; i++) {
    const a = TARGET_PERIODS[i]
    const b = TARGET_PERIODS[i + 1]
    const gap = monthIndex(b.year, b.month) - monthIndex(a.year, a.month)
    for (let step = 1; step < gap; step++) {
      const idx = monthIndex(a.year, a.month) + step
      const year = Math.floor(idx / 12)
      const month = (idx % 12) + 1
      missing.push(`${MONTH_NAMES[month - 1]} ${year}`)
    }
  }
  return missing
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 text-xs">—</span>
  const up = value >= 0
  return (
    <span className={`text-xs font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
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
      select: { reporting_starts: true, amount_spent: true, inquiries: true, reach: true },
    }),
    prisma.facebookPost.findMany({
      select: { publish_time: true, engagement_rate: true, reach: true },
    }),
  ])

  const adTrends = TARGET_PERIODS.map(({ label, year, month }) => {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    const ads = allAds.filter(a => {
      const d = new Date(a.reporting_starts)
      return d >= start && d <= end
    })
    const total_spend = ads.reduce((s, a) => s + a.amount_spent, 0)
    const total_inquiries = ads.reduce((s, a) => s + (a.inquiries ?? 0), 0)
    const total_reach = ads.reduce((s, a) => s + (a.reach ?? 0), 0)
    const ad_count = ads.length
    return { period: label, total_spend, total_inquiries, total_reach, ad_count }
  })

  const postTrends = TARGET_PERIODS.map(({ label, year, month }) => {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    const posts = allPosts.filter(p => {
      const d = new Date(p.publish_time)
      return d >= start && d <= end
    })
    const post_count = posts.length
    const avg_engagement_rate = post_count > 0 ? posts.reduce((s, p) => s + p.engagement_rate, 0) / post_count : 0
    const total_reach = posts.reduce((s, p) => s + p.reach, 0)
    return { period: label, post_count, avg_engagement_rate, total_reach }
  })

  const lastTwoPeriods = TARGET_PERIODS.slice(-2)
  const isConsecutive = lastTwoPeriods.length === 2
    && monthIndex(lastTwoPeriods[1].year, lastTwoPeriods[1].month) - monthIndex(lastTwoPeriods[0].year, lastTwoPeriods[0].month) === 1

  const insight = computeTrendInsight(adTrends, isConsecutive)

  const lastTwo = adTrends.slice(-2)
  const spendDelta = lastTwo.length === 2 && lastTwo[0].total_spend > 0
    ? ((lastTwo[1].total_spend - lastTwo[0].total_spend) / lastTwo[0].total_spend) * 100
    : null
  const inquiryDelta = lastTwo.length === 2 && lastTwo[0].total_inquiries > 0
    ? ((lastTwo[1].total_inquiries - lastTwo[0].total_inquiries) / lastTwo[0].total_inquiries) * 100
    : null

  const missingMonths = missingMonthLabels()

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader title="Trend Analysis" description="Period-over-period performance across paid ads and organic posts" />

      {missingMonths.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 mb-6 text-xs text-amber-700 dark:text-amber-300">
          Data is available for {TARGET_PERIODS.map(p => p.label).join(', ')} only — {missingMonths.join(', ')} {missingMonths.length === 1 ? 'is' : 'are'} not in the uploaded dataset.
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
                          <span className="text-xs text-gray-500">Inquiries</span>
                          <span className="font-semibold text-green-400 text-sm">{t.total_inquiries}</span>
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
                        {lastTwo[0].period} → {lastTwo[1].period} · Inquiries
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
