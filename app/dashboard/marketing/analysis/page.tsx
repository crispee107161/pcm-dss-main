import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { loadAnalysisScreenData } from '@/lib/data/analysis'
import AnalysisView from '@/components/analytics/pages/AnalysisView'

export default async function MarketingAnalysisPage() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MARKETING_MANAGER' && session.user.role !== 'MARKETING_TEAM')) {
    redirect('/login')
  }

  const data = await loadAnalysisScreenData()

  return <AnalysisView data={data} />
}
