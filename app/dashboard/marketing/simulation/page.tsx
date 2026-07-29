import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SimulationView from '@/components/analytics/pages/SimulationView'

export default async function SimulationPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') redirect('/login')

  return <SimulationView />
}
