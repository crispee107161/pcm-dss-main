import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SimulationView from '@/components/analytics/pages/SimulationView'

export default async function OwnerSimulationPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') redirect('/login')

  return <SimulationView />
}
