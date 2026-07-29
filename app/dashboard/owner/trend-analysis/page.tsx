import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TrendAnalysisView from '@/components/analytics/pages/TrendAnalysisView'

export default async function OwnerTrendAnalysisPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  return <TrendAnalysisView emptyStateMessage="No ad data found. The Marketing Manager needs to upload a Facebook Ads Manager CSV." />
}
