import { describe, it, expect } from 'vitest'
import { computeWatchThrough, type PostForWatchThrough } from './watch-through'

function post(overrides: Partial<PostForWatchThrough>): PostForWatchThrough {
  return { duration_sec: 30, avg_seconds_viewed: 15, engagement_rate: 1, ...overrides }
}

describe('computeWatchThrough', () => {
  it('excludes posts missing either duration_sec or avg_seconds_viewed', () => {
    const posts: PostForWatchThrough[] = [
      post({}),
      post({ duration_sec: null }),
      post({ avg_seconds_viewed: null }),
    ]

    const result = computeWatchThrough(posts)

    expect(result.n).toBe(1)
  })

  it('computes rate as avg_seconds_viewed / duration_sec', () => {
    const posts: PostForWatchThrough[] = [post({ duration_sec: 20, avg_seconds_viewed: 10 })]

    const result = computeWatchThrough(posts)

    expect(result.medianRate).toBeCloseTo(0.5, 6)
  })

  it('caps the display rate at 100% and counts outliers separately', () => {
    const posts: PostForWatchThrough[] = [
      post({ duration_sec: 10, avg_seconds_viewed: 25 }), // 250% raw, looped/replayed
      post({ duration_sec: 10, avg_seconds_viewed: 5 }),
      post({ duration_sec: 10, avg_seconds_viewed: 8 }),
    ]

    const result = computeWatchThrough(posts)

    expect(result.outlierCount).toBe(1)
    // The capped rate for the outlier is 1.0, not 2.5
    expect(result.q3Rate).toBeLessThanOrEqual(1)
  })

  it('reports the correlation between watch-through rate and engagement rate', () => {
    const posts: PostForWatchThrough[] = Array.from({ length: 10 }, (_, i) => ({
      duration_sec: 20,
      avg_seconds_viewed: 2 + i * 2, // rising watch-through
      engagement_rate: 1 + i * 0.5, // rising engagement rate too
    }))

    const result = computeWatchThrough(posts)

    expect(result.correlationWithEngagement.rho).toBeGreaterThan(0.8)
    expect(result.correlationWithEngagement.n).toBe(10)
  })

  it('throws when no posts qualify', () => {
    expect(() => computeWatchThrough([post({ duration_sec: null })])).toThrow()
  })
})
