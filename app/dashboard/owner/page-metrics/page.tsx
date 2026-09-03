import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { withStudyPeriod, withStudyPeriodPageMetric } from '@/lib/data/study-period'
import { demographicSnapshotSuffix } from '@/lib/data/demographic-snapshot'
import { PageHeader } from '@/components/nav/PageHeader'
import DateRangeFilter from '@/components/ui/DateRangeFilter'
import {
  DailyMetricsChart,
  ViewsClicksChart,
  FollowerHistoryChart,
  ViewersChart,
  GenderPieChart,
  TerritoryChart,
  AgeGenderChart,
  AudienceRankChart,
} from '@/components/marketing/PageMetricsCharts'
import {
  computeDailyActivityInsight,
  computeViewsClicksInsight,
  computeFollowerGrowthInsight,
  computeViewerMixInsight,
  computeGenderInsight,
  computeTerritoryInsight,
  computePostTypeInsight,
  computeAgeGenderInsight,
  computeAudienceLocationInsight,
} from '@/lib/insights/page-metrics-insight'
import InsightHeader from '@/components/analytics/InsightHeader'
import { manilaDayRange } from '@/lib/date-range'

function fmt(date: Date) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(date))
}

function StatCard({ label, value, sub, color = 'text-foreground' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="bg-card rounded-2xl card-shadow p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

// Owner can't upload (role-gated to Marketing Manager/Team), so the empty
// state explains who to ask instead of offering a CTA the owner can't act on.
function EmptyCard({ message }: { message: string }) {
  return (
    <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center">
      <p className="text-foreground font-semibold mb-1 text-sm">No data yet</p>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">{message}</p>
    </div>
  )
}

export default async function OwnerPageMetricsPage({
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
  const dateWhere = { where: range ? { date: range } : undefined }
  // FR-04a — PageMetricDaily was never scoped to the study period anywhere
  // in the codebase (docs/raven/Executive_Dashboard_Review.md A2); this
  // screen's own daily-activity chart is exactly the kind of "analytical
  // output" the requirement means, so the study-period floor is ANDed onto
  // whatever date range the user picked. followerHistory/pageViewers below
  // keep the plain dateWhere — a broader scope than what A2 flagged.
  const pageMetricWhere = { where: withStudyPeriodPageMetric(range ? { date: range } : undefined) }
  const postWhere = { where: withStudyPeriod(range ? { publish_time: range } : undefined) }
  const noDataMessage = range ? 'No data in the selected period.' : undefined

  const [
    dailyMetrics,
    followerHistory,
    pageViewers,
    genderData,
    territoryData,
    ageGenderData,
    audienceRankData,
    postCount,
    postAgg,
    typeBreakdown,
  ] = await Promise.all([
    prisma.pageMetricDaily.findMany({ ...pageMetricWhere, orderBy: { date: 'asc' } }),
    prisma.followerHistory.findMany({ ...dateWhere, orderBy: { date: 'asc' } }),
    prisma.pageViewers.findMany({ ...dateWhere, orderBy: { date: 'asc' } }),
    // No per-row date filter — these are point-in-time snapshots, not a
    // series (the source files carry no date of their own; captured_at is
    // the upload moment, see docs/raven/Three_Decisions_and_FR_Table_Writable.md
    // §3). Always all-time; "as of" is rendered from captured_at below.
    prisma.followerGender.findMany({ orderBy: { distribution: 'desc' } }),
    prisma.followerTerritory.findMany({ orderBy: { distribution: 'desc' } }),
    prisma.followerAgeGender.findMany({ orderBy: { age_bracket: 'asc' } }),
    prisma.followerAudienceRank.findMany({ orderBy: { distribution: 'desc' } }),
    prisma.facebookPost.count(postWhere),
    prisma.facebookPost.aggregate({
      ...postWhere,
      _sum: { reach: true, reactions: true, comments: true, shares: true, views: true },
      _avg: { engagement_rate: true },
    }),
    prisma.facebookPost.groupBy({
      by: ['post_type'],
      ...postWhere,
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

  const dailyActivityInsight = computeDailyActivityInsight(dailyMetrics)
  const viewsClicksInsight   = computeViewsClicksInsight(dailyMetrics)
  const followerGrowthInsight = computeFollowerGrowthInsight(followerHistory)
  const viewerMixInsight     = computeViewerMixInsight(pageViewers)
  const genderInsight        = computeGenderInsight(genderData)
  const territoryInsight     = computeTerritoryInsight(territoryData)
  const postTypeInsight      = computePostTypeInsight(typeBreakdown)
  const ageGenderInsight     = computeAgeGenderInsight(ageGenderData)

  const topCities = audienceRankData.filter(r => r.category === 'city')
  const topCitiesInsight = computeAudienceLocationInsight(topCities)

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
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Page Metrics"
        description="Facebook page-level performance: follows, views, interactions, demographics"
      />

      <DateRangeFilter from={from} to={to} className="mb-6" />

      {/* ── SECTION 1: Organic Post Metrics ── */}
      {postCount > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-border rounded-full inline-block" />
            Organic Post Performance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <StatCard label="Total Posts"    value={postCount.toLocaleString()} />
            <StatCard label="Total Reach"    value={totalPostReach.toLocaleString()} />
            <StatCard label="Total Views"    value={(postAgg._sum.views ?? 0).toLocaleString()} />
            <StatCard label="Reactions"      value={(postAgg._sum.reactions ?? 0).toLocaleString()} />
            <StatCard label="Comments"       value={(postAgg._sum.comments ?? 0).toLocaleString()} />
            <StatCard label="Avg Engagement" value={`${avgEngagement.toFixed(2)}%`} />
          </div>
          {typeBreakdown.length > 0 && (
            <div className="bg-card rounded-2xl card-shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-medium text-foreground text-sm">Performance by Post Type</h3>
                {postTypeInsight && (
                  <p className="text-xs text-muted-foreground mt-1">{postTypeInsight.headline}. {postTypeInsight.detail}</p>
                )}
              </div>
              <div className="table-scroll rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Type</th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Posts</th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Avg Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeBreakdown.map(row => (
                      <tr key={row.post_type} className="border-t border-border hover:bg-secondary">
                        <td className="px-4 py-2.5 font-medium text-foreground">{row.post_type}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{row._count.id}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{(row._avg.engagement_rate ?? 0).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 2: Daily Page Metrics ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-border rounded-full inline-block" />
          Daily Page Activity
        </h2>
        {dailyMetrics.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <StatCard label="Follows"      value={totalFollows.toLocaleString()}      sub="total in period" />
              <StatCard label="Interactions" value={totalInteractions.toLocaleString()} sub="total in period" />
              <StatCard label="Link Clicks"  value={totalLinkClicks.toLocaleString()}   sub="total in period" />
              <StatCard label="Page Views"   value={totalViews.toLocaleString()}         sub="total in period" />
              <StatCard label="Page Visits"  value={totalVisits.toLocaleString()}        sub="total in period" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-2xl card-shadow p-6">
                <h3 className="font-medium text-foreground mb-1 text-sm">Follows, Interactions & Visits</h3>
                <p className="text-xs text-muted-foreground mb-4">Daily counts over the uploaded period</p>
                {dailyActivityInsight && (
                  <InsightHeader headline={dailyActivityInsight.headline} detail={dailyActivityInsight.detail} />
                )}
                <div className="mt-4">
                  <DailyMetricsChart data={dailyChartData} />
                </div>
              </div>
              <div className="bg-card rounded-2xl card-shadow p-6">
                <h3 className="font-medium text-foreground mb-1 text-sm">Page Views & Link Clicks</h3>
                <p className="text-xs text-muted-foreground mb-4">Page views and link clicks, shown separately since clicks are a fraction of views</p>
                {viewsClicksInsight && (
                  <InsightHeader headline={viewsClicksInsight.headline} detail={viewsClicksInsight.detail} />
                )}
                <div className="mt-4">
                  <ViewsClicksChart data={dailyChartData} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <EmptyCard message={noDataMessage ?? 'No data yet — ask your Marketing Manager to upload daily page activity data.'} />
        )}
      </section>

      {/* ── SECTION 3: Follower Growth ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-border rounded-full inline-block" />
          Follower Growth
        </h2>
        {followerHistory.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {latestFollowers !== null && (
                <StatCard label="Current Followers" value={latestFollowers.toLocaleString()} />
              )}
              {followerGrowth !== null && (
                <StatCard
                  label="Growth in Period"
                  value={`${followerGrowth >= 0 ? '+' : ''}${followerGrowth.toLocaleString()}`}
                  color={followerGrowth >= 0 ? 'text-status-positive' : 'text-status-negative'}
                  sub={`${followerHistory[0] ? fmt(followerHistory[0].date) : ''} – ${followerHistory.at(-1) ? fmt(followerHistory.at(-1)!.date) : ''}`}
                />
              )}
              <StatCard label="Data Points" value={followerHistory.length.toLocaleString()} sub="days of history" />
            </div>
            <div className="bg-card rounded-2xl card-shadow p-6">
              <h3 className="font-medium text-foreground mb-1 text-sm">Follower Count & Daily Change</h3>
              <p className="text-xs text-muted-foreground mb-4">Total followers and day-over-day change, shown separately since they're different scales</p>
              {followerGrowthInsight && (
                <InsightHeader headline={followerGrowthInsight.headline} detail={followerGrowthInsight.detail} />
              )}
              <div className="mt-4">
                <FollowerHistoryChart data={followerChartData} />
              </div>
            </div>
          </>
        ) : (
          <EmptyCard message={noDataMessage ?? 'No data yet — ask your Marketing Manager to upload follower history data.'} />
        )}
      </section>

      {/* ── SECTION 4: Viewers ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-border rounded-full inline-block" />
          Page Viewers
        </h2>
        {pageViewers.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <StatCard label="New Viewers"       value={totalNewViewers.toLocaleString()}       sub="total in period" />
              <StatCard label="Returning Viewers" value={totalReturningViewers.toLocaleString()} sub="total in period" />
              <StatCard
                label="Return Rate"
                value={
                  totalNewViewers + totalReturningViewers > 0
                    ? `${((totalReturningViewers / (totalNewViewers + totalReturningViewers)) * 100).toFixed(1)}%`
                    : '—'
                }
              />
            </div>
            <div className="bg-card rounded-2xl card-shadow p-6">
              <h3 className="font-medium text-foreground mb-1 text-sm">New vs. Returning Viewers</h3>
              <p className="text-xs text-muted-foreground mb-4">Stacked daily viewer counts</p>
              {viewerMixInsight && (
                <InsightHeader headline={viewerMixInsight.headline} detail={viewerMixInsight.detail} />
              )}
              <div className="mt-4">
                <ViewersChart data={viewerChartData} />
              </div>
            </div>
          </>
        ) : (
          <EmptyCard message={noDataMessage ?? 'No data yet — ask your Marketing Manager to upload page viewer data.'} />
        )}
      </section>

      {/* ── SECTION 5: Audience Demographics ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-border rounded-full inline-block" />
          Audience Demographics
        </h2>
        <p className="text-xs text-muted-foreground -mt-3 mb-4">Current audience snapshot — not affected by the date filter above.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {genderData.length > 0 ? (
            <div className="bg-card rounded-2xl card-shadow p-6">
              <h3 className="font-medium text-foreground mb-1 text-sm">Gender Distribution</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Follower gender breakdown{demographicSnapshotSuffix(genderData)}
              </p>
              <GenderPieChart data={genderData} />
              <div className="mt-3 space-y-1">
                {genderData.map(g => (
                  <div key={g.gender} className="flex justify-between text-xs text-muted-foreground">
                    <span>{g.gender}</span>
                    <span className="font-medium">{(g.distribution * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              {genderInsight && (
                <div className="mt-3 pt-3 border-t border-border">
                  <InsightHeader headline={genderInsight.headline} detail={genderInsight.detail} />
                </div>
              )}
            </div>
          ) : (
            <EmptyCard message="No data yet — ask your Marketing Manager to upload follower gender data." />
          )}
          {territoryData.length > 0 ? (
            <div className="bg-card rounded-2xl card-shadow p-6">
              <h3 className="font-medium text-foreground mb-1 text-sm">Top Territories</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Followers by country/region{demographicSnapshotSuffix(territoryData)}
              </p>
              <TerritoryChart data={territoryData} />
              {territoryInsight && (
                <div className="mt-3 pt-3 border-t border-border">
                  <InsightHeader headline={territoryInsight.headline} detail={territoryInsight.detail} />
                </div>
              )}
            </div>
          ) : (
            <EmptyCard message="No data yet — ask your Marketing Manager to upload follower territory data." />
          )}
        </div>

        {(ageGenderData.length > 0 || topCities.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {ageGenderData.length > 0 && (
              <div className="bg-card rounded-2xl card-shadow p-6">
                <h3 className="font-medium text-foreground mb-1 text-sm">Age &amp; Gender</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Audience share by age bracket and gender{demographicSnapshotSuffix(ageGenderData)}
                </p>
                <AgeGenderChart data={ageGenderData} />
                {ageGenderInsight && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <InsightHeader headline={ageGenderInsight.headline} detail={ageGenderInsight.detail} />
                  </div>
                )}
              </div>
            )}
            {topCities.length > 0 && (
              <div className="bg-card rounded-2xl card-shadow p-6">
                <h3 className="font-medium text-foreground mb-1 text-sm">Top Cities</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Followers by city{demographicSnapshotSuffix(topCities)}
                </p>
                <AudienceRankChart data={topCities} />
                {topCitiesInsight && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <InsightHeader headline={topCitiesInsight.headline} detail={topCitiesInsight.detail} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
