import { describe, it, expect } from 'vitest'
import { mulberry32, seededShuffle, seededKFoldIndices } from './seeded-random'

describe('mulberry32', () => {
  it('produces a fixed, regression-locked sequence for seed 42', () => {
    const rng = mulberry32(42)
    const first5 = Array.from({ length: 5 }, () => rng())
    for (const v of first5) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
    // Locks the exact sequence so a future refactor can't silently change
    // which folds every past FR-31 acceptance run was computed against.
    expect(first5[0]).toBeCloseTo(0.6011037519201636, 12)
  })

  it('is deterministic: same seed produces the same sequence every time', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b())
    }
  })

  it('different seeds diverge', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect(a()).not.toBe(b())
  })
})

describe('seededShuffle', () => {
  it('is a permutation of the input (same multiset)', () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    const shuffled = seededShuffle(items, 42)
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items)
  })

  it('is deterministic across calls with the same seed', () => {
    const items = Array.from({ length: 20 }, (_, i) => i)
    expect(seededShuffle(items, 42)).toEqual(seededShuffle(items, 42))
  })

  it('does not mutate the input array', () => {
    const items = [1, 2, 3, 4, 5]
    const copy = [...items]
    seededShuffle(items, 42)
    expect(items).toEqual(copy)
  })
})

describe('seededKFoldIndices', () => {
  it('matches sklearn KFold fold-size rule for n=108, k=10', () => {
    const folds = seededKFoldIndices(108, 10, 42)
    const sizes = folds.map(f => f.length)
    expect(sizes).toEqual([11, 11, 11, 11, 11, 11, 11, 11, 10, 10])
  })

  it('every index appears in exactly one fold', () => {
    const folds = seededKFoldIndices(108, 10, 42)
    const seen = new Map<number, number>()
    for (const fold of folds) {
      for (const idx of fold) {
        seen.set(idx, (seen.get(idx) ?? 0) + 1)
      }
    }
    expect(seen.size).toBe(108)
    for (const count of seen.values()) expect(count).toBe(1)
  })

  it('is byte-identical across repeated calls with the same seed', () => {
    expect(seededKFoldIndices(108, 10, 42)).toEqual(seededKFoldIndices(108, 10, 42))
  })

  it('rejects k < 2 or k > n', () => {
    expect(() => seededKFoldIndices(10, 1, 42)).toThrow()
    expect(() => seededKFoldIndices(10, 11, 42)).toThrow()
  })
})
