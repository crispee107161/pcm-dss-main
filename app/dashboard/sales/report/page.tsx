import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { buildReportData } from '@/lib/reports/report-data'
import ReportView from '@/components/reports/ReportView'

export default async function SalesReportPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SALES_DIRECTOR') {
    redirect('/login')
  }

  const data = await buildReportData({ includeOrganicPosts: false })
  return <ReportView variant="screen" role="sales" data={data} />
}
