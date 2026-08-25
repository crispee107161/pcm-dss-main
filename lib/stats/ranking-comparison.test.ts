import { describe, it, expect } from 'vitest'
import { computeRankingComparison, type PostForRankingComparison } from './ranking-comparison'

describe('computeRankingComparison', () => {
  it('excludes posts with null Views explicitly, not as 0 or Infinity', () => {
    const posts: PostForRankingComparison[] = [
      { views: 100, organic_engagement_rate: 0.01, reach: 1000 },
      { views: 200, organic_engagement_rate: 0.02, reach: 2000 },
      { views: 300, organic_engagement_rate: 0.03, reach: 3000 },
      { views: null, organic_engagement_rate: 0.99, reach: 9000 }, // would corrupt both correlation and overlap if included
    ]

    const result = computeRankingComparison(posts)

    expect(result.n).toBe(3)
    expect(result.excludedNullViews).toBe(1)
  })

  it('computes rho = 1 for a perfectly monotonic relationship', () => {
    const posts: PostForRankingComparison[] = [
      { views: 100, organic_engagement_rate: 0.01, reach: 1000 },
      { views: 200, organic_engagement_rate: 0.02, reach: 2000 },
      { views: 300, organic_engagement_rate: 0.03, reach: 3000 },
      { views: 400, organic_engagement_rate: 0.04, reach: 4000 },
      { views: 500, organic_engagement_rate: 0.05, reach: 5000 },
    ]

    const result = computeRankingComparison(posts)

    expect(result.rho).toBeCloseTo(1, 6)
  })

  it('computes rho = -1 for a perfectly inverse relationship', () => {
    const posts: PostForRankingComparison[] = [
      { views: 100, organic_engagement_rate: 0.05, reach: 1000 },
      { views: 200, organic_engagement_rate: 0.04, reach: 2000 },
      { views: 300, organic_engagement_rate: 0.03, reach: 3000 },
      { views: 400, organic_engagement_rate: 0.02, reach: 4000 },
      { views: 500, organic_engagement_rate: 0.01, reach: 5000 },
    ]

    const result = computeRankingComparison(posts)

    expect(result.rho).toBeCloseTo(-1, 6)
  })

  it('reports 100% top-k overlap when the two rankings agree exactly', () => {
    const posts: PostForRankingComparison[] = Array.from({ length: 10 }, (_, i) => ({
      views: (i + 1) * 100,
      organic_engagement_rate: (i + 1) * 0.01,
      reach: (i + 1) * 1000,
    }))

    const result = computeRankingComparison(posts)

    const overlap10 = result.overlaps.find(o => o.k === 10)!
    const overlap20 = result.overlaps.find(o => o.k === 20)!
    expect(overlap10.overlapFraction).toBe(1)
    expect(overlap20.overlapFraction).toBe(1)
  })

  it('reports 0% top-k overlap when the two rankings are perfectly inverted', () => {
    const posts: PostForRankingComparison[] = Array.from({ length: 10 }, (_, i) => ({
      views: (i + 1) * 100,
      organic_engagement_rate: (10 - i) * 0.01,
      reach: (i + 1) * 1000,
    }))

    const result = computeRankingComparison(posts)

    const overlap10 = result.overlaps.find(o => o.k === 10)!
    expect(overlap10.overlapFraction).toBe(0)
  })

  it('throws when fewer than 3 posts have a non-null Views value', () => {
    const posts: PostForRankingComparison[] = [
      { views: 100, organic_engagement_rate: 0.01, reach: 1000 },
      { views: null, organic_engagement_rate: 0.02, reach: 2000 },
    ]
    expect(() => computeRankingComparison(posts)).toThrow()
  })

  // FR-09 — Views vs. Reach, same eligible population as rho above.
  it('computes viewsReachRho = 1 for a perfectly monotonic Views/Reach relationship', () => {
    const posts: PostForRankingComparison[] = [
      { views: 100, organic_engagement_rate: 0.05, reach: 1000 },
      { views: 200, organic_engagement_rate: 0.04, reach: 2000 },
      { views: 300, organic_engagement_rate: 0.03, reach: 3000 },
      { views: 400, organic_engagement_rate: 0.02, reach: 4000 },
      { views: 500, organic_engagement_rate: 0.01, reach: 5000 },
    ]

    const result = computeRankingComparison(posts)

    expect(result.viewsReachRho).toBeCloseTo(1, 6)
  })

  it('excludes the same null-Views posts from viewsReachRho as from rho', () => {
    const posts: PostForRankingComparison[] = [
      { views: 100, organic_engagement_rate: 0.01, reach: 1000 },
      { views: 200, organic_engagement_rate: 0.02, reach: 2000 },
      { views: 300, organic_engagement_rate: 0.03, reach: 3000 },
      { views: null, organic_engagement_rate: 0.99, reach: 9000 },
    ]

    const result = computeRankingComparison(posts)

    expect(Number.isFinite(result.viewsReachRho)).toBe(true)
    expect(Number.isFinite(result.viewsReachP)).toBe(true)
  })
})
