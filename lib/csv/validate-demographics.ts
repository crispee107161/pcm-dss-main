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
    return { type: 'gender', rows: genderRows }
  }

  if (headers.includes('Top territories')) {
    const territoryRows: TerritoryRecord[] = rows.map((row, i) => {
      const territory = row['Top territories']?.trim()
      const dist      = parseFloat(row['Distribution'] ?? '0')
      if (!territory) throw new Error(`Row ${i + 1}: missing Top territories`)
      return { territory, distribution: isNaN(dist) ? 0 : dist }
    })
    return { type: 'territory', rows: territoryRows }
  }

  throw new Error('Could not identify demographics file type (expected Gender or Top territories column)')
}
