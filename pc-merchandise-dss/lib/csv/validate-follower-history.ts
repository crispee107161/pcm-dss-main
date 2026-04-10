export interface FollowerHistoryRecord {
  date: Date
  followers: number
  daily_change: number
}

/**
 * Dates in FollowerHistory.csv are formatted as "August 18" (month + day, no year).
 * The data covers Aug–Oct 2025, so we append " 2025".
 */
function parseFollowerDate(raw: string): Date {
  const cleaned = raw.trim().replace(/^"|"$/g, '')
  const d = new Date(`${cleaned} 2025`)
  if (isNaN(d.getTime())) {
    throw new Error(`Could not parse follower history date: "${raw}"`)
  }
  return d
}

export function validateFollowerHistoryRows(
  rows: Record<string, string>[]
): FollowerHistoryRecord[] {
  if (rows.length === 0) throw new Error('FollowerHistory CSV has no data rows')

  return rows.map((row, i) => {
    const dateRaw  = row['Date']
    const follRaw  = row['Followers']
    const diffRaw  = row['Difference in followers from previous day']

    if (!dateRaw) throw new Error(`Row ${i + 1}: missing Date`)
    if (!follRaw) throw new Error(`Row ${i + 1}: missing Followers`)

    return {
      date:         parseFollowerDate(dateRaw),
      followers:    parseInt(follRaw, 10) || 0,
      daily_change: parseInt(diffRaw ?? '0', 10) || 0,
    }
  })
}
