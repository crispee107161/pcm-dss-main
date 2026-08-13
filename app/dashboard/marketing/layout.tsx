import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar, { NavItem } from '@/components/nav/Sidebar'
import {
  IconHome, IconUpload, IconTag, IconKey, IconChart,
  IconRanking, IconTrendUp, IconMetrics, IconReport, IconAuditLog, IconScale,
  IconFolder, IconLayers,
} from '@/components/nav/icons'
import { UploadProvider } from '@/contexts/UploadContext'
import UploadStatusBar from '@/components/upload/UploadStatusBar'

// Regression and What-If Simulation are cut per mvp.md §5 (regression to the
// mean / non-experimental data can't support "what if I change X" causal
// claims) — left off the nav so they're unreachable, route files stay on
// disk for a later dedicated deletion step.
const navItems: NavItem[] = [
  { section: 'Overview', label: 'Dashboard', href: '/dashboard/marketing', icon: <IconHome /> },
  { section: 'Data', label: 'Upload Data', href: '/dashboard/marketing/upload', icon: <IconUpload /> },
  { label: 'Content Library', href: '/dashboard/marketing/content', icon: <IconFolder /> },
  { label: 'Categorization Review', href: '/dashboard/marketing/categorize', icon: <IconTag /> },
  { label: 'Manage Keywords', href: '/dashboard/marketing/keywords', icon: <IconKey /> },
  // "Correlation" (the old ad-metrics-vs-messaging Spearman matrix, cut-era
  // code) is superseded by S7 Analysis (FR-19-22) — unlinked from the nav,
  // route file left on disk per this repo's convention for superseded pages.
  { section: 'Analytics', label: 'Analysis', href: '/dashboard/marketing/analysis', icon: <IconChart /> },
  { label: 'Method Evaluation', href: '/dashboard/marketing/method-evaluation', icon: <IconScale /> },
  { label: 'Campaign Rankings', href: '/dashboard/marketing/campaign-rankings', icon: <IconRanking /> },
  { label: 'Post Type Performance', href: '/dashboard/marketing/post-type-performance', icon: <IconLayers /> },
  { label: 'Trend Analysis', href: '/dashboard/marketing/trend-analysis', icon: <IconTrendUp /> },
  { label: 'Page Metrics', href: '/dashboard/marketing/page-metrics', icon: <IconMetrics /> },
  { section: 'Reports', label: 'Generate Report', href: '/dashboard/marketing/report', icon: <IconReport /> },
  { label: 'Audit Log', href: '/dashboard/marketing/audit-log', icon: <IconAuditLog /> },
]

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MARKETING_MANAGER' && session.user.role !== 'MARKETING_TEAM')) {
    redirect('/login')
  }

  const isTeam = session.user.role === 'MARKETING_TEAM'
  // MARKETING_TEAM's screens are the Dashboard (S1, View), Content Library
  // (View), Categorization Review (suggest only), Post Type Performance
  // (S6, View — mvp.md §3 calls this "their screen"), and Analysis (S7,
  // View) — everything else on this nav (upload, reports) is
  // Marketing-Manager-only.
  const TEAM_VISIBLE_HREFS = new Set([
    '/dashboard/marketing', '/dashboard/marketing/content', '/dashboard/marketing/categorize',
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
