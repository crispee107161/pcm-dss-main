import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { loadCategoryPerformanceData } from '@/lib/data/category-performance'
import CategoryPerformanceView from '@/components/analytics/pages/CategoryPerformanceView'

export default async function CategoryPerformancePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') redirect('/login')

  const data = await loadCategoryPerformanceData()

  return <CategoryPerformanceView data={data} />
}
