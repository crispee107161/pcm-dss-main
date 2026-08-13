import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { buildReportData } from '@/lib/reports/report-data'
import ReportView from '@/components/reports/ReportView'

// mvp.md §3 S9: Owner Full, Marketing Manager Full, Marketing Team View.
export default async function ReportPage() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MARKETING_MANAGER' && session.user.role !== 'MARKETING_TEAM')) {
    redirect('/login')
  }

  const data = await buildReportData({ role: 'marketing' })
  const canExport = session.user.role === 'MARKETING_MANAGER'
  return <ReportView variant="screen" role="marketing" data={data} canExport={canExport} />
}
