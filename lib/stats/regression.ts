import { prisma } from '@/lib/prisma'

export type ModelType = 'log_mlr' | 'plain_mlr' | 'poly_mlr' | 'ridge_mlr'

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
}

interface FitResult {
  modelType: ModelType
  intercept: number
  coef_reach: number
  coef_messaging: number
  coef_amount_spent: number
  coef_spend_sq: number
  r_squared: number
  adj_r_squared: number
  residual_std_error: number
  n: number
  equation: string
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

// Core solver: normal equations with optional ridge penalty on non-intercept coefficients
function fitLinear(
  X: number[][],
  y: number[],
  numPredictors: number,
  ridge: number = 0,
): { beta: number[], r_squared: number, adj_r_squared: number, residual_std_error: number } {
  const n = X.length
  const p = X[0].length

  const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0))
  for (let i = 0; i < p; i++)
    for (let j = 0; j < p; j++)
      for (let k = 0; k < n; k++)
        XtX[i][j] += X[k][i] * X[k][j]

  // Ridge: add λ to diagonal of non-intercept terms only
  if (ridge > 0) {
    for (let i = 1; i < p; i++) XtX[i][i] += ridge
  }

  const Xty = new Array(p).fill(0)
  for (let i = 0; i < p; i++)
    for (let k = 0; k < n; k++)
      Xty[i] += X[k][i] * y[k]

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

function fmt(v: number): string {
  return v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4)
}

function fitLogMLR(data: TrainingData[]): FitResult {
  const y = data.map(d => d.purchases)
  const X = data.map(d => [1, Math.log1p(d.reach), Math.log1p(d.messaging), Math.log1p(d.amount_spent)])
  const { beta, r_squared, adj_r_squared, residual_std_error } = fitLinear(X, y, 3)
  const [intercept, coef_reach, coef_messaging, coef_amount_spent] = beta
  return {
    modelType: 'log_mlr',
    intercept, coef_reach, coef_messaging, coef_amount_spent, coef_spend_sq: 0,
    r_squared, adj_r_squared, residual_std_error, n: data.length,
    equation: `Purchases = ${intercept.toFixed(4)} ${fmt(coef_reach)}·log(1+Reach) ${fmt(coef_messaging)}·log(1+Msgs) ${fmt(coef_amount_spent)}·log(1+Spend)`,
  }
}

function fitPlainMLR(data: TrainingData[]): FitResult {
  const y = data.map(d => d.purchases)
  const X = data.map(d => [1, d.reach, d.messaging, d.amount_spent])
  const { beta, r_squared, adj_r_squared, residual_std_error } = fitLinear(X, y, 3)
  const [intercept, coef_reach, coef_messaging, coef_amount_spent] = beta
  return {
    modelType: 'plain_mlr',
    intercept, coef_reach, coef_messaging, coef_amount_spent, coef_spend_sq: 0,
    r_squared, adj_r_squared, residual_std_error, n: data.length,
    equation: `Purchases = ${intercept.toFixed(4)} ${fmt(coef_reach)}·Reach ${fmt(coef_messaging)}·Msgs ${fmt(coef_amount_spent)}·Spend`,
  }
}

function fitPolyMLR(data: TrainingData[]): FitResult {
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
    r_squared, adj_r_squared, residual_std_error, n: data.length,
    equation: `Purchases = ${intercept.toFixed(4)} ${fmt(coef_reach)}·log(1+Reach) ${fmt(coef_messaging)}·log(1+Msgs) ${fmt(coef_amount_spent)}·log(1+Spend) ${fmt(coef_spend_sq)}·log(1+Spend)²`,
  }
}

function fitRidgeMLR(data: TrainingData[]): FitResult {
  const y = data.map(d => d.purchases)
  const X = data.map(d => [1, Math.log1p(d.reach), Math.log1p(d.messaging), Math.log1p(d.amount_spent)])
  const { beta, r_squared, adj_r_squared, residual_std_error } = fitLinear(X, y, 3, 0.1)
  const [intercept, coef_reach, coef_messaging, coef_amount_spent] = beta
  return {
    modelType: 'ridge_mlr',
    intercept, coef_reach, coef_messaging, coef_amount_spent, coef_spend_sq: 0,
    r_squared, adj_r_squared, residual_std_error, n: data.length,
    equation: `Purchases = ${intercept.toFixed(4)} ${fmt(coef_reach)}·log(1+Reach) ${fmt(coef_messaging)}·log(1+Msgs) ${fmt(coef_amount_spent)}·log(1+Spend) [ridge λ=0.1]`,
  }
}

function selectBestModel(data: TrainingData[]): FitResult {
  const candidates = [fitLogMLR(data), fitPlainMLR(data), fitPolyMLR(data), fitRidgeMLR(data)]
  return candidates.reduce((best, c) => c.adj_r_squared > best.adj_r_squared ? c : best)
}

// Predict purchases from any stored model record — handles all model types and legacy SLR
export function predictFromModel(
  model: {
    model_type?: string | null
    intercept: number
    coef_reach?: number | null
    coef_messaging?: number | null
    coef_amount_spent?: number | null
    coef_spend_sq?: number | null
    coefficient: number
  },
  reach: number,
  messaging: number,
  spend: number,
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

  if (model.coef_reach != null && model.coef_messaging != null && model.coef_amount_spent != null) {
    // log_mlr, ridge_mlr, or legacy MLR — all use the same log-transform prediction formula
    return model.intercept
      + model.coef_reach * Math.log1p(reach)
      + model.coef_messaging * Math.log1p(messaging)
      + model.coef_amount_spent * Math.log1p(spend)
  }

  // Legacy SLR fallback
  return model.intercept + model.coefficient * spend
}

// Kept for any existing callers — delegates to auto-selection
export function fitMLR(data: { reach: number; messaging: number; amount_spent: number; purchases: number }[]): MLRResult {
  const result = selectBestModel(data)
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
      model_type: result.modelType,
      r_squared: result.r_squared,
      residual_std_error: result.residual_std_error,
      n: result.n,
    },
  })

  return true
}
