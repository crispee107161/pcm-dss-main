import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CorrelationView from '@/components/analytics/pages/CorrelationView'

export default async function OwnerCorrelationPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') redirect('/login')

  return <CorrelationView />
}
