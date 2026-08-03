import { describe, it, expect } from 'vitest'
import { computeHealthScores, type AdForHealth } from './health-score'

function ad(overrides: Partial<AdForHealth> & { id: number }): AdForHealth {
  return {
    ad_name: `ad-${overrides.id}`,
    ad_set_name: 'set-1',
    amount_spent: 0,
    inquiries: null,
    reach: null,
    reporting_starts: new Date('2026-01-01'),
    reporting_ends: new Date('2026-01-07'),
    ...overrides,
  }
}

describe('computeHealthScores', () => {
  it('returns an empty array for no ads', () => {
    expect(computeHealthScores([])).toEqual([])
  })

  it('scores the best-performing ad in the set as Excellent (100)', () => {
    // CPI 10 (best of the two priced ads), rate 0.01 (best), reach 1000 (top of range).
    const ads = [
      ad({ id: 1, amount_spent: 100, inquiries: 10, reach: 1000 }),
      ad({ id: 2, amount_spent: 200, inquiries: 5, reach: 1000 }),
    ]

    const [scoredA] = computeHealthScores(ads)

    expect(scoredA.cpi).toBe(10)
    expect(scoredA.inquiry_rate).toBe(0.01)
    expect(scoredA.score).toBe(100)
    expect(scoredA.grade).toBe('Excellent')
  })

  it('scores a mid-performing ad using the 0.50/0.35/0.15 weighting exactly', () => {
    const ads = [
      ad({ id: 1, amount_spent: 100, inquiries: 10, reach: 1000 }),
      ad({ id: 2, amount_spent: 200, inquiries: 5, reach: 1000 }),
    ]

    const [, scoredB] = computeHealthScores(ads)

    // cpi_score=0 (worst CPI), rate_score=50 (half of best rate), reach_score=100 (tied for top reach)
    // 0*0.50 + 50*0.35 + 100*0.15 = 17.5 + 15 = 32.5 -> rounds to 33
    expect(scoredB.score).toBe(33)
    expect(scoredB.grade).toBe('Poor')
  })

  it('gives an ad with zero inquiries a low score without throwing on null cpi/rate', () => {
    const ads = [
      ad({ id: 1, amount_spent: 100, inquiries: 10, reach: 1000 }),
      ad({ id: 2, amount_spent: 200, inquiries: 5, reach: 1000 }),
      ad({ id: 3, amount_spent: 50, inquiries: 0, reach: 500 }),
    ]

    const scoredC = computeHealthScores(ads)[2]

    expect(scoredC.cpi).toBeNull()
    expect(scoredC.inquiry_rate).toBeNull()
    // Only reach contributes: reach_score=50 (500 is half of the 1000 cap) * 0.15 = 7.5 -> rounds to 8
    expect(scoredC.score).toBe(8)
    expect(scoredC.grade).toBe('Critical')
  })

  it('never lets a single outlier CPI compress every other score to the same band', () => {
    // The 95th-percentile cap means one extreme ad shouldn't flatten the distribution.
    const ads = [
      ad({ id: 1, amount_spent: 100, inquiries: 10, reach: 1000 }),
      ad({ id: 2, amount_spent: 10000, inquiries: 1, reach: 1000 }), // extreme outlier CPI
    ]

    const scores = computeHealthScores(ads).map((s) => s.score)
    expect(scores[0]).toBeGreaterThan(scores[1])
    expect(new Set(scores).size).toBeGreaterThan(1)
  })

  it('clamps a score at 100 for an ad above the 95th-percentile reach cap, rather than exceeding it', () => {
    // pct95 needs >= 20 points before its index diverges from the raw max, so
    // a 2-ad fixture can't actually exercise the cap - use 21 ads with reach
    // 100..2100. sorted[19] (2000) becomes the cap; the top ad (reach=2100)
    // sits above it, which pre-clamp produced a reach_score of 105.
    const ads = Array.from({ length: 21 }, (_, i) =>
      ad({ id: i, amount_spent: 100, inquiries: 0, reach: (i + 1) * 100 })
    )

    const scored = computeHealthScores(ads)
    const topAd = scored.find(s => s.reach === 2100)!
    const midAd = scored.find(s => s.reach === 1000)!

    expect(topAd.breakdown.reach_score).toBe(100) // would be 105 without clamping
    expect(midAd.breakdown.reach_score).toBe(50)  // 1000 / 2000 cap = 50%, unaffected by the fix
  })
})
