import { describe, it, expect } from 'vitest'
import { olsFit, olsStandardErrors, hc3StandardErrors, olsPredict, type OlsFit } from './ols-core'

function withIntercept(rows: number[][]): number[][] {
  return rows.map(r => [1, ...r])
}

describe('olsFit', () => {
  it('recovers exact coefficients on a perfectly linear relationship', () => {
    // y = 2 + 3x1 - 1x2, no noise
    const X = withIntercept([
      [1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [1, 3], [2, 2], [6, 1],
    ])
    const beta = [2, 3, -1]
    const y = X.map(row => row.reduce((s, v, j) => s + v * beta[j], 0))
    const fit = olsFit(X, y)
    for (let j = 0; j < 3; j++) expect(fit.beta[j]).toBeCloseTo(beta[j], 8)
    expect(fit.rSquared).toBeCloseTo(1, 8)
    expect(fit.ssResidual).toBeCloseTo(0, 6)
    expect(fit.rankDeficient).toBe(false)
  })

  it('trace of the hat matrix equals p', () => {
    const X = withIntercept([
      [1, 5], [2, 3], [3, 8], [4, 1], [5, 9], [6, 2], [7, 6], [8, 4], [9, 7], [10, 0],
    ])
    const y = [3, 5, 2, 8, 1, 9, 4, 6, 2, 7]
    const fit = olsFit(X, y)
    const trace = fit.hatDiagonal.reduce((a, b) => a + b, 0)
    expect(trace).toBeCloseTo(fit.p, 8)
  })

  it('hat diagonal entries are within (0, 1)', () => {
    const X = withIntercept([
      [1, 5], [2, 3], [3, 8], [4, 1], [5, 9], [6, 2], [7, 6], [8, 4], [9, 7], [10, 0],
    ])
    const y = [3, 5, 2, 8, 1, 9, 4, 6, 2, 7]
    const fit = olsFit(X, y)
    for (const h of fit.hatDiagonal) {
      expect(h).toBeGreaterThan(0)
      expect(h).toBeLessThan(1)
    }
  })

  it('(X^T X) * xtxInv is the identity matrix', () => {
    const X = withIntercept([
      [1, 5], [2, 3], [3, 8], [4, 1], [5, 9], [6, 2], [7, 6], [8, 4], [9, 7], [10, 0],
    ])
    const y = [3, 5, 2, 8, 1, 9, 4, 6, 2, 7]
    const fit = olsFit(X, y)
    const p = fit.p
    const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0))
    for (let i = 0; i < p; i++)
      for (let j = 0; j < p; j++)
        for (let k = 0; k < X.length; k++) XtX[i][j] += X[k][i] * X[k][j]

    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        let s = 0
        for (let k = 0; k < p; k++) s += XtX[i][k] * fit.xtxInv[k][j]
        expect(s).toBeCloseTo(i === j ? 1 : 0, 8)
      }
    }
  })

  it('normal equations hold: residuals are orthogonal to every design column', () => {
    const X = withIntercept([
      [1, 5], [2, 3], [3, 8], [4, 1], [5, 9], [6, 2], [7, 6], [8, 4], [9, 7], [10, 0],
    ])
    const y = [3, 5, 2, 8, 1, 9, 4, 6, 2, 7]
    const fit = olsFit(X, y)
    expect(fit.residuals.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 8)
    for (let j = 0; j < fit.p; j++) {
      const dot = fit.residuals.reduce((s, e, i) => s + e * X[i][j], 0)
      expect(dot).toBeCloseTo(0, 6)
    }
  })

  it('is scale-invariant under rescaling one predictor column (proves equilibration works)', () => {
    const rawX = [
      [1, 5], [2, 3], [3, 8], [4, 1], [5, 9], [6, 2], [7, 6], [8, 4], [9, 7], [10, 0],
    ]
    const y = [3, 5, 2, 8, 1, 9, 4, 6, 2, 7]
    const X1 = withIntercept(rawX)
    const X2 = withIntercept(rawX.map(([a, b]) => [a, b * 1000]))
    const fit1 = olsFit(X1, y)
    const fit2 = olsFit(X2, y)

    // coefficient and SEs for the rescaled column divide by exactly 1000
    expect(fit2.beta[2]).toBeCloseTo(fit1.beta[2] / 1000, 6)
    const se1 = olsStandardErrors(fit1)
    const se2 = olsStandardErrors(fit2)
    expect(se2[2]).toBeCloseTo(se1[2] / 1000, 6)

    // everything scale-free is unchanged: R^2, sigma^2, hat diagonal, fitted values
    expect(fit2.rSquared).toBeCloseTo(fit1.rSquared, 9)
    expect(fit2.sigmaSquared).toBeCloseTo(fit1.sigmaSquared, 6)
    for (let i = 0; i < fit1.n; i++) {
      expect(fit2.hatDiagonal[i]).toBeCloseTo(fit1.hatDiagonal[i], 8)
      expect(fit2.fitted[i]).toBeCloseTo(fit1.fitted[i], 6)
    }
    // t-statistics (coef / SE) are unchanged for the rescaled column too
    expect(fit2.beta[2] / se2[2]).toBeCloseTo(fit1.beta[1 + 1] / se1[1 + 1], 6)
  })

  it('flags rank deficiency on a perfectly collinear predictor, without NaN', () => {
    const rawX = [
      [1, 2], [2, 4], [3, 6], [4, 8], [5, 10], [6, 12], [7, 14], [8, 16],
    ] // second column = 2 * first column, perfectly collinear
    const X = withIntercept(rawX)
    const y = [3, 5, 2, 8, 1, 9, 4, 6]
    const fit = olsFit(X, y)
    expect(fit.rankDeficient).toBe(true)
    for (const b of fit.beta) expect(Number.isNaN(b)).toBe(false)
  })

  it('rejects mismatched X/y lengths and underdetermined systems', () => {
    const X = withIntercept([[1, 2], [2, 3], [3, 4]])
    expect(() => olsFit(X, [1, 2])).toThrow()
    expect(() => olsFit(X.slice(0, 2), [1, 2])).toThrow()
  })
})

describe('hc3StandardErrors', () => {
  it('agrees with OLS SEs within a factor of ~3 under homoscedastic synthetic data (no directional assumption)', () => {
    // HC3 is not a conservative inflation of OLS SE — it can be smaller
    // (confirmed against FR-31's own published numbers: ctr's HC3 SE
    // 4.5382 is *below* its OLS SE 4.7952). This test only checks the two
    // estimators are in the same ballpark under well-behaved data, not that
    // one bounds the other.
    const rawX: number[][] = []
    const y: number[] = []
    let seed = 7
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    for (let i = 0; i < 200; i++) {
      const x1 = rand() * 10
      const x2 = rand() * 10
      rawX.push([x1, x2])
      const noise = (rand() - 0.5) * 2
      y.push(5 + 2 * x1 - 1.5 * x2 + noise)
    }
    const X = withIntercept(rawX)
    const fit = olsFit(X, y)
    const seOls = olsStandardErrors(fit)
    const seHc3 = hc3StandardErrors(fit, X)
    for (let j = 0; j < fit.p; j++) {
      const ratio = seHc3[j] / seOls[j]
      expect(ratio).toBeGreaterThan(1 / 3)
      expect(ratio).toBeLessThan(3)
    }
  })
})

describe('olsPredict', () => {
  it('matches fitted values from olsFit on the training data', () => {
    const X = withIntercept([[1, 2], [2, 3], [3, 5], [4, 4], [5, 6]])
    const y = [3, 5, 8, 7, 10]
    const fit: OlsFit = olsFit(X, y)
    const predicted = olsPredict(fit.beta, X)
    for (let i = 0; i < y.length; i++) expect(predicted[i]).toBeCloseTo(fit.fitted[i], 8)
  })
})
