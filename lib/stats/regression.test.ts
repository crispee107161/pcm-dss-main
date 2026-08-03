import { describe, it, expect } from 'vitest'
import { fitMLR, predictFromModel } from './regression'

describe('fitMLR', () => {
  it('recovers exact coefficients from noise-free data', () => {
    // Ground truth: inquiries = 10 + 2*reach + 3*messaging + 5*spend
    // Each row isolates one predictor so the system solves exactly (r_squared = 1).
    const data = [
      { reach: 1, messaging: 0, amount_spent: 0, inquiries: 12 }, // 10 + 2*1
      { reach: 0, messaging: 1, amount_spent: 0, inquiries: 13 }, // 10 + 3*1
      { reach: 0, messaging: 0, amount_spent: 1, inquiries: 15 }, // 10 + 5*1
      { reach: 0, messaging: 0, amount_spent: 0, inquiries: 10 }, // intercept only
    ]

    const result = fitMLR(data)

    expect(result.intercept).toBeCloseTo(10, 6)
    expect(result.coef_reach).toBeCloseTo(2, 6)
    expect(result.coef_messaging).toBeCloseTo(3, 6)
    expect(result.coef_amount_spent).toBeCloseTo(5, 6)
    expect(result.r_squared).toBeCloseTo(1, 6)
    expect(result.n).toBe(4)
  })
})

describe('predictFromModel', () => {
  const model = {
    intercept: 10,
    coef_reach: 2,
    coef_messaging: 3,
    coef_amount_spent: 5,
    coefficient: 5,
  }

  it('applies the linear equation to new inputs', () => {
    // 10 + 2*10 + 3*5 + 5*2 = 10 + 20 + 15 + 10 = 55
    expect(predictFromModel(model, 10, 5, 2)).toBe(55)
  })

  it('falls back to the legacy single coefficient when coef_amount_spent is missing', () => {
    const legacyModel = { intercept: 1, coefficient: 4 }
    // no coef_reach/coef_messaging -> treated as 0; spend uses `coefficient`
    expect(predictFromModel(legacyModel, 100, 100, 2)).toBe(1 + 4 * 2)
  })
})
