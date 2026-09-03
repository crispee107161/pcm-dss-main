// Every stored timestamp is a UTC instant representing a Manila wall-clock
// time (lib/csv/timezone.ts's parseIsoLocalAsManila) — Manila midnight on
// the 1st of a month is 16:00 UTC the day before, so reading year/month off
// the raw Date with .getFullYear()/.getMonth() (server-local, UTC on
// Vercel) bucketed early-month rows into the previous month. This mirrors
// STUDY_PERIOD_LABEL's own Asia/Manila-anchored formatter so a row's month
// bucket always matches the wall-clock month it was uploaded against
// (docs/dashboard/Dashboard_Plain_Language_and_Notation.md §6.2 — the
// Follows chart's leftmost tick read "Jul 2025" against a study period that
// starts Aug 2025).
const MANILA_TZ = 'Asia/Manila'
const MANILA_YEAR_MONTH_FMT = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TZ, year: 'numeric', month: '2-digit' })
export const MANILA_MONTH_LABEL_FMT = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TZ, month: 'short', year: 'numeric' })

export function manilaYearMonth(d: Date): { year: number; month: number } {
  const parts = MANILA_YEAR_MONTH_FMT.formatToParts(d)
  const year = Number(parts.find(p => p.type === 'year')!.value)
  const month = Number(parts.find(p => p.type === 'month')!.value)
  return { year, month }
}

export function monthKey(d: Date): string {
  const { year, month } = manilaYearMonth(d)
  return `${year}-${String(month).padStart(2, '0')}`
}

export function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1)
}

export interface TargetMonth { label: string; year: number; month: number }

// Shared by every "monthly series" chart on the dashboard — buckets rows by
// calendar month (Manila wall-clock, see manilaYearMonth above) using each
// row's own date field, most-recent-first, then returns the labelled months
// in chronological order for charting.
export function distinctMonths<T>(rows: T[], getDate: (row: T) => Date, limit?: number): TargetMonth[] {
  const seen = new Set<string>()
  const months: TargetMonth[] = []
  const sorted = [...rows].sort((a, b) => getDate(b).getTime() - getDate(a).getTime())
  for (const row of sorted) {
    const d = getDate(row)
    const { year, month } = manilaYearMonth(d)
    const key = `${year}-${String(month).padStart(2, '0')}`
    if (!seen.has(key)) {
      seen.add(key)
      months.push({ label: MANILA_MONTH_LABEL_FMT.format(d), year, month })
      if (limit && months.length === limit) break
    }
  }
  return months.reverse()
}

export function rowsInMonth<T>(rows: T[], getDate: (row: T) => Date, target: TargetMonth): T[] {
  return rows.filter(row => {
    const { year, month } = manilaYearMonth(getDate(row))
    return year === target.year && month === target.month
  })
}
