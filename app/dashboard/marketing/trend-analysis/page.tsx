import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import TrendAnalysisView from '@/components/analytics/pages/TrendAnalysisView'

export default async function TrendAnalysisPage() {
  const session = await requireSession()
  if (session.user.role !== 'MARKETING_MANAGER') {
    redirect('/login')
  }

  return <TrendAnalysisView emptyStateMessage="No ad data found. Upload a Facebook Ads Manager CSV to see trends." />
}
