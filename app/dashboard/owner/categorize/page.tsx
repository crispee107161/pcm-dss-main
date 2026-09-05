import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { withStudyPeriod } from '@/lib/data/study-period'
import { PageHeader } from '@/components/nav/PageHeader'
import ContentClient from '@/components/marketing/ContentClient'
import { parseContentFilter, whereForFilter, type ContentFilter } from '@/lib/categorize/content-filter'

// docs/raven/Categorisation_Workflow_Consolidation.md §3.4 — Owner keeps this
// route, view-only, default filter "needs-review" (Phase 4 of
// docs/raven/Consolidation_Plan_Checklist.md). `/dashboard/owner/content` was
// deleted — already orphaned before this merge.

// docs/raven/Content_Second_Pass.md §3 — the "excluding the locked
// ground-truth benchmark" clause described a screen that no longer exists
// once §2 stops hiding those 200 posts here; removing the exclusion removed
// the need to explain it.
const FILTER_DESCRIPTIONS: Record<ContentFilter, string> = {
  'needs-review': 'Queue of posts awaiting a final category (view only).',
  all: 'Every organic post and its assigned category (view only).',
  // docs/raven-review/Unassigned_Labels_and_Coding_Procedure.md §2.1
  unassigned: 'Posts reviewed and found to have no determinable category. Reviewed, not skipped (view only).',
}

export default async function OwnerCategorizePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const session = await requireSession()
  if (session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const { filter: rawFilter } = await searchParams
  const filter = parseContentFilter(rawFilter)

  const posts = await prisma.facebookPost.findMany({
    where: withStudyPeriod(whereForFilter(filter, { includeGroundTruth: true })),
    orderBy: { publish_time: 'desc' },
    select: {
      id: true,
      title: true,
      permalink: true,
      post_type: true,
      publish_time: true,
      views: true,
      engagement_rate: true,
      category_keyword: true,
      category_llm: true,
      category_flag_reasons: true,
      category_final: true,
      category_final_source: true,
      category_final_assigned_at: true,
      category_final_assigned_by: { select: { email: true } },
    },
  })

  const postRows = posts.map((p) => ({
    id: p.id,
    title: p.title,
    permalink: p.permalink,
    post_type: p.post_type,
    publish_time: p.publish_time.toISOString(),
    views: p.views,
    engagement_rate: p.engagement_rate,
    keywordSuggestion: p.category_keyword,
    llmSuggestion: p.category_llm,
    flagReasons: p.category_flag_reasons,
    category_final: p.category_final,
    category_final_source: p.category_final_source,
    assignedByEmail: p.category_final_assigned_by?.email ?? null,
    assignedAt: p.category_final_assigned_at?.toISOString() ?? null,
  }))

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Content"
        description={FILTER_DESCRIPTIONS[filter]}
      />
      <ContentClient posts={postRows} role={session.user.role} filter={filter} />
    </div>
  )
}
