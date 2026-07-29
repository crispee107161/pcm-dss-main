import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TrendAnalysisView from '@/components/analytics/pages/TrendAnalysisView'

export default async function SalesTrendAnalysisPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SALES_DIRECTOR') {
    redirect('/login')
  }

  return <TrendAnalysisView emptyStateMessage="No ad data found. The Marketing Manager must upload Facebook Ads Manager CSV data first." />
}
