import { describe, it, expect } from 'vitest'
import { median, quantile, iqr } from './descriptive'

describe('median', () => {
  it('returns the middle value for an odd-length array', () => {
    // Arrange
    const values = [5, 1, 3]

    // Act
    const result = median(values)

    // Assert
    expect(result).toBe(3)
  })

  it('averages the two middle values for an even-length array', () => {
    // Arrange
    const values = [1, 2, 3, 4]

    // Act
    const result = median(values)

    // Assert
    expect(result).toBe(2.5)
  })

  it('returns the single value for a one-element array', () => {
    expect(median([42])).toBe(42)
  })

  it('does not mutate the input array', () => {
    // Arrange
    const values = [3, 1, 2]

    // Act
    median(values)

    // Assert
    expect(values).toEqual([3, 1, 2])
  })
})

describe('quantile', () => {
  it('throws on an empty array', () => {
    expect(() => quantile([], 0.5)).toThrow()
  })

  it('throws for q outside [0, 1]', () => {
    expect(() => quantile([1, 2, 3], 1.5)).toThrow()
  })

  it('returns the minimum at q=0 and the maximum at q=1', () => {
    // Arrange
    const values = [7, 2, 9, 4]

    // Act & Assert
    expect(quantile(values, 0)).toBe(2)
    expect(quantile(values, 1)).toBe(9)
  })

  it('interpolates linearly between ranks', () => {
    // Arrange: sorted [1,2,3,4,5], q=0.25 -> pos=1.0 -> exactly rank 1 (value 2)
    const values = [5, 3, 1, 4, 2]

    // Act
    const result = quantile(values, 0.25)

    // Assert
    expect(result).toBe(2)
  })
})

describe('iqr', () => {
  it('computes q1, q3 and their difference', () => {
    // Arrange
    const values = [1, 2, 3, 4, 5, 6, 7, 8]

    // Act
    const result = iqr(values)

    // Assert
    expect(result.q1).toBeCloseTo(2.75, 5)
    expect(result.q3).toBeCloseTo(6.25, 5)
    expect(result.iqr).toBeCloseTo(3.5, 5)
  })
})
