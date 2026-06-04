import { prisma } from '@/lib/prisma'

export type ModelType =
  | 'log_mlr'
  | 'plain_mlr'
  | 'poly_mlr'
  | 'ridge_mlr'
  | 'lasso_mlr'
  | 'elastic_net_mlr'
  | 'wls_mlr'
  | 'robust_mlr'
  | 'log_log_mlr'
  | 'expanded_mlr'

// Solve Ax = b using Gaussian elimination with partial pivoting
function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = A.length
  const M = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
    }
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]

    const pivot = M[col][col]
    if (Math.abs(pivot) < 1e-12) continue

    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / pivot
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j]
    }
  }

  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(M[i][i]) < 1e-12) continue
    x[i] = M[i][n]
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j]
    x[i] /= M[i][i]
  }
  return x
}

interface TrainingData {
  reach: number
  messaging: number
  amount_spent: number
  purchases: number
  link_clicks: number       // used by expanded_mlr
  reporting_starts?: Date   // used by WLS time-decay
}

interface FitResult {
  modelType: ModelType
  intercept: number
  coef_reach: number
  coef_messaging: number
  coef_amount_spent: number
  coef_spend_sq: number
  coef_link_clicks: number
  r_squared: number
  adj_r_squared: number
  residual_std_error: number
  n: number
  equation: string
  cv_mse: number  // 5-fold CV MSE — primary selection criterion
}

// Kept for backward compat with any existing imports
export interface MLRResult {
  intercept: number
  coef_reach: number
  coef_messaging: number
  coef_amount_spent: number
  r_squared: number
  residual_std_error: number
  n: number
  equation: string
}

// Core OLS solver with optional L2 ridge penalty and per-observation weights.
// R² computed on unweighted residuals so WLS/robust compare fairly.
function fitLinear(
  X: number[][],
  y: number[],
  numPredictors: number,
  ridge = 0,
  weights?: number[],
): { beta: number[]; r_squared: number; adj_r_squared: number; residual_std_error: number } {
  const n = X.length
  const p = X[0].length
  const w = weights ?? new Array(n).fill(1)

  const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0))
  for (let i = 0; i < p; i++)
    for (let j = 0; j < p; j++)
      for (let k = 0; k < n; k++)
        XtX[i][j] += w[k] * X[k][i] * X[k][j]

  if (ridge > 0) {
    for (let i = 1; i < p; i++) XtX[i][i] += ridge
  }

  const Xty = new Array(p).fill(0)
  for (let i = 0; i < p; i++)
    for (let k = 0; k < n; k++)
      Xty[i] += w[k] * X[k][i] * y[k]

  const beta = gaussianElimination(XtX, Xty)

  const meanY = y.reduce((a, b) => a + b, 0) / n
  const ssTot = y.reduce((a, yi) => a + (yi - meanY) ** 2, 0)

  let ssRes = 0
  for (let k = 0; k < n; k++) {
    let yhat = 0
    for (let j = 0; j < p; j++) yhat += beta[j] * X[k][j]
    ssRes += (y[k] - yhat) ** 2
  }

  const r_squared = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  const adj_r_squared = n > numPredictors + 1
    ? 1 - (1 - r_squared) * (n - 1) / (n - numPredictors - 1)
    : 0
  const residual_std_error = n > p ? Math.sqrt(ssRes / (n - p)) : 0

  return { beta, r_squared, adj_r_squared, residual_std_error }
}

// Soft-thresholding for L1 coordinate descent
function softThreshold(z: number, lambda: number): number {
  return z > lambda ? z - lambda : z < -lambda ? z + lambda : 0
}

// Coordinate descent solver shared by Lasso and Elastic Net
function fitCoordDescent(
  data: TrainingData[],
  modelType: 'lasso_mlr' | 'elastic_net_mlr',
  alpha: number,
  lambda: number,
  maxIter = 2000,
): Omit<FitResult, 'cv_mse'> {
  const n = data.length
  const y = data.map(d => d.purchases)
  const Xraw = data.map(d => [
    Math.log1p(d.reach),
    Math.log1p(d.messaging),
    Math.log1p(d.amount_spent),
  ])

  const meanY = y.reduce((a, b) => a + b, 0) / n
  const yc = y.map(v => v - meanY)

  const p = 3
  const colMeans = Array.from({ length: p }, (_, j) => Xraw.reduce((s, r) => s + r[j], 0) / n)
  const colSds = Array.from({ length: p }, (_, j) => {
    const m = colMeans[j]
    return Math.sqrt(Xraw.reduce((s, r) => s + (r[j] - m) ** 2, 0) / n) || 1
  })
  const Xs = Xraw.map(r => r.map((v, j) => (v - colMeans[j]) / colSds[j]))
  const colNormSq = Array.from({ length: p }, (_, j) => Xs.reduce((s, r) => s + r[j] ** 2, 0))

  const beta = new Array(p).fill(0)
  const residuals = [...yc]

  for (let iter = 0; iter < maxIter; iter++) {
    let maxChange = 0
    for (let j = 0; j < p; j++) {
      if (colNormSq[j] === 0) continue
      const rho = Xs.reduce((s, r, i) => s + r[j] * residuals[i], 0) + colNormSq[j] * beta[j]
      const l2Denom = colNormSq[j] + (1 - alpha) * lambda * n
      const newBeta = softThreshold(rho / colNormSq[j], alpha * lambda) * colNormSq[j] / l2Denom
      const delta = newBeta - beta[j]
      if (Math.abs(delta) > 1e-10) {
        for (let i = 0; i < n; i++) residuals[i] -= Xs[i][j] * delta
        maxChange = Math.max(maxChange, Math.abs(delta))
        beta[j] = newBeta
      }
    }
    if (maxChange < 1e-6) break
  }

  const coefs = beta.map((b, j) => b / colSds[j])
  const intercept = meanY - coefs.reduce((s, b, j) => s + b * colMeans[j], 0)
  const [coef_reach, coef_messaging, coef_amount_spent] = coefs

  const ybar = y.reduce((a, b) => a + b, 0) / n
  const ssTot = y.reduce((s, yi) => s + (yi - ybar) ** 2, 0)
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    const yhat = intercept + Xraw[i].reduce((s, v, j) => s + coefs[j] * v, 0)
    ssRes += (y[i] - yhat) ** 2
  }
  const r_squared = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  const adj_r_squared = n > 4 ? 1 - (1 - r_squared) * (n - 1) / (n - 4) : 0
  const residual_std_error = n > 4 ? Math.sqrt(ssRes / (n - 4)) : 0

  const tag = modelType === 'lasso_mlr'
    ? `[lasso λ=${lambda}]`
    : `[elastic net α=${alpha} λ=${lambda}]`

  return {
    modelType,
    intercept, coef_reach, coef_messaging, coef_amount_spent,
    coef_spend_sq: 0, coef_link_clicks: 0,
    r_squared, adj_r_squared, residual_std_error, n,
    equation: `Purchases = ${intercept.toFixed(4)} ${fmt(coef_reach)}·log(1+Reach) ${fmt(coef_messaging)}·log(1+Msgs) ${fmt(coef_amount_spent)}·log(1+Spend) ${tag}`,
  }
}

function fmt(v: number): string {
  return v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4)
}

// ─── 5-fold Cross-Validation ──────────────────────────────────────────────────

// Runs k-fold CV for any model type, returns mean squared error on held-out folds.
// Used as the primary model selection criterion (lower CV MSE = better).
function kFoldCVMse(
  data: TrainingData[],
  fitter: (train: TrainingData[]) => Omit<FitResult, 'cv_mse'>,
  predictor: (result: Omit<FitResult, 'cv_mse'>, d: TrainingData) => number,
  k = 5,
): number {
  const n = data.length
  if (n < k * 2) return Infinity  // too few samples to CV

  // Shuffle indices deterministically (Fisher-Yates with fixed seed offset)
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = (i * 1664525 + 1013904223) % (i + 1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }

  let totalSqErr = 0
  let totalCount = 0

  for (let fold = 0; fold < k; fold++) {
    const testIdx = idx.filter((_, i) => i % k === fold)
    const trainIdx = idx.filter((_, i) => i % k !== fold)

    if (trainIdx.length < 5) continue  // guard against tiny folds

    const train = trainIdx.map(i => data[i])
    const test = testIdx.map(i => data[i])

    try {
      const result = fitter(train)
      for (const d of test) {
        const predicted = predictor(result, d)
        totalSqErr += (d.purchases - predicted) ** 2
        totalCount++
      }
    } catch {
      return Infinity
    }
  }

  return totalCount > 0 ? totalSqErr / totalCount : Infinity
}

// ─── Model fitters (return Omit<FitResult,'cv_mse'>) ─────────────────────────

function fitLogMLR(data: TrainingData[]): Omit<FitResult, 'cv_mse'> {
  const y = data.map(d => d.purchases)
  const X = data.map(d => [1, Math.log1p(d.reach), Math.log1p(d.messaging), Math.log1p(d.amount_spent)])
  const { beta, r_squared, adj_r_squared, residual_std_error } = fitLinear(X, y, 3)
  const [intercept, coef_reach, coef_messaging, coef_amount_spent] = beta
  return {
    modelType: 'log_mlr',
    intercept, coef_reach, coef_messaging, coef_amount_spent,
    coef_spend_sq: 0, coef_link_clicks: 0,
    r_squared, adj_r_squared, residual_std_error, n: data.length,
    equation: `Purchases = ${intercept.toFixed(4)} ${fmt(coef_reach)}·log(1+Reach) ${fmt(coef_messaging)}·log(1+Msgs) ${fmt(coef_amount_spent)}·log(1+Spend)`,
  }
}

function fitPlainMLR(data: TrainingData[]): Omit<FitResult, 'cv_mse'> {
  const y = data.map(d => d.purchases)
  const X = data.map(d => [1, d.reach, d.messaging, d.amount_spent])
  const { beta, r_squared, adj_r_squared, residual_std_error } = fitLinear(X, y, 3)
  const [intercept, coef_reach, coef_messaging, coef_amount_spent] = beta
  return {
    modelType: 'plain_mlr',
    intercept, coef_reach, coef_messaging, coef_amount_spent,
    coef_spend_sq: 0, coef_link_clicks: 0,
    r_squared, adj_r_squared, residual_std_error, n: data.length,
    equation: `Purchases = ${intercept.toFixed(4)} ${fmt(coef_reach)}·Reach ${fmt(coef_messaging)}·Msgs ${fmt(coef_amount_spent)}·Spend`,
  }
}

function fitPolyMLR(data: TrainingData[]): Omit<FitResult, 'cv_mse'> {
  const y = data.map(d => d.purchases)
  const X = data.map(d => {
    const ls = Math.log1p(d.amount_spent)
    return [1, Math.log1p(d.reach), Math.log1p(d.messaging), ls, ls * ls]
  })
  const { beta, r_squared, adj_r_squared, residual_std_error } = fitLinear(X, y, 4)
  const [intercept, coef_reach, coef_messaging, coef_amount_spent, coef_spend_sq] = beta
  return {
    modelType: 'poly_mlr',
    intercept, coef_reach, coef_messaging, coef_amount_spent, coef_spend_sq,
    coef_link_clicks: 0,
    r_squared, adj_r_squared, residual_std_error, n: data.length,
    equation: `Purchases = ${intercept.toFixed(4)} ${fmt(coef_reach)}·log(1+Reach) ${fmt(coef_messaging)}·log(1+Msgs) ${fmt(coef_amount_spent)}·log(1+Spend) ${fmt(coef_spend_sq)}·log(1+Spend)²`,
  }
}

function fitRidgeMLR(data: TrainingData[]): Omit<FitResult, 'cv_mse'> {
  const y = data.map(d => d.purchases)
  const X = data.map(d => [1, Math.log1p(d.reach), Math.log1p(d.messaging), Math.log1p(d.amount_spent)])
  const { beta, r_squared, adj_r_squared, residual_std_error } = fitLinear(X, y, 3, 0.1)
  const [intercept, coef_reach, coef_messaging, coef_amount_spent] = beta
  return {
    modelType: 'ridge_mlr',
    intercept, coef_reach, coef_messaging, coef_amount_spent,
    coef_spend_sq: 0, coef_link_clicks: 0,
    r_squared, adj_r_squared, residual_std_error, n: data.length,
    equation: `Purchases = ${intercept.toFixed(4)} ${fmt(coef_reach)}·log(1+Reach) ${fmt(coef_messaging)}·log(1+Msgs) ${fmt(coef_amount_spent)}·log(1+Spend) [ridge λ=0.1]`,
  }
}

function fitLassoMLR(data: TrainingData[]): Omit<FitResult, 'cv_mse'> {
  return fitCoordDescent(data, 'lasso_mlr', 1, 0.1)
}

function fitElasticNetMLR(data: TrainingData[]): Omit<FitResult, 'cv_mse'> {
  return fitCoordDescent(data, 'elastic_net_mlr', 0.5, 0.1)
}

function fitWLSMLR(data: TrainingData[]): Omit<FitResult, 'cv_mse'> {
  const DECAY = Math.log(2) / 90
  const now = Date.now()
  const weights = data.map(d => {
    if (!d.reporting_starts) return 1
    const ageDays = (now - d.reporting_starts.getTime()) / 86_400_000
    return Math.exp(-DECAY * Math.max(0, ageDays))
  })

  const y = data.map(d => d.purchases)
  const X = data.map(d => [1, Math.log1p(d.reach), Math.log1p(d.messaging), Math.log1p(d.amount_spent)])
  const { beta, r_squared, adj_r_squared, residual_std_error } = fitLinear(X, y, 3, 0, weights)
  const [intercept, coef_reach, coef_messaging, coef_amount_spent] = beta

  return {
    modelType: 'wls_mlr',
    intercept, coef_reach, coef_messaging, coef_amount_spent,
    coef_spend_sq: 0, coef_link_clicks: 0,
    r_squared, adj_r_squared, residual_std_error, n: data.length,
    equation: `Purchases = ${intercept.toFixed(4)} ${fmt(coef_reach)}·log(1+Reach) ${fmt(coef_messaging)}·log(1+Msgs) ${fmt(coef_amount_spent)}·log(1+Spend) [wls 90d decay]`,
  }
}

function fitRobustMLR(data: TrainingData[]): Omit<FitResult, 'cv_mse'> {
  const n = data.length
  const y = data.map(d => d.purchases)
  const X = data.map(d => [1, Math.log1p(d.reach), Math.log1p(d.messaging), Math.log1p(d.amount_spent)])

  let { beta } = fitLinear(X, y, 3)

  for (let iter = 0; iter < 50; iter++) {
    const residuals = y.map((yi, i) => yi - X[i].reduce((s, v, j) => s + v * beta[j], 0))
    const sorted = residuals.map(Math.abs).sort((a, b) => a - b)
    const mad = sorted[Math.floor(n / 2)] || 1
    const sigma = Math.max(mad * 1.4826, 1e-6)
    const delta = 1.345 * sigma

    const weights = residuals.map(r => Math.min(1, delta / (Math.abs(r) || 1e-10)))
    const prevBeta = [...beta]
    beta = fitLinear(X, y, 3, 0, weights).beta
    if (beta.every((b, j) => Math.abs(b - prevBeta[j]) < 1e-6)) break
  }

  const [intercept, coef_reach, coef_messaging, coef_amount_spent] = beta
  const ybar = y.reduce((a, b) => a + b, 0) / n
  const ssTot = y.reduce((s, yi) => s + (yi - ybar) ** 2, 0)
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    const yhat = X[i].reduce((s, v, j) => s + v * beta[j], 0)
    ssRes += (y[i] - yhat) ** 2
  }
  const r_squared = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  const adj_r_squared = n > 4 ? 1 - (1 - r_squared) * (n - 1) / (n - 4) : 0
  const residual_std_error = n > 4 ? Math.sqrt(ssRes / (n - 4)) : 0

  return {
    modelType: 'robust_mlr',
    intercept, coef_reach, coef_messaging, coef_amount_spent,
    coef_spend_sq: 0, coef_link_clicks: 0,
    r_squared, adj_r_squared, residual_std_error, n,
    equation: `Purchases = ${intercept.toFixed(4)} ${fmt(coef_reach)}·log(1+Reach) ${fmt(coef_messaging)}·log(1+Msgs) ${fmt(coef_amount_spent)}·log(1+Spend) [robust huber]`,
  }
}

function fitLogLogMLR(data: TrainingData[]): Omit<FitResult, 'cv_mse'> {
  const n = data.length
  const yOrig = data.map(d => d.purchases)
  const yLog = yOrig.map(v => Math.log1p(v))
  const X = data.map(d => [1, Math.log1p(d.reach), Math.log1p(d.messaging), Math.log1p(d.amount_spent)])

  const { beta } = fitLinear(X, yLog, 3)
  const [intercept, coef_reach, coef_messaging, coef_amount_spent] = beta

  const ybar = yOrig.reduce((a, b) => a + b, 0) / n
  const ssTot = yOrig.reduce((s, yi) => s + (yi - ybar) ** 2, 0)
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    const logHat = X[i].reduce((s, v, j) => s + v * beta[j], 0)
    ssRes += (yOrig[i] - (Math.exp(logHat) - 1)) ** 2
  }
  const r_squared = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  const adj_r_squared = n > 4 ? 1 - (1 - r_squared) * (n - 1) / (n - 4) : 0
  const residual_std_error = n > 4 ? Math.sqrt(ssRes / (n - 4)) : 0

  return {
    modelType: 'log_log_mlr',
    intercept, coef_reach, coef_messaging, coef_amount_spent,
    coef_spend_sq: 0, coef_link_clicks: 0,
    r_squared, adj_r_squared, residual_std_error, n,
    equation: `log(1+Purchases) = ${intercept.toFixed(4)} ${fmt(coef_reach)}·log(1+Reach) ${fmt(coef_messaging)}·log(1+Msgs) ${fmt(coef_amount_spent)}·log(1+Spend) [elasticity]`,
  }
}

// Expanded MLR: adds log(1+link_clicks) as a 4th predictor
// Only competes when link_clicks data is available in at least half the training rows
function fitExpandedMLR(data: TrainingData[]): Omit<FitResult, 'cv_mse'> {
  const hasLinkClicks = data.filter(d => d.link_clicks > 0).length >= data.length * 0.5
  if (!hasLinkClicks) return { ...fitLogMLR(data), modelType: 'expanded_mlr' }

  const n = data.length
  const y = data.map(d => d.purchases)
  const X = data.map(d => [
    1,
    Math.log1p(d.reach),
    Math.log1p(d.messaging),
    Math.log1p(d.amount_spent),
    Math.log1p(d.link_clicks),
  ])

  const { beta, r_squared, adj_r_squared, residual_std_error } = fitLinear(X, y, 4)
  const [intercept, coef_reach, coef_messaging, coef_amount_spent, coef_link_clicks] = beta

  return {
    modelType: 'expanded_mlr',
    intercept, coef_reach, coef_messaging, coef_amount_spent,
    coef_spend_sq: 0, coef_link_clicks,
    r_squared, adj_r_squared, residual_std_error, n,
    equation: `Purchases = ${intercept.toFixed(4)} ${fmt(coef_reach)}·log(1+Reach) ${fmt(coef_messaging)}·log(1+Msgs) ${fmt(coef_amount_spent)}·log(1+Spend) ${fmt(coef_link_clicks)}·log(1+Clicks)`,
  }
}

// ─── Predictors for CV (one per model type) ───────────────────────────────────

function predictResult(result: Omit<FitResult, 'cv_mse'>, d: TrainingData): number {
  const type = result.modelType

  if (type === 'plain_mlr') {
    return result.intercept
      + result.coef_reach * d.reach
      + result.coef_messaging * d.messaging
      + result.coef_amount_spent * d.amount_spent
  }
  if (type === 'poly_mlr') {
    const ls = Math.log1p(d.amount_spent)
    return result.intercept
      + result.coef_reach * Math.log1p(d.reach)
      + result.coef_messaging * Math.log1p(d.messaging)
      + result.coef_amount_spent * ls
      + result.coef_spend_sq * ls * ls
  }
  if (type === 'log_log_mlr') {
    return Math.max(0, Math.exp(
      result.intercept
      + result.coef_reach * Math.log1p(d.reach)
      + result.coef_messaging * Math.log1p(d.messaging)
      + result.coef_amount_spent * Math.log1p(d.amount_spent)
    ) - 1)
  }
  if (type === 'expanded_mlr') {
    return result.intercept
      + result.coef_reach * Math.log1p(d.reach)
      + result.coef_messaging * Math.log1p(d.messaging)
      + result.coef_amount_spent * Math.log1p(d.amount_spent)
      + result.coef_link_clicks * Math.log1p(d.link_clicks)
  }
  // log_mlr, ridge_mlr, lasso_mlr, elastic_net_mlr, wls_mlr, robust_mlr
  return result.intercept
    + result.coef_reach * Math.log1p(d.reach)
    + result.coef_messaging * Math.log1p(d.messaging)
    + result.coef_amount_spent * Math.log1p(d.amount_spent)
}

// ─── Auto-selection via 5-fold CV ────────────────────────────────────────────

function selectBestModel(data: TrainingData[]): FitResult {
  const fitters: Array<(d: TrainingData[]) => Omit<FitResult, 'cv_mse'>> = [
    fitLogMLR, fitPlainMLR, fitPolyMLR, fitRidgeMLR,
    fitLassoMLR, fitElasticNetMLR,
    fitWLSMLR, fitRobustMLR, fitLogLogMLR, fitExpandedMLR,
  ]

  const results: FitResult[] = fitters.map(fitter => {
    const full = fitter(data)
    const cv_mse = kFoldCVMse(data, fitter, predictResult)
    return { ...full, cv_mse }
  })

  // Primary: lowest CV MSE. Tie-break: highest adj-R²
  return results.reduce((best, c) => {
    if (c.cv_mse < best.cv_mse) return c
    if (c.cv_mse === best.cv_mse && c.adj_r_squared > best.adj_r_squared) return c
    return best
  })
}

// ─── Public prediction ────────────────────────────────────────────────────────

export function predictFromModel(
  model: {
    model_type?: string | null
    intercept: number
    coef_reach?: number | null
    coef_messaging?: number | null
    coef_amount_spent?: number | null
    coef_spend_sq?: number | null
    coef_link_clicks?: number | null
    coefficient: number
  },
  reach: number,
  messaging: number,
  spend: number,
  link_clicks = 0,
): number {
  const type = model.model_type ?? (model.coef_reach != null ? 'log_mlr' : 'slr')

  if (type === 'plain_mlr') {
    return model.intercept
      + (model.coef_reach ?? 0) * reach
      + (model.coef_messaging ?? 0) * messaging
      + (model.coef_amount_spent ?? model.coefficient) * spend
  }
  if (type === 'poly_mlr') {
    const ls = Math.log1p(spend)
    return model.intercept
      + (model.coef_reach ?? 0) * Math.log1p(reach)
      + (model.coef_messaging ?? 0) * Math.log1p(messaging)
      + (model.coef_amount_spent ?? 0) * ls
      + (model.coef_spend_sq ?? 0) * ls * ls
  }
  if (type === 'log_log_mlr') {
    return Math.max(0, Math.exp(
      model.intercept
      + (model.coef_reach ?? 0) * Math.log1p(reach)
      + (model.coef_messaging ?? 0) * Math.log1p(messaging)
      + (model.coef_amount_spent ?? 0) * Math.log1p(spend)
    ) - 1)
  }
  if (type === 'expanded_mlr') {
    return model.intercept
      + (model.coef_reach ?? 0) * Math.log1p(reach)
      + (model.coef_messaging ?? 0) * Math.log1p(messaging)
      + (model.coef_amount_spent ?? 0) * Math.log1p(spend)
      + (model.coef_link_clicks ?? 0) * Math.log1p(link_clicks)
  }
  // log_mlr, ridge_mlr, lasso_mlr, elastic_net_mlr, wls_mlr, robust_mlr
  if (model.coef_reach != null && model.coef_messaging != null && model.coef_amount_spent != null) {
    return model.intercept
      + model.coef_reach * Math.log1p(reach)
      + model.coef_messaging * Math.log1p(messaging)
      + model.coef_amount_spent * Math.log1p(spend)
  }
  // Legacy SLR fallback
  return model.intercept + model.coefficient * spend
}

// ─── Public exports ───────────────────────────────────────────────────────────

export function fitMLR(data: { reach: number; messaging: number; amount_spent: number; purchases: number }[]): MLRResult {
  const full = data.map(d => ({ ...d, link_clicks: 0 }))
  const result = selectBestModel(full)
  return {
    intercept: result.intercept,
    coef_reach: result.coef_reach,
    coef_messaging: result.coef_messaging,
    coef_amount_spent: result.coef_amount_spent,
    r_squared: result.r_squared,
    residual_std_error: result.residual_std_error,
    n: result.n,
    equation: result.equation,
  }
}

export async function maybeRetrainRegression(): Promise<boolean> {
  const ads = await prisma.ad.findMany({ where: { purchases: { not: null } } })
  if (ads.length < 10) return false

  const data: TrainingData[] = ads.map(a => ({
    reach: a.reach ?? 0,
    messaging: a.total_messaging_contacts ?? 0,
    amount_spent: a.amount_spent,
    purchases: a.purchases as number,
    link_clicks: a.link_clicks ?? 0,
    reporting_starts: a.reporting_starts,
  }))

  const result = selectBestModel(data)

  await prisma.regressionModel.create({
    data: {
      intercept: result.intercept,
      coefficient: result.coef_amount_spent,
      coef_reach: result.coef_reach,
      coef_messaging: result.coef_messaging,
      coef_amount_spent: result.coef_amount_spent,
      coef_spend_sq: result.coef_spend_sq !== 0 ? result.coef_spend_sq : null,
      coef_link_clicks: result.coef_link_clicks !== 0 ? result.coef_link_clicks : null,
      model_type: result.modelType,
      r_squared: result.r_squared,
      adj_r_squared: result.adj_r_squared,
      residual_std_error: result.residual_std_error,
      n: result.n,
    },
  })

  return true
}
