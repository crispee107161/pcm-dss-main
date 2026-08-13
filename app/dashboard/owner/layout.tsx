import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar, { NavItem } from '@/components/nav/Sidebar'
import {
  IconHome, IconChart, IconTag,
  IconRanking, IconTrendUp, IconMetrics, IconReport, IconUsers, IconCategory, IconWallet, IconRegression, IconAuditLog, IconScale,
  IconFolder, IconLayers,
} from '@/components/nav/icons'

// Regression and What-If Simulation are cut per mvp.md §5 — left off the nav
// so they're unreachable, route files stay on disk for a later dedicated
// deletion step.
const navItems: NavItem[] = [
  { section: 'Overview',        label: 'Executive Dashboard',   href: '/dashboard/owner',                    icon: <IconHome /> },
  { section: 'Content',         label: 'Content Library',       href: '/dashboard/owner/content',            icon: <IconFolder /> },
  {                             label: 'Categorization Review',  href: '/dashboard/owner/categorize',         icon: <IconTag /> },
  // "Correlation" (the old ad-metrics-vs-messaging Spearman matrix, cut-era
  // code) is superseded by S7 Analysis (FR-19-22) — unlinked from the nav,
  // route file left on disk per this repo's convention for superseded pages.
  { section: 'Analytics', label: 'Analysis', href: '/dashboard/owner/analysis', icon: <IconChart /> },
  {                             label: 'Method Evaluation',    href: '/dashboard/owner/method-evaluation', icon: <IconScale /> },
  {                             label: 'Budget Reallocation',   href: '/dashboard/owner/budget-reallocation', icon: <IconWallet /> },
  {                             label: 'Rankings',               href: '/dashboard/owner/ad-set-ranking',  icon: <IconRanking /> },
  // Renamed from "Campaign Rankings" (the label it shared with the FR-26 page
  // above, which actually ranks by group) — this page ranks individual ads,
  // not campaigns; see its PageHeader copy, unchanged.
  {                             label: 'Top Ads',               href: '/dashboard/owner/campaign-rankings',  icon: <IconRegression /> },
  {                             label: 'Trend Analysis',        href: '/dashboard/owner/trend-analysis',     icon: <IconTrendUp /> },
  {                             label: 'Page Metrics',          href: '/dashboard/owner/page-metrics',       icon: <IconMetrics /> },
  {                             label: 'Category Performance',  href: '/dashboard/owner/category-performance', icon: <IconCategory /> },
  {                             label: 'Post Type Performance', href: '/dashboard/owner/post-type-performance', icon: <IconLayers /> },
  { section: 'Reports',         label: 'Generate Report',       href: '/dashboard/owner/report',             icon: <IconReport /> },
  { section: 'Administration',  label: 'User Management',       href: '/dashboard/owner/administration',     icon: <IconUsers /> },
  {                             label: 'Audit Log',             href: '/dashboard/owner/audit-log',          icon: <IconAuditLog /> },
]

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  return (
    <Sidebar
      navItems={navItems}
      email={session.user.email ?? ''}
      roleLabel="Business Owner"
    >
      {children}
    </Sidebar>
  )
}
