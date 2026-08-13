import { describe, it, expect } from 'vitest'
import { assertNoDuplicateKeys } from './upsert-ads'
import type { AdRecord } from '@/lib/csv/validate-ads'

function makeRecord(overrides: Partial<AdRecord> = {}): AdRecord {
  return {
    reporting_starts: new Date('2026-01-01T00:00:00Z'),
    reporting_ends: new Date('2026-01-31T00:00:00Z'),
    ad_id: 'AD1',
    ad_name: 'Ad A',
    ad_set_id: 'SET1',
    ad_set_name: 'Set A',
    campaign_id: 'CAMP1',
    campaign_name: 'Campaign A',
    attribution_setting: '7-day click',
    reach: 100,
    impressions: 1000,
    link_clicks: 10,
    amount_spent: 50,
    result_type: 'Messaging conversations started',
    frequency: 1.2,
    post_engagements: 20,
    views: 300,
    viewers: 250,
    total_messaging_contacts: 5,
    results: 5,
    cost_per_result: 10,
    inquiries: null,
    ...overrides,
  }
}

describe('assertNoDuplicateKeys', () => {
  it('throws when two rows share ad_id and reporting_starts', () => {
    const records = [makeRecord(), makeRecord({ amount_spent: 999 })]
    expect(() => assertNoDuplicateKeys(records)).toThrow(/Duplicate row/)
  })

  it('allows rows that share reporting_starts but differ by ad_id', () => {
    const records = [
      makeRecord({ ad_id: 'AD1' }),
      makeRecord({ ad_id: 'AD2' }),
    ]
    expect(() => assertNoDuplicateKeys(records)).not.toThrow()
  })

  it('allows rows that share ad_id but differ by reporting_starts', () => {
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
