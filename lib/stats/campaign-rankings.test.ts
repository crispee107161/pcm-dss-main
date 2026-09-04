import { describe, it, expect } from 'vitest'
import {
  aggregateAdsById,
  rankBySpend,
  rankByMessagingContacts,
  rankByReach,
  rankByCostPerInquiry,
  rankByCtr,
  rankByCostPerClick,
  countEligibleForCostPerInquiry,
  countEligibleForCtr,
  countEligibleForCostPerClick,
  type AdForRanking,
  type AggregatedAd,
} from './campaign-rankings'
import { FR31_RESULT_TYPE } from './fr31-regression'

function adRow(overrides: Partial<AdForRanking> & { ad_id: string; ad_name: string }): AdForRanking {
  const total_messaging_contacts = overrides.total_messaging_contacts ?? null
  return {
    ad_set_name: 'set-1',
    amount_spent: 0,
    impressions: 0,
    link_clicks: null,
    total_messaging_contacts,
    // Mirrors lib/csv/validate-ads.ts's derivation (messaging row -> both
    // set, non-messaging row -> both null), so tests that only set
    // total_messaging_contacts keep behaving correctly under the fix that
    // filters messagingSpend on result_type. Override result_type directly
    // to test the case where the two diverge (a messaging row with a blank
    // "Results" CSV cell, where total_messaging_contacts is null but
    // result_type is still FR31_RESULT_TYPE).
    result_type: total_messaging_contacts !== null ? FR31_RESULT_TYPE : null,
    reach: null,
    reporting_starts: new Date('2026-01-01'),
    reporting_ends: new Date('2026-01-31'),
    ...overrides,
  }
}

function ad(overrides: Partial<AggregatedAd> & { name: string }): AggregatedAd {
  const amountSpent = overrides.amountSpent ?? 0
  return {
    ad_id: overrides.name,
    adSetName: 'set-1',
    amountSpent,
    // Defaults to amountSpent (all-messaging ad) so existing CPI tests that
    // only set amountSpent keep behaving as a pure-messaging ad; tests for
    // the mixed-spend case override messagingSpend explicitly.
    messagingSpend: amountSpent,
    impressions: 0,
    linkClicks: 0,
    messagingContacts: 0,
    reach: 0,
    monthsRan: 1,
    ...overrides,
  }
}

describe('aggregateAdsById', () => {
  it('sums an advertisement\'s monthly rows into one aggregate, keyed by ad_id not ad_name', () => {
    const rows = [
      adRow({
        ad_id: 'a1', ad_name: 'summer promo', amount_spent: 100, total_messaging_contacts: 5, reach: 1000,
        reporting_starts: new Date('2026-01-01'), reporting_ends: new Date('2026-01-31'),
      }),
      adRow({
        ad_id: 'a1', ad_name: 'summer promo', amount_spent: 200, total_messaging_contacts: 10, reach: 800,
        reporting_starts: new Date('2026-02-01'), reporting_ends: new Date('2026-02-28'),
      }),
    ]
    const [aggregated] = aggregateAdsById(rows)
    expect(aggregated.amountSpent).toBe(300)
    expect(aggregated.messagingContacts).toBe(15)
    expect(aggregated.reach).toBe(1800)
    expect(aggregated.monthsRan).toBe(2)
  })

  it('counts distinct calendar months, not rows — two rows in the same month count once', () => {
    const rows = [
      adRow({
        ad_id: 'a1', ad_name: 'daily-grain ad',
        reporting_starts: new Date('2026-01-01'), reporting_ends: new Date('2026-01-01'),
      }),
      adRow({
        ad_id: 'a1', ad_name: 'daily-grain ad',
        reporting_starts: new Date('2026-01-15'), reporting_ends: new Date('2026-01-15'),
      }),
    ]
    const [aggregated] = aggregateAdsById(rows)
    expect(aggregated.monthsRan).toBe(1)
  })

  it('keeps two different ads with the same name as two separate aggregates', () => {
    const rows = [
      adRow({ ad_id: 'a1', ad_name: 'reused name', amount_spent: 100 }),
      adRow({ ad_id: 'a2', ad_name: 'reused name', amount_spent: 900 }),
    ]
    const aggregated = aggregateAdsById(rows)
    expect(aggregated).toHaveLength(2)
    expect(aggregated.map(a => a.amountSpent).sort((x, y) => x - y)).toEqual([100, 900])
  })

  it('treats null link_clicks/messaging/reach as zero, not skipped', () => {
    const rows = [adRow({ ad_id: 'a1', ad_name: 'no-clicks', amount_spent: 50 })]
    const [aggregated] = aggregateAdsById(rows)
    expect(aggregated.linkClicks).toBe(0)
    expect(aggregated.messagingContacts).toBe(0)
    expect(aggregated.reach).toBe(0)
  })

  it('sums messagingSpend only from rows with result_type = "Messaging conversations started", unlike amountSpent which sums every row', () => {
    // docs/raven/Top_Ads_Accepted_and_Filter_Question.md §2: a mixed ad that
    // ran both a messaging month and a non-messaging month must not have the
    // non-messaging month's spend counted toward its cost-per-inquiry numerator.
    const rows = [
      adRow({ ad_id: 'a1', ad_name: 'mixed', amount_spent: 100, total_messaging_contacts: 5 }), // messaging month
      adRow({ ad_id: 'a1', ad_name: 'mixed', amount_spent: 400, total_messaging_contacts: null }), // non-messaging month
    ]
    const [aggregated] = aggregateAdsById(rows)
    expect(aggregated.amountSpent).toBe(500)
    expect(aggregated.messagingSpend).toBe(100)
    expect(aggregated.messagingContacts).toBe(5)
  })

  it('counts a messaging row\'s spend even when total_messaging_contacts is null because the CSV\'s Results cell was blank', () => {
    // The filter is on result_type, not on total_messaging_contacts !== null.
    // A messaging-type row with an unparsable/blank "Results" cell still has
    // total_messaging_contacts = null (lib/csv/validate-ads.ts), but its
    // spend is still real messaging spend and must not be dropped from the
    // numerator — that would be the mirror-image bug (CPI deflated instead
    // of inflated).
    const rows = [
      adRow({ ad_id: 'a1', ad_name: 'blank-results', amount_spent: 100, result_type: FR31_RESULT_TYPE, total_messaging_contacts: null }),
    ]
    const [aggregated] = aggregateAdsById(rows)
    expect(aggregated.messagingSpend).toBe(100)
    expect(aggregated.messagingContacts).toBe(0)
  })
})

describe('rankBySpend', () => {
  it('ranks descending and respects the limit', () => {
    const ads = [ad({ name: 'low', amountSpent: 10 }), ad({ name: 'high', amountSpent: 90 })]
    expect(rankBySpend(ads).map(r => r.name)).toEqual(['high', 'low'])
    expect(rankBySpend(ads, 1)).toHaveLength(1)
  })

  it('excludes ads with zero spend', () => {
    const ads = [ad({ name: 'zero', amountSpent: 0 })]
    expect(rankBySpend(ads)).toEqual([])
  })

  it('carries monthsRan through to the ranked row', () => {
    const ads = [ad({ name: 'multi-month', amountSpent: 100, monthsRan: 4 })]
    expect(rankBySpend(ads)[0].monthsRan).toBe(4)
  })
})

describe('rankByMessagingContacts', () => {
  it('ranks descending and excludes zero', () => {
    const ads = [
      ad({ name: 'none', messagingContacts: 0 }),
      ad({ name: 'few', messagingContacts: 2 }),
      ad({ name: 'many', messagingContacts: 20 }),
    ]
    expect(rankByMessagingContacts(ads).map(r => r.name)).toEqual(['many', 'few'])
  })
})

describe('rankByReach', () => {
  it('ranks descending and excludes zero', () => {
    const ads = [ad({ name: 'none', reach: 0 }), ad({ name: 'some', reach: 500 })]
    expect(rankByReach(ads).map(r => r.name)).toEqual(['some'])
  })
})

describe('rankByCostPerInquiry', () => {
  it('ranks ascending — cheapest cost per inquiry first', () => {
    const ads = [
      ad({ name: 'expensive', amountSpent: 1000, messagingContacts: 10 }), // 100/inquiry
      ad({ name: 'cheap', amountSpent: 100, messagingContacts: 10 }), // 10/inquiry
    ]
    const ranked = rankByCostPerInquiry(ads)
    expect(ranked.map(r => r.name)).toEqual(['cheap', 'expensive'])
    expect(ranked[0].value).toBe(10)
  })

  it('excludes ads below the minimum inquiry sample size, summed across months', () => {
    const ads = [
      // 1 inquiry at very low spend looks amazing but is noise, not signal
      ad({ name: 'lucky-fluke', amountSpent: 5, messagingContacts: 1 }),
      ad({ name: 'proven', amountSpent: 500, messagingContacts: 50 }),
    ]
    const ranked = rankByCostPerInquiry(ads)
    expect(ranked.map(r => r.name)).toEqual(['proven'])
  })

  it('skips ads with zero inquiries and zero spend, without producing Infinity/NaN', () => {
    const ads = [
      ad({ name: 'zero-inquiries', amountSpent: 100, messagingContacts: 0 }),
      ad({ name: 'zero-spend', amountSpent: 0, messagingContacts: 10 }),
    ]
    expect(rankByCostPerInquiry(ads)).toEqual([])
  })

  it('respects the limit and returns [] for empty input', () => {
    const ads = Array.from({ length: 15 }, (_, i) => ad({ name: `ad-${i}`, amountSpent: 100, messagingContacts: 10 }))
    expect(rankByCostPerInquiry(ads)).toHaveLength(10)
    expect(rankByCostPerInquiry(ads, 3)).toHaveLength(3)
    expect(rankByCostPerInquiry([])).toEqual([])
  })

  it('divides by messaging-only spend, not total spend, for an ad with a mixed messaging/non-messaging month', () => {
    const rows = [
      adRow({ ad_id: 'a1', ad_name: 'mixed', amount_spent: 100, total_messaging_contacts: 5 }), // messaging month
      adRow({ ad_id: 'a1', ad_name: 'mixed', amount_spent: 400, total_messaging_contacts: null }), // non-messaging month
    ]
    const [aggregated] = aggregateAdsById(rows)
    const ranked = rankByCostPerInquiry([aggregated])
    // Correct: 100 (messaging spend) / 5 = 20. Bug would give 500 / 5 = 100.
    expect(ranked[0].value).toBe(20)
  })

  it('sums spend and messaging across an ad\'s months before dividing, not the mean of per-month ratios', () => {
    const rows = [
      adRow({ ad_id: 'a1', ad_name: 'multi-month', amount_spent: 10, total_messaging_contacts: 10 }), // 1/inquiry
      adRow({ ad_id: 'a1', ad_name: 'multi-month', amount_spent: 990, total_messaging_contacts: 1 }), // 990/inquiry
    ]
    const [aggregated] = aggregateAdsById(rows)
    const ranked = rankByCostPerInquiry([aggregated])
    // sum-then-divide: (10 + 990) / (10 + 1) = 90.9...
    // mean-of-ratios (wrong): (1 + 990) / 2 = 495.5
    expect(ranked[0].value).toBeCloseTo(1000 / 11, 6)
  })
})

describe('rankByCtr', () => {
  it('ranks descending — highest CTR first', () => {
    const ads = [
      ad({ name: 'low-ctr', impressions: 10000, linkClicks: 200 }), // 2%
      ad({ name: 'high-ctr', impressions: 10000, linkClicks: 500 }), // 5%
    ]
    const ranked = rankByCtr(ads)
    expect(ranked.map(r => r.name)).toEqual(['high-ctr', 'low-ctr'])
    expect(ranked[0].value).toBeCloseTo(0.05, 6)
  })

  it('does not let a low-impression ad with a lucky CTR outrank a high-impression, high-volume ad', () => {
    const ads = [
      // 1 click out of 12 impressions = 8.3% CTR, but far too small a sample to trust
      ad({ name: 'small-sample-fluke', impressions: 12, linkClicks: 1 }),
      ad({ name: 'real-performer', impressions: 80000, linkClicks: 3040 }), // 3.8%
    ]
    const ranked = rankByCtr(ads)
    expect(ranked.map(r => r.name)).toEqual(['real-performer'])
  })

  it('skips ads with zero link_clicks or zero impressions', () => {
    const ads = [
      ad({ name: 'zero-clicks', impressions: 5000, linkClicks: 0 }),
      ad({ name: 'zero-impressions', impressions: 0, linkClicks: 10 }),
    ]
    expect(rankByCtr(ads)).toEqual([])
  })

  it('respects the limit and returns [] for empty input', () => {
    const ads = Array.from({ length: 15 }, (_, i) => ad({ name: `ad-${i}`, impressions: 5000, linkClicks: 100 }))
    expect(rankByCtr(ads)).toHaveLength(10)
    expect(rankByCtr(ads, 4)).toHaveLength(4)
    expect(rankByCtr([])).toEqual([])
  })
})

describe('rankByCostPerClick', () => {
  it('ranks ascending — cheapest cost per click first', () => {
    const ads = [
      ad({ name: 'expensive', amountSpent: 1000, linkClicks: 50 }), // 20/click
      ad({ name: 'cheap', amountSpent: 200, linkClicks: 50 }), // 4/click
    ]
    const ranked = rankByCostPerClick(ads)
    expect(ranked.map(r => r.name)).toEqual(['cheap', 'expensive'])
    expect(ranked[0].value).toBe(4)
  })

  it('excludes ads below the minimum click sample size', () => {
    const ads = [
      ad({ name: 'lucky-fluke', amountSpent: 1, linkClicks: 1 }),
      ad({ name: 'proven', amountSpent: 300, linkClicks: 100 }),
    ]
    const ranked = rankByCostPerClick(ads)
    expect(ranked.map(r => r.name)).toEqual(['proven'])
  })

  it('skips ads with zero link_clicks or zero spend', () => {
    const ads = [
      ad({ name: 'zero-clicks', amountSpent: 100, linkClicks: 0 }),
      ad({ name: 'zero-spend', amountSpent: 0, linkClicks: 50 }),
    ]
    expect(rankByCostPerClick(ads)).toEqual([])
  })

  it('respects the limit and returns [] for empty input', () => {
    const ads = Array.from({ length: 15 }, (_, i) => ad({ name: `ad-${i}`, amountSpent: 100, linkClicks: 50 }))
    expect(rankByCostPerClick(ads)).toHaveLength(10)
    expect(rankByCostPerClick(ads, 2)).toHaveLength(2)
    expect(rankByCostPerClick([])).toEqual([])
  })
})

describe('countEligibleFor*', () => {
  it('mirrors each rank function\'s own filter', () => {
    const ads = [
      ad({ name: 'eligible-cpi', amountSpent: 100, messagingContacts: 10 }),
      ad({ name: 'not-eligible-cpi', amountSpent: 100, messagingContacts: 1 }),
    ]
    expect(countEligibleForCostPerInquiry(ads)).toBe(1)

    // countEligibleForCostPerInquiry filters on messagingSpend, not
    // amountSpent — this case only exercises that if messagingSpend
    // genuinely diverges from amountSpent (the ad() fixture defaults
    // messagingSpend to amountSpent, which would mask this).
    const rows = [
      adRow({ ad_id: 'a1', ad_name: 'messaging-eligible', amount_spent: 100, total_messaging_contacts: 5 }),
      adRow({ ad_id: 'a2', ad_name: 'all-non-messaging', amount_spent: 100, total_messaging_contacts: null }),
    ]
    const aggregated = aggregateAdsById(rows)
    // 'messaging-eligible' clears the floor (messagingSpend 100 > 0,
    // messagingContacts 5 >= MIN_INQUIRIES_FOR_CPI); 'all-non-messaging' has
    // messagingSpend = 0 despite amountSpent = 100, so it must not count as
    // eligible for cost-per-inquiry even though it has real ad spend.
    expect(countEligibleForCostPerInquiry(aggregated)).toBe(1)

    const ctrAds = [
      ad({ name: 'eligible-ctr', impressions: 2000, linkClicks: 10 }),
      ad({ name: 'not-eligible-ctr', impressions: 100, linkClicks: 10 }),
    ]
    expect(countEligibleForCtr(ctrAds)).toBe(1)

    const cpcAds = [
      ad({ name: 'eligible-cpc', amountSpent: 100, linkClicks: 40 }),
      ad({ name: 'not-eligible-cpc', amountSpent: 100, linkClicks: 5 }),
    ]
    expect(countEligibleForCostPerClick(cpcAds)).toBe(1)
  })
})
