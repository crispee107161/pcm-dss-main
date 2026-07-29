import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { buildReportData } from '@/lib/reports/report-data'
import ReportView from '@/components/reports/ReportView'

export default async function ReportPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') redirect('/login')

  const data = await buildReportData({ includeOrganicPosts: true })
  return <ReportView variant="screen" role="marketing" data={data} />
}
