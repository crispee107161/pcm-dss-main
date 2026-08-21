import { describe, it, expect } from 'vitest'
import {
  lgamma,
  normalCdf,
  normalQuantile,
  regularizedIncompleteBeta,
  studentTPValue,
  fPValue,
  chiSquareUpperTailEvenDf,
  normalTwoTailedPValue,
} from './normal-dist'

describe('lgamma', () => {
  it('matches known factorial values: Gamma(n) = (n-1)!', () => {
    expect(lgamma(1)).toBeCloseTo(0, 6)
    expect(lgamma(2)).toBeCloseTo(0, 6)
    expect(Math.exp(lgamma(5))).toBeCloseTo(24, 4) // 4!
  })

  it('matches Gamma(0.5) = sqrt(pi)', () => {
    expect(Math.exp(lgamma(0.5))).toBeCloseTo(Math.sqrt(Math.PI), 5)
  })
})

describe('normalCdf', () => {
  it('is 0.5 at the mean', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6)
  })

  it('matches the standard 1.96 -> 0.975 landmark', () => {
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 4)
  })
})

describe('normalQuantile', () => {
  it('inverts normalCdf at well-known landmarks', () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 3)
    expect(normalQuantile(0.95)).toBeCloseTo(1.644854, 3)
    expect(normalQuantile(0.5)).toBeCloseTo(0, 6)
  })

  it('round-trips through normalCdf across the distribution', () => {
    for (const p of [0.001, 0.01, 0.1, 0.3, 0.5, 0.7, 0.9, 0.99, 0.999]) {
      const z = normalQuantile(p)
      expect(normalCdf(z)).toBeCloseTo(p, 3)
    }
  })
})

describe('regularizedIncompleteBeta', () => {
  it('is the identity CDF for Beta(1,1) (uniform distribution)', () => {
    expect(regularizedIncompleteBeta(0.3, 1, 1)).toBeCloseTo(0.3, 6)
    expect(regularizedIncompleteBeta(0.5, 1, 1)).toBeCloseTo(0.5, 6)
  })

  it('is symmetric: I_x(a,b) = 1 - I_(1-x)(b,a)', () => {
    const left = regularizedIncompleteBeta(0.3, 2, 5)
    const right = 1 - regularizedIncompleteBeta(0.7, 5, 2)
    expect(left).toBeCloseTo(right, 6)
  })
})

describe('studentTPValue', () => {
  it('matches the textbook two-tailed critical value at df=10, alpha=0.05', () => {
    // t-critical for df=10, two-tailed 0.05 is 2.228 (standard t-table)
    expect(studentTPValue(2.228, 10)).toBeCloseTo(0.05, 2)
  })

  it('matches the textbook two-tailed critical value at df=20, alpha=0.05', () => {
    // t-critical for df=20, two-tailed 0.05 is 2.086
    expect(studentTPValue(2.086, 20)).toBeCloseTo(0.05, 2)
  })

  it('approaches 1 as t approaches 0 (no evidence against the null)', () => {
    expect(studentTPValue(0, 30)).toBeCloseTo(1, 6)
  })

  it('is symmetric in the sign of t', () => {
    expect(studentTPValue(2.5, 15)).toBeCloseTo(studentTPValue(-2.5, 15), 6)
  })
})

describe('fPValue', () => {
  it('reproduces FR-31 primary model significance: F=31.188, df=(4,103) -> p=5.22e-17', () => {
    const p = fPValue(31.188, 4, 103)
    expect(p / 5.22e-17).toBeCloseTo(1, 1)
  })

  it('reproduces FR-31 secondary model significance: F=30.036, df=(4,182) -> p=3.44e-19', () => {
    const p = fPValue(30.036, 4, 182)
    expect(p / 3.44e-19).toBeCloseTo(1, 1)
  })

  it('agrees with studentTPValue via F(1,df) = t(df)^2', () => {
    for (const [t, df] of [[2.228, 10], [2.086, 20], [1.5, 50]] as const) {
      expect(fPValue(t * t, 1, df)).toBeCloseTo(studentTPValue(t, df), 10)
    }
  })

  it('returns 1 at f=0 and 0 for a perfect (infinite) fit', () => {
    expect(fPValue(0, 4, 103)).toBe(1)
    expect(fPValue(Infinity, 4, 103)).toBe(0)
  })

  it('rejects non-positive degrees of freedom', () => {
    expect(() => fPValue(1, 0, 10)).toThrow()
    expect(() => fPValue(1, 10, -1)).toThrow()
  })
})

describe('chiSquareUpperTailEvenDf', () => {
  it('matches the exact df=2 closed form exp(-x/2)', () => {
    for (const x of [0.5, 5.99, 9.2866, 106.005]) {
      expect(chiSquareUpperTailEvenDf(x, 2)).toBeCloseTo(Math.exp(-x / 2), 12)
    }
  })

  it('reproduces FR-31 Breusch-Pagan: LM=9.2866, df=4 -> p=0.0543', () => {
    expect(chiSquareUpperTailEvenDf(9.2866, 4)).toBeCloseTo(0.0543, 4)
  })

  it('reproduces FR-31 primary Jarque-Bera: JB=106.005, df=2 -> p~=9.6e-24', () => {
    const p = chiSquareUpperTailEvenDf(106.005, 2)
    expect(p / 9.6e-24).toBeCloseTo(1, 1)
  })

  it('is 1 at x=0 and monotonically decreasing', () => {
    expect(chiSquareUpperTailEvenDf(0, 4)).toBe(1)
    const a = chiSquareUpperTailEvenDf(5, 4)
    const b = chiSquareUpperTailEvenDf(15, 4)
    expect(b).toBeLessThan(a)
  })

  it('throws on odd, zero, negative, or non-integer df', () => {
    expect(() => chiSquareUpperTailEvenDf(5, 3)).toThrow()
    expect(() => chiSquareUpperTailEvenDf(5, 1)).toThrow()
    expect(() => chiSquareUpperTailEvenDf(5, 0)).toThrow()
    expect(() => chiSquareUpperTailEvenDf(5, -2)).toThrow()
    expect(() => chiSquareUpperTailEvenDf(5, 2.5)).toThrow()
  })
})

describe('normalTwoTailedPValue', () => {
  it('reproduces FR-31 HC3 p-values exactly (the normal-vs-t decision)', () => {
    // coef/SE_HC3 for engagement_rate, frequency, ctr (primary model, n=108)
    expect(normalTwoTailedPValue(-0.6511 / 0.3421)).toBeCloseTo(0.0570, 4)
    expect(normalTwoTailedPValue(-0.2084 / 0.1138)).toBeCloseTo(0.0670, 3)
    expect(normalTwoTailedPValue(-9.6285 / 4.5382)).toBeCloseTo(0.0339, 4)
  })

  it('is 1 at z=0 and symmetric in sign', () => {
    expect(normalTwoTailedPValue(0)).toBeCloseTo(1, 6)
    expect(normalTwoTailedPValue(2.5)).toBeCloseTo(normalTwoTailedPValue(-2.5), 10)
  })

  it('matches the standard 1.96 -> 0.05 landmark', () => {
    expect(normalTwoTailedPValue(1.959964)).toBeCloseTo(0.05, 4)
  })

  it('stays continuous and nonzero across the |z|=5 branch boundary', () => {
    // p is ~5.7e-7 at this z, right where A&S 7.1.26's ~1.5e-7 absolute
    // error becomes a large *relative* error — so the two branches are
    // expected to disagree by a bit more than at looser z, not be exact.
    const below = normalTwoTailedPValue(4.999)
    const above = normalTwoTailedPValue(5.001)
    expect(below).toBeGreaterThan(0)
    expect(above).toBeGreaterThan(0)
    expect(below / above).toBeGreaterThan(0.5)
    expect(below / above).toBeLessThan(2)
  })

  it('does not underflow to exactly 0 for a large z (e.g. cpm-scale HC3 statistics)', () => {
    expect(normalTwoTailedPValue(8.6)).toBeGreaterThan(0)
    expect(normalTwoTailedPValue(20)).toBeGreaterThan(0)
  })
})
