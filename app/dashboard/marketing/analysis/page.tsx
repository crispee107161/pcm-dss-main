import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { loadAnalysisScreenData, loadRegressionAnalysis } from '@/lib/data/analysis'
import AnalysisView from '@/components/analytics/pages/AnalysisView'

export default async function MarketingAnalysisPage() {
  const session = await requireSession()
  if (session.user.role !== 'MARKETING_MANAGER' && session.user.role !== 'MARKETING_TEAM') {
    redirect('/login')
  }

  const [data, regression] = await Promise.all([loadAnalysisScreenData(), loadRegressionAnalysis()])

  return <AnalysisView data={data} regression={regression} hideAdEfficiency={session.user.role === 'MARKETING_TEAM'} />
}
