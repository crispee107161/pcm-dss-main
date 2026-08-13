import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import MethodologyNote from '@/components/analytics/MethodologyNote'
import { computePostTypePerformance } from '@/lib/stats/post-type-performance'
import { computeWatchThrough } from '@/lib/stats/watch-through'
import PostTypePerformanceTable from '@/components/analytics/PostTypePerformanceTable'
import WatchThroughCard from '@/components/analytics/WatchThroughCard'

export default async function MarketingPostTypePerformancePage() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MARKETING_MANAGER' && session.user.role !== 'MARKETING_TEAM')) {
    redirect('/login')
  }

  const posts = await prisma.facebookPost.findMany({
    select: { post_type: true, reach: true, engagement_rate: true, views: true, duration_sec: true, avg_seconds_viewed: true },
  })

  const rows = computePostTypePerformance(posts)
  const linksRow = rows.find(r => r.postType === 'Link' || r.postType === 'Links')
  const watchThroughEligible = posts.filter(p => p.duration_sec !== null && p.avg_seconds_viewed !== null)
  const watchThrough = watchThroughEligible.length > 0 ? computeWatchThrough(posts) : null

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Post Type Performance"
        description="Organic posts compared by format — reach, engagement rate, and views, median per type"
      />

      <div className="bg-card rounded-2xl card-shadow p-4 mb-6 border-l-4 border-status-warning">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Confounding caveat:</span> Meta distributes reels differently from
          photos, so this reflects both content quality and algorithmic distribution — read it as a trade-off
          between formats, never as a ranking of &quot;which content is better.&quot;
        </p>
      </div>

      <div className="bg-card rounded-2xl card-shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">By Post Type (n={rows.length})</p>
        </div>
        <PostTypePerformanceTable rows={rows} />
      </div>

      {linksRow && linksRow.n === 1 && (
        <p className="text-[11px] text-muted-foreground mt-3">
          The single Links post above is one data point, not a trend — treat its figures as anecdotal.
        </p>
      )}

      {watchThrough && (
        <div className="mt-6">
          <WatchThroughCard result={watchThrough} />
        </div>
      )}

      <div className="mt-4">
        <MethodologyNote>
          Each organic post&apos;s reach, engagement rate, and views are grouped by its &quot;Post type&quot;
          value, then the median of each metric is taken per group — median, not mean, so a single viral post
          cannot pull the whole row upward. Groups with fewer than 3 posts are flagged &quot;low confidence&quot;
          rather than hidden, since a median of one or two posts is not a stable estimate. Watch-through rate
          (FR-28) is &quot;Average Seconds viewed&quot; divided by &quot;Duration (sec)&quot;, computable only for
          video/reel posts that report both fields.
        </MethodologyNote>
      </div>
    </div>
  )
}
