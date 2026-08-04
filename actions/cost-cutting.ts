'use server'

import { auth } from '@/lib/auth'
import { computeCostCuttingScenario, type CostCuttingResult } from '@/lib/stats/cost-cutting'

export type CostCuttingState = { result: CostCuttingResult } | { error: string } | null

export async function runCostCuttingScenario(
  _prev: CostCuttingState,
  formData: FormData
): Promise<CostCuttingState> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const raw = formData.get('reduction')
  const pct = raw ? parseFloat(String(raw)) / 100 : NaN
  if (isNaN(pct) || pct <= 0 || pct >= 1) return { error: 'Enter a valid reduction percentage between 1 and 99.' }

  try {
    const result = await computeCostCuttingScenario(pct)
    return { result }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
