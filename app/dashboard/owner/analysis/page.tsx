import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { loadAnalysisScreenData, loadAdLifecycleData, loadRegressionAnalysis } from '@/lib/data/analysis'
import AnalysisView from '@/components/analytics/pages/AnalysisView'

export default async function OwnerAnalysisPage() {
  const session = await requireSession()
  if (session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const [data, lifecycle, regression] = await Promise.all([
    loadAnalysisScreenData(),
    loadAdLifecycleData(),
    loadRegressionAnalysis(),
  ])

  return <AnalysisView data={data} lifecycle={lifecycle} regression={regression} />
}
