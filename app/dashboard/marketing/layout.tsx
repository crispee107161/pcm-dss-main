import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar, { NavItem } from '@/components/nav/Sidebar'
import {
  IconHome, IconUpload, IconTag, IconKey, IconChart,
  IconRegression, IconPlay, IconRanking, IconTrendUp, IconMetrics, IconReport,
} from '@/components/nav/icons'

const navItems: NavItem[] = [
  { section: 'Overview', label: 'Dashboard', href: '/dashboard/marketing', icon: <IconHome /> },
  { section: 'Data', label: 'Upload Data', href: '/dashboard/marketing/upload', icon: <IconUpload /> },
  { label: 'Categorize Content', href: '/dashboard/marketing/categorize', icon: <IconTag /> },
  { label: 'Manage Keywords', href: '/dashboard/marketing/keywords', icon: <IconKey /> },
  { section: 'Analytics', label: 'Correlation', href: '/dashboard/marketing/correlation', icon: <IconChart /> },
  { label: 'Regression', href: '/dashboard/marketing/regression', icon: <IconRegression /> },
  { label: 'What-If Simulation', href: '/dashboard/marketing/simulation', icon: <IconPlay /> },
  { label: 'Campaign Rankings', href: '/dashboard/marketing/campaign-rankings', icon: <IconRanking /> },
  { label: 'Trend Analysis', href: '/dashboard/marketing/trend-analysis', icon: <IconTrendUp /> },
  { label: 'Page Metrics', href: '/dashboard/marketing/page-metrics', icon: <IconMetrics /> },
  { section: 'Reports', label: 'Generate Report', href: '/dashboard/marketing/report', icon: <IconReport /> },
]

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    redirect('/login')
  }

  return (
    <Sidebar
      navItems={navItems}
      email={session.user.email ?? ''}
      roleLabel="Marketing Manager"
      roleBadgeClass="bg-white/10 text-zinc-300"
    >
      {children}
    </Sidebar>
  )
}
