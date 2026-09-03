import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { loadCategoryPerformanceData } from '@/lib/data/category-performance'
import CategoryPerformanceView from '@/components/analytics/pages/CategoryPerformanceView'

export default async function CategoryPerformancePage() {
  const session = await requireSession()
  if (session.user.role !== 'BUSINESS_OWNER') redirect('/login')

  const data = await loadCategoryPerformanceData()

  return <CategoryPerformanceView data={data} />
}
