'use server'

import { auth } from '@/lib/auth'
import { runSimulation } from '@/lib/stats/simulation'
import { revalidatePath } from 'next/cache'
import type { SimulationOutput } from '@/types/index'

export async function runWhatIfAction(
  prevState: SimulationOutput | { error: string } | null,
  formData: FormData
): Promise<SimulationOutput | { error: string }> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized: you must be logged in' }

  const parse = (name: string) => {
    const raw = formData.get(name)
    if (!raw) return null
    const v = parseFloat(String(raw).replace(/,/g, ''))
    return isNaN(v) || v < 0 ? null : v
  }

  const amountSpent = parse('amount_spent')
  if (amountSpent === null) return { error: 'Please enter a valid positive amount spent' }

  const reach = parse('reach') ?? 0
  const messaging = parse('messaging') ?? 0

  try {
    const userId = parseInt(session.user.id, 10)
    const result = await runSimulation(userId, reach, messaging, amountSpent)

    const role = session.user.role
    if (role === 'MARKETING_MANAGER') revalidatePath('/dashboard/marketing')
    else if (role === 'SALES_DIRECTOR') revalidatePath('/dashboard/sales')
    else if (role === 'BUSINESS_OWNER') revalidatePath('/dashboard/owner')

    return result
  } catch (err) {
    return { error: (err as Error).message }
  }
}
