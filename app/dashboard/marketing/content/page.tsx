import { redirect } from 'next/navigation'

// docs/raven/Categorisation_Workflow_Consolidation.md §3.4 — Content Library
// was merged into the canonical Content screen (Phase 4 of
// docs/raven/Consolidation_Plan_Checklist.md); this route now just redirects
// to preserve the old bookmark/link. The destination route does its own auth
// check, so an unauthenticated visitor here just bounces through to /login
// via that check rather than needing a duplicate one here.
export default function ContentLibraryRedirectPage() {
  redirect('/dashboard/marketing/categorize?filter=all')
}
