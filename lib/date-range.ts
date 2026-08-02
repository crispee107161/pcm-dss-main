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
