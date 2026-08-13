import { describe, it, expect } from 'vitest'
import {
  lgamma,
  normalCdf,
  normalQuantile,
  regularizedIncompleteBeta,
  studentTPValue,
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
