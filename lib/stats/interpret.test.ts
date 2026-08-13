import { describe, it, expect } from 'vitest'
import { magnitudeLabel, interpretCorrelation } from './interpret'

describe('magnitudeLabel', () => {
  it('bands correctly at each mvp.md §4.4 boundary', () => {
    expect(magnitudeLabel(0.0)).toBe('negligible')
    expect(magnitudeLabel(0.19)).toBe('negligible')
    expect(magnitudeLabel(0.2)).toBe('weak')
    expect(magnitudeLabel(0.39)).toBe('weak')
    expect(magnitudeLabel(0.4)).toBe('moderate')
    expect(magnitudeLabel(0.59)).toBe('moderate')
    expect(magnitudeLabel(0.6)).toBe('strong')
    expect(magnitudeLabel(0.95)).toBe('strong')
  })

  it('uses the absolute value — negative coefficients band the same as positive', () => {
    expect(magnitudeLabel(-0.5)).toBe('moderate')
    expect(magnitudeLabel(-0.9)).toBe('strong')
  })
})

describe('interpretCorrelation', () => {
  it('marks p < 0.05 as significant and includes coefficient + n together', () => {
    const result = interpretCorrelation(0.55, 187, 0.001)
    expect(result.isSignificant).toBe(true)
    expect(result.magnitude).toBe('moderate')
    expect(result.direction).toBe('positive')
    expect(result.summary).toContain('187')
    expect(result.summary).toContain('0.550')
  })

  it('marks p >= 0.05 as not significant', () => {
    const result = interpretCorrelation(0.1, 20, 0.4)
    expect(result.isSignificant).toBe(false)
    expect(result.summary).toContain('not statistically significant')
  })

  it('labels a negative coefficient as a negative direction', () => {
    const result = interpretCorrelation(-0.7, 50, 0.0001)
    expect(result.direction).toBe('negative')
    expect(result.summary).toContain('negative')
  })

  it('never reports a bare p-value — significance is always paired with magnitude and n in the summary', () => {
    const result = interpretCorrelation(0.05, 100, 0.6)
    expect(result.summary).toMatch(/n = 100/)
    expect(result.summary).toMatch(/negligible/i)
  })
})
