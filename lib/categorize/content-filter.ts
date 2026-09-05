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
//
// docs/raven/Content_Second_Pass.md §2 and docs/raven/Show_All_731_and_
// Chapter3_Wording.md §2.2 — includeGroundTruth exists because hiding the
// 200 reference posts protects nothing FR-08 doesn't already get from the
// server-side write refusal (actions/categorize.ts's updatePostCategory)
// and CategoryEditCell's own isGroundTruth branch, which renders them locked
// rather than editable regardless of role. Hiding them only opened an
// unexplained 731-vs-531 gap against the Executive Dashboard's count. Both
// Owner and Marketing Manager routes now pass includeGroundTruth: true;
// the locked-and-visible treatment does the same job the exclusion used to
// do for the Manager (who can edit other rows), so the flag defaults to
// false only for callers that don't opt in explicitly.
export function whereForFilter(filter: ContentFilter, opts: { includeGroundTruth?: boolean } = {}): Prisma.FacebookPostWhereInput {
  const groundTruth = opts.includeGroundTruth ? {} : EXCLUDE_GROUND_TRUTH
  if (filter === 'needs-review') return { category_final: null, ...groundTruth }
  // docs/raven/Content_Second_Pass.md §1 — UNCLASSIFIED (the system's own
  // abstain) and UNCLEAR (a human coder's "cannot decide" verdict, written
  // only by the codebook/ground-truth import scripts — see CategoryLabel's
  // doc comments in prisma/schema.prisma) are two mechanisms for the same
  // "no determinable category" concept this tab is meant to surface.
  // Filtering on UNCLASSIFIED alone left every UNCLEAR-labelled post
  // invisible here even though it's categorised and excluded from nothing
  // else.
  if (filter === 'unassigned') return { category_final: { in: ['UNCLASSIFIED', 'UNCLEAR'] }, ...groundTruth }
  return { ...groundTruth }
}
