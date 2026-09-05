import { describe, it, expect } from 'vitest'
import { computeBudgetReallocation, sortQ4WorstFirst, type AdForReallocation, type ReallocationAd } from './budget-reallocation'
import { MESSAGING_RESULT_TYPE } from './ad-population-constants'

function ad(overrides: Partial<AdForReallocation> & { ad_id: string }): AdForReallocation {
  return {
    ad_name: overrides.ad_id,
    ad_set_name: 'set-1',
    amount_spent: 0,
    total_messaging_contacts: null,
    result_type: MESSAGING_RESULT_TYPE,
    ...overrides,
  }
}

describe('computeBudgetReallocation', () => {
  it('aggregates monthly rows per Ad ID before quartiling', () => {
    const ads = [
      ad({ ad_id: 'A', amount_spent: 600, total_messaging_contacts: 30 }), // month 1
      ad({ ad_id: 'A', amount_spent: 600, total_messaging_contacts: 30 }), // month 2 — same ad, sums to spend 1200, inquiries 60, cpi 20
      ad({ ad_id: 'B', amount_spent: 1200, total_messaging_contacts: 20 }), // cpi 60
    ]
    const result = computeBudgetReallocation(ads, 1000)
    expect(result.n).toBe(2)
    expect(result.q1Cpi).toBe(20)
  })

  it('excludes ads below the minimum-spend threshold', () => {
    const ads = [
      ad({ ad_id: 'below', amount_spent: 500, total_messaging_contacts: 25 }),
      ad({ ad_id: 'above', amount_spent: 1500, total_messaging_contacts: 50 }),
    ]
    const result = computeBudgetReallocation(ads, 1000)
    expect(result.n).toBe(1)
    expect(result.quartiles.reduce((s, q) => s + q.n, 0)).toBe(1)
  })

  it('excludes ads with zero inquiries — CPI is undefined, not infinite', () => {
    const ads = [
      ad({ ad_id: 'spend-no-results', amount_spent: 2000, total_messaging_contacts: 0 }),
      ad({ ad_id: 'real', amount_spent: 2000, total_messaging_contacts: 10 }),
    ]
    const result = computeBudgetReallocation(ads, 1000)
    expect(result.n).toBe(1)
  })

  it('splits into four equal-size rank-based quartiles (best CPI first)', () => {
    // 8 ads, CPI 10..80 in steps of 10 — clean 2/2/2/2 split.
    const ads = Array.from({ length: 8 }, (_, i) =>
      ad({ ad_id: `ad-${i}`, amount_spent: 1000, total_messaging_contacts: 1000 / ((i + 1) * 10) }),
    )
    const result = computeBudgetReallocation(ads, 500)
    expect(result.quartiles.map(q => q.n)).toEqual([2, 2, 2, 2])
    expect(result.quartiles[0].cpi).toBeLessThan(result.quartiles[3].cpi)
  })

  it('computes the counterfactual as Q4 spend at Q1 rate, based on recorded results', () => {
    // 8 ads, rank-quartiled 2/2/2/2 by cpi.
    // Q1 (lowest cpi): two ads at cpi 10 (spend 1000/inquiries 100 each) -> q1Cpi = 10
    // Q4 (highest cpi): two ads at cpi 50 (spend 1000/inquiries 20 each) -> q4Spend = 2000, q4Inquiries = 40
    const ads = [
      ad({ ad_id: 'q1-a', amount_spent: 1000, total_messaging_contacts: 100 }),
      ad({ ad_id: 'q1-b', amount_spent: 1000, total_messaging_contacts: 100 }),
      ad({ ad_id: 'q2-a', amount_spent: 1000, total_messaging_contacts: 50 }),
      ad({ ad_id: 'q2-b', amount_spent: 1000, total_messaging_contacts: 50 }),
      ad({ ad_id: 'q3-a', amount_spent: 1000, total_messaging_contacts: 30 }),
      ad({ ad_id: 'q3-b', amount_spent: 1000, total_messaging_contacts: 30 }),
      ad({ ad_id: 'q4-a', amount_spent: 1000, total_messaging_contacts: 20 }),
      ad({ ad_id: 'q4-b', amount_spent: 1000, total_messaging_contacts: 20 }),
    ]
    const result = computeBudgetReallocation(ads, 500)
    expect(result.q1Cpi).toBe(10)
    expect(result.q4Spend).toBe(2000)
    expect(result.q4Inquiries).toBe(40)
    expect(result.counterfactualInquiries).toBe(200) // 2000 / 10
    expect(result.additionalInquiries).toBe(160) // 200 - 40
  })

  it('returns an empty result when nothing clears the threshold', () => {
    const ads = [ad({ ad_id: 'small', amount_spent: 100, total_messaging_contacts: 5 })]
    const result = computeBudgetReallocation(ads, 1000)
    expect(result.n).toBe(0)
    expect(result.quartiles).toHaveLength(4)
    expect(result.quartiles.every(q => q.n === 0)).toBe(true)
    expect(result.additionalInquiries).toBe(0)
  })

  it('excludes non-messaging-month spend from the CPI numerator (docs/raven/Top_Ads_Accepted_and_Filter_Question.md §2)', () => {
    const ads = [
      // Messaging month: spend 1000, 50 inquiries.
      ad({ ad_id: 'mixed', amount_spent: 1000, total_messaging_contacts: 50, result_type: MESSAGING_RESULT_TYPE }),
      // Same ad, a later non-messaging month: this spend must NOT inflate the CPI numerator.
      ad({ ad_id: 'mixed', amount_spent: 4000, total_messaging_contacts: null, result_type: 'Link clicks' }),
    ]
    const result = computeBudgetReallocation(ads, 500)
    expect(result.n).toBe(1)
    expect(result.q1Cpi).toBe(20) // 1000 / 50, not 5000 / 50
  })

  // The actual live-behaviour delta of switching from `total_messaging_contacts
  // !== null` to `result_type === MESSAGING_RESULT_TYPE`: a messaging row whose
  // "Results" cell was blank in the CSV has total_messaging_contacts null
  // (lib/csv/validate-ads.ts sets it to `results`, which parseIntOrNull leaves
  // null for a blank cell) even though result_type correctly says it's a
  // messaging row. Its spend must still count toward CPI.
  it('includes spend from a messaging-optimised row with a blank Results cell', () => {
    const ads = [
      ad({ ad_id: 'blank-results', amount_spent: 1000, total_messaging_contacts: 50 }), // normal month
      ad({ ad_id: 'blank-results', amount_spent: 500, total_messaging_contacts: null, result_type: MESSAGING_RESULT_TYPE }), // blank Results cell, still messaging
    ]
    const result = computeBudgetReallocation(ads, 1000)
    expect(result.n).toBe(1)
    expect(result.q1Cpi).toBe(30) // (1000 + 500) / 50, not 1000 / 50
  })

  it('excludes an ad from the population whose messaging spend does not clear the threshold, even if its total spend would', () => {
    const ads = [
      ad({ ad_id: 'mostly-non-messaging', amount_spent: 400, total_messaging_contacts: 20, result_type: MESSAGING_RESULT_TYPE }),
      ad({ ad_id: 'mostly-non-messaging', amount_spent: 4000, total_messaging_contacts: null, result_type: 'Link clicks' }), // total spend 4400, but only 400 is messaging spend
    ]
    const result = computeBudgetReallocation(ads, 1000)
    expect(result.n).toBe(0)
  })

  it('treats a null result_type as non-messaging, not as messaging by default', () => {
    const ads = [ad({ ad_id: 'no-result-type', amount_spent: 2000, total_messaging_contacts: null, result_type: null })]
    const result = computeBudgetReallocation(ads, 1000)
    expect(result.n).toBe(0)
  })

  it('never enters an ad with only non-messaging rows into the population, even at a zero threshold', () => {
    const ads = [ad({ ad_id: 'never-messaging', amount_spent: 100, total_messaging_contacts: null, result_type: 'Link clicks' })]
    const result = computeBudgetReallocation(ads, 0)
    expect(result.n).toBe(0)
  })
})

function reallocationAd(overrides: Partial<ReallocationAd> & { ad_id: string; cpi: number }): ReallocationAd {
  return {
    ad_name: overrides.ad_id,
    ad_set_name: 'set-1',
    spend: 0,
    inquiries: 0,
    ...overrides,
  }
}

describe('sortQ4WorstFirst', () => {
  it('puts the highest-CPI ad first, regardless of input order', () => {
    const q4Ads = [
      reallocationAd({ ad_id: 'least-bad', cpi: 25 }),
      reallocationAd({ ad_id: 'worst', cpi: 60 }),
      reallocationAd({ ad_id: 'middle', cpi: 40 }),
    ]
    const sorted = sortQ4WorstFirst(q4Ads)
    expect(sorted.map(a => a.ad_id)).toEqual(['worst', 'middle', 'least-bad'])
  })

  it('does not mutate the input array', () => {
    const q4Ads = [reallocationAd({ ad_id: 'a', cpi: 10 }), reallocationAd({ ad_id: 'b', cpi: 20 })]
    sortQ4WorstFirst(q4Ads)
    expect(q4Ads.map(a => a.ad_id)).toEqual(['a', 'b'])
  })
})
