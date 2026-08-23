import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar, { NavItem } from '@/components/nav/Sidebar'
import { UploadProvider } from '@/contexts/UploadContext'
import UploadStatusBar from '@/components/upload/UploadStatusBar'

// Regression and What-If Simulation are cut per mvp.md §5 — left off the nav
// so they're unreachable, route files stay on disk for a later dedicated
// deletion step.
//
// Sidebar consolidation per docs/raven/Response_Forecast_Upload_Sidebar.md §4
// (2026-08-22): Content Library removed (Owner doesn't audit content
// history — that's the Manager's screen, still on the Marketing nav); Method
// Evaluation moved under Reports (a research output the Owner looks at once,
// if that — still reachable, just not primary); Upload Data added (FR-04,
// Owner now has full upload rights alongside the Manager, see §2.1 of that
// doc). "Rankings" + "Top Ads" are NOT merged yet — see the comment on those
// two items below; the merge Raven's memo describes doesn't fit cleanly and
// needs a call from her first.
const navItems: NavItem[] = [
  { section: 'Overview',        label: 'Executive Dashboard',   href: '/dashboard/owner',                    icon: 'home' },
  { section: 'Data',            label: 'Upload Data',           href: '/dashboard/owner/upload',             icon: 'upload' },
  // Renamed from "Categorization Review" — the route now serves the merged
  // Content screen (docs/raven/Categorisation_Workflow_Consolidation.md §3,
  // Phase 4 of docs/raven/Consolidation_Plan_Checklist.md), not just the
  // review queue.
  { section: 'Content',         label: 'Content',               href: '/dashboard/owner/categorize',         icon: 'tag' },
  // "Correlation" (the old ad-metrics-vs-messaging Spearman matrix, cut-era
  // code) is superseded by S7 Analysis (FR-19-22) — unlinked from the nav,
  // route file left on disk per this repo's convention for superseded pages.
  { section: 'Analytics', label: 'Analysis', href: '/dashboard/owner/analysis', icon: 'chart' },
  {                             label: 'Budget Reallocation',   href: '/dashboard/owner/budget-reallocation', icon: 'wallet' },
  // NOT merged into one "Efficiency Rankings" screen yet, unlike Raven's memo
  // asks for (§4 #1): Rankings (ad-set-ranking) is a simple efficiency table
  // grouped by ad set/campaign, but Top Ads (campaign-rankings) is a richer
  // individual-ad screen with six top-10 panels (volume: spend/inquiries/reach,
  // efficiency: CPI/CTR/cost-per-click) plus a date filter — not "the same
  // table structure at every level." Merging would mean either dropping the
  // volume/CTR/cost-per-click panels to fit the simple table, or building a
  // bigger unified component. Flagged back to Raven rather than guessing
  // which one she wants — see docs/raven/Route_Inventory_and_Forecast_Removal.md.
  {                             label: 'Rankings',               href: '/dashboard/owner/ad-set-ranking',  icon: 'ranking' },
  {                             label: 'Top Ads',               href: '/dashboard/owner/campaign-rankings',  icon: 'ranking' },
  {                             label: 'Trend Analysis',        href: '/dashboard/owner/trend-analysis',     icon: 'trendUp' },
  {                             label: 'Page Metrics',          href: '/dashboard/owner/page-metrics',       icon: 'metrics' },
  {                             label: 'Category Performance',  href: '/dashboard/owner/category-performance', icon: 'category' },
  {                             label: 'Post Type Performance', href: '/dashboard/owner/post-type-performance', icon: 'layers' },
  { section: 'Reports',         label: 'Generate Report',       href: '/dashboard/owner/report',             icon: 'report' },
  {                             label: 'Method Evaluation',    href: '/dashboard/owner/method-evaluation', icon: 'compare' },
  { section: 'Administration',  label: 'User Management',       href: '/dashboard/owner/administration',     icon: 'users' },
  {                             label: 'Audit Log',             href: '/dashboard/owner/audit-log',          icon: 'auditLog' },
]

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  return (
    <UploadProvider>
      <Sidebar
        navItems={navItems}
        email={session.user.email ?? ''}
        roleLabel="Business Owner"
      >
        {children}
      </Sidebar>
      <UploadStatusBar />
    </UploadProvider>
  )
}
