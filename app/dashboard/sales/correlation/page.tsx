import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CorrelationView from '@/components/analytics/pages/CorrelationView'

export default async function SalesCorrelationPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SALES_DIRECTOR') redirect('/login')

  return <CorrelationView />
}
