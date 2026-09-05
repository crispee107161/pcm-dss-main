import { describe, it, expect } from 'vitest'
import { computeCategorySignificance } from './category-significance'
import type { CategoryLabel } from '@/app/generated/prisma/client'

describe('computeCategorySignificance', () => {
  it('reproduces a hand-computable Kruskal-Wallis result with no ties', () => {
    // Three groups of consecutive integers with no ties. By hand: ranks
    // 1..9 in order, rank sums 6/15/24, H = 12/90 * (36+225+576)/3 - 30 = 7.2, df=2.
    const result = computeCategorySignificance([
      { category: 'ENTERTAINMENT' as CategoryLabel, values: [1, 2, 3] },
      { category: 'PRODUCT_SHOWCASE' as CategoryLabel, values: [4, 5, 6] },
      { category: 'TESTIMONIAL' as CategoryLabel, values: [7, 8, 9] },
    ])

    expect(result).not.toBeNull()
    expect(result!.h).toBeCloseTo(7.2, 6)
    expect(result!.df).toBe(2)
    expect(result!.p).toBeCloseTo(Math.exp(-3.6), 10) // exact df=2 closed form
    expect(result!.significant).toBe(true) // p ~= 0.027
  })

  it('finds no significant difference when every group is drawn from the same values', () => {
    const result = computeCategorySignificance([
      { category: 'ENTERTAINMENT' as CategoryLabel, values: [1, 2, 3, 4, 5] },
      { category: 'PRODUCT_SHOWCASE' as CategoryLabel, values: [1, 2, 3, 4, 5] },
      { category: 'TESTIMONIAL' as CategoryLabel, values: [1, 2, 3, 4, 5] },
    ])

    expect(result).not.toBeNull()
    expect(result!.h).toBeCloseTo(0, 6)
    expect(result!.significant).toBe(false)
    expect(result!.pairwise.every(pair => !pair.significant)).toBe(true)
  })

  it('flags a pairwise comparison as significant when one group is clearly shifted, not the others', () => {
    const result = computeCategorySignificance([
      { category: 'ENTERTAINMENT' as CategoryLabel, values: [10, 11, 12, 13, 14, 15, 16] },
      { category: 'PRODUCT_SHOWCASE' as CategoryLabel, values: [9, 11, 13, 15, 17, 12, 14] },
      { category: 'TESTIMONIAL' as CategoryLabel, values: [1, 2, 3, 4, 5, 6, 7] },
    ])

    expect(result).not.toBeNull()
    const testimonialVsEntertainment = result!.pairwise.find(
      p => (p.a === 'TESTIMONIAL' && p.b === 'ENTERTAINMENT') || (p.a === 'ENTERTAINMENT' && p.b === 'TESTIMONIAL')
    )!
    const entertainmentVsShowcase = result!.pairwise.find(
      p => (p.a === 'ENTERTAINMENT' && p.b === 'PRODUCT_SHOWCASE') || (p.a === 'PRODUCT_SHOWCASE' && p.b === 'ENTERTAINMENT')
    )!
    expect(testimonialVsEntertainment.significant).toBe(true)
    expect(entertainmentVsShowcase.significant).toBe(false)
  })

  it('applies Holm monotonicity so a later, larger raw p cannot beat an earlier adjusted one', () => {
    // Constructed directly against the step-down math (finding-L memo §1's
    // cosmetic note: a raw 0.922 gets raised to 1.000 by the step above it).
    // Three groups engineered so the raw pairwise p-values land at
    // approximately 0.01, 0.04, 0.03 in group order (a-b, a-c, b-c).
    const result = computeCategorySignificance([
      { category: 'ENTERTAINMENT' as CategoryLabel, values: [1, 2, 3, 4, 5, 6, 20] },
      { category: 'PRODUCT_SHOWCASE' as CategoryLabel, values: [7, 8, 9, 10, 11, 12, 13] },
      { category: 'TESTIMONIAL' as CategoryLabel, values: [14, 15, 16, 17, 18, 19, 21] },
    ])

    expect(result).not.toBeNull()
    const adjustedPs = result!.pairwise.map(p => p.adjustedP)
    // Regardless of the exact values, Holm's adjusted p-values are
    // non-decreasing when read in ascending-raw-p order.
    const sortedByRaw = [...result!.pairwise].sort((a, b) => a.rawP - b.rawP)
    for (let i = 1; i < sortedByRaw.length; i++) {
      expect(sortedByRaw[i].adjustedP).toBeGreaterThanOrEqual(sortedByRaw[i - 1].adjustedP)
    }
    expect(adjustedPs.every(p => p <= 1)).toBe(true)
  })

  // code-review-analyst (MEDIUM-3, 2026-09-06): the all-identical-groups
  // case above can't discriminate the tie-correction term (H collapses to 0
  // either way), so pin it against a case where ties are present but H is
  // NOT trivially 0 — verified against scipy.stats.kruskal, which reports
  // H=8.0 for this exact input (the uncorrected H would be 7.2).
  it('applies the tie correction, verified against scipy.stats.kruskal([1,1,1],[2,2,2],[3,3,3])', () => {
    const result = computeCategorySignificance([
      { category: 'ENTERTAINMENT' as CategoryLabel, values: [1, 1, 1] },
      { category: 'PRODUCT_SHOWCASE' as CategoryLabel, values: [2, 2, 2] },
      { category: 'TESTIMONIAL' as CategoryLabel, values: [3, 3, 3] },
    ])

    expect(result).not.toBeNull()
    expect(result!.h).toBeCloseTo(8.0, 6)
  })

  // code-review-analyst (MEDIUM-3, 2026-09-06): verified against
  // scipy.stats.mannwhitneyu([1,1,2,3],[2,3,4,4], method='asymptotic',
  // use_continuity=True), which reports p=0.10375366 — pins the tie
  // correction AND the continuity correction together in the pairwise step.
  it('applies the Mann-Whitney tie and continuity correction, verified against scipy.stats.mannwhitneyu', () => {
    const result = computeCategorySignificance([
      { category: 'ENTERTAINMENT' as CategoryLabel, values: [1, 1, 2, 3] },
      { category: 'PRODUCT_SHOWCASE' as CategoryLabel, values: [2, 3, 4, 4] },
    ])

    expect(result).not.toBeNull()
    expect(result!.pairwise).toHaveLength(1)
    expect(result!.pairwise[0].rawP).toBeCloseTo(0.10375366, 6)
  })

  it('excludes a group with fewer than 3 posts from the test entirely', () => {
    const result = computeCategorySignificance([
      { category: 'ENTERTAINMENT' as CategoryLabel, values: [1, 2, 3] },
      { category: 'PRODUCT_SHOWCASE' as CategoryLabel, values: [4, 5, 6] },
      { category: 'PROMOTIONAL_OFFER' as CategoryLabel, values: [7, 8] },
    ])

    expect(result).not.toBeNull()
    expect(result!.groups).toHaveLength(2)
    expect(result!.groups.some(g => g.category === 'PROMOTIONAL_OFFER')).toBe(false)
  })

  it('returns null when fewer than 2 categories have enough posts to compare', () => {
    const result = computeCategorySignificance([
      { category: 'ENTERTAINMENT' as CategoryLabel, values: [1, 2, 3] },
      { category: 'PRODUCT_SHOWCASE' as CategoryLabel, values: [4, 5] },
    ])

    expect(result).toBeNull()
  })
})
