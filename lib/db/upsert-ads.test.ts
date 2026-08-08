import { describe, it, expect } from 'vitest'
import { assertNoDuplicateKeys, findSupersededMonthlyRowIds } from './upsert-ads'
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

describe('findSupersededMonthlyRowIds', () => {
  function daysBetween(startIso: string, endIso: string): AdRecord[] {
    const records: AdRecord[] = []
    for (let t = new Date(startIso).getTime(); t <= new Date(endIso).getTime(); t += 24 * 60 * 60 * 1000) {
      records.push(makeRecord({ ad_name: 'Ad A', ad_set_name: 'Set A', reporting_starts: new Date(t) }))
    }
    return records
  }

  const monthlyRow = {
    id: 1,
    ad_name: 'Ad A',
    ad_set_name: 'Set A',
    reporting_starts: new Date('2026-01-01T00:00:00Z'),
    reporting_ends: new Date('2026-01-31T00:00:00Z'),
  }

  it('supersedes a monthly row fully covered day-by-day by the daily upload', () => {
    const dailyRecords = daysBetween('2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z')
    expect(findSupersededMonthlyRowIds(dailyRecords, [monthlyRow])).toEqual([1])
  })

  it('does not supersede a monthly row when the daily upload only covers part of its span', () => {
    // Real-world case: a truncated/partial-month file. Deleting the monthly row here
    // would permanently lose the days outside this upload with nothing to restore them.
    const dailyRecords = daysBetween('2026-01-15T00:00:00Z', '2026-01-20T00:00:00Z')
    expect(findSupersededMonthlyRowIds(dailyRecords, [monthlyRow])).toEqual([])
  })

  it('supersedes a monthly row when the daily upload has a gap in the middle, as long as the file spans the full month', () => {
    // Facebook's daily export omits zero-delivery days per ad by design - a
    // gap here just means the ad didn't deliver that day, not a truncated
    // file. Coverage is judged by the file's overall date range, not by
    // whether every individual day has a row for this ad.
    const dailyRecords = [
      ...daysBetween('2026-01-01T00:00:00Z', '2026-01-14T00:00:00Z'),
      // 2026-01-15 missing - a normal zero-delivery day, not a truncation signal
      ...daysBetween('2026-01-16T00:00:00Z', '2026-01-31T00:00:00Z'),
    ]
    expect(findSupersededMonthlyRowIds(dailyRecords, [monthlyRow])).toEqual([1])
  })

  it('does not supersede a monthly row when the ad never appears anywhere in the file', () => {
    // A nonzero monthly aggregate with zero matching daily rows anywhere in
    // the file is a real mismatch between sources, not an expected gap -
    // leave it unsuperseded rather than guessing.
    const dailyRecords = daysBetween('2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z').map((r) => ({
      ...r,
      ad_name: 'A Different Ad',
    }))
    expect(findSupersededMonthlyRowIds(dailyRecords, [monthlyRow])).toEqual([])
  })

  it('does not supersede a same-length-span (already daily) existing row', () => {
    const existing = [
      {
        id: 1,
        ad_name: 'Ad A',
        ad_set_name: 'Set A',
        reporting_starts: new Date('2026-01-15T00:00:00Z'),
        reporting_ends: new Date('2026-01-15T00:00:00Z'),
      },
    ]
    const dailyRecords = daysBetween('2026-01-15T00:00:00Z', '2026-01-15T00:00:00Z')
    expect(findSupersededMonthlyRowIds(dailyRecords, existing)).toEqual([])
  })

  it('does not supersede a 2-day-span row unless both days are covered', () => {
    const existing = [
      {
        id: 1,
        ad_name: 'Ad A',
        ad_set_name: 'Set A',
        reporting_starts: new Date('2026-01-01T00:00:00Z'),
        reporting_ends: new Date('2026-01-02T00:00:00Z'),
      },
    ]
    const onlyOneDay = daysBetween('2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
    expect(findSupersededMonthlyRowIds(onlyOneDay, existing)).toEqual([])

    const bothDays = daysBetween('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')
    expect(findSupersededMonthlyRowIds(bothDays, existing)).toEqual([1])
  })

  it('does not supersede a monthly row for a different ad/ad-set pair', () => {
    const existing = [{ ...monthlyRow, id: 2, ad_name: 'Ad B' }]
    const dailyRecords = daysBetween('2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z')
    expect(findSupersededMonthlyRowIds(dailyRecords, existing)).toEqual([])
  })

  it('does not confuse ad names/ad-set names that collide when naively joined by a space', () => {
    const existing = [
      {
        id: 1,
        ad_name: 'A B',
        ad_set_name: 'C',
        reporting_starts: new Date('2026-01-01T00:00:00Z'),
        reporting_ends: new Date('2026-01-31T00:00:00Z'),
      },
    ]
    const dailyRecords = daysBetween('2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z').map((r) => ({
      ...r,
      ad_name: 'A',
      ad_set_name: 'B C',
    }))
    expect(findSupersededMonthlyRowIds(dailyRecords, existing)).toEqual([])
  })
})
