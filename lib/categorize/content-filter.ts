// docs/raven/Categorisation_Workflow_Consolidation.md §3.4 — filter state
// lives in the query string. Shared by both categorize/page.tsx routes
// (marketing + owner) so the whitelist can't silently drift between them —
// an unrecognised or absent value always falls back to "needs-review",
// never to showing every post unfiltered.
export type ContentFilter = 'needs-review' | 'all' | 'categorised' | 'unassigned'

export function parseContentFilter(raw: string | undefined): ContentFilter {
  if (raw === 'all' || raw === 'categorised' || raw === 'unassigned') return raw
  return 'needs-review'
}
