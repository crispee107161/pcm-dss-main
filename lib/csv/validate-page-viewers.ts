export interface PageViewersRecord {
  date: Date
  total_viewers: number | null
  new_viewers: number
  returning_viewers: number
}

/**
 * Dates in Viewers.csv are formatted as "August 19" (no year) → append " 2025".
 * Last row has "undefined" for Total Viewers → treat as null.
 */
function parseViewerDate(raw: string): Date {
  const cleaned = raw.trim().replace(/^"|"$/g, '')
  const d = new Date(`${cleaned} 2025`)
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

export function validatePageViewersRows(
  rows: Record<string, string>[]
): PageViewersRecord[] {
  if (rows.length === 0) throw new Error('Viewers CSV has no data rows')

  return rows.map((row, i) => {
    const dateRaw      = row['Date']
    const totalRaw     = row['Total Viewers']
    const newRaw       = row['New Viewers']
    const returningRaw = row['Returning Viewers']

    if (!dateRaw) throw new Error(`Row ${i + 1}: missing Date`)

    return {
      date:              parseViewerDate(dateRaw),
      total_viewers:     parseNullableInt(totalRaw),
      new_viewers:       parseInt(newRaw ?? '0', 10) || 0,
      returning_viewers: parseInt(returningRaw ?? '0', 10) || 0,
    }
  })
}
