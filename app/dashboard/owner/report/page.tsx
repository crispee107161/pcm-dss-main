import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { buildReportData } from '@/lib/reports/report-data'
import ReportView from '@/components/reports/ReportView'

export default async function OwnerReportPage() {
  const session = await requireSession()
  if (session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const data = await buildReportData({ role: 'owner' })
  return <ReportView variant="screen" role="owner" data={data} />
}
