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

  if (!session?.user) {
    return { error: 'Unauthorized: you must be logged in' }
  }

  const amountRaw = formData.get('amount_spent')
  if (!amountRaw) {
    return { error: 'Please enter an amount' }
  }

  const amountSpent = parseFloat(String(amountRaw).replace(/,/g, ''))
  if (isNaN(amountSpent) || amountSpent < 0) {
    return { error: 'Please enter a valid positive amount' }
  }

  try {
    const userId = parseInt(session.user.id, 10)
    const result = await runSimulation(userId, amountSpent)

    const role = session.user.role
    if (role === 'MARKETING_MANAGER') revalidatePath('/dashboard/marketing')
    else if (role === 'SALES_DIRECTOR') revalidatePath('/dashboard/sales')
    else if (role === 'BUSINESS_OWNER') revalidatePath('/dashboard/owner')

    return result
  } catch (err) {
    return { error: (err as Error).message }
  }
}
