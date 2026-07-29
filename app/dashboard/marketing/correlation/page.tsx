import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CorrelationView from '@/components/analytics/pages/CorrelationView'

export default async function CorrelationPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') redirect('/login')

  return <CorrelationView />
}
