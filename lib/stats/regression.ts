import { prisma } from '@/lib/prisma'

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

interface MLRData {
  reach: number
  messaging: number
  amount_spent: number
  purchases: number
}

export function fitMLR(data: MLRData[]): MLRResult {
  const n = data.length
  if (n < 5) throw new Error('Need at least 5 data points for multiple regression')

  const p = 4 // intercept + 3 predictors
  const X = data.map(d => [
    1,
    Math.log1p(d.reach),
    Math.log1p(d.messaging),
    Math.log1p(d.amount_spent),
  ])
  const y = data.map(d => d.purchases)

  // Normal equations: (X'X)β = X'y
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
  const ssTot = y.reduce((a, yi) => a + (yi - meanY) ** 2, 0)

  let ssRes = 0
  for (let k = 0; k < n; k++) {
    const yhat = intercept + coef_reach * X[k][1] + coef_messaging * X[k][2] + coef_amount_spent * X[k][3]
    ssRes += (y[k] - yhat) ** 2
  }

  const r_squared = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  const residual_std_error = n > p ? Math.sqrt(ssRes / (n - p)) : 0

  const s = (v: number) => (v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4))
  const equation = `Purchases = ${intercept.toFixed(4)} ${s(coef_reach)}·log(1+Reach) ${s(coef_messaging)}·log(1+Msgs) ${s(coef_amount_spent)}·log(1+Spend)`

  return { intercept, coef_reach, coef_messaging, coef_amount_spent, r_squared, residual_std_error, n, equation }
}

export async function maybeRetrainRegression(): Promise<boolean> {
  const ads = await prisma.ad.findMany({ where: { purchases: { not: null } } })

  if (ads.length < 10) return false

  const data: MLRData[] = ads.map(a => ({
    reach: a.reach ?? 0,
    messaging: a.total_messaging_contacts ?? 0,
    amount_spent: a.amount_spent,
    purchases: a.purchases as number,
  }))

  const result = fitMLR(data)

  await prisma.regressionModel.create({
    data: {
      intercept: result.intercept,
      coefficient: result.coef_amount_spent, // keep for backward compat
      coef_reach: result.coef_reach,
      coef_messaging: result.coef_messaging,
      coef_amount_spent: result.coef_amount_spent,
      r_squared: result.r_squared,
      residual_std_error: result.residual_std_error,
      n: result.n,
    },
  })

  return true
}
