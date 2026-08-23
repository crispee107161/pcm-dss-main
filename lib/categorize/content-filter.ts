import type { Prisma } from '@/app/generated/prisma/client'

// docs/raven/Categorisation_Workflow_Consolidation.md §3.4 — filter state
// lives in the query string. Shared by both categorize/page.tsx routes
// (marketing + owner) so the whitelist can't silently drift between them —
// an unrecognised or absent value always falls back to "needs-review",
// never to showing every post unfiltered.
//
// docs/raven/Content_Filters_Review.md §7 — 'categorised' dropped
// (2026-08-23): it was All minus the uncategorised rows, which is a filter
// on a column rather than a distinct view, and the two screens looked
// identical for exactly that reason. Its one stated advantage (showing who
// set the category) already lives on All via ProvenanceCell.
export type ContentFilter = 'needs-review' | 'all' | 'unassigned'

export function parseContentFilter(raw: string | undefined): ContentFilter {
  if (raw === 'all' || raw === 'unassigned') return raw
  return 'needs-review'
}

// docs/raven/Content_Filters_Review.md §9 Q6 — the where clause every
// non-queue filter query must AND onto its own predicate, so the 200
// MANUAL_GROUND_TRUTH benchmark posts are invisible on every tab, not just
// uneditable (actions/categorize.ts already refuses the write; this is the
// read-side half of the same lock).
//
// Code review (2026-08-23) caught a real bug in an earlier version of this:
// `{ category_final_source: { not: 'MANUAL_GROUND_TRUTH' } }` does NOT match
// rows where category_final_source is NULL — Prisma/SQL's `!=` never matches
// NULL, it has to be spelled out. Every post still awaiting triage has a
// NULL source (it hasn't been assigned yet), so that version silently
// emptied the entire needs-review queue (130/130 posts hidden) and shrank
// All by the same 130. The explicit `OR` below is required, not stylistic.
export const EXCLUDE_GROUND_TRUTH = {
  OR: [
    { category_final_source: null },
    { category_final_source: { not: 'MANUAL_GROUND_TRUTH' as const } },
  ],
}

// docs/raven/Content_Filters_Review.md §1 and §9 Q6 — was duplicated
// byte-for-byte in both app/dashboard/{marketing,owner}/categorize/page.tsx;
// extracted here so the two routes can't silently drift the way this same
// duplication almost let 'categorised' vs 'all' drift before. Typed against
// Prisma.FacebookPostWhereInput (not left to inference) so a typo'd field
// name fails tsc instead of silently matching every post — same rationale
// as the original inline version (code review, 2026-08-23).
export function whereForFilter(filter: ContentFilter): Prisma.FacebookPostWhereInput {
  if (filter === 'needs-review') return { category_final: null, ...EXCLUDE_GROUND_TRUTH }
  if (filter === 'unassigned') return { category_final: 'UNCLASSIFIED', ...EXCLUDE_GROUND_TRUTH }
  return { ...EXCLUDE_GROUND_TRUTH }
}
