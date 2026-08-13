import { describe, it, expect } from 'vitest'
import { rankByAdSet, rankByCampaign, MIN_ADS_FOR_CONFIDENCE, type AdForGroupRanking } from './ad-set-ranking'

function ad(overrides: Partial<AdForGroupRanking> & { ad_id: string }): AdForGroupRanking {
  return {
    ad_set_id: 'set-1',
    ad_set_name: 'Set One',
    campaign_id: 'camp-1',
    campaign_name: 'Campaign One',
    amount_spent: 0,
    total_messaging_contacts: null,
    ...overrides,
  }
}

describe('rankByAdSet', () => {
  it('groups by ad_set_id, not ad_set_name — the name-reuse trap', () => {
    // Two distinct ad_set_ids that happen to share the same display name.
    const ads = [
      ad({ ad_id: 'a1', ad_set_id: 'set-A', ad_set_name: 'Reused Name', amount_spent: 1000, total_messaging_contacts: 10 }),
      ad({ ad_id: 'a2', ad_set_id: 'set-B', ad_set_name: 'Reused Name', amount_spent: 500, total_messaging_contacts: 5 }),
    ]
    const rows = rankByAdSet(ads)
    expect(rows).toHaveLength(2)
    expect(new Set(rows.map(r => r.id))).toEqual(new Set(['set-A', 'set-B']))
  })

  it('aggregates monthly rows per Ad ID before grouping', () => {
    const ads = [
      ad({ ad_id: 'a1', ad_set_id: 'set-A', amount_spent: 500, total_messaging_contacts: 10 }), // month 1
      ad({ ad_id: 'a1', ad_set_id: 'set-A', amount_spent: 500, total_messaging_contacts: 10 }), // month 2 — same ad
      ad({ ad_id: 'a2', ad_set_id: 'set-A', amount_spent: 1000, total_messaging_contacts: 20 }),
    ]
    const rows = rankByAdSet(ads)
    expect(rows).toHaveLength(1)
    expect(rows[0].adCount).toBe(2) // 2 distinct ads, not 3 rows
    expect(rows[0].spend).toBe(2000)
    expect(rows[0].inquiries).toBe(40)
    expect(rows[0].cpi).toBe(50)
  })

  it('excludes non-messaging ads (total_messaging_contacts null) entirely', () => {
    const ads = [
      ad({ ad_id: 'purchase-ad', ad_set_id: 'set-A', amount_spent: 1000, total_messaging_contacts: null }),
      ad({ ad_id: 'messaging-ad', ad_set_id: 'set-B', amount_spent: 500, total_messaging_contacts: 10 }),
    ]
    const rows = rankByAdSet(ads)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('set-B')
  })

  it('gives a group with zero inquiries a null CPI, sorted last', () => {
    const ads = [
      ad({ ad_id: 'a1', ad_set_id: 'no-results', amount_spent: 1000, total_messaging_contacts: 0 }),
      ad({ ad_id: 'a2', ad_set_id: 'has-results', amount_spent: 1000, total_messaging_contacts: 50 }),
    ]
    const rows = rankByAdSet(ads)
    expect(rows.map(r => r.id)).toEqual(['has-results', 'no-results'])
    expect(rows[1].cpi).toBeNull()
  })

  it('sorts ascending by CPI — cheapest cost per messaging conversation first', () => {
    const ads = [
      ad({ ad_id: 'a1', ad_set_id: 'expensive', amount_spent: 1000, total_messaging_contacts: 10 }), // cpi 100
      ad({ ad_id: 'a2', ad_set_id: 'cheap', amount_spent: 100, total_messaging_contacts: 10 }), // cpi 10
    ]
    const rows = rankByAdSet(ads)
    expect(rows.map(r => r.id)).toEqual(['cheap', 'expensive'])
  })

  it(`flags groups with fewer than ${MIN_ADS_FOR_CONFIDENCE} ads as low-confidence`, () => {
    const ads = [
      ad({ ad_id: 'a1', ad_set_id: 'small', amount_spent: 500, total_messaging_contacts: 10 }),
      ad({ ad_id: 'a2', ad_set_id: 'big', amount_spent: 500, total_messaging_contacts: 10 }),
      ad({ ad_id: 'a3', ad_set_id: 'big', amount_spent: 500, total_messaging_contacts: 10 }),
      ad({ ad_id: 'a4', ad_set_id: 'big', amount_spent: 500, total_messaging_contacts: 10 }),
    ]
    const rows = rankByAdSet(ads)
    const small = rows.find(r => r.id === 'small')
    const big = rows.find(r => r.id === 'big')
    expect(small?.lowConfidence).toBe(true)
    expect(big?.lowConfidence).toBe(false)
  })
})

describe('rankByCampaign', () => {
  it('groups by campaign_id, not campaign_name', () => {
    const ads = [
      ad({ ad_id: 'a1', campaign_id: 'camp-A', campaign_name: 'Q1 Push', amount_spent: 1000, total_messaging_contacts: 10 }),
      ad({ ad_id: 'a2', campaign_id: 'camp-B', campaign_name: 'Q1 Push', amount_spent: 500, total_messaging_contacts: 5 }),
    ]
    const rows = rankByCampaign(ads)
    expect(new Set(rows.map(r => r.id))).toEqual(new Set(['camp-A', 'camp-B']))
  })
})
