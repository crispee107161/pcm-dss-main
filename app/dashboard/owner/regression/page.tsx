import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import RegressionView from '@/components/analytics/pages/RegressionView'

export default async function OwnerRegressionPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') redirect('/login')

  return <RegressionView />
}
