import { prisma } from '@/lib/prisma'

export type ModelType = 'plain_mlr'

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
  inquiries: number
}

interface FitResult {
  modelType: ModelType
  intercept: number
  coef_reach: number
  coef_messaging: number
  coef_amount_spent: number
  r_squared: number
  adj_r_squared: number
  residual_std_error: number
  n: number
  equation: string
}

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

function fmt(v: number): string {
  return v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4)
}

// Plain OLS: Inquiries = β₀ + β₁·Reach + β₂·MessagingContacts + β₃·Spend
function fitPlainMLR(data: TrainingData[]): FitResult {
  const n = data.length
  const y = data.map(d => d.inquiries)
  const X = data.map(d => [1, d.reach, d.messaging, d.amount_spent])
  const p = 4

  const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0))
  for (let i = 0; i < p; i++)
    for (let j = 0; j < p; j++)
      for (let k = 0; k < n; k++)
        XtX[i][j] += X[k][i] * X[k][j]

  const Xty = new Array(p).fill(0)
  for (let i = 0; i < p; i++)
    for (let k = 0; k < n; k++)
      Xty[i] += X[k][i] * y[k]

  const beta = gaussianElimination(XtX, Xty)
  const [intercept, coef_reach, coef_messaging, coef_amount_spent] = beta

  const meanY = y.reduce((a, b) => a + b, 0) / n
  const ssTot = y.reduce((s, yi) => s + (yi - meanY) ** 2, 0)
  let ssRes = 0
  for (let k = 0; k < n; k++) {
    const yhat = beta.reduce((s, b, j) => s + b * X[k][j], 0)
    ssRes += (y[k] - yhat) ** 2
  }

  const r_squared = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  const numPredictors = 3
  const adj_r_squared = n > numPredictors + 1
    ? 1 - (1 - r_squared) * (n - 1) / (n - numPredictors - 1)
    : 0
  const residual_std_error = n > p ? Math.sqrt(ssRes / (n - p)) : 0

  return {
    modelType: 'plain_mlr',
    intercept, coef_reach, coef_messaging, coef_amount_spent,
    r_squared, adj_r_squared, residual_std_error, n,
    equation: `Inquiries = ${intercept.toFixed(4)} ${fmt(coef_reach)}·Reach ${fmt(coef_messaging)}·Msgs ${fmt(coef_amount_spent)}·Spend`,
  }
}

// ─── Public prediction ────────────────────────────────────────────────────────

export function predictFromModel(
  model: {
    model_type?: string | null
    intercept: number
    coef_reach?: number | null
    coef_messaging?: number | null
    coef_amount_spent?: number | null
    coefficient: number
  },
  reach: number,
  messaging: number,
  spend: number,
): number {
  return model.intercept
    + (model.coef_reach ?? 0) * reach
    + (model.coef_messaging ?? 0) * messaging
    + (model.coef_amount_spent ?? model.coefficient) * spend
}

// ─── Public exports ───────────────────────────────────────────────────────────

export function fitMLR(data: { reach: number; messaging: number; amount_spent: number; inquiries: number }[]): MLRResult {
  const result = fitPlainMLR(data)
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
  const ads = await prisma.ad.findMany({ where: { inquiries: { not: null } } })
  if (ads.length < 10) return false

  const data: TrainingData[] = ads.map(a => ({
    reach: a.reach ?? 0,
    messaging: a.total_messaging_contacts ?? 0,
    amount_spent: a.amount_spent,
    inquiries: a.inquiries as number,
  }))

  const result = fitPlainMLR(data)

  await prisma.regressionModel.create({
    data: {
      intercept: result.intercept,
      coefficient: result.coef_amount_spent,
      coef_reach: result.coef_reach,
      coef_messaging: result.coef_messaging,
      coef_amount_spent: result.coef_amount_spent,
      coef_spend_sq: null,
      coef_link_clicks: null,
      model_type: result.modelType,
      r_squared: result.r_squared,
      adj_r_squared: result.adj_r_squared,
      residual_std_error: result.residual_std_error,
      n: result.n,
    },
  })

  return true
}
