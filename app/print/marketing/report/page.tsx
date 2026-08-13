import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { buildReportData } from '@/lib/reports/report-data'
import ReportView from '@/components/reports/ReportView'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function MarketingPrintReportPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') redirect('/login')

  const data = await buildReportData({ role: 'marketing' })
  return <ReportView variant="print" role="marketing" data={data} />
}
