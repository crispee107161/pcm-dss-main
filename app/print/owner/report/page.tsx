import type { Metadata } from 'next'
import { requireUsableSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { buildReportData } from '@/lib/reports/report-data'
import ReportView from '@/components/reports/ReportView'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function OwnerPrintReportPage() {
  const session = await requireUsableSession()
  if (!session || session.user.role !== 'BUSINESS_OWNER') redirect('/login')

  const data = await buildReportData({ role: 'owner' })
  return <ReportView variant="print" role="owner" data={data} />
}
