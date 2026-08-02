import { describe, it, expect } from 'vitest'
import { computeFollowerGrowthInsight, type FollowerPoint } from './page-metrics-insight'

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
