import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { buildReportData } from '@/lib/reports/report-data'
import ReportView from '@/components/reports/ReportView'

// mvp.md §3 S9: Owner Full, Marketing Manager Full, Marketing Team View.
export default async function ReportPage() {
  const session = await requireSession()
  if (session.user.role !== 'MARKETING_MANAGER' && session.user.role !== 'MARKETING_TEAM') {
    redirect('/login')
  }

  const data = await buildReportData({ role: 'marketing' })
  const canExport = session.user.role === 'MARKETING_MANAGER'
  // SR-Z2: spend and cost-per-inquiry are Owner/Manager-only. Team keeps FR-23's
  // "View" access to the report, but monetary sections/columns are hidden —
  // same pattern as AnalysisView's hideAdEfficiency for the Analysis screen.
  const hideMonetary = session.user.role === 'MARKETING_TEAM'
  return <ReportView variant="screen" role="marketing" data={data} canExport={canExport} hideMonetary={hideMonetary} />
}
