import { prisma } from '@/lib/prisma'
import type { SpearmanRow } from '@/types/index'

export function rankArray(arr: (number | null)[]): (number | null)[] {
  const indexed = arr
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v !== null) as { v: number; i: number }[]

  indexed.sort((a, b) => a.v - b.v)

  const ranks = new Array(arr.length).fill(null)

  let i = 0
  while (i < indexed.length) {
    let j = i
    while (j < indexed.length && indexed[j].v === indexed[i].v) {
      j++
    }
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

function pearsonFiltered(
  x: (number | null)[],
  y: (number | null)[]
): number | null {
  const pairs: { xi: number; yi: number }[] = []
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== null && y[i] !== null) {
      pairs.push({ xi: x[i] as number, yi: y[i] as number })
    }
  }
  if (pairs.length < 3) return null
  return pearsonCorrelation(pairs.map(p => p.xi), pairs.map(p => p.yi))
}

function spearmanFiltered(
  x: (number | null)[],
  y: (number | null)[]
): number | null {
  const xComplete: number[] = []
  const yComplete: number[] = []
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== null && y[i] !== null) {
      xComplete.push(x[i] as number)
      yComplete.push(y[i] as number)
    }
  }
  if (xComplete.length < 3) return null
  const rankedX = rankArray(xComplete) as number[]
  const rankedY = rankArray(yComplete) as number[]
  return pearsonCorrelation(rankedX, rankedY)
}

export async function computeSpearmanMatrix(): Promise<SpearmanRow[]> {
  const ads = await prisma.ad.findMany()

  const amount_spent = ads.map((a) => a.amount_spent)
  const reach = ads.map((a) => a.reach)
  const impressions = ads.map((a) => a.impressions ?? null)
  const link_clicks = ads.map((a) => a.link_clicks)
  const inquiries = ads.map((a) => a.inquiries)
  const messaging = ads.map((a) => a.total_messaging_contacts)

  const predictors: { name: string; values: (number | null)[] }[] = [
    { name: 'Amount Spent (PHP)', values: amount_spent },
    { name: 'Reach', values: reach },
    { name: 'Impressions', values: impressions },
    { name: 'Link Clicks', values: link_clicks },
  ]

  return predictors.map(({ name, values }) => ({
    variable: name,
    vs_inquiries: spearmanFiltered(values, inquiries),
    vs_messaging: spearmanFiltered(values, messaging),
  }))
}
