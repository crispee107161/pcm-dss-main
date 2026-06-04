'use server'

import { auth } from '@/lib/auth'
import { computeBudgetAllocation, type AllocationResult } from '@/lib/stats/budget-allocator'

export type AllocateState = { result: AllocationResult } | { error: string } | null

export async function runBudgetAllocation(
  _prev: AllocateState,
  formData: FormData
): Promise<AllocateState> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const raw = formData.get('budget')
  const budget = raw ? parseFloat(String(raw).replace(/,/g, '')) : NaN
  if (isNaN(budget) || budget <= 0) return { error: 'Enter a valid positive budget amount.' }
  if (budget > 10_000_000) return { error: 'Budget too large — maximum is ₱10,000,000.' }

  try {
    const result = await computeBudgetAllocation(budget)
    return { result }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
