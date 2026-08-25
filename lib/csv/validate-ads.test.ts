import { describe, it, expect } from 'vitest'
import { validateAdsRows } from './validate-ads'

function baseRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    'Ad ID': '123456789',
    'Ad name': 'Test Ad',
    'Reporting starts': '2025-09-01',
    'Reporting ends': '2025-09-30',
    'Ad set ID': '987654321',
    'Ad set name': 'Set A',
    'Campaign ID': '111222333',
    'Campaign name': 'Campaign A',
    'Attribution setting': '7-day click',
    Impressions: '1000',
    'Amount spent (PHP)': '500',
    ...overrides,
  }
}

describe('validateAdsRows', () => {
  it('parses a pure ISO date (no time) as UTC midnight', () => {
    const { valid: [record] } = validateAdsRows([baseRow()])
    expect(record.reporting_starts.toISOString()).toBe('2025-09-01T00:00:00.000Z')
    expect(record.reporting_ends.toISOString()).toBe('2025-09-30T00:00:00.000Z')
  })

  it('is deterministic regardless of process timezone', () => {
    const { valid: [a] } = validateAdsRows([baseRow()])
    const { valid: [b] } = validateAdsRows([baseRow()])
    expect(a.reporting_starts.getTime()).toBe(b.reporting_starts.getTime())
  })

  // FR-04/FR-07: a row that fails validation must be reported, not discard
  // the rest of the file — docs/raven/Three_Decisions_and_FR_Table_Writable.md §1.
  it('rejects a single malformed row without discarding the rest of the file', () => {
    const rows = [
      baseRow({ 'Ad ID': 'good-1' }),
      baseRow({ 'Ad ID': '' }), // missing required field
      baseRow({ 'Ad ID': 'good-2' }),
    ]
    const { valid, rejected } = validateAdsRows(rows)

    expect(valid).toHaveLength(2)
    expect(valid.map(r => r.ad_id)).toEqual(['good-1', 'good-2'])
    expect(rejected).toHaveLength(1)
    expect(rejected[0].row).toBe(2)
    expect(rejected[0].reason).toMatch(/Ad ID/)
  })

  it('rejects a within-file duplicate (Ad ID, Reporting starts) as its own row, keeping the first occurrence', () => {
    const rows = [
      baseRow({ 'Ad ID': 'dup', 'Reporting starts': '2025-09-01' }),
      baseRow({ 'Ad ID': 'dup', 'Reporting starts': '2025-09-01' }),
    ]
    const { valid, rejected } = validateAdsRows(rows)

    expect(valid).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(rejected[0].row).toBe(2)
    expect(rejected[0].reason).toMatch(/Duplicate row/)
  })

  it('returns an empty valid array with every row rejected when the whole file is malformed, rather than throwing', () => {
    const { valid, rejected } = validateAdsRows([baseRow({ 'Ad ID': '' }), baseRow({ 'Ad ID': '' })])
    expect(valid).toHaveLength(0)
    expect(rejected).toHaveLength(2)
  })
})
