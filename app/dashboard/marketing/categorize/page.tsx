import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import ContentClient from '@/components/marketing/ContentClient'
import { parseContentFilter, type ContentFilter } from '@/lib/categorize/content-filter'
import type { Prisma } from '@/app/generated/prisma/client'

// docs/raven/Categorisation_Workflow_Consolidation.md §3.4 — canonical route
// for the merged Content screen (Phase 4 of
// docs/raven/Consolidation_Plan_Checklist.md). `/dashboard/marketing/content`
// redirects here with `?filter=all`.

const FILTER_DESCRIPTIONS: Record<ContentFilter, string> = {
  'needs-review': 'Review and finalize categories for uncategorized posts.',
  all: 'Every organic post and its assigned category.',
  categorised: 'Posts with a final category (excluding Unassigned), and who set it.',
  unassigned: 'Posts explicitly marked as unable to be categorized.',
}

// "Categorised" and "Unassigned" are mutually exclusive tabs, not overlapping
// checkboxes — code review (2026-08-23) flagged that `category_final: { not:
// null }` alone also matches UNCLASSIFIED rows, which then show up under
// both tabs and defeat the point of Unassigned being able to isolate them.
// Typed against Prisma.FacebookPostWhereInput (not left to inference) so a
// typo'd field name here fails tsc instead of silently matching every post.
function whereForFilter(filter: ContentFilter): Prisma.FacebookPostWhereInput {
  if (filter === 'needs-review') return { category_final: null }
  if (filter === 'categorised') return { category_final: { not: null, notIn: ['UNCLASSIFIED'] } }
  if (filter === 'unassigned') return { category_final: 'UNCLASSIFIED' }
  return {}
}

export default async function CategorizePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MARKETING_MANAGER' && session.user.role !== 'MARKETING_TEAM')) {
    redirect('/login')
  }

  const { filter: rawFilter } = await searchParams
  const filter = parseContentFilter(rawFilter)

  const posts = await prisma.facebookPost.findMany({
    where: whereForFilter(filter),
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
