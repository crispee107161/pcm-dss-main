import { MANILA_OFFSET } from '@/lib/csv/timezone'

export interface DateRangeWhere {
  gte?: Date
  lte?: Date
}

/**
 * Builds a Prisma-compatible `{ gte, lte }` filter from `from`/`to` date-only
 * strings (as produced by `DateRangeFilter`'s `?from=&to=` URL params).
 *
 * Facebook CSV rows are stored Manila-anchored (see lib/csv/timezone.ts,
 * `parseIsoLocalAsManila`). A bare `new Date('2025-09-20')` is midnight UTC,
 * which is 08:00 *after* the Manila-midnight row for that day — so a naive
 * `gte` would silently drop the first day of the range. Anchoring both
 * boundaries to +08:00 keeps the filter aligned with how the data was parsed.
 *
 * Returns `null` when both `from` and `to` are absent, meaning "all time" —
 * callers should omit the `where` clause entirely in that case.
 */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

function dayBoundary(day: string | undefined, timePart: string): Date | undefined {
  if (!day || !ISO_DAY.test(day)) return undefined
  const date = new Date(`${day}T${timePart}${MANILA_OFFSET}`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function manilaDayRange(from?: string, to?: string): DateRangeWhere | null {
  const gte = dayBoundary(from, '00:00:00')
  const lte = dayBoundary(to, '23:59:59.999')

  if (!gte && !lte) return null

  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte } : {}),
  }
}

// ── Date-only (YYYY-MM-DD) string helpers ──
// Shared by DateRangeFilter's prev/next stepper (client) and any server
// component that needs to derive a comparison window from the same
// `?from=&to=` params (e.g. "vs prior period" deltas) — kept in one place
// so the window-length math can't drift between the two.

export function toISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Operates entirely in UTC — `iso` parses as UTC midnight, so mixing in
// local getters/setters (as toISODate uses for actual local Dates) would
// shift the result by a day on any negative-UTC-offset server.
export function addDaysToIsoDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function diffDaysInclusive(fromISO: string, toISO: string): number {
  const from = new Date(fromISO)
  const to = new Date(toISO)
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

/**
 * The equal-length window immediately preceding `[from, to]` — e.g. for a
 * selected "Last 30 days" range, this is the 30 days right before it. Used
 * to compute honest "vs prior period" deltas when a date filter is active,
 * instead of comparing against a fixed 7-day window that may not even
 * overlap the selected range.
 */
export function priorEqualWindow(from: string, to: string): { from: string; to: string } {
  const windowDays = diffDaysInclusive(from, to)
  const prevTo = addDaysToIsoDate(from, -1)
  const prevFrom = addDaysToIsoDate(prevTo, -(windowDays - 1))
  return { from: prevFrom, to: prevTo }
}

/**
 * The last full calendar month before `ref` — e.g. ref=Aug 12 -> Jul 1..Jul
 * 31. This is the S1 dashboard's default period (mvp.md §4.1). Shared
 * between `DateRangeFilter` (client, for the preset menu) and the dashboard
 * data layer (server, to scope the default query) so the two can't drift.
 */
export function lastCompleteMonth(ref: Date): { from: string; to: string } {
  const end = new Date(ref.getFullYear(), ref.getMonth(), 0)
  const start = new Date(end.getFullYear(), end.getMonth(), 1)
  return { from: toISODate(start), to: toISODate(end) }
}
