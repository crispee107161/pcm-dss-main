import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar, { NavItem } from '@/components/nav/Sidebar'
import {
  IconHome, IconChart, IconRegression, IconPlay,
  IconRanking, IconTrendUp, IconMetrics, IconReport, IconUsers,
} from '@/components/nav/icons'

const navItems: NavItem[] = [
  { section: 'Overview', label: 'Executive Dashboard', href: '/dashboard/owner', icon: <IconHome /> },
  { section: 'Analytics', label: 'Correlation', href: '/dashboard/owner/correlation', icon: <IconChart /> },
  { label: 'Regression', href: '/dashboard/owner/regression', icon: <IconRegression /> },
  { label: 'What-If Simulation', href: '/dashboard/owner/simulation', icon: <IconPlay /> },
  { label: 'Campaign Rankings', href: '/dashboard/owner/campaign-rankings', icon: <IconRanking /> },
  { label: 'Trend Analysis', href: '/dashboard/owner/trend-analysis', icon: <IconTrendUp /> },
  { label: 'Page Metrics', href: '/dashboard/owner/page-metrics', icon: <IconMetrics /> },
  { section: 'Reports', label: 'Generate Report', href: '/dashboard/owner/report', icon: <IconReport /> },
  { section: 'Administration', label: 'User Management', href: '/dashboard/owner/administration', icon: <IconUsers /> },
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
      roleBadgeClass="bg-red-600/20 text-red-400"
    >
      {children}
    </Sidebar>
  )
}
