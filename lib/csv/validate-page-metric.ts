import type { PageMetricParseResult, PageMetricRow } from './parse'
import type { RowRejection } from './row-validation'

// Re-export for use in upsert
export type { PageMetricParseResult }

export interface PageMetricValidationResult {
  valid: PageMetricParseResult
  rejected: RowRejection[]
}

// FR-04/FR-07 — an unparseable date rejects only that row, not the whole
// file (docs/raven/Four_Remaining_Gaps_Please_Confirm.md §3). Returns the
// same `{ column, rows }` shape upsert-page-metric.ts already consumes,
// with `rows` filtered down to the valid ones — not the generic
// RowValidationResult<T> shape, since `valid` here is one object (a column
// plus its rows), not an array of records.
export function validatePageMetricResult(
  result: PageMetricParseResult
): PageMetricValidationResult {
  if (result.rows.length === 0) {
    throw new Error(`No data rows found in page metric file for column "${result.column}"`)
  }

  const validRows: PageMetricRow[] = []
  const rejected: RowRejection[] = []

  result.rows.forEach((row, i) => {
    const d = new Date(row.date)
    if (isNaN(d.getTime())) {
      rejected.push({ row: i + 1, reason: `Invalid date in page metric file: "${row.date}"` })
    } else {
      validRows.push(row)
    }
  })

  return { valid: { column: result.column, rows: validRows }, rejected }
}
