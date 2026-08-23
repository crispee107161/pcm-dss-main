import { describe, it, expect } from 'vitest'
import { validateAudienceResult } from './validate-audience'
import type { AudienceParseResult } from './parse'

const empty: AudienceParseResult = { ageGender: [], topCities: [], topPages: [] }

describe('validateAudienceResult', () => {
  it('converts percent values to fractions', () => {
    const result = validateAudienceResult({
      ...empty,
      ageGender: [{ age_bracket: '18-24', men_pct: 12.3, women_pct: 3.6 }],
      topCities: [{ label: 'Manila, Philippines', pct: 6.4 }],
    })
    expect(result.ageGender[0].age_bracket).toBe('18-24')
    expect(result.ageGender[0].men_distribution).toBeCloseTo(0.123, 5)
    expect(result.ageGender[0].women_distribution).toBeCloseTo(0.036, 5)
    expect(result.topCities[0].label).toBe('Manila, Philippines')
    expect(result.topCities[0].distribution).toBeCloseTo(0.064, 5)
  })

  it('allows Top pages affinity scores above 100 (not a distribution)', () => {
    const result = validateAudienceResult({
      ...empty,
      topPages: [{ label: 'ABS-CBN', pct: 168.4 }],
    })
    expect(result.topPages[0].label).toBe('ABS-CBN')
    expect(result.topPages[0].distribution).toBeCloseTo(1.684, 5)
  })

  it('rejects a negative Top cities percentage', () => {
    expect(() =>
      validateAudienceResult({ ...empty, topCities: [{ label: 'Manila, Philippines', pct: -1 }] })
    ).toThrow(/between 0 and 100/)
  })

  it('rejects a Top cities percentage over 100', () => {
    expect(() =>
      validateAudienceResult({ ...empty, topCities: [{ label: 'Manila, Philippines', pct: 150 }] })
    ).toThrow(/between 0 and 100/)
  })

  it('rejects an Age & gender value over 100', () => {
    expect(() =>
      validateAudienceResult({ ...empty, ageGender: [{ age_bracket: '18-24', men_pct: 150, women_pct: 3.6 }] })
    ).toThrow(/between 0 and 100/)
  })

  it('rejects when Age & gender values sum to an implausible total', () => {
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
