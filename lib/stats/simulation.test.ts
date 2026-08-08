import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    regressionModel: { findFirst: vi.fn() },
    ad: { findMany: vi.fn() },
    simulationResult: { create: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { randNormal, runSimulation } from './simulation'

describe('randNormal', () => {
  it('produces a large sample with approximately zero mean and unit variance', () => {
    const n = 20000
    const samples = Array.from({ length: n }, () => randNormal())
    const mean = samples.reduce((s, v) => s + v, 0) / n
    const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / n

    expect(mean).toBeCloseTo(0, 1)
    expect(variance).toBeCloseTo(1, 1)
  })
})

describe('runSimulation', () => {
  const model = {
    id: 1,
    intercept: 10,
    coefficient: 5,
    coef_reach: 2,
    coef_amount_spent: 5,
    residual_std_error: 2,
    r_squared: 0.8,
    n: 30,
    model_type: 'plain_mlr',
  }

  const trainingAds = [
    { ad_name: 'Ad A', ad_set_name: 'Set 1', reach: 100, total_messaging_contacts: 10, amount_spent: 50, reporting_starts: new Date('2026-01-01'), reporting_ends: new Date('2026-01-01') },
    { ad_name: 'Ad B', ad_set_name: 'Set 1', reach: 1000, total_messaging_contacts: 100, amount_spent: 500, reporting_starts: new Date('2026-01-02'), reporting_ends: new Date('2026-01-02') },
  ]

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue(model as any)
    vi.mocked(prisma.ad.findMany).mockResolvedValue(trainingAds as any)
    vi.mocked(prisma.simulationResult.create).mockResolvedValue({} as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('computes a deterministic projection when the RNG is stubbed', async () => {
    // With Math.random pinned to 0.5, every Monte Carlo sample collapses to
    // the same value, so the median and both interval bounds must match it exactly.
    const result = await runSimulation(1, 500, 200)

    const basePredict = 10 + 2 * 500 + 5 * 200 // 1020
    const noise = Math.sqrt(-2 * Math.log(0.5)) * Math.cos(2 * Math.PI * 0.5) * model.residual_std_error
    const expected = Math.max(0, basePredict + noise)

    expect(result.projected_inquiries).toBeCloseTo(expected, 6)
    expect(result.interval_lower).toBeCloseTo(expected, 6)
    expect(result.interval_upper).toBeCloseTo(expected, 6)
  })

  it('warns when an input falls outside the training data range', async () => {
    const result = await runSimulation(1, 5000, 200) // reach far above training max of 1000
    expect(result.warnings.some(w => w.includes('Reach'))).toBe(true)
  })

  it('does not warn about range when inputs are within the training range', async () => {
    const result = await runSimulation(1, 500, 200)
    expect(result.warnings.some(w => w.includes('training range'))).toBe(false)
  })

  it('warns when model fit (r_squared) is low', async () => {
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue({ ...model, r_squared: 0.3 } as any)
    const result = await runSimulation(1, 500, 200)
    expect(result.warnings.some(w => w.includes('Model fit is low'))).toBe(true)
  })

  it('warns when the model was trained on too few records', async () => {
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue({ ...model, n: 5 } as any)
    const result = await runSimulation(1, 500, 200)
    expect(result.warnings.some(w => w.includes('only 5 ad record'))).toBe(true)
  })

  it('throws a clear error when no regression model has been trained yet', async () => {
    vi.mocked(prisma.regressionModel.findFirst).mockResolvedValue(null)
    await expect(runSimulation(1, 500, 200)).rejects.toThrow('No regression model available')
  })
})
