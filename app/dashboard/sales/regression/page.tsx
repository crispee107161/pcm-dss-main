import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import RegressionView from '@/components/analytics/pages/RegressionView'

export default async function SalesRegressionPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SALES_DIRECTOR') redirect('/login')

  return <RegressionView />
}
