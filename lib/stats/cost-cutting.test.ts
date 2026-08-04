import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    regressionModel: { findFirst: vi.fn() },
    ad: { findMany: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { computeCostCuttingScenario } from './cost-cutting'

// A model where only spend predicts inquiries 1:1, so projected inquiries
// for each ad set equal its spend exactly — makes the cut/keep math
// independently verifiable by hand.
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

describe('computeCostCuttingScenario', () => {
  beforeEach(() => {
    vi.mocked(prisma.regressionModel.findFirst).mockReset()
    vi.mocked(prisma.ad.findMany).mockReset()
  })

  it('cuts the least-efficient ad set first until the target reduction is reached', async () => {
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue(linearSpendModel as any)
    vi.mocked(prisma.ad.findMany).mockResolvedValue([
      // Set A: spend=1000, inquiries=100 -> most efficient
      { ad_set_name: 'A', amount_spent: 1000, inquiries: 100, reach: 500, total_messaging_contacts: 50 },
      // Set B: spend=1000, inquiries=10 -> least efficient, cut candidate
      { ad_set_name: 'B', amount_spent: 1000, inquiries: 10, reach: 500, total_messaging_contacts: 50 },
    ] as any)

    // total spend = 2000, target 20% reduction = 400 -> cutting B alone (spend=1000) already exceeds target
    const result = await computeCostCuttingScenario(0.2)

    expect(result.total_spend).toBe(2000)
    expect(result.cut_ad_sets).toHaveLength(1)
    expect(result.cut_ad_sets[0].ad_set_name).toBe('B')
    expect(result.kept_ad_sets).toHaveLength(1)
    expect(result.kept_ad_sets[0].ad_set_name).toBe('A')
    expect(result.spend_removed).toBe(1000)
    expect(result.actual_reduction_pct).toBeCloseTo(0.5, 6)

    // With coef_amount_spent=1 and all other coefs 0, projected inquiries equal spend.
    expect(result.baseline_projected_inquiries).toBeCloseTo(2000, 6)
    expect(result.after_cut_projected_inquiries).toBeCloseTo(1000, 6)
    expect(result.inquiry_loss_pct).toBeCloseTo(0.5, 6)
  })

  it('cuts multiple ad sets when one is not enough to hit the target', async () => {
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue(linearSpendModel as any)
    vi.mocked(prisma.ad.findMany).mockResolvedValue([
      { ad_set_name: 'A', amount_spent: 1000, inquiries: 100, reach: 500, total_messaging_contacts: 50 },
      { ad_set_name: 'B', amount_spent: 500, inquiries: 20, reach: 250, total_messaging_contacts: 25 },
      { ad_set_name: 'C', amount_spent: 500, inquiries: 5, reach: 250, total_messaging_contacts: 25 },
    ] as any)

    // total spend = 2000, target 50% = 1000 -> cutting C (500, least efficient) alone isn't
    // enough, so B (next least efficient) is also cut: 500 + 500 = 1000 >= 1000
    const result = await computeCostCuttingScenario(0.5)

    const cutNames = result.cut_ad_sets.map(a => a.ad_set_name)
    expect(cutNames).toEqual(['C', 'B'])
    expect(result.kept_ad_sets.map(a => a.ad_set_name)).toEqual(['A'])
    expect(result.spend_removed).toBe(1000)
    expect(result.actual_reduction_pct).toBeCloseTo(0.5, 6)
  })

  it('does not multiply the intercept by ad-set count when comparing baseline vs after-cut', async () => {
    // A negative intercept makes the bug visible: summing a full model
    // prediction (including intercept) once per ad set biases the
    // baseline/after-cut difference by however many ad sets are cut, unrelated
    // to the spend actually removed.
    const negativeInterceptModel = {
      model_type: 'plain_mlr',
      intercept: -100,
      coef_reach: 0,
      coef_messaging: 0,
      coef_amount_spent: 1,
      coefficient: 1,
      r_squared: 0.9,
      residual_std_error: 0,
      n: 50,
    }
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue(negativeInterceptModel as any)
    vi.mocked(prisma.ad.findMany).mockResolvedValue([
      { ad_set_name: 'A', amount_spent: 1000, inquiries: 100, reach: 500, total_messaging_contacts: 50 },
      { ad_set_name: 'B', amount_spent: 1000, inquiries: 10, reach: 500, total_messaging_contacts: 50 },
    ] as any)

    // total spend = 2000, target 20% = 400 -> cutting B (spend=1000) alone exceeds target.
    // Marginal (spend-only, coef=1) contribution per ad set is 1000; intercept (-100) applies
    // once to the whole pool, not once per ad set.
    const result = await computeCostCuttingScenario(0.2)

    expect(result.cut_ad_sets.map(a => a.ad_set_name)).toEqual(['B'])
    expect(result.baseline_projected_inquiries).toBeCloseTo(-100 + 1000 + 1000, 6) // 1900
    expect(result.after_cut_projected_inquiries).toBeCloseTo(-100 + 1000, 6)       // 900
    expect(result.inquiry_loss_pct).toBeCloseTo(1000 / 1900, 6)
  })

  it('includes zero-inquiry ad sets as cut candidates ahead of any low-efficiency ad set', async () => {
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue(linearSpendModel as any)
    vi.mocked(prisma.ad.findMany).mockResolvedValue([
      // Set A: spend=1000, inquiries=100 -> efficient, should be kept
      { ad_set_name: 'A', amount_spent: 1000, inquiries: 100, reach: 500, total_messaging_contacts: 50 },
      // Set Z: spend=500, inquiries=0 -> pure waste, must be visible and cut first
      { ad_set_name: 'Z', amount_spent: 500, inquiries: 0, reach: 250, total_messaging_contacts: 25 },
    ] as any)

    // total spend = 1500 (Z's spend must count toward the total), target 20% = 300
    const result = await computeCostCuttingScenario(0.2)

    expect(result.total_spend).toBe(1500)
    expect(result.cut_ad_sets.map(a => a.ad_set_name)).toEqual(['Z'])
    expect(result.cut_ad_sets[0].historical_cpi).toBeNull()
    expect(result.kept_ad_sets.map(a => a.ad_set_name)).toEqual(['A'])
  })

  it('rejects a reduction percentage outside (0, 1)', async () => {
    await expect(computeCostCuttingScenario(0)).rejects.toThrow('Reduction percentage must be between 1% and 99%.')
    await expect(computeCostCuttingScenario(1)).rejects.toThrow('Reduction percentage must be between 1% and 99%.')
    await expect(computeCostCuttingScenario(-0.1)).rejects.toThrow('Reduction percentage must be between 1% and 99%.')
  })

  it('throws when no regression model has been trained yet', async () => {
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.ad.findMany).mockResolvedValue([] as any)
    await expect(computeCostCuttingScenario(0.2)).rejects.toThrow('No regression model trained yet')
  })

  it('throws when there is no ad data at all', async () => {
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue(linearSpendModel as any)
    vi.mocked(prisma.ad.findMany).mockResolvedValue([] as any)
    await expect(computeCostCuttingScenario(0.2)).rejects.toThrow('No ad data available')
  })
})
