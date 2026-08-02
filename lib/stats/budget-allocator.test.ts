import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    regressionModel: { findFirst: vi.fn() },
    ad: { findMany: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { computeBudgetAllocation } from './budget-allocator'

// A model where only spend predicts purchases 1:1, so projected_purchases
// for each ad set should equal its allocated spend exactly — makes the
// allocation math independently verifiable by hand.
const linearSpendModel = {
  model_type: 'plain_mlr',
  intercept: 0,
  coef_reach: 0,
  coef_messaging: 0,
  coef_amount_spent: 1,
  coefficient: 1,
  r_squared: 0.9,
  residual_std_error: 0,
  n: 50,
}

describe('computeBudgetAllocation', () => {
  beforeEach(() => {
    vi.mocked(prisma.regressionModel.findFirst).mockReset()
    vi.mocked(prisma.ad.findMany).mockReset()
  })

  it('allocates budget proportional to Laplace-smoothed efficiency across two ad sets', async () => {
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue(linearSpendModel as any)
    vi.mocked(prisma.ad.findMany).mockResolvedValue([
      { ad_set_name: 'A', amount_spent: 500, purchases: 50, reach: 250, total_messaging_contacts: 25 },
      { ad_set_name: 'A', amount_spent: 500, purchases: 50, reach: 250, total_messaging_contacts: 25 },
      { ad_set_name: 'B', amount_spent: 500, purchases: 5, reach: 250, total_messaging_contacts: 25 },
      { ad_set_name: 'B', amount_spent: 500, purchases: 5, reach: 250, total_messaging_contacts: 25 },
    ] as any)

    // Set A: spend=1000, purchases=100 -> cpaEstimate=10, efficiency=(101)/(1000+10)=0.1
    // Set B: spend=1000, purchases=10  -> cpaEstimate=100, efficiency=(11)/(1000+100)=0.01
    // totalEfficiency=0.11 -> A gets 0.1/0.11 (~90.9%), B gets 0.01/0.11 (~9.1%)
    const result = await computeBudgetAllocation(1000)

    expect(result.allocations).toHaveLength(2)
    // Sorted by efficiency descending -> A (more efficient) comes first.
    const [a, b] = result.allocations
    expect(a.ad_set_name).toBe('A')
    expect(b.ad_set_name).toBe('B')

    expect(a.pct).toBeCloseTo(0.1 / 0.11, 6)
    expect(b.pct).toBeCloseTo(0.01 / 0.11, 6)
    expect(a.allocated_spend).toBeCloseTo(1000 * (0.1 / 0.11), 4)
    expect(b.allocated_spend).toBeCloseTo(1000 * (0.01 / 0.11), 4)

    // With coef_reach=coef_messaging=0 and coef_amount_spent=1, projected
    // purchases must equal allocated spend exactly (residual_std_error=0
    // collapses the interval to a point).
    expect(a.projected_purchases).toBeCloseTo(a.allocated_spend, 6)
    expect(a.interval_lower).toBeCloseTo(a.allocated_spend, 6)
    expect(a.interval_upper).toBeCloseTo(a.allocated_spend, 6)

    expect(a.historical_cpa).toBeCloseTo(10, 6)
    expect(b.historical_cpa).toBeCloseTo(100, 6)

    // Total projected purchases should equal the total budget, since every peso
    // allocated maps 1:1 to a projected purchase under this model.
    expect(result.total_projected_purchases).toBeCloseTo(1000, 4)
  })

  it('caps allocation at the top 8 most efficient ad sets', async () => {
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue(linearSpendModel as any)

    // 10 ad sets, spend=100 each, purchases = i+1 for i in 0..9.
    // efficiency simplifies to purchases/100, so higher purchase count -> higher rank.
    const ads = Array.from({ length: 10 }, (_, i) => ({
      ad_set_name: `Set-${i}`,
      amount_spent: 100,
      purchases: i + 1,
      reach: 50,
      total_messaging_contacts: 5,
    }))
    vi.mocked(prisma.ad.findMany).mockResolvedValue(ads as any)

    const result = await computeBudgetAllocation(800)

    expect(result.allocations).toHaveLength(8)
    const names = result.allocations.map(a => a.ad_set_name)
    expect(names).not.toContain('Set-0') // purchases=1, lowest efficiency
    expect(names).not.toContain('Set-1') // purchases=2, second lowest
    expect(names[0]).toBe('Set-9') // purchases=10, highest efficiency, sorted first
  })

  it('throws when no regression model has been trained yet', async () => {
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.ad.findMany).mockResolvedValue([] as any)
    await expect(computeBudgetAllocation(1000)).rejects.toThrow('No regression model trained yet')
  })

  it('throws when there is no ad data at all', async () => {
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue(linearSpendModel as any)
    vi.mocked(prisma.ad.findMany).mockResolvedValue([] as any)
    await expect(computeBudgetAllocation(1000)).rejects.toThrow('No ad data available')
  })

  it('throws when no ad set has any purchases recorded', async () => {
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue(linearSpendModel as any)
    vi.mocked(prisma.ad.findMany).mockResolvedValue([
      { ad_set_name: 'A', amount_spent: 500, purchases: 0, reach: 250, total_messaging_contacts: 25 },
    ] as any)
    await expect(computeBudgetAllocation(1000)).rejects.toThrow('No ad sets with purchase data found')
  })
})
