import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SimulationView from '@/components/analytics/pages/SimulationView'

export default async function SalesSimulationPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'SALES_DIRECTOR') redirect('/login')

  return <SimulationView />
}
