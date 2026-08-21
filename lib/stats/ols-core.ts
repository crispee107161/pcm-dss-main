// Design-matrix OLS for FR-31. Not a port of lib/stats/regression.ts's
// private gaussianElimination: that solver returns only the coefficient
// vector, its singularity check is an *absolute* 1e-12 pivot tolerance
// (meaningless once a column like `cpm` puts ~1e6 on the XtX diagonal), and
// on a near-singular pivot it silently leaves the coefficient at 0 rather
// than surfacing the failure. FR-31 additionally needs the explicit
// (XtX)^-1 itself (for standard errors, VIF, and HC3's hat diagonal), not
// just a solve.
//
// FR-31's predictors span roughly eight orders of magnitude in scale
// (ctr ~ 0.01, cpm ~ 100), and forming XtX squares the condition number, so
// this factors an *equilibrated* design matrix via Modified Gram-Schmidt QR
// with one reorthogonalization pass ("twice is enough" — Kahan):
//
//   1. Scale each column to unit Euclidean norm: X~ = X * D, D = diag(1/||X_j||).
//   2. QR-factor X~ = QR (condition number kappa(X~), not kappa(X~)^2 as a
//      Gram-matrix approach would carry).
//   3. The hat diagonal falls out for free: H = Q Q^T, so h_ii = sum_j Q[i][j]^2
//      — no x_i (XtX)^-1 x_i^T triple product, which is exactly where an
//      explicit inverse's error would bite hardest and could otherwise
//      produce an h_ii outside [0, 1] and a negative HC3 variance.
//   4. (X~^T X~)^-1 = R^-1 R^-T (one triangular back-substitution on a
//      5x5), then unscale both sides by D to recover (X^T X)^-1 and beta in
//      original units.

export interface OlsFit {
  beta: number[]
  fitted: number[]
  residuals: number[]
  xtxInv: number[][]
  hatDiagonal: number[]
  rSquared: number
  sigmaSquared: number
  ssResidual: number
  ssTotal: number
  n: number
  p: number
  reciprocalConditionNumber: number
  rankDeficient: boolean
}

function transpose(A: readonly number[][]): number[][] {
  const rows = A.length
  const cols = A[0].length
  const T: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0))
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) T[j][i] = A[i][j]
  return T
}

function matMul(A: readonly number[][], B: readonly number[][]): number[][] {
  const n = A.length
  const m = B[0].length
  const k = B.length
  const C: number[][] = Array.from({ length: n }, () => new Array(m).fill(0))
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      let s = 0
      for (let t = 0; t < k; t++) s += A[i][t] * B[t][j]
      C[i][j] = s
    }
  return C
}

// Modified Gram-Schmidt with one reorthogonalization pass. X is n x p
// (p <= n assumed); returns Q (n x p, orthonormal columns) and R (p x p,
// upper triangular) such that X = QR.
function mgsQr(X: readonly number[][]): { Q: number[][]; R: number[][] } {
  const n = X.length
  const p = X[0].length
  const Q: number[][] = Array.from({ length: n }, () => new Array(p).fill(0))
  const R: number[][] = Array.from({ length: p }, () => new Array(p).fill(0))

  // Work on column-major copies for numerically cheap dot/axpy operations.
  const V: number[][] = Array.from({ length: p }, (_, j) => X.map(row => row[j]))

  for (let j = 0; j < p; j++) {
    let v = V[j]
    // Reorthogonalize once against all previously computed Q columns. R[i][j]
    // must equal the TOTAL projection of the original column onto q_i, i.e.
    // q_i . x_j — since X = QR is required for (X^T X)^-1 = R^-1 R^-T to
    // hold, both passes' dot products are accumulated into R, not just the
    // first (the second pass corrects v itself for numerical loss, but the
    // coefficient it removes is still part of the true q_i . x_j total).
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < j; i++) {
        const qi = Q.map(row => row[i])
        let dot = 0
        for (let k = 0; k < n; k++) dot += qi[k] * v[k]
        R[i][j] += dot
        v = v.map((val, k) => val - dot * qi[k])
      }
    }
    let norm = 0
    for (let k = 0; k < n; k++) norm += v[k] * v[k]
    norm = Math.sqrt(norm)
    R[j][j] = norm
    const qCol = norm > 1e-300 ? v.map(val => val / norm) : v.map(() => 0)
    for (let k = 0; k < n; k++) Q[k][j] = qCol[k]
  }

  return { Q, R }
}

// Solves the upper-triangular system R x = b via back-substitution.
function backSubstitute(R: readonly number[][], b: readonly number[]): number[] {
  const p = R.length
  const x = new Array(p).fill(0)
  for (let i = p - 1; i >= 0; i--) {
    let s = b[i]
    for (let j = i + 1; j < p; j++) s -= R[i][j] * x[j]
    x[i] = Math.abs(R[i][i]) > 1e-300 ? s / R[i][i] : 0
  }
  return x
}

// R^-1 via back-substitution against each standard basis vector — cheap at
// FR-31's p=5.
function invertUpperTriangular(R: readonly number[][]): number[][] {
  const p = R.length
  const inv: number[][] = Array.from({ length: p }, () => new Array(p).fill(0))
  for (let col = 0; col < p; col++) {
    const e = new Array(p).fill(0)
    e[col] = 1
    const x = backSubstitute(R, e)
    for (let row = 0; row < p; row++) inv[row][col] = x[row]
  }
  return inv
}

/** X must already include the intercept column of 1s. */
export function olsFit(X: readonly number[][], y: readonly number[]): OlsFit {
  const n = X.length
  if (n === 0) throw new Error('olsFit: X must have at least one row')
  const p = X[0].length
  if (y.length !== n) throw new Error('olsFit: X and y row counts must match')
  if (n <= p) throw new Error('olsFit: need more observations than parameters')

  // Step 1: column equilibration.
  const colNorms = new Array(p).fill(0)
  for (let j = 0; j < p; j++) {
    let s = 0
    for (let i = 0; i < n; i++) s += X[i][j] * X[i][j]
    colNorms[j] = Math.sqrt(s)
  }
  const Xs: number[][] = X.map(row => row.map((v, j) => (colNorms[j] > 1e-300 ? v / colNorms[j] : v)))

  // Step 2: QR on the equilibrated matrix.
  const { Q, R } = mgsQr(Xs)

  // M6 (docs/raven/pr-review.md): this is min(diag)/max(diag) — the
  // RECIPROCAL of R's condition number (1/κ), not κ itself. A well-
  // conditioned fit has this close to 1; near-0 signals rank deficiency.
  // Previously named/logged as if it were κ, which reads backwards.
  const diag = R.map((row, i) => Math.abs(row[i]))
  const reciprocalConditionNumber = Math.min(...diag) / Math.max(...diag)
  const rankDeficient = !Number.isFinite(reciprocalConditionNumber) || reciprocalConditionNumber < 1e-10

  // beta~ solves R beta~ = Q^T y.
  const Qty = new Array(p).fill(0)
  for (let j = 0; j < p; j++) {
    let s = 0
    for (let i = 0; i < n; i++) s += Q[i][j] * y[i]
    Qty[j] = s
  }
  const betaScaled = backSubstitute(R, Qty)
  const beta = betaScaled.map((b, j) => (colNorms[j] > 1e-300 ? b / colNorms[j] : b))

  // Step 3: hat diagonal falls out of Q for free.
  const hatDiagonal = Q.map(row => row.reduce((s, v) => s + v * v, 0))

  const fitted = X.map(row => row.reduce((s, v, j) => s + v * beta[j], 0))
  const residuals = y.map((v, i) => v - fitted[i])
  const meanY = y.reduce((a, b) => a + b, 0) / n
  const ssTotal = y.reduce((s, v) => s + (v - meanY) ** 2, 0)
  const ssResidual = residuals.reduce((s, v) => s + v * v, 0)
  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0
  const sigmaSquared = ssResidual / (n - p)

  // Step 4: (X~^T X~)^-1 = R^-1 R^-T, then unscale both sides by D.
  const Rinv = invertUpperTriangular(R)
  const xtxInvScaled = matMul(Rinv, transpose(Rinv))
  const xtxInv = xtxInvScaled.map((row, i) =>
    row.map((v, j) => v / ((colNorms[i] || 1) * (colNorms[j] || 1)))
  )

  return {
    beta,
    fitted,
    residuals,
    xtxInv,
    hatDiagonal,
    rSquared,
    sigmaSquared,
    ssResidual,
    ssTotal,
    n,
    p,
    reciprocalConditionNumber,
    rankDeficient,
  }
}

export function olsStandardErrors(fit: OlsFit): number[] {
  return fit.xtxInv.map((row, j) => Math.sqrt(Math.max(0, fit.sigmaSquared * row[j])))
}

// HC3 (MacKinnon-White) sandwich standard errors:
//   omega_i = e_i^2 / (1 - h_ii)^2
//   V = (X^T X)^-1 [ sum_i omega_i x_i x_i^T ] (X^T X)^-1
//   SE_j = sqrt(V_jj)
// No extra small-sample df correction is applied — the (1-h)^2 divisor IS
// the correction. h_ii is guarded away from 1 to avoid a division blowup on
// a maximal-leverage point.
export function hc3StandardErrors(fit: OlsFit, X: readonly number[][]): number[] {
  const { p, residuals, hatDiagonal, xtxInv } = fit
  const meat: number[][] = Array.from({ length: p }, () => new Array(p).fill(0))
  for (let i = 0; i < X.length; i++) {
    const h = Math.min(hatDiagonal[i], 1 - 1e-10)
    const omega = (residuals[i] * residuals[i]) / (1 - h) ** 2
    const xi = X[i]
    for (let a = 0; a < p; a++) {
      for (let b = 0; b < p; b++) {
        meat[a][b] += omega * xi[a] * xi[b]
      }
    }
  }
  const V = matMul(matMul(xtxInv, meat), xtxInv)
  return V.map((row, j) => Math.sqrt(Math.max(0, row[j])))
}

export function olsPredict(beta: readonly number[], X: readonly number[][]): number[] {
  return X.map(row => row.reduce((s, v, j) => s + v * beta[j], 0))
}
