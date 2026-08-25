import type { RowRejection } from './row-validation'

export interface GenderRecord {
  gender: string
  distribution: number
}

export interface TerritoryRecord {
  territory: string
  distribution: number
}

export type DemographicsResult =
  | { type: 'gender';    rows: GenderRecord[] }
  | { type: 'territory'; rows: TerritoryRecord[] }

export interface DemographicsValidationResult {
  valid: DemographicsResult
  rejected: RowRejection[]
}

// `distribution` is stored as a fraction (0-1), matching every display site
// (page-metrics pages, SalesDashboardTabs, page-metrics-insight, the pie
// chart) which multiplies by 100 to render a percentage. Facebook's own
// export is inconsistent about which form it ships — some exports use
// fractions ("0.75"), others percentages ("73.70") — so this normalizes at
// the ingestion boundary rather than leaving every consumer to guess.
//
// A fraction can never exceed 1, so any row above 1 proves the file is in
// percent form; the sum check catches the case where every individual value
// happens to be <= 1 but the set as a whole is percent-scaled (unlikely for
// gender/territory shares, but cheap to guard). A normalized sum still above
// 1.5 means neither convention fits — this is a whole-file structural
// problem (the export itself is garbled or the wrong file), not a single
// row failing validation, so it still rejects the whole file rather than
// becoming a per-row rejection (docs/raven/Four_Remaining_Gaps_Please_Confirm.md §3).
function normalizeDistribution<T extends { distribution: number }>(rows: T[], label: string): T[] {
  if (rows.length === 0) return rows
  const isPercentForm = rows.some(r => r.distribution > 1) || rows.reduce((s, r) => s + r.distribution, 0) > 1.5
  const normalized = isPercentForm ? rows.map(r => ({ ...r, distribution: r.distribution / 100 })) : rows

  const total = normalized.reduce((s, r) => s + r.distribution, 0)
  if (total > 1.5) {
    throw new Error(`${label} distribution values sum to ${(total * 100).toFixed(0)}%, which is not a valid percentage or fraction split`)
  }

  return normalized
}

// FR-04/FR-07 — a row missing its label is rejected individually rather
// than aborting the whole file; the sum-consistency check above stays
// whole-file since it's a property of the file as a set, not a single row
// (docs/raven/Four_Remaining_Gaps_Please_Confirm.md §3 — this validator now
// backs FR-13a, so it's load-bearing, not a low-traffic edge case).
export function validateDemographicsRows(
  headers: string[],
  rows: Record<string, string>[]
): DemographicsValidationResult {
  if (rows.length === 0) throw new Error('Demographics CSV has no data rows')

  const rejected: RowRejection[] = []

  if (headers.includes('Gender')) {
    const genderRows: GenderRecord[] = []
    rows.forEach((row, i) => {
      const gender = row['Gender']?.trim()
      const dist   = parseFloat(row['Distribution'] ?? '0')
      if (!gender) {
        rejected.push({ row: i + 1, reason: 'missing Gender' })
        return
      }
      genderRows.push({ gender, distribution: isNaN(dist) ? 0 : dist })
    })
    return { valid: { type: 'gender', rows: normalizeDistribution(genderRows, 'Gender') }, rejected }
  }

  const territoryHeader = headers.find((h) => h.toLowerCase() === 'top territories')
  if (territoryHeader) {
    const territoryRows: TerritoryRecord[] = []
    rows.forEach((row, i) => {
      const territory = row[territoryHeader]?.trim()
      const dist      = parseFloat(row['Distribution'] ?? '0')
      if (!territory) {
        rejected.push({ row: i + 1, reason: `missing ${territoryHeader}` })
        return
      }
      territoryRows.push({ territory, distribution: isNaN(dist) ? 0 : dist })
    })
    return { valid: { type: 'territory', rows: normalizeDistribution(territoryRows, territoryHeader) }, rejected }
  }

  throw new Error('Could not identify demographics file type (expected Gender or Top territories column)')
}
