import { describe, it, expect } from 'vitest'
import { validateAdsRows } from './validate-ads'

function baseRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    'Ad name': 'Test Ad',
    'Reporting starts': '2025-09-01',
    'Reporting ends': '2025-09-30',
    'Ad set name': 'Set A',
    'Attribution setting': '7-day click',
    Impressions: '1000',
    'Amount spent (PHP)': '500',
    ...overrides,
  }
}

describe('validateAdsRows', () => {
  it('parses a pure ISO date (no time) as UTC midnight', () => {
    const [record] = validateAdsRows([baseRow()])
    expect(record.reporting_starts.toISOString()).toBe('2025-09-01T00:00:00.000Z')
    expect(record.reporting_ends.toISOString()).toBe('2025-09-30T00:00:00.000Z')
  })

  it('is deterministic regardless of process timezone', () => {
    const [a] = validateAdsRows([baseRow()])
    const [b] = validateAdsRows([baseRow()])
    expect(a.reporting_starts.getTime()).toBe(b.reporting_starts.getTime())
  })
})
