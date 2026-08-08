import { describe, it, expect } from 'vitest'
import { aggregateAdsBySet, type AdRowForSetAggregation } from './ad-set-metrics'

function row(overrides: Partial<AdRowForSetAggregation> & { ad_name: string; ad_set_name: string }): AdRowForSetAggregation {
  return {
    amount_spent: 0,
    total_messaging_contacts: null,
    reach: null,
    ...overrides,
  }
}

describe('aggregateAdsBySet', () => {
  it('sums spend and messaging across ad-day rows for the same ad', () => {
    const rows = [
      row({ ad_name: 'ad-1', ad_set_name: 'set-a', amount_spent: 100, total_messaging_contacts: 5 }),
      row({ ad_name: 'ad-1', ad_set_name: 'set-a', amount_spent: 50, total_messaging_contacts: 2 }),
    ]
    const grouped = aggregateAdsBySet(rows)
    expect(grouped.get('set-a')).toEqual({ total_spend: 150, total_messaging: 7, total_reach: 0 })
  })

  it('takes MAX reach per ad, not the sum, before summing across ads in a set', () => {
    const rows = [
      row({ ad_name: 'ad-1', ad_set_name: 'set-a', reach: 100 }),
      row({ ad_name: 'ad-1', ad_set_name: 'set-a', reach: 80 }),
      row({ ad_name: 'ad-2', ad_set_name: 'set-a', reach: 40 }),
    ]
    const grouped = aggregateAdsBySet(rows)
    // ad-1 contributes max(100, 80) = 100, ad-2 contributes 40 -> set total 140
    expect(grouped.get('set-a')?.total_reach).toBe(140)
  })

  it('keeps different ad sets separate', () => {
    const rows = [
      row({ ad_name: 'ad-1', ad_set_name: 'set-a', amount_spent: 10, total_messaging_contacts: 1 }),
      row({ ad_name: 'ad-2', ad_set_name: 'set-b', amount_spent: 20, total_messaging_contacts: 2 }),
    ]
    const grouped = aggregateAdsBySet(rows)
    expect(grouped.get('set-a')).toEqual({ total_spend: 10, total_messaging: 1, total_reach: 0 })
    expect(grouped.get('set-b')).toEqual({ total_spend: 20, total_messaging: 2, total_reach: 0 })
  })

  it('treats null reach and null messaging contacts as zero', () => {
    const rows = [row({ ad_name: 'ad-1', ad_set_name: 'set-a' })]
    const grouped = aggregateAdsBySet(rows)
    expect(grouped.get('set-a')).toEqual({ total_spend: 0, total_messaging: 0, total_reach: 0 })
  })

  it('returns an empty map for no rows', () => {
    expect(aggregateAdsBySet([]).size).toBe(0)
  })
})
