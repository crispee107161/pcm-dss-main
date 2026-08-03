import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { ad: { findMany: vi.fn() } },
}))

import { prisma } from '@/lib/prisma'
import { pearsonPValue, expandAndAggregate, computeLaggedCorrelations } from './laggedCorrelation'

describe('pearsonPValue', () => {
  it('returns 1 for zero correlation (no evidence of a relationship)', () => {
    expect(pearsonPValue(0, 20)).toBeCloseTo(1, 3)
  })

  it('returns 1 when n is too small to draw any conclusion (n <= 3)', () => {
    expect(pearsonPValue(0.9, 3)).toBe(1)
  })

  it('returns 0 for a perfect correlation with enough data points', () => {
    expect(pearsonPValue(1, 10)).toBe(0)
    expect(pearsonPValue(-1, 10)).toBe(0)
  })

  it('returns a small p-value for a strong correlation with reasonable n', () => {
    expect(pearsonPValue(0.9, 20)).toBeLessThan(0.01)
  })
})

describe('expandAndAggregate', () => {
  it('spreads a multi-day ad evenly across each day it ran', () => {
    const ads = [
      {
        reporting_starts: new Date('2026-01-01'),
        reporting_ends: new Date('2026-01-02'), // 2-day flight
        reach: 200,
        total_messaging_contacts: 20,
        amount_spent: 100,
        inquiries: 10,
      },
    ]

    const result = expandAndAggregate(ads)

    expect(result.size).toBe(2)
    expect(result.get('2026-01-01')).toEqual({ reach: 100, messaging: 10, amount_spent: 50, inquiries: 5 })
    expect(result.get('2026-01-02')).toEqual({ reach: 100, messaging: 10, amount_spent: 50, inquiries: 5 })
  })

  it('sums contributions from overlapping ads onto the same day', () => {
    const sameDayAd = {
      reporting_starts: new Date('2026-01-01'),
      reporting_ends: new Date('2026-01-01'),
      reach: 50,
      total_messaging_contacts: 5,
      amount_spent: 25,
      inquiries: 2,
    }
    const result = expandAndAggregate([sameDayAd, sameDayAd])

    expect(result.get('2026-01-01')).toEqual({ reach: 100, messaging: 10, amount_spent: 50, inquiries: 4 })
  })

  it('treats null inquiries/reach/messaging as zero rather than throwing', () => {
    const ads = [
      {
        reporting_starts: new Date('2026-01-01'),
        reporting_ends: new Date('2026-01-01'),
        reach: null,
        total_messaging_contacts: null,
        amount_spent: 10,
        inquiries: null,
      },
    ]
    expect(expandAndAggregate(ads).get('2026-01-01')).toEqual({ reach: 0, messaging: 0, amount_spent: 10, inquiries: 0 })
  })
})

describe('computeLaggedCorrelations', () => {
  beforeEach(() => {
    vi.mocked(prisma.ad.findMany).mockReset()
  })

  it('reports has_data: false with no ads uploaded', async () => {
    vi.mocked(prisma.ad.findMany).mockResolvedValue([])
    const result = await computeLaggedCorrelations()
    expect(result.has_data).toBe(false)
    expect(result.results).toEqual([])
  })

  it('identifies the correct lag when inquiries are an exact function of reach N days earlier', async () => {
    // An irregular (non-monotonic) reach sequence so that only the true lag
    // reconstructs it — a monotonic sequence would correlate at every lag.
    const reach = [120, 340, 90, 500, 210, 60, 430, 150, 280, 20, 390, 460, 100, 310, 70, 480, 200, 40, 350, 260]
    const TRUE_LAG = 3

    const ads = reach.map((r, d) => {
      const date = new Date('2026-01-01')
      date.setDate(date.getDate() + d)
      const inquiries = d < TRUE_LAG ? 0 : reach[d - TRUE_LAG]
      return {
        reporting_starts: date,
        reporting_ends: date,
        reach: r,
        total_messaging_contacts: 0,
        amount_spent: 1,
        inquiries,
      }
    })

    vi.mocked(prisma.ad.findMany).mockResolvedValue(ads as any)
    const result = await computeLaggedCorrelations()

    expect(result.has_data).toBe(true)
    expect(result.best_lag).toBe(TRUE_LAG)
    expect(result.best_metric).toBe('reach')
    expect(result.best_r).toBeCloseTo(1, 6)

    const lagRow = result.results.find(r => r.lag === TRUE_LAG)
    expect(lagRow?.reach_r).toBeCloseTo(1, 6)
  })
})
