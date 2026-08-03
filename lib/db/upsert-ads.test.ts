import { describe, it, expect } from 'vitest'
import { assertNoDuplicateKeys } from './upsert-ads'
import type { AdRecord } from '@/lib/csv/validate-ads'

function makeRecord(overrides: Partial<AdRecord> = {}): AdRecord {
  return {
    reporting_starts: new Date('2026-01-01T00:00:00Z'),
    reporting_ends: new Date('2026-01-31T00:00:00Z'),
    ad_name: 'Ad A',
    ad_set_name: 'Set A',
    attribution_setting: '7-day click',
    reach: 100,
    impressions: 1000,
    link_clicks: 10,
    amount_spent: 50,
    total_messaging_contacts: 5,
    results: 5,
    cost_per_result: 10,
    inquiries: 5,
    ...overrides,
  }
}

describe('assertNoDuplicateKeys', () => {
  it('throws when two rows share ad_name, ad_set_name, and reporting_starts', () => {
    const records = [makeRecord(), makeRecord({ amount_spent: 999 })]
    expect(() => assertNoDuplicateKeys(records)).toThrow(/Duplicate row/)
  })

  it('allows rows that share an ad_name but differ by ad_set_name', () => {
    const records = [
      makeRecord({ ad_set_name: 'Set A' }),
      makeRecord({ ad_set_name: 'Set B' }),
    ]
    expect(() => assertNoDuplicateKeys(records)).not.toThrow()
  })

  it('allows rows that share ad_name and ad_set_name but differ by reporting_starts', () => {
    const records = [
      makeRecord({ reporting_starts: new Date('2026-01-01T00:00:00Z') }),
      makeRecord({ reporting_starts: new Date('2026-01-02T00:00:00Z') }),
    ]
    expect(() => assertNoDuplicateKeys(records)).not.toThrow()
  })

  it('does not throw for a single row', () => {
    expect(() => assertNoDuplicateKeys([makeRecord()])).not.toThrow()
  })
})
