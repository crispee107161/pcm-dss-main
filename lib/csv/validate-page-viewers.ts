import { MONTH_INDEX } from './month-names'
import { parseIsoLocalAsManila } from './timezone'
import type { RowValidationResult } from './row-validation'

export interface PageViewersRecord {
  date: Date
  total_viewers: number | null
  new_viewers: number
  returning_viewers: number
}

/**
 * Dates in Viewers.csv are formatted as "August 19" (no year) → assume 2025.
 * Last row has "undefined" for Total Viewers → treat as null.
 */
function parseViewerDate(raw: string): Date {
  const cleaned = raw.trim().replace(/^"|"$/g, '')
  const match = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2})$/)
  const month = match ? MONTH_INDEX[match[1]] : undefined
  if (!match || month === undefined) {
    throw new Error(`Could not parse viewer date: "${raw}"`)
  }
  const day = match[2].padStart(2, '0')
  const monthStr = String(month + 1).padStart(2, '0')
  const d = parseIsoLocalAsManila(`2025-${monthStr}-${day}T00:00:00`)
  if (isNaN(d.getTime())) {
    throw new Error(`Could not parse viewer date: "${raw}"`)
  }
  return d
}

function parseNullableInt(raw: string | undefined): number | null {
  if (!raw || raw.trim() === '' || raw.trim().toLowerCase() === 'undefined') return null
  const v = parseInt(raw, 10)
  return isNaN(v) ? null : v
}

// FR-04/FR-07 — collects a parse error per row instead of throwing on the
// first one, so one malformed row no longer discards every other row in
// the file (docs/raven/Four_Remaining_Gaps_Please_Confirm.md §3).
export function validatePageViewersRows(
  rows: Record<string, string>[]
): RowValidationResult<PageViewersRecord> {
  if (rows.length === 0) throw new Error('Viewers CSV has no data rows')

  const valid: PageViewersRecord[] = []
  const rejected: RowValidationResult<PageViewersRecord>['rejected'] = []

  rows.forEach((row, i) => {
    try {
      const dateRaw      = row['Date']
      const totalRaw     = row['Total Viewers']
      const newRaw       = row['New Viewers']
      const returningRaw = row['Returning Viewers']

      if (!dateRaw) throw new Error('missing Date')

      valid.push({
        date:              parseViewerDate(dateRaw),
        total_viewers:     parseNullableInt(totalRaw),
        new_viewers:       parseInt(newRaw ?? '0', 10) || 0,
        returning_viewers: parseInt(returningRaw ?? '0', 10) || 0,
      })
    } catch (err) {
      rejected.push({ row: i + 1, reason: (err as Error).message })
    }
  })

  return { valid, rejected }
}
