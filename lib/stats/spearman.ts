import { prisma } from '@/lib/prisma'
import type { SpearmanRow } from '@/types/index'

export function rankArray(arr: (number | null)[]): (number | null)[] {
  // Filter out nulls, keeping track of original indices
  const indexed = arr
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v !== null) as { v: number; i: number }[]

  // Sort by value
  indexed.sort((a, b) => a.v - b.v)

  const ranks = new Array(arr.length).fill(null)

  let i = 0
  while (i < indexed.length) {
    let j = i
    // Find ties
    while (j < indexed.length && indexed[j].v === indexed[i].v) {
      j++
    }
    // Average rank for ties (1-based)
    const avgRank = (i + 1 + j) / 2
    for (let k = i; k < j; k++) {
      ranks[indexed[k].i] = avgRank
    }
    i = j
  }

  return ranks
}

export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n === 0) return 0

  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n

  let num = 0
  let denX = 0
  let denY = 0

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }

  const den = Math.sqrt(denX * denY)
  if (den === 0) return 0
  return num / den
}

export function spearman(
  x: (number | null)[],
  y: (number | null)[]
): number | null {
  if (x.length !== y.length) throw new Error('Arrays must have same length')

  // Keep only pairs where both are non-null
  const pairs: { xi: number; yi: number }[] = []
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== null && y[i] !== null) {
      pairs.push({ xi: x[i] as number, yi: y[i] as number })
    }
  }

  if (pairs.length < 3) return null

  const xVals = pairs.map((p) => p.xi)
  const yVals = pairs.map((p) => p.yi)

  const xRanks = rankArray(xVals) as number[]
  const yRanks = rankArray(yVals) as number[]

  return pearsonCorrelation(xRanks, yRanks)
}

export async function computeSpearmanMatrix(): Promise<SpearmanRow[]> {
  const ads = await prisma.ad.findMany()

  const amount_spent = ads.map((a) => a.amount_spent)
  const reach = ads.map((a) => a.reach)
  const impressions = ads.map((a) => a.impressions as number)
  const link_clicks = ads.map((a) => a.link_clicks)
  const purchases = ads.map((a) => a.purchases)
  const messaging = ads.map((a) => a.total_messaging_contacts)

  const predictors: { name: string; values: (number | null)[] }[] = [
    { name: 'Amount Spent (PHP)', values: amount_spent },
    { name: 'Reach', values: reach },
    { name: 'Impressions', values: impressions },
    { name: 'Link Clicks', values: link_clicks },
  ]

  return predictors.map(({ name, values }) => ({
    variable: name,
    vs_purchases: spearman(values, purchases),
    vs_messaging: spearman(values, messaging),
  }))
}
