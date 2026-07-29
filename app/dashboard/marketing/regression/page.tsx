import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import RegressionView from '@/components/analytics/pages/RegressionView'

export default async function RegressionPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') redirect('/login')

  return <RegressionView />
}
