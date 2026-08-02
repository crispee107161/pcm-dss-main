import { describe, it, expect } from 'vitest'
import { rankArray, pearsonCorrelation } from './spearman'

describe('rankArray', () => {
  it('assigns 1-based ranks to ascending values', () => {
    expect(rankArray([10, 20, 30])).toEqual([1, 2, 3])
  })

  it('averages ranks for ties', () => {
    // 10 -> rank 1, the two 20s tie for ranks 2 and 3 -> avg 2.5, 30 -> rank 4
    expect(rankArray([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4])
  })

  it('preserves null positions without ranking them', () => {
    expect(rankArray([10, null, 20])).toEqual([1, null, 2])
  })

  it('ranks are order-independent of input position', () => {
    expect(rankArray([30, 10, 20])).toEqual([3, 1, 2])
  })
})

describe('pearsonCorrelation', () => {
  it('returns 1 for a perfect positive linear relationship', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10)
  })

  it('returns -1 for a perfect negative linear relationship', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 10)
  })

  it('returns 0 when one series has no variance', () => {
    expect(pearsonCorrelation([1, 1, 1], [1, 2, 3])).toBe(0)
  })

  it('returns 0 for empty input instead of throwing or NaN', () => {
    expect(pearsonCorrelation([], [])).toBe(0)
  })
})
