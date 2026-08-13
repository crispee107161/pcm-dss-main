import { describe, it, expect } from 'vitest'
import { selectCorrelation, type AdForCorrelationSelection } from './correlation-selection'

function ad(overrides: Partial<AdForCorrelationSelection> & { ad_id: string }): AdForCorrelationSelection {
  return {
    amount_spent: 1000,
    total_messaging_contacts: 10,
    reach: 5000,
    post_engagements: 250,
    ...overrides,
  }
}

describe('selectCorrelation', () => {
  it('sums spend/messaging/reach/engagements per ad_id before computing rates (ALG-09)', () => {
    // Arrange: ad 'a' has two monthly rows that should combine into one point
    const ads: AdForCorrelationSelection[] = [
      ad({ ad_id: 'a', amount_spent: 500, total_messaging_contacts: 5, reach: 2000, post_engagements: 100 }),
      ad({ ad_id: 'a', amount_spent: 500, total_messaging_contacts: 5, reach: 2000, post_engagements: 100 }),
      ad({ ad_id: 'b', amount_spent: 1100, total_messaging_contacts: 12, reach: 4200, post_engagements: 310 }),
      ad({ ad_id: 'c', amount_spent: 800, total_messaging_contacts: 8, reach: 3500, post_engagements: 150 }),
    ]

    // Act
    const result = selectCorrelation(ads)

    // Assert: 3 distinct ads, not 4 rows
    expect(result.n).toBe(3)
  })

  it('excludes ads with zero messaging contacts or zero reach', () => {
    const ads: AdForCorrelationSelection[] = [
      ad({ ad_id: 'a', amount_spent: 900, total_messaging_contacts: 9, reach: 4800, post_engagements: 220 }),
      ad({ ad_id: 'b', amount_spent: 1100, total_messaging_contacts: 12, reach: 4200, post_engagements: 310 }),
      ad({ ad_id: 'c', amount_spent: 800, total_messaging_contacts: 8, reach: 3500, post_engagements: 150 }),
      ad({ ad_id: 'no-messaging', total_messaging_contacts: 0 }),
      ad({ ad_id: 'no-reach', reach: 0 }),
    ]

    const result = selectCorrelation(ads)

    expect(result.n).toBe(3)
  })

  it('never computes both coefficients and picks the favourable one — selects Spearman when either variable fails normality', () => {
    // Arrange: y is heavily right-skewed (mostly small values, one huge outlier
    // per ad) — should fail Shapiro-Wilk, forcing Spearman regardless of X.
    const ads: AdForCorrelationSelection[] = Array.from({ length: 20 }, (_, i) => {
      const skewedSpend = i === 19 ? 50000 : 100 + i * 10
      return ad({
        ad_id: `ad-${i}`,
        amount_spent: skewedSpend,
        total_messaging_contacts: 5,
        reach: 1000 + i * 50,
        post_engagements: 50 + i * 5,
      })
    })

    const result = selectCorrelation(ads)

    expect(result.method).toBe('SPEARMAN')
    expect(result.shapiroY.isNormal).toBe(false)
  })

  it('reports coefficient, n, p, and both Shapiro-Wilk results together (FR-22)', () => {
    const ads: AdForCorrelationSelection[] = Array.from({ length: 15 }, (_, i) =>
      ad({ ad_id: `ad-${i}`, amount_spent: 1000 + i * 50, total_messaging_contacts: 5 + i, reach: 5000 + i * 100, post_engagements: 200 + i * 10 })
    )

    const result = selectCorrelation(ads)

    expect(result.n).toBe(15)
    expect(typeof result.coefficient).toBe('number')
    expect(result.p).toBeGreaterThanOrEqual(0)
    expect(result.p).toBeLessThanOrEqual(1)
    expect(result.shapiroX).toBeDefined()
    expect(result.shapiroY).toBeDefined()
  })

  it('throws when fewer than 3 ads qualify', () => {
    const ads: AdForCorrelationSelection[] = [ad({ ad_id: 'a' }), ad({ ad_id: 'b' })]
    expect(() => selectCorrelation(ads)).toThrow()
  })
})
