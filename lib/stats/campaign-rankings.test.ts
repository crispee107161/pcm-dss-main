import { describe, it, expect } from 'vitest'
import {
  rankByCostPerInquiry,
  rankByCtr,
  rankByCostPerClick,
  type AdForRanking,
} from './campaign-rankings'

function ad(overrides: Partial<AdForRanking> & { ad_name: string }): AdForRanking {
  return {
    ad_set_name: 'set-1',
    amount_spent: 0,
    impressions: 0,
    link_clicks: null,
    total_messaging_contacts: null,
    reporting_starts: new Date('2026-01-01'),
    reporting_ends: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('rankByCostPerInquiry', () => {
  it('ranks ascending — cheapest cost per inquiry first', () => {
    const ads = [
      ad({ ad_name: 'expensive', amount_spent: 1000, total_messaging_contacts: 10 }), // 100/inquiry
      ad({ ad_name: 'cheap',     amount_spent: 100,  total_messaging_contacts: 10 }), // 10/inquiry
    ]
    const ranked = rankByCostPerInquiry(ads)
    expect(ranked.map(r => r.name)).toEqual(['cheap', 'expensive'])
    expect(ranked[0].value).toBe(10)
  })

  it('excludes ads below the minimum inquiry sample size', () => {
    const ads = [
      // 1 inquiry at very low spend looks amazing but is noise, not signal
      ad({ ad_name: 'lucky-fluke', amount_spent: 5, total_messaging_contacts: 1 }),
      ad({ ad_name: 'proven',      amount_spent: 500, total_messaging_contacts: 50 }),
    ]
    const ranked = rankByCostPerInquiry(ads)
    expect(ranked.map(r => r.name)).toEqual(['proven'])
  })

  it('skips ads with null or zero inquiries, and zero spend, without producing Infinity/NaN', () => {
    const ads = [
      ad({ ad_name: 'no-inquiries', amount_spent: 100, total_messaging_contacts: null }),
      ad({ ad_name: 'zero-inquiries', amount_spent: 100, total_messaging_contacts: 0 }),
      ad({ ad_name: 'zero-spend', amount_spent: 0, total_messaging_contacts: 10 }),
    ]
    const ranked = rankByCostPerInquiry(ads)
    expect(ranked).toEqual([])
  })

  it('respects the limit and returns [] for empty input', () => {
    const ads = Array.from({ length: 15 }, (_, i) =>
      ad({ ad_name: `ad-${i}`, amount_spent: 100, total_messaging_contacts: 10 })
    )
    expect(rankByCostPerInquiry(ads)).toHaveLength(10)
    expect(rankByCostPerInquiry(ads, 3)).toHaveLength(3)
    expect(rankByCostPerInquiry([])).toEqual([])
  })

  it('excludes monthly-granularity rows even when they would otherwise rank best', () => {
    const ads = [
      // A month's totals blended into one ratio isn't comparable to a daily one -
      // must never outrank real daily performance, in either direction.
      ad({
        ad_name: 'stale-monthly-survivor', amount_spent: 100, total_messaging_contacts: 100,
        reporting_starts: new Date('2025-09-01'), reporting_ends: new Date('2025-09-30'),
      }),
      ad({ ad_name: 'real-daily', amount_spent: 500, total_messaging_contacts: 50 }),
    ]
    const ranked = rankByCostPerInquiry(ads)
    expect(ranked.map(r => r.name)).toEqual(['real-daily'])
  })
})

describe('rankByCtr', () => {
  it('ranks descending — highest CTR first', () => {
    const ads = [
      ad({ ad_name: 'low-ctr',  impressions: 10000, link_clicks: 200 }), // 2%
      ad({ ad_name: 'high-ctr', impressions: 10000, link_clicks: 500 }), // 5%
    ]
    const ranked = rankByCtr(ads)
    expect(ranked.map(r => r.name)).toEqual(['high-ctr', 'low-ctr'])
    expect(ranked[0].value).toBeCloseTo(0.05, 6)
  })

  it('does not let a low-impression ad with a lucky CTR outrank a high-impression, high-volume ad', () => {
    const ads = [
      // 1 click out of 12 impressions = 8.3% CTR, but far too small a sample to trust
      ad({ ad_name: 'small-sample-fluke', impressions: 12, link_clicks: 1 }),
      ad({ ad_name: 'real-performer',     impressions: 80000, link_clicks: 3040 }), // 3.8%
    ]
    const ranked = rankByCtr(ads)
    expect(ranked.map(r => r.name)).toEqual(['real-performer'])
  })

  it('skips ads with null/zero link_clicks or zero impressions', () => {
    const ads = [
      ad({ ad_name: 'no-clicks', impressions: 5000, link_clicks: null }),
      ad({ ad_name: 'zero-clicks', impressions: 5000, link_clicks: 0 }),
      ad({ ad_name: 'zero-impressions', impressions: 0, link_clicks: 10 }),
    ]
    expect(rankByCtr(ads)).toEqual([])
  })

  it('respects the limit and returns [] for empty input', () => {
    const ads = Array.from({ length: 15 }, (_, i) =>
      ad({ ad_name: `ad-${i}`, impressions: 5000, link_clicks: 100 })
    )
    expect(rankByCtr(ads)).toHaveLength(10)
    expect(rankByCtr(ads, 4)).toHaveLength(4)
    expect(rankByCtr([])).toEqual([])
  })
})

describe('rankByCostPerClick', () => {
  it('ranks ascending — cheapest cost per click first', () => {
    const ads = [
      ad({ ad_name: 'expensive', amount_spent: 1000, link_clicks: 50 }), // 20/click
      ad({ ad_name: 'cheap',     amount_spent: 200,  link_clicks: 50 }), // 4/click
    ]
    const ranked = rankByCostPerClick(ads)
    expect(ranked.map(r => r.name)).toEqual(['cheap', 'expensive'])
    expect(ranked[0].value).toBe(4)
  })

  it('excludes ads below the minimum click sample size', () => {
    const ads = [
      ad({ ad_name: 'lucky-fluke', amount_spent: 1, link_clicks: 1 }),
      ad({ ad_name: 'proven', amount_spent: 300, link_clicks: 100 }),
    ]
    const ranked = rankByCostPerClick(ads)
    expect(ranked.map(r => r.name)).toEqual(['proven'])
  })

  it('skips ads with null/zero link_clicks or zero spend', () => {
    const ads = [
      ad({ ad_name: 'no-clicks', amount_spent: 100, link_clicks: null }),
      ad({ ad_name: 'zero-clicks', amount_spent: 100, link_clicks: 0 }),
      ad({ ad_name: 'zero-spend', amount_spent: 0, link_clicks: 50 }),
    ]
    expect(rankByCostPerClick(ads)).toEqual([])
  })

  it('respects the limit and returns [] for empty input', () => {
    const ads = Array.from({ length: 15 }, (_, i) =>
      ad({ ad_name: `ad-${i}`, amount_spent: 100, link_clicks: 50 })
    )
    expect(rankByCostPerClick(ads)).toHaveLength(10)
    expect(rankByCostPerClick(ads, 2)).toHaveLength(2)
    expect(rankByCostPerClick([])).toEqual([])
  })
})
