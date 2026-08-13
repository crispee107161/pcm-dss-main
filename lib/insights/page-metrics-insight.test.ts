import { describe, it, expect } from 'vitest'
import { computeFollowerGrowthInsight, computePostTypeInsight, type FollowerPoint, type PostTypeRow } from './page-metrics-insight'

function points(dailyChanges: number[]): FollowerPoint[] {
  let followers = 1000
  return dailyChanges.map(daily_change => {
    followers += daily_change
    return { followers, daily_change }
  })
}

describe('computeFollowerGrowthInsight', () => {
  it('reports "up" when a decline reverses into growth, not "down"', () => {
    // First half loses followers, second half gains more than it lost.
    const insight = computeFollowerGrowthInsight(points([-10, -10, 5, 5, 5, 5]))
    expect(insight?.detail).toContain('Daily growth is up')
  })

  it('reports "down" when growth reverses into decline', () => {
    const insight = computeFollowerGrowthInsight(points([10, 10, -5, -5, -5, -5]))
    expect(insight?.detail).toContain('Daily growth is down')
  })

  it('reports steady growth as "up" when both halves are positive and rising', () => {
    const insight = computeFollowerGrowthInsight(points([1, 1, 10, 10]))
    expect(insight?.detail).toContain('Daily growth is up')
  })

  it('treats an unchanged zero-to-zero pattern as flat', () => {
    const insight = computeFollowerGrowthInsight(points([0, 0, 0, 0]))
    expect(insight?.detail).toBe('Daily growth has been fairly consistent throughout the period.')
  })

  it('returns null for fewer than two data points', () => {
    expect(computeFollowerGrowthInsight(points([5]))).toBeNull()
  })
})

function typeRow(post_type: string, count: number, avgEngagement: number | null): PostTypeRow {
  return { post_type, _count: { id: count }, _avg: { engagement_rate: avgEngagement } }
}

describe('computePostTypeInsight', () => {
  it('does not crown a 1-post type "best" over a 430-post type with lower engagement', () => {
    const insight = computePostTypeInsight([
      typeRow('Photos', 430, 0.77),
      typeRow('Videos', 337, 0.76),
      typeRow('Reels', 147, 1.14),
      typeRow('Text', 1, 0.22),
      typeRow('Links', 1, 1.16),
    ])
    // Reels (147 posts, 1.14%) is the highest-engagement type that clears the
    // minimum sample size — Links (1 post, 1.16%) must not win despite the
    // higher raw average.
    expect(insight?.headline).toBe('Reels posts get the best engagement, averaging 1.14%')
  })

  it('falls back to a "not enough data" message when no type has enough posts', () => {
    const insight = computePostTypeInsight([
      typeRow('Text', 1, 0.22),
      typeRow('Links', 2, 1.16),
    ])
    expect(insight?.headline).toContain('Links is posted most often')
    expect(insight?.detail).toMatch(/not enough posts/i)
  })

  it('returns null for an empty breakdown', () => {
    expect(computePostTypeInsight([])).toBeNull()
  })

  it('names the most-posted type by count even when it is not the winner', () => {
    const insight = computePostTypeInsight([
      typeRow('Photos', 430, 0.77),
      typeRow('Reels', 147, 1.14),
    ])
    expect(insight?.detail).toContain('Photos is posted most often (430 posts)')
    expect(insight?.detail).toContain('Reels')
  })
})
