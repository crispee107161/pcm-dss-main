import { describe, it, expect } from 'vitest'
import { validateAudienceResult } from './validate-audience'
import type { AudienceParseResult } from './parse'

const empty: AudienceParseResult = { ageGender: [], topCities: [] }

describe('validateAudienceResult', () => {
  it('converts percent values to fractions', () => {
    const { valid } = validateAudienceResult({
      ...empty,
      ageGender: [{ age_bracket: '18-24', men_pct: 12.3, women_pct: 3.6 }],
      topCities: [{ label: 'Manila, Philippines', pct: 6.4 }],
    })
    expect(valid.ageGender[0].age_bracket).toBe('18-24')
    expect(valid.ageGender[0].men_distribution).toBeCloseTo(0.123, 5)
    expect(valid.ageGender[0].women_distribution).toBeCloseTo(0.036, 5)
    expect(valid.topCities[0].label).toBe('Manila, Philippines')
    expect(valid.topCities[0].distribution).toBeCloseTo(0.064, 5)
  })

  // FR-04/FR-07: an out-of-range row is rejected individually, the rest of
  // the file is still processed — docs/raven/Four_Remaining_Gaps_Please_Confirm.md §3.
  it('rejects a negative Top cities percentage without discarding the rest of the file', () => {
    const { valid, rejected } = validateAudienceResult({
      ...empty,
      topCities: [
        { label: 'Manila, Philippines', pct: -1 },
        { label: 'Cebu, Philippines', pct: 4.2 },
      ],
    })
    expect(valid.topCities).toEqual([{ label: 'Cebu, Philippines', distribution: 0.042 }])
    expect(rejected).toEqual([{ row: 1, reason: expect.stringMatching(/between 0 and 100/) }])
  })

  it('rejects a Top cities percentage over 100 as a per-row rejection', () => {
    const { valid, rejected } = validateAudienceResult({
      ...empty,
      topCities: [{ label: 'Manila, Philippines', pct: 150 }],
    })
    expect(valid.topCities).toEqual([])
    expect(rejected[0].reason).toMatch(/between 0 and 100/)
  })

  it('rejects an Age & gender value over 100 as a per-row rejection', () => {
    const { valid, rejected } = validateAudienceResult({
      ...empty,
      ageGender: [{ age_bracket: '18-24', men_pct: 150, women_pct: 3.6 }],
    })
    expect(valid.ageGender).toEqual([])
    expect(rejected[0].reason).toMatch(/between 0 and 100/)
  })

  it('rejects when the surviving valid Age & gender rows sum to an implausible total', () => {
    expect(() =>
      validateAudienceResult({
        ...empty,
        ageGender: [
          { age_bracket: '18-24', men_pct: 90, women_pct: 90 },
        ],
      })
    ).toThrow(/sum to/)
  })

  it('throws when no blocks contain any data', () => {
    expect(() => validateAudienceResult(empty)).toThrow(/no recognizable data/)
  })
})
