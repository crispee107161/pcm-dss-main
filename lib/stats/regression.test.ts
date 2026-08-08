import { describe, it, expect } from 'vitest'
import { fitMLR, predictFromModel, aggregateAdsForTraining, pearsonCorrelation, type AdRowForTraining } from './regression'

// Single-day span (reporting_starts === reporting_ends) so rows count as
// daily-granularity by default, matching how the real daily CSV export sets
// these fields (see lib/csv/validate-ads-daily.ts).
function dailyRow(overrides: Partial<AdRowForTraining> & { ad_name: string; ad_set_name: string }): AdRowForTraining {
  const day = overrides.reporting_starts ?? new Date('2026-01-01')
  return {
    reach: null,
    amount_spent: 0,
    total_messaging_contacts: null,
    reporting_starts: day,
    reporting_ends: day,
    ...overrides,
  }
}

describe('fitMLR', () => {
  it('recovers exact coefficients from noise-free data', () => {
    // Ground truth: messaging_conversations = 10 + 2*reach + 5*spend
    // Each row isolates one predictor so the system solves exactly (r_squared = 1).
    const data = [
      { reach: 1, amount_spent: 0, messaging_conversations: 12 }, // 10 + 2*1
      { reach: 0, amount_spent: 1, messaging_conversations: 15 }, // 10 + 5*1
      { reach: 0, amount_spent: 0, messaging_conversations: 10 }, // intercept only
    ]

    const result = fitMLR(data)

    expect(result.intercept).toBeCloseTo(10, 6)
    expect(result.coef_reach).toBeCloseTo(2, 6)
    expect(result.coef_amount_spent).toBeCloseTo(5, 6)
    expect(result.r_squared).toBeCloseTo(1, 6)
    expect(result.n).toBe(3)
  })
})

describe('predictFromModel', () => {
  const model = {
    intercept: 10,
    coef_reach: 2,
    coef_amount_spent: 5,
    coefficient: 5,
  }

  it('applies the linear equation to new inputs', () => {
    // 10 + 2*10 + 5*2 = 10 + 20 + 10 = 40
    expect(predictFromModel(model, 10, 2)).toBe(40)
  })

  it('falls back to the legacy single coefficient when coef_amount_spent is missing', () => {
    const legacyModel = { intercept: 1, coefficient: 4 }
    // no coef_reach -> treated as 0; spend uses `coefficient`
    expect(predictFromModel(legacyModel, 100, 2)).toBe(1 + 4 * 2)
  })

  it('throws instead of predicting from a pre-pivot model trained under the old inquiries formula', () => {
    const staleModel = { intercept: 1, coefficient: 4, coef_messaging: 0.5 }
    expect(() => predictFromModel(staleModel, 100, 2)).toThrow(/inquiries-based formula/)
  })
})

describe('aggregateAdsForTraining', () => {
  it('collapses multiple ad-day rows for the same (ad_name, ad_set_name) into one observation', () => {
    const rows = [
      dailyRow({ ad_name: 'Ad A', ad_set_name: 'Set 1', reach: 100, amount_spent: 50, total_messaging_contacts: 5 }),
      dailyRow({ ad_name: 'Ad A', ad_set_name: 'Set 1', reach: 300, amount_spent: 70, total_messaging_contacts: 8 }),
      dailyRow({ ad_name: 'Ad A', ad_set_name: 'Set 1', reach: 200, amount_spent: 20, total_messaging_contacts: 2 }),
    ]

    const result = aggregateAdsForTraining(rows)

    expect(result).toHaveLength(1)
    // spend and messaging conversations are summed across the group
    expect(result[0].amount_spent).toBe(140)
    expect(result[0].messaging_conversations).toBe(15)
    // reach is the MAX across the group, not the sum — Facebook's Reach is
    // deduplicated per period, so summing daily reach would overstate it.
    expect(result[0].reach).toBe(300)
  })

  it('keeps distinct (ad_name, ad_set_name) pairs as separate observations', () => {
    const rows = [
      dailyRow({ ad_name: 'Ad A', ad_set_name: 'Set 1', reach: 100, amount_spent: 50, total_messaging_contacts: 5 }),
      dailyRow({ ad_name: 'Ad A', ad_set_name: 'Set 2', reach: 100, amount_spent: 50, total_messaging_contacts: 5 }),
      dailyRow({ ad_name: 'Ad B', ad_set_name: 'Set 1', reach: 100, amount_spent: 50, total_messaging_contacts: 5 }),
    ]

    expect(aggregateAdsForTraining(rows)).toHaveLength(3)
  })

  it('treats null reach and messaging contacts as zero rather than throwing', () => {
    const rows = [
      dailyRow({ ad_name: 'Ad A', ad_set_name: 'Set 1', reach: null, amount_spent: 10, total_messaging_contacts: null }),
    ]

    const result = aggregateAdsForTraining(rows)
    expect(result[0]).toEqual({ reach: 0, amount_spent: 10, messaging_conversations: 0 })
  })

  it('returns an empty array for no rows', () => {
    expect(aggregateAdsForTraining([])).toEqual([])
  })

  it('excludes monthly-granularity rows (span >= 1 day) from training', () => {
    const rows = [
      dailyRow({ ad_name: 'Ad A', ad_set_name: 'Set 1', amount_spent: 10, total_messaging_contacts: 1 }),
      dailyRow({
        ad_name: 'Ad A', ad_set_name: 'Set 1',
        amount_spent: 1000, total_messaging_contacts: 100,
        reporting_starts: new Date('2026-02-01'), reporting_ends: new Date('2026-02-28'),
      }),
    ]

    const result = aggregateAdsForTraining(rows)

    expect(result).toHaveLength(1)
    expect(result[0].amount_spent).toBe(10)
    expect(result[0].messaging_conversations).toBe(1)
  })
})

describe('collinearity warning', () => {
  it('fires when Reach and Spend are highly correlated (VIF > 10)', () => {
    // Reach is (nearly) a constant multiple of Spend across observations,
    // so r -> ~1 and VIF = 1/(1-r^2) blows well past the threshold of 10.
    const data = Array.from({ length: 12 }, (_, i) => {
      const spend = 100 + i * 37
      return {
        reach: spend * 10 + (i % 2), // tiny jitter so it's not a perfect singular fit
        amount_spent: spend,
        messaging_conversations: 5 + i,
      }
    })

    const result = fitMLR(data)

    expect(pearsonCorrelation(data.map(d => d.reach), data.map(d => d.amount_spent))).toBeGreaterThan(0.99)
    expect(result.collinearity_warning).toBeDefined()
    expect(result.collinearity_warning).toContain('VIF=')
  })

  it('does not fire when Reach and Spend are not collinear', () => {
    // A balanced 2x2-style design (reach and spend vary independently of
    // each other) gives a Pearson r of exactly 0 between the two predictors.
    const data = [
      { reach: 500,  amount_spent: 100, messaging_conversations: 10 },
      { reach: 500,  amount_spent: 300, messaging_conversations: 15 },
      { reach: 1000, amount_spent: 100, messaging_conversations: 20 },
      { reach: 1000, amount_spent: 300, messaging_conversations: 25 },
      { reach: 1500, amount_spent: 200, messaging_conversations: 30 },
    ]

    expect(pearsonCorrelation(data.map(d => d.reach), data.map(d => d.amount_spent))).toBeCloseTo(0, 6)

    const result = fitMLR(data)
    expect(result.collinearity_warning).toBeUndefined()
  })
})
