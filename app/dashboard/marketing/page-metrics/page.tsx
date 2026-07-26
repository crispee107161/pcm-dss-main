import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import Link from 'next/link'
import {
  DailyMetricsChart,
  ViewsClicksChart,
  FollowerHistoryChart,
  ViewersChart,
  GenderPieChart,
  TerritoryChart,
  MovingAverageForecastChart,
} from '@/components/marketing/PageMetricsCharts'
import { computeHoltWintersForecast } from '@/lib/stats/forecast'

function fmt(date: Date) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(date))
}

function StatCard({ label, value, sub, color = 'text-gray-900' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="bg-card rounded-2xl card-shadow p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function EmptyCard({ message, uploadHref = '/dashboard/marketing/upload' }: {
  message: string; uploadHref?: string
}) {
  return (
    <div className="bg-card rounded-2xl border border-dashed border-gray-300 p-8 text-center">
      <p className="text-gray-400 text-sm mb-2">{message}</p>
      <Link href={uploadHref} className="text-red-600 hover:underline text-xs">
        Upload data →
      </Link>
    </div>
  )
}

export default async function PageMetricsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    redirect('/login')
  }

  const [
    dailyMetrics,
    followerHistory,
    pageViewers,
    genderData,
    territoryData,
    postCount,
    postAgg,
    typeBreakdown,
  ] = await Promise.all([
    prisma.pageMetricDaily.findMany({ orderBy: { date: 'asc' } }),
    prisma.followerHistory.findMany({ orderBy: { date: 'asc' } }),
    prisma.pageViewers.findMany({ orderBy: { date: 'asc' } }),
    prisma.followerGender.findMany({ orderBy: { distribution: 'desc' } }),
    prisma.followerTerritory.findMany({ orderBy: { distribution: 'desc' } }),
    prisma.facebookPost.count(),
    prisma.facebookPost.aggregate({
      _sum: { reach: true, reactions: true, comments: true, shares: true, views: true },
      _avg: { engagement_rate: true },
    }),
    prisma.facebookPost.groupBy({
      by: ['post_type'],
      _count: { id: true },
      _avg: { engagement_rate: true },
      orderBy: { _count: { id: 'desc' } },
    }),
  ])

  // --- Derived stats ---
  const latestFollowers = followerHistory.at(-1)?.followers ?? null
  const followerGrowth = followerHistory.length >= 2
    ? (followerHistory.at(-1)!.followers - followerHistory[0].followers)
    : null

  const totalFollows      = dailyMetrics.reduce((s, d) => s + (d.follows ?? 0), 0)
  const totalInteractions = dailyMetrics.reduce((s, d) => s + (d.interactions ?? 0), 0)
  const totalLinkClicks   = dailyMetrics.reduce((s, d) => s + (d.link_clicks ?? 0), 0)
  const totalViews        = dailyMetrics.reduce((s, d) => s + (d.views ?? 0), 0)
  const totalVisits       = dailyMetrics.reduce((s, d) => s + (d.visits ?? 0), 0)

  const totalNewViewers       = pageViewers.reduce((s, d) => s + d.new_viewers, 0)
  const totalReturningViewers = pageViewers.reduce((s, d) => s + d.returning_viewers, 0)

  const avgEngagement = postAgg._avg.engagement_rate ?? 0
  const totalPostReach = postAgg._sum.reach ?? 0

  // --- Holt-Winters forecast for page views (FR-22) ---
  const viewsForecast = computeHoltWintersForecast(
    dailyMetrics.map(d => ({ date: d.date, value: d.views })),
    7, 7
  )
  const forecastChartData = [
    ...viewsForecast.history.slice(-21).map(h => ({
      date: h.date.slice(5), // MM-DD
      value: h.value,
      ma: h.ma,
      forecast: undefined as number | undefined,
    })),
    ...viewsForecast.forecast.map(f => ({
      date: f.date.slice(5),
      value: undefined as number | undefined,
      ma: undefined as number | undefined,
      forecast: f.forecastValue,
    })),
  ]

  // --- Chart data ---
  const dailyChartData = dailyMetrics.map(d => ({
    date: fmt(d.date),
    follows:      d.follows,
    interactions: d.interactions,
    link_clicks:  d.link_clicks,
    views:        d.views,
    visits:       d.visits,
  }))

  const followerChartData = followerHistory.map(d => ({
    date:         fmt(d.date),
    followers:    d.followers,
    daily_change: d.daily_change,
  }))

  const viewerChartData = pageViewers.map(d => ({
    date:              fmt(d.date),
    total_viewers:     d.total_viewers,
    new_viewers:       d.new_viewers,
    returning_viewers: d.returning_viewers,
  }))

  const hasAnyData = dailyMetrics.length > 0 || followerHistory.length > 0 || pageViewers.length > 0 || genderData.length > 0

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Page Metrics"
        description="Facebook page-level performance: follows, views, interactions, demographics"
      />

      {/* Upload guide */}
      {!hasAnyData && postCount === 0 && (
        <div className="bg-card rounded-2xl card-shadow p-12 text-center mb-8">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-gray-700 font-semibold mb-2">No page data uploaded yet</h2>
          <p className="text-gray-500 text-sm max-w-lg mx-auto mb-6">
            Upload the following files from your Facebook export to unlock all metrics:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-xl mx-auto text-left mb-6">
            {[
              ['Follows.csv', 'Daily page follows'],
              ['Interactions.csv', 'Daily content interactions'],
              ['Link clicks.csv', 'Daily link clicks'],
              ['Views.csv', 'Daily page views'],
              ['Visits.csv', 'Daily page visits'],
              ['FollowerHistory.csv', 'Follower count over time'],
              ['Viewers.csv', 'New vs. returning viewers'],
              ['FollowerGender.csv', 'Audience gender split'],
              ['FollowerTopTerritories.csv', 'Audience by country'],
            ].map(([file, desc]) => (
              <div key={file} className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-xs font-mono text-gray-700">{file}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
          <Link href="/dashboard/marketing/upload" className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            Upload Data →
          </Link>
        </div>
      )}

      {/* ── SECTION 1: Organic Post Metrics ── */}
      {postCount > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-red-500 rounded-full inline-block" />
            Organic Post Performance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <StatCard label="Total Posts"      value={postCount.toLocaleString()} />
            <StatCard label="Total Reach"      value={(totalPostReach).toLocaleString()} color="text-red-400" />
            <StatCard label="Total Views"      value={(postAgg._sum.views ?? 0).toLocaleString()} color="text-violet-400" />
            <StatCard label="Reactions"        value={(postAgg._sum.reactions ?? 0).toLocaleString()} color="text-blue-400" />
            <StatCard label="Comments"         value={(postAgg._sum.comments ?? 0).toLocaleString()} color="text-yellow-400" />
            <StatCard label="Avg Engagement"   value={`${avgEngagement.toFixed(2)}%`} color="text-green-400" />
          </div>
          {typeBreakdown.length > 0 && (
            <div className="bg-card rounded-2xl card-shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-700 text-sm">Performance by Post Type</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Type</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Posts</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Avg Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {typeBreakdown.map(row => (
                    <tr key={row.post_type} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-700">{row.post_type}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{row._count.id}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{(row._avg.engagement_rate ?? 0).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 2: Daily Page Metrics ── */}
      {dailyMetrics.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-amber-400 rounded-full inline-block" />
            Daily Page Activity
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard label="Follows"      value={totalFollows.toLocaleString()}      sub="total in period" color="text-red-400" />
            <StatCard label="Interactions" value={totalInteractions.toLocaleString()} sub="total in period" color="text-yellow-400" />
            <StatCard label="Link Clicks"  value={totalLinkClicks.toLocaleString()}   sub="total in period" color="text-red-400" />
            <StatCard label="Page Views"   value={totalViews.toLocaleString()}         sub="total in period" color="text-violet-400" />
            <StatCard label="Page Visits"  value={totalVisits.toLocaleString()}        sub="total in period" color="text-green-400" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl card-shadow p-6">
              <h3 className="font-medium text-gray-700 mb-1 text-sm">Follows, Interactions & Visits</h3>
              <p className="text-xs text-gray-400 mb-4">Daily counts over the uploaded period</p>
              <DailyMetricsChart data={dailyChartData} />
            </div>
            <div className="bg-card rounded-2xl card-shadow p-6">
              <h3 className="font-medium text-gray-700 mb-1 text-sm">Page Views & Link Clicks</h3>
              <p className="text-xs text-gray-400 mb-4">Views (left axis) vs. link clicks (right axis)</p>
              <ViewsClicksChart data={dailyChartData} />
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-amber-400 rounded-full inline-block" />
            Daily Page Activity
          </h2>
          <EmptyCard message="Upload Follows, Interactions, Link clicks, Views, or Visits CSV to see daily trends." />
        </section>
      )}

      {/* ── SECTION 2b: 7-Day MA Forecast (FR-22) ── */}
      {dailyMetrics.length >= 7 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-500 rounded-full inline-block" />
            Page Views — Holt-Winters Forecast
            <span className="text-xs font-normal text-gray-400">(FR-22)</span>
          </h2>
          <div className="bg-card rounded-2xl card-shadow p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-gray-700 text-sm">Historical views + 7-day forecast</h3>
              <span className="text-xs text-gray-400">
                Level: {viewsForecast.lastLevel.toLocaleString()} views/day
                {viewsForecast.method === 'holt-winters' ? ' · Triple exp. smoothing (α=0.3, β=0.1, γ=0.3)' : ' · Double exp. smoothing'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Solid line = actual daily views · Red = H-W fitted values · Orange dots = 7-day forecast
            </p>
            <MovingAverageForecastChart data={forecastChartData} />
            <p className="text-xs text-gray-400 mt-3">
              {viewsForecast.method === 'holt-winters'
                ? 'Holt-Winters triple exponential smoothing captures trend and weekly seasonality for a more adaptive forecast.'
                : 'Holt linear (double exponential smoothing) used — upload more data to enable full Holt-Winters seasonal model.'}
            </p>
          </div>
        </section>
      )}

      {/* ── SECTION 3: Follower Growth ── */}
      {followerHistory.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-red-500 rounded-full inline-block" />
            Follower Growth
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {latestFollowers !== null && (
              <StatCard label="Current Followers" value={latestFollowers.toLocaleString()} color="text-red-400" />
            )}
            {followerGrowth !== null && (
              <StatCard
                label="Growth in Period"
                value={`${followerGrowth >= 0 ? '+' : ''}${followerGrowth.toLocaleString()}`}
                color={followerGrowth >= 0 ? 'text-green-400' : 'text-red-600'}
                sub={`${followerHistory[0] ? fmt(followerHistory[0].date) : ''} – ${followerHistory.at(-1) ? fmt(followerHistory.at(-1)!.date) : ''}`}
              />
            )}
            <StatCard label="Data Points" value={followerHistory.length.toLocaleString()} sub="days of history" />
          </div>
          <div className="bg-card rounded-2xl card-shadow p-6">
            <h3 className="font-medium text-gray-700 mb-1 text-sm">Follower Count & Daily Change</h3>
            <p className="text-xs text-gray-400 mb-4">Total followers (left) and day-over-day change (right)</p>
            <FollowerHistoryChart data={followerChartData} />
          </div>
        </section>
      ) : (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-red-500 rounded-full inline-block" />
            Follower Growth
          </h2>
          <EmptyCard message="Upload FollowerHistory.csv to see follower count trends." />
        </section>
      )}

      {/* ── SECTION 4: Viewers ── */}
      {pageViewers.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-violet-500 rounded-full inline-block" />
            Page Viewers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="New Viewers"       value={totalNewViewers.toLocaleString()}       color="text-red-400" sub="total in period" />
            <StatCard label="Returning Viewers" value={totalReturningViewers.toLocaleString()} color="text-green-400" sub="total in period" />
            <StatCard
              label="Return Rate"
              value={
                totalNewViewers + totalReturningViewers > 0
                  ? `${((totalReturningViewers / (totalNewViewers + totalReturningViewers)) * 100).toFixed(1)}%`
                  : '—'
              }
              color="text-violet-400"
            />
          </div>
          <div className="bg-card rounded-2xl card-shadow p-6">
            <h3 className="font-medium text-gray-700 mb-1 text-sm">New vs. Returning Viewers</h3>
            <p className="text-xs text-gray-400 mb-4">Stacked daily viewer counts</p>
            <ViewersChart data={viewerChartData} />
          </div>
        </section>
      ) : (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-violet-500 rounded-full inline-block" />
            Page Viewers
          </h2>
          <EmptyCard message="Upload Viewers.csv to see new vs. returning viewer trends." />
        </section>
      )}

      {/* ── SECTION 5: Audience Demographics ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-red-400 rounded-full inline-block" />
          Audience Demographics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {genderData.length > 0 ? (
            <div className="bg-card rounded-2xl card-shadow p-6">
              <h3 className="font-medium text-gray-700 mb-1 text-sm">Gender Distribution</h3>
              <p className="text-xs text-gray-400 mb-2">Follower gender breakdown</p>
              <GenderPieChart data={genderData} />
              <div className="mt-3 space-y-1">
                {genderData.map(g => (
                  <div key={g.gender} className="flex justify-between text-xs text-gray-600">
                    <span>{g.gender}</span>
                    <span className="font-medium">{(g.distribution * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-400 text-sm mb-2">No gender data. Upload FollowerGender.csv.</p>
              <Link href="/dashboard/marketing/upload" className="text-red-600 hover:underline text-xs">Upload data →</Link>
            </div>
          )}

          {territoryData.length > 0 ? (
            <div className="bg-card rounded-2xl card-shadow p-6">
              <h3 className="font-medium text-gray-700 mb-1 text-sm">Top Territories</h3>
              <p className="text-xs text-gray-400 mb-2">Followers by country/region</p>
              <TerritoryChart data={territoryData} />
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-400 text-sm mb-2">No territory data. Upload FollowerTopTerritories.csv.</p>
              <Link href="/dashboard/marketing/upload" className="text-red-600 hover:underline text-xs">Upload data →</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
