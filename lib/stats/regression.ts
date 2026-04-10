import { prisma } from '@/lib/prisma'
import type { RegressionResult } from '@/types/index'

export function fitLinearRegression(
  pairs: { x: number; y: number }[]
): RegressionResult {
  const n = pairs.length
  if (n < 2) throw new Error('Need at least 2 data points for regression')

  const sumX = pairs.reduce((a, p) => a + p.x, 0)
  const sumY = pairs.reduce((a, p) => a + p.y, 0)
  const sumXY = pairs.reduce((a, p) => a + p.x * p.y, 0)
  const sumXX = pairs.reduce((a, p) => a + p.x * p.x, 0)

  const meanX = sumX / n
  const meanY = sumY / n

  const denominator = sumXX - n * meanX * meanX
  if (denominator === 0) throw new Error('Cannot fit regression: no variance in X')

  const coefficient = (sumXY - n * meanX * meanY) / denominator
  const intercept = meanY - coefficient * meanX

  // Compute R²
  const ssTot = pairs.reduce((a, p) => {
    const d = p.y - meanY
    return a + d * d
  }, 0)

  const ssRes = pairs.reduce((a, p) => {
    const predicted = intercept + coefficient * p.x
    const d = p.y - predicted
    return a + d * d
  }, 0)

  const r_squared = ssTot === 0 ? 0 : 1 - ssRes / ssTot

  const equation = `Purchases = ${intercept.toFixed(4)} + ${coefficient.toFixed(6)} × Amount Spent`

  return { intercept, coefficient, r_squared, n, equation }
}

export async function maybeRetrainRegression(): Promise<boolean> {
  const ads = await prisma.ad.findMany({
    where: {
      purchases: { not: null },
    },
  })

  if (ads.length < 10) {
    return false
  }

  const pairs = ads
    .filter((a) => a.purchases !== null)
    .map((a) => ({ x: a.amount_spent, y: a.purchases as number }))

  const result = fitLinearRegression(pairs)

  await prisma.regressionModel.create({
    data: {
      intercept: result.intercept,
      coefficient: result.coefficient,
      r_squared: result.r_squared,
      n: result.n,
    },
  })

  return true
}
