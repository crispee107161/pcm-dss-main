import { requireSession } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { loadCategoryPerformanceData } from '@/lib/data/category-performance'
import CategoryPerformanceView from '@/components/analytics/pages/CategoryPerformanceView'

// Manager-only per docs/raven/FR_Mapping_Complete_and_Category_CPI_Gap.md §5:
// Marketing Team's justified access (condition five) is to how their own
// content performed, which the Analysis screen's FR-20 distribution section
// already covers.
export default async function MarketingCategoryPerformancePage() {
  const session = await requireSession()
  if (session.user.role !== 'MARKETING_MANAGER') redirect('/login')

  const data = await loadCategoryPerformanceData()

  return <CategoryPerformanceView data={data} />
}
