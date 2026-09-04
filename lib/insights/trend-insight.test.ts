import { describe, it, expect } from 'vitest'
import { computeTrendInsight, type TrendPeriodPoint, type PeriodDataCompleteness } from './trend-insight'

function period(overrides: Partial<TrendPeriodPoint> & { period: string }): TrendPeriodPoint {
  return { total_spend: 10000, total_inquiries: 500, ...overrides }
}

function complete(overrides: Partial<PeriodDataCompleteness> = {}): PeriodDataCompleteness {
  return { isFullyPresent: true, hasAdRecords: true, hasOrganicRecords: true, ...overrides }
}

describe('computeTrendInsight', () => {
  it('returns null with fewer than two periods', () => {
    expect(computeTrendInsight([], true)).toBeNull()
    expect(computeTrendInsight([period({ period: 'Jun 2026' })], true)).toBeNull()
  })

  it('reports weak signal (low) when there is no valid delta, regardless of completeness', () => {
    const insight = computeTrendInsight(
      [period({ period: 'Jun 2026', total_spend: 0 }), period({ period: 'Jul 2026' })],
      true,
      [complete(), complete()],
    )
    expect(insight?.confidence).toBe('low')
  })

  // docs/raven/Trend_Analysis_Corrections_and_Confidence_Decision.md §3.1 —
  // the full Reliable gate: consecutive, both fully present, both sources.
  it('reports high (Reliable) only when consecutive AND both periods are fully present AND both carry ad and organic records', () => {
    const insight = computeTrendInsight(
      [period({ period: 'Jun 2026' }), period({ period: 'Jul 2026' })],
      true,
      [complete(), complete()],
    )
    expect(insight?.confidence).toBe('high')
  })

  it('falls back to medium (Rough guide) when periods are not consecutive, even if otherwise complete', () => {
    const insight = computeTrendInsight(
      [period({ period: 'Dec 2025' }), period({ period: 'Jul 2026' })],
      false,
      [complete(), complete()],
    )
    expect(insight?.confidence).toBe('medium')
  })

  it('falls back to medium when a period is not fully present, even if consecutive with both sources', () => {
    const insight = computeTrendInsight(
      [period({ period: 'Jun 2026' }), period({ period: 'Jul 2026' })],
      true,
      [complete({ isFullyPresent: false }), complete()],
    )
    expect(insight?.confidence).toBe('medium')
  })

  it('falls back to medium when a period is missing one data source, even if consecutive and fully present', () => {
    const insight = computeTrendInsight(
      [period({ period: 'Jun 2026' }), period({ period: 'Jul 2026' })],
      true,
      [complete(), complete({ hasOrganicRecords: false })],
    )
    expect(insight?.confidence).toBe('medium')
  })

  it('falls back to medium when completeness data is not supplied at all', () => {
    const insight = computeTrendInsight(
      [period({ period: 'Jun 2026' }), period({ period: 'Jul 2026' })],
      true,
    )
    expect(insight?.confidence).toBe('medium')
  })
})
