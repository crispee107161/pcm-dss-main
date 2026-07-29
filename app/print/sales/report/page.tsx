import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { buildReportData } from '@/lib/reports/report-data'
import ReportView from '@/components/reports/ReportView'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function SalesPrintReportPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SALES_DIRECTOR') redirect('/login')

  const data = await buildReportData({ includeOrganicPosts: false })
  return <ReportView variant="print" role="sales" data={data} />
}
