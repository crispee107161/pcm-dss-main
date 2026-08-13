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
// 1.5 means neither convention fits, so the file is rejected rather than
// silently rendering a bogus split.
function normalizeDistribution<T extends { distribution: number }>(rows: T[], label: string): T[] {
  const isPercentForm = rows.some(r => r.distribution > 1) || rows.reduce((s, r) => s + r.distribution, 0) > 1.5
  const normalized = isPercentForm ? rows.map(r => ({ ...r, distribution: r.distribution / 100 })) : rows

  const total = normalized.reduce((s, r) => s + r.distribution, 0)
  if (total > 1.5) {
    throw new Error(`${label} distribution values sum to ${(total * 100).toFixed(0)}%, which is not a valid percentage or fraction split`)
  }

  return normalized
}

export function validateDemographicsRows(
  headers: string[],
  rows: Record<string, string>[]
): DemographicsResult {
  if (rows.length === 0) throw new Error('Demographics CSV has no data rows')

  if (headers.includes('Gender')) {
    const genderRows: GenderRecord[] = rows.map((row, i) => {
      const gender = row['Gender']?.trim()
      const dist   = parseFloat(row['Distribution'] ?? '0')
      if (!gender) throw new Error(`Row ${i + 1}: missing Gender`)
      return { gender, distribution: isNaN(dist) ? 0 : dist }
    })
    return { type: 'gender', rows: normalizeDistribution(genderRows, 'Gender') }
  }

  if (headers.includes('Top territories')) {
    const territoryRows: TerritoryRecord[] = rows.map((row, i) => {
      const territory = row['Top territories']?.trim()
      const dist      = parseFloat(row['Distribution'] ?? '0')
      if (!territory) throw new Error(`Row ${i + 1}: missing Top territories`)
      return { territory, distribution: isNaN(dist) ? 0 : dist }
    })
    return { type: 'territory', rows: normalizeDistribution(territoryRows, 'Top territories') }
  }

  throw new Error('Could not identify demographics file type (expected Gender or Top territories column)')
}
