import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar, { NavItem } from '@/components/nav/Sidebar'
import {
  IconHome, IconChart, IconRegression, IconPlay,
  IconRanking, IconTrendUp, IconMetrics, IconReport,
} from '@/components/nav/icons'

const navItems: NavItem[] = [
  { section: 'Overview', label: 'Dashboard', href: '/dashboard/sales', icon: <IconHome /> },
  { section: 'Analytics', label: 'Correlation', href: '/dashboard/sales/correlation', icon: <IconChart /> },
  { label: 'Regression', href: '/dashboard/sales/regression', icon: <IconRegression /> },
  { label: 'What-If Simulation', href: '/dashboard/sales/simulation', icon: <IconPlay /> },
  { label: 'Campaign Rankings', href: '/dashboard/sales/campaign-rankings', icon: <IconRanking /> },
  { label: 'Trend Analysis', href: '/dashboard/sales/trend-analysis', icon: <IconTrendUp /> },
  { label: 'Page Metrics', href: '/dashboard/sales/page-metrics', icon: <IconMetrics /> },
  { section: 'Reports', label: 'Generate Report', href: '/dashboard/sales/report', icon: <IconReport /> },
]

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SALES_DIRECTOR') {
    redirect('/login')
  }

  return (
    <Sidebar
      navItems={navItems}
      email={session.user.email ?? ''}
      roleLabel="Sales Director"
      roleBadgeClass="bg-white/10 text-zinc-300"
    >
      {children}
    </Sidebar>
  )
}
