import { describe, it, expect } from 'vitest'
import { manilaYearMonth, monthKey, monthIndex, distinctMonths, rowsInMonth } from './month-buckets'

describe('manilaYearMonth', () => {
  // Manila is UTC+8, so Manila midnight on the 1st is 16:00 UTC the day
  // before — reading year/month off the raw UTC instant with a server-local
  // (or UTC) .getFullYear()/.getMonth() would bucket this into the prior
  // month.
  it('buckets a Manila-midnight boundary instant into the correct month', () => {
    const manilaMidnightFeb1 = new Date('2026-01-31T16:00:00.000Z')
    expect(manilaYearMonth(manilaMidnightFeb1)).toEqual({ year: 2026, month: 2 })
  })

  it('buckets a mid-month instant unambiguously', () => {
    expect(manilaYearMonth(new Date('2026-06-15T04:00:00.000Z'))).toEqual({ year: 2026, month: 6 })
  })
})

describe('monthKey', () => {
  it('formats as zero-padded YYYY-MM', () => {
    expect(monthKey(new Date('2026-02-15T04:00:00.000Z'))).toBe('2026-02')
  })
})

describe('monthIndex', () => {
  it('is monotonically increasing across a year boundary', () => {
    expect(monthIndex(2025, 12)).toBeLessThan(monthIndex(2026, 1))
    expect(monthIndex(2026, 1) - monthIndex(2025, 12)).toBe(1)
  })
})

describe('distinctMonths', () => {
  it('includes months beyond a stale 3-month snapshot when the data extends further', () => {
    const rows = [
      { date: new Date('2025-09-15T04:00:00.000Z') },
      { date: new Date('2025-12-15T04:00:00.000Z') },
      { date: new Date('2026-01-15T04:00:00.000Z') },
      { date: new Date('2026-05-15T04:00:00.000Z') },
      { date: new Date('2026-07-15T04:00:00.000Z') },
    ]
    const months = distinctMonths(rows, r => r.date)
    expect(months.map(m => m.label)).toEqual(['Sep 2025', 'Dec 2025', 'Jan 2026', 'May 2026', 'Jul 2026'])
  })

  it('returns months in chronological order regardless of row order', () => {
    const rows = [
      { date: new Date('2026-03-01T04:00:00.000Z') },
      { date: new Date('2025-11-01T04:00:00.000Z') },
    ]
    const months = distinctMonths(rows, r => r.date)
    expect(months.map(m => `${m.year}-${m.month}`)).toEqual(['2025-11', '2026-3'])
  })

  it('dedupes multiple rows in the same month', () => {
    const rows = [
      { date: new Date('2026-03-01T04:00:00.000Z') },
      { date: new Date('2026-03-20T04:00:00.000Z') },
    ]
    expect(distinctMonths(rows, r => r.date)).toHaveLength(1)
  })

  it('respects a limit, keeping the most recent months', () => {
    const rows = [
      { date: new Date('2026-01-01T04:00:00.000Z') },
      { date: new Date('2026-02-01T04:00:00.000Z') },
      { date: new Date('2026-03-01T04:00:00.000Z') },
    ]
    const months = distinctMonths(rows, r => r.date, 2)
    expect(months.map(m => m.month)).toEqual([2, 3])
  })

  it('returns an empty array for no rows', () => {
    expect(distinctMonths<{ date: Date }>([], r => r.date)).toEqual([])
  })
})

describe('rowsInMonth', () => {
  it('filters rows to the target Manila month', () => {
    const rows = [
      { date: new Date('2026-01-31T16:00:00.000Z') }, // Manila Feb 1
      { date: new Date('2026-02-15T04:00:00.000Z') },
      { date: new Date('2026-03-01T04:00:00.000Z') },
    ]
    const feb = rowsInMonth(rows, r => r.date, { label: 'Feb 2026', year: 2026, month: 2 })
    expect(feb).toHaveLength(2)
  })
})
