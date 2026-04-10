import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import {
  DailyMetricsChart,
  ViewsClicksChart,
  FollowerHistoryChart,
  ViewersChart,
  GenderPieChart,
  TerritoryChart,
} from '@/components/marketing/PageMetricsCharts'

function fmt(date: Date) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(date))
}

function StatCard({ label, value, sub, color = 'text-slate-900' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  )
}

export default async function OwnerPageMetricsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
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

  const dailyChartData = dailyMetrics.map(d => ({
    date: fmt(d.date),
    follows: d.follows, interactions: d.interactions,
    link_clicks: d.link_clicks, views: d.views, visits: d.visits,
  }))

  const followerChartData = followerHistory.map(d => ({
    date: fmt(d.date), followers: d.followers, daily_change: d.daily_change,
  }))

  const viewerChartData = pageViewers.map(d => ({
    date: fmt(d.date), total_viewers: d.total_viewers,
    new_viewers: d.new_viewers, returning_viewers: d.returning_viewers,
  }))

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Page Metrics"
        description="Facebook page-level performance: follows, views, interactions, demographics"
      />

      {/* ── SECTION 1: Organic Post Metrics ── */}
      {postCount > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-red-500 rounded-full inline-block" />
            Organic Post Performance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <StatCard label="Total Posts"    value={postCount.toLocaleString()} />
            <StatCard label="Total Reach"    value={totalPostReach.toLocaleString()} color="text-red-700" />
            <StatCard label="Total Views"    value={(postAgg._sum.views ?? 0).toLocaleString()} color="text-purple-700" />
            <StatCard label="Reactions"      value={(postAgg._sum.reactions ?? 0).toLocaleString()} color="text-pink-700" />
            <StatCard label="Comments"       value={(postAgg._sum.comments ?? 0).toLocaleString()} color="text-amber-700" />
            <StatCard label="Avg Engagement" value={`${avgEngagement.toFixed(2)}%`} color="text-green-700" />
          </div>
          {typeBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-medium text-slate-700 text-sm">Performance by Post Type</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Type</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Posts</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Avg Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {typeBreakdown.map(row => (
                    <tr key={row.post_type} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{row.post_type}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{row._count.id}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{(row._avg.engagement_rate ?? 0).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 2: Daily Page Metrics ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-amber-400 rounded-full inline-block" />
          Daily Page Activity
        </h2>
        {dailyMetrics.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <StatCard label="Follows"      value={totalFollows.toLocaleString()}      sub="total in period" color="text-red-700" />
              <StatCard label="Interactions" value={totalInteractions.toLocaleString()} sub="total in period" color="text-amber-700" />
              <StatCard label="Link Clicks"  value={totalLinkClicks.toLocaleString()}   sub="total in period" color="text-red-600" />
              <StatCard label="Page Views"   value={totalViews.toLocaleString()}         sub="total in period" color="text-purple-700" />
              <StatCard label="Page Visits"  value={totalVisits.toLocaleString()}        sub="total in period" color="text-green-700" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-medium text-slate-700 mb-1 text-sm">Follows, Interactions & Visits</h3>
                <p className="text-xs text-slate-400 mb-4">Daily counts over the uploaded period</p>
                <DailyMetricsChart data={dailyChartData} />
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-medium text-slate-700 mb-1 text-sm">Page Views & Link Clicks</h3>
                <p className="text-xs text-slate-400 mb-4">Views (left axis) vs. link clicks (right axis)</p>
                <ViewsClicksChart data={dailyChartData} />
              </div>
            </div>
          </>
        ) : (
          <EmptyCard message="No daily page metric data uploaded yet." />
        )}
      </section>

      {/* ── SECTION 3: Follower Growth ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-red-500 rounded-full inline-block" />
          Follower Growth
        </h2>
        {followerHistory.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {latestFollowers !== null && (
                <StatCard label="Current Followers" value={latestFollowers.toLocaleString()} color="text-red-700" />
              )}
              {followerGrowth !== null && (
                <StatCard
                  label="Growth in Period"
                  value={`${followerGrowth >= 0 ? '+' : ''}${followerGrowth.toLocaleString()}`}
                  color={followerGrowth >= 0 ? 'text-green-700' : 'text-red-600'}
                  sub={`${followerHistory[0] ? fmt(followerHistory[0].date) : ''} – ${followerHistory.at(-1) ? fmt(followerHistory.at(-1)!.date) : ''}`}
                />
              )}
              <StatCard label="Data Points" value={followerHistory.length.toLocaleString()} sub="days of history" />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-medium text-slate-700 mb-1 text-sm">Follower Count & Daily Change</h3>
              <p className="text-xs text-slate-400 mb-4">Total followers (left) and day-over-day change (right)</p>
              <FollowerHistoryChart data={followerChartData} />
            </div>
          </>
        ) : (
          <EmptyCard message="No follower history data uploaded yet." />
        )}
      </section>

      {/* ── SECTION 4: Viewers ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-purple-500 rounded-full inline-block" />
          Page Viewers
        </h2>
        {pageViewers.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <StatCard label="New Viewers"       value={totalNewViewers.toLocaleString()}       color="text-red-700" sub="total in period" />
              <StatCard label="Returning Viewers" value={totalReturningViewers.toLocaleString()} color="text-green-700" sub="total in period" />
              <StatCard
                label="Return Rate"
                value={
                  totalNewViewers + totalReturningViewers > 0
                    ? `${((totalReturningViewers / (totalNewViewers + totalReturningViewers)) * 100).toFixed(1)}%`
                    : '—'
                }
                color="text-purple-700"
              />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-medium text-slate-700 mb-1 text-sm">New vs. Returning Viewers</h3>
              <p className="text-xs text-slate-400 mb-4">Stacked daily viewer counts</p>
              <ViewersChart data={viewerChartData} />
            </div>
          </>
        ) : (
          <EmptyCard message="No viewer data uploaded yet." />
        )}
      </section>

      {/* ── SECTION 5: Audience Demographics ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-pink-500 rounded-full inline-block" />
          Audience Demographics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {genderData.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-medium text-slate-700 mb-1 text-sm">Gender Distribution</h3>
              <p className="text-xs text-slate-400 mb-2">Follower gender breakdown</p>
              <GenderPieChart data={genderData} />
              <div className="mt-3 space-y-1">
                {genderData.map(g => (
                  <div key={g.gender} className="flex justify-between text-xs text-slate-600">
                    <span>{g.gender}</span>
                    <span className="font-medium">{(g.distribution * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyCard message="No gender data uploaded yet." />
          )}
          {territoryData.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-medium text-slate-700 mb-1 text-sm">Top Territories</h3>
              <p className="text-xs text-slate-400 mb-2">Followers by country/region</p>
              <TerritoryChart data={territoryData} />
            </div>
          ) : (
            <EmptyCard message="No territory data uploaded yet." />
          )}
        </div>
      </section>
    </div>
  )
}
