import { describe, it, expect } from 'vitest'
import { sumSpendAndMessagingByAdId, resolvePeriod } from './dashboard'
import { MESSAGING_RESULT_TYPE } from '@/lib/stats/ad-population-constants'

function adRow(overrides: Partial<{
  ad_id: string
  ad_name: string
  ad_set_name: string
  amount_spent: number
  total_messaging_contacts: number | null
  result_type: string | null
}> = {}) {
  return {
    ad_id: 'ad-1',
    ad_name: 'Ad One',
    ad_set_name: 'Set One',
    amount_spent: 100,
    total_messaging_contacts: 5,
    result_type: MESSAGING_RESULT_TYPE,
    ...overrides,
  }
}

describe('sumSpendAndMessagingByAdId', () => {
  it('sums spend and messaging across multiple monthly rows for the same ad_id', () => {
    const rows = [
      adRow({ ad_id: 'ad-1', amount_spent: 100, total_messaging_contacts: 5 }),
      adRow({ ad_id: 'ad-1', amount_spent: 50, total_messaging_contacts: 2 }),
      adRow({ ad_id: 'ad-2', amount_spent: 30, total_messaging_contacts: 1 }),
    ]

    const perAd = sumSpendAndMessagingByAdId(rows)

    expect(perAd.get('ad-1')).toEqual({ ad_name: 'Ad One', ad_set_name: 'Set One', spend: 150, messaging: 7 })
    expect(perAd.get('ad-2')?.spend).toBe(30)
  })

  // docs/raven/Dashboard_Second_Pass.md §4.2 — spend and messaging must come
  // from the same filtered row set. This function no longer filters by
  // result_type itself (that's the caller's job, matching ad-set-ranking.ts's
  // rankByGroup) — an earlier version zeroed only spend on a non-matching
  // row while still summing its messaging contacts, which could put an ad at
  // a spuriously low or ₱0 cost per inquiry. Passing an already-filtered row
  // set here is the fix; this test locks in that the function itself just
  // sums whatever it's given, with no hidden filtering to regress.
  it('has no built-in result_type filtering — callers must pre-filter the row set', () => {
    const mixedRows = [
      adRow({ ad_id: 'ad-1', amount_spent: 100, total_messaging_contacts: 5, result_type: MESSAGING_RESULT_TYPE }),
      adRow({ ad_id: 'ad-1', amount_spent: 200, total_messaging_contacts: 10, result_type: 'Reach' }),
    ]

    const messagingOnly = sumSpendAndMessagingByAdId(mixedRows.filter(a => a.result_type === MESSAGING_RESULT_TYPE))

    expect(messagingOnly.get('ad-1')).toEqual({ ad_name: 'Ad One', ad_set_name: 'Set One', spend: 100, messaging: 5 })
  })
})

describe('resolvePeriod', () => {
  const anchor = new Date('2026-07-31T00:00:00')

  it('returns a plain "All time" periodLabel plus a separate resolved-range label', () => {
    const period = resolvePeriod(undefined, undefined, true, anchor)

    // periodLabel stays short so prose captions ("ran in {periodLabel}")
    // don't grow a parenthetical (docs/raven/Dashboard_Second_Pass.md §3) —
    // the resolved range lives in periodRangeLabel instead, for the KPI
    // cards' sub-line only.
    expect(period.periodLabel).toBe('All time')
    expect(period.periodRangeLabel).toMatch(/^\w+ \d{1,2}, \d{4} . \w+ \d{1,2}, \d{4}$/)
  })

  it('leaves periodRangeLabel null for an explicit date range', () => {
    const period = resolvePeriod('2026-06-01', '2026-06-30', false, anchor)

    expect(period.periodRangeLabel).toBeNull()
  })
})
