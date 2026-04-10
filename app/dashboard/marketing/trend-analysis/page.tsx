import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import TrendCharts from '@/components/marketing/TrendCharts'

function formatPHP(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

const TARGET_PERIODS = [
  { label: 'Sep 2025', year: 2025, month: 9 },
  { label: 'Dec 2025', year: 2025, month: 12 },
  { label: 'Jan 2026', year: 2026, month: 1 },
]

export default async function TrendAnalysisPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    redirect('/login')
  }

  const [allAds, allPosts] = await Promise.all([
    prisma.ad.findMany({
      select: {
        reporting_starts: true,
        amount_spent: true,
        purchases: true,
        reach: true,
      },
    }),
    prisma.facebookPost.findMany({
      select: {
        publish_time: true,
        engagement_rate: true,
        reach: true,
      },
    }),
  ])

  // Build monthly ad trends
  const adTrends = TARGET_PERIODS.map(({ label, year, month }) => {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    const ads = allAds.filter(a => {
      const d = new Date(a.reporting_starts)
      return d >= start && d <= end
    })
    const total_spend = ads.reduce((s, a) => s + a.amount_spent, 0)
    const total_purchases = ads.reduce((s, a) => s + (a.purchases ?? 0), 0)
    const total_reach = ads.reduce((s, a) => s + (a.reach ?? 0), 0)
    const ad_count = ads.length
    return {
      period: label,
      total_spend,
      total_purchases,
      total_reach,
      ad_count,
      avg_spend_per_ad: ad_count > 0 ? total_spend / ad_count : 0,
    }
  })

  // Build monthly post trends (posts only have Sep 2025 data)
  const postTrends = TARGET_PERIODS.map(({ label, year, month }) => {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    const posts = allPosts.filter(p => {
      const d = new Date(p.publish_time)
      return d >= start && d <= end
    })
    const post_count = posts.length
    const avg_engagement_rate =
      post_count > 0 ? posts.reduce((s, p) => s + p.engagement_rate, 0) / post_count : 0
    const total_reach = posts.reduce((s, p) => s + p.reach, 0)
    return { period: label, post_count, avg_engagement_rate, total_reach }
  })

  // Month-over-month deltas (comparing last two periods)
  const lastTwo = adTrends.slice(-2)
  const spendDelta =
    lastTwo.length === 2 && lastTwo[0].total_spend > 0
      ? ((lastTwo[1].total_spend - lastTwo[0].total_spend) / lastTwo[0].total_spend) * 100
      : null
  const purchaseDelta =
    lastTwo.length === 2 && lastTwo[0].total_purchases > 0
      ? ((lastTwo[1].total_purchases - lastTwo[0].total_purchases) / lastTwo[0].total_purchases) * 100
      : null

  function DeltaBadge({ value }: { value: number | null }) {
    if (value === null) return <span className="text-slate-400 text-xs">—</span>
    const up = value >= 0
    return (
      <span className={`text-xs font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
        {up ? '▲' : '▼'} {Math.abs(value).toFixed(1)}% vs prev month
      </span>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Trend Analysis"
        description="Month-over-month performance across paid ads and organic posts"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {adTrends.map(t => (
          <div key={t.period} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">{t.period}</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Spend</span>
                <span className="font-semibold text-slate-800 text-sm">{formatPHP(t.total_spend)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Purchases</span>
                <span className="font-semibold text-green-700 text-sm">{t.total_purchases}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Reach</span>
                <span className="font-semibold text-slate-800 text-sm">{t.total_reach.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Ads</span>
                <span className="font-semibold text-slate-800 text-sm">{t.ad_count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MoM deltas */}
      {lastTwo.length === 2 && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 mb-8 flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              {lastTwo[0].period} → {lastTwo[1].period} · Spend
            </p>
            <DeltaBadge value={spendDelta} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              {lastTwo[0].period} → {lastTwo[1].period} · Purchases
            </p>
            <DeltaBadge value={purchaseDelta} />
          </div>
        </div>
      )}

      {allAds.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          No ad data found. Upload a Facebook Ads Manager CSV to see trends.
        </div>
      ) : (
        <TrendCharts adTrends={adTrends} postTrends={postTrends} />
      )}
    </div>
  )
}
