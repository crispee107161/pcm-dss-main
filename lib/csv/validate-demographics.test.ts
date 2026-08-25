import { describe, it, expect } from 'vitest'
import { validateDemographicsRows } from './validate-demographics'

describe('validateDemographicsRows', () => {
  describe('gender', () => {
    const headers = ['Gender', 'Distribution']

    it('passes fraction-form input through unchanged', () => {
      const { valid } = validateDemographicsRows(headers, [
        { Gender: 'Male', Distribution: '0.75' },
        { Gender: 'Female', Distribution: '0.24' },
        { Gender: 'Other', Distribution: '0.01' },
      ])
      expect(valid.type).toBe('gender')
      if (valid.type !== 'gender') throw new Error('unreachable')
      expect(valid.rows).toEqual([
        { gender: 'Male', distribution: 0.75 },
        { gender: 'Female', distribution: 0.24 },
        { gender: 'Other', distribution: 0.01 },
      ])
    })

    it('normalizes percent-form input to fractions (0-1)', () => {
      const { valid } = validateDemographicsRows(headers, [
        { Gender: 'Male', Distribution: '73.70' },
        { Gender: 'Female', Distribution: '26.30' },
        { Gender: 'Other', Distribution: '0.01' },
      ])
      expect(valid.type).toBe('gender')
      if (valid.type !== 'gender') throw new Error('unreachable')
      expect(valid.rows[0].distribution).toBeCloseTo(0.737, 5)
      expect(valid.rows[1].distribution).toBeCloseTo(0.263, 5)
      // A single row under 1 does not force it back to percent form once the
      // whole set has already been identified as percent-form by the other rows.
      expect(valid.rows[2].distribution).toBeCloseTo(0.0001, 6)
    })

    it('throws when the distribution values do not sum to a plausible split — a whole-file structural problem, not a per-row one', () => {
      expect(() =>
        validateDemographicsRows(headers, [
          { Gender: 'Male', Distribution: '200' },
          { Gender: 'Female', Distribution: '200' },
        ])
      ).toThrow(/does not|sum/i)
    })

    // FR-04/FR-07: a row missing its label is rejected individually, the
    // rest of the file is still processed.
    it('rejects a row missing Gender without discarding the rest of the file', () => {
      const { valid, rejected } = validateDemographicsRows(headers, [
        { Gender: '', Distribution: '0.5' },
        { Gender: 'Male', Distribution: '0.5' },
      ])
      expect(valid.type).toBe('gender')
      if (valid.type !== 'gender') throw new Error('unreachable')
      expect(valid.rows).toEqual([{ gender: 'Male', distribution: 0.5 }])
      expect(rejected).toEqual([{ row: 1, reason: 'missing Gender' }])
    })
  })

  describe('territory', () => {
    const headers = ['Top territories', 'Distribution']

    it('does not misdetect a top-N territory list (summing under 1) as percent form', () => {
      const { valid } = validateDemographicsRows(headers, [
        { 'Top territories': 'PH', Distribution: '0.704' },
        { 'Top territories': 'Others', Distribution: '0.185' },
        { 'Top territories': 'US', Distribution: '0.032' },
      ])
      expect(valid.type).toBe('territory')
      if (valid.type !== 'territory') throw new Error('unreachable')
      expect(valid.rows[0].distribution).toBeCloseTo(0.704, 5)
    })

    it('normalizes a percent-form territory list', () => {
      const { valid } = validateDemographicsRows(headers, [
        { 'Top territories': 'PH', Distribution: '70.4' },
        { 'Top territories': 'Others', Distribution: '18.5' },
        { 'Top territories': 'US', Distribution: '3.2' },
      ])
      expect(valid.type).toBe('territory')
      if (valid.type !== 'territory') throw new Error('unreachable')
      expect(valid.rows[0].distribution).toBeCloseTo(0.704, 5)
    })

    it('rejects a row missing Top territories without discarding the rest of the file', () => {
      const { valid, rejected } = validateDemographicsRows(headers, [
        { 'Top territories': '', Distribution: '0.5' },
        { 'Top territories': 'PH', Distribution: '0.5' },
      ])
      expect(valid.type).toBe('territory')
      if (valid.type !== 'territory') throw new Error('unreachable')
      expect(valid.rows).toEqual([{ territory: 'PH', distribution: 0.5 }])
      expect(rejected).toEqual([{ row: 1, reason: 'missing Top territories' }])
    })

    it('detects and parses the capitalized "Top Territories" header variant', () => {
      const capitalizedHeaders = ['Top Territories', 'Distribution']
      const { valid } = validateDemographicsRows(capitalizedHeaders, [
        { 'Top Territories': 'Philippines', Distribution: '0.601' },
        { 'Top Territories': 'Others', Distribution: '0.399' },
      ])
      expect(valid.type).toBe('territory')
      if (valid.type !== 'territory') throw new Error('unreachable')
      expect(valid.rows).toEqual([
        { territory: 'Philippines', distribution: 0.601 },
        { territory: 'Others', distribution: 0.399 },
      ])
    })
  })

  it('throws when the CSV has no data rows', () => {
    expect(() => validateDemographicsRows(['Gender', 'Distribution'], [])).toThrow(/no data rows/)
  })

  it('throws when neither Gender nor Top territories column is present', () => {
    expect(() =>
      validateDemographicsRows(['Something', 'Distribution'], [{ Something: 'x', Distribution: '1' }])
    ).toThrow(/Could not identify/)
  })
})
