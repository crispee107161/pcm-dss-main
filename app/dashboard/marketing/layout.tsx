import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar, { NavItem } from '@/components/nav/Sidebar'
import { UploadProvider } from '@/contexts/UploadContext'
import UploadStatusBar from '@/components/upload/UploadStatusBar'

// Regression and What-If Simulation are cut per mvp.md §5 (regression to the
// mean / non-experimental data can't support "what if I change X" causal
// claims) — left off the nav so they're unreachable, route files stay on
// disk for a later dedicated deletion step.
const navItems: NavItem[] = [
  { section: 'Overview', label: 'Dashboard', href: '/dashboard/marketing', icon: 'home' },
  { section: 'Data', label: 'Upload Data', href: '/dashboard/marketing/upload', icon: 'upload' },
  // Single "Content" entry replacing the old "Content Library" +
  // "Categorization Review" pair — docs/raven/Categorisation_Workflow_Consolidation.md
  // §3, Phase 4 of docs/raven/Consolidation_Plan_Checklist.md. The route
  // itself now serves both (a `?filter=` query param switches the view);
  // /dashboard/marketing/content still exists as a redirect to preserve the
  // old link.
  { label: 'Content', href: '/dashboard/marketing/categorize', icon: 'tag' },
  // Renamed from "Manage Keywords" — the lexicon is now a frozen research
  // baseline (docs/raven/FR08_Seed_Lexicon_Rerun_Results.md), view-only.
  { label: 'Keyword Lexicon', href: '/dashboard/marketing/keywords', icon: 'key' },
  // "Correlation" (the old ad-metrics-vs-messaging Spearman matrix, cut-era
  // code) is superseded by S7 Analysis (FR-19-22) — unlinked from the nav,
  // route file left on disk per this repo's convention for superseded pages.
  { section: 'Analytics', label: 'Analysis', href: '/dashboard/marketing/analysis', icon: 'chart' },
  { label: 'Method Evaluation', href: '/dashboard/marketing/method-evaluation', icon: 'compare' },
  // Named "Top Ads" to match the Owner nav's naming for the same page — see
  // app/dashboard/owner/layout.tsx's comment on why "Campaign Rankings" was
  // renamed there (it ranks individual ads, not campaigns).
  { label: 'Top Ads', href: '/dashboard/marketing/campaign-rankings', icon: 'ranking' },
  { label: 'Post Type Performance', href: '/dashboard/marketing/post-type-performance', icon: 'layers' },
  // Manager-only (see TEAM_VISIBLE_HREFS below) per
  // docs/raven/FR_Mapping_Complete_and_Category_CPI_Gap.md §5 — reuses the
  // Owner screen's data-loader + presentational component
  // (lib/data/category-performance.ts, CategoryPerformanceView), not a
  // second implementation.
  { label: 'Category Performance', href: '/dashboard/marketing/category-performance', icon: 'category' },
  { label: 'Trend Analysis', href: '/dashboard/marketing/trend-analysis', icon: 'trendUp' },
  { label: 'Page Metrics', href: '/dashboard/marketing/page-metrics', icon: 'metrics' },
  { section: 'Reports', label: 'Generate Report', href: '/dashboard/marketing/report', icon: 'report' },
  { label: 'Audit Log', href: '/dashboard/marketing/audit-log', icon: 'auditLog' },
]

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MARKETING_MANAGER' && session.user.role !== 'MARKETING_TEAM')) {
    redirect('/login')
  }

  const isTeam = session.user.role === 'MARKETING_TEAM'
  // MARKETING_TEAM's screens are the Dashboard (S1, View), Content (View —
  // Phase 2 of docs/raven/Consolidation_Plan_Checklist.md removed Propose,
  // so Team is view-only here now, not "suggest only"), Post Type
  // Performance (S6, View — mvp.md §3 calls this "their screen"), and
  // Analysis (S7, View) — everything else on this nav (upload, reports) is
  // Marketing-Manager-only.
  const TEAM_VISIBLE_HREFS = new Set([
    '/dashboard/marketing', '/dashboard/marketing/categorize',
    '/dashboard/marketing/post-type-performance', '/dashboard/marketing/analysis',
    // S9 Reports — mvp.md §3 access matrix lists MARKETING_TEAM as View.
    '/dashboard/marketing/report',
  ])
  const visibleNavItems = isTeam
    ? navItems.filter((item) => TEAM_VISIBLE_HREFS.has(item.href))
    : navItems

  return (
    <UploadProvider>
      <Sidebar
        navItems={visibleNavItems}
        email={session.user.email ?? ''}
        roleLabel={isTeam ? 'Marketing Team' : 'Marketing Manager'}
      >
        {children}
      </Sidebar>
      <UploadStatusBar />
    </UploadProvider>
  )
}
