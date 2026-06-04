import type { PageMetricParseResult } from './parse'

// Re-export for use in upsert
export type { PageMetricParseResult }

export function validatePageMetricResult(result: PageMetricParseResult): PageMetricParseResult {
  if (result.rows.length === 0) {
    throw new Error(`No data rows found in page metric file for column "${result.column}"`)
  }

  // Validate that dates are parseable ISO datetime strings
  for (const row of result.rows) {
    const d = new Date(row.date)
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid date in page metric file: "${row.date}"`)
    }
  }

  return result
}
