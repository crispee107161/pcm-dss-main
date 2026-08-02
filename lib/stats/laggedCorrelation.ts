import { prisma } from '@/lib/prisma'
import { pearsonCorrelation } from '@/lib/stats/spearman'

interface DailyPoint {
  reach: number
  messaging: number
  amount_spent: number
  purchases: number
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

export function expandAndAggregate(ads: Array<{
  reporting_starts: Date
  reporting_ends: Date
  reach: number | null
  total_messaging_contacts: number | null
  amount_spent: number
  purchases: number | null
}>): Map<string, DailyPoint> {
  const map = new Map<string, DailyPoint>()

  for (const ad of ads) {
    const start = new Date(ad.reporting_starts)
    const end = new Date(ad.reporting_ends)
    const days = Math.max(1, diffDays(end, start) + 1)

    const dailyReach = (ad.reach ?? 0) / days
    const dailyMessaging = (ad.total_messaging_contacts ?? 0) / days
    const dailySpend = ad.amount_spent / days
    const dailyPurchases = (ad.purchases ?? 0) / days

    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)

      const existing = map.get(key) ?? { reach: 0, messaging: 0, amount_spent: 0, purchases: 0 }
      existing.reach += dailyReach
      existing.messaging += dailyMessaging
      existing.amount_spent += dailySpend
      existing.purchases += dailyPurchases
      map.set(key, existing)
    }
  }

  return map
}

// Two-tailed p-value via Fisher z-transform → normal approximation
export function pearsonPValue(r: number, n: number): number {
  if (n <= 3 || Math.abs(r) >= 1) return n <= 3 ? 1 : 0
  const z = 0.5 * Math.log((1 + r) / (1 - r))
  const se = 1 / Math.sqrt(n - 3)
  const zScore = Math.abs(z / se)
  // Abramowitz & Stegun normal CDF approximation
  const t = 1 / (1 + 0.2316419 * zScore)
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  const pdf = Math.exp(-0.5 * zScore * zScore) / Math.sqrt(2 * Math.PI)
  const cdf = 1 - pdf * poly
  return Math.min(1, 2 * (1 - cdf))
}

function computeLaggedPearson(
  dailyMap: Map<string, DailyPoint>,
  lag: number
): { reach_r: number | null; messaging_r: number | null; spend_r: number | null; n: number } {
  const dates = Array.from(dailyMap.keys()).sort()

  const reachX: number[] = []
  const messagingX: number[] = []
  const spendX: number[] = []
  const purchasesY: number[] = []

  for (const dateStr of dates) {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + lag)
    const futureDateStr = d.toISOString().slice(0, 10)

    if (dailyMap.has(futureDateStr)) {
      const today = dailyMap.get(dateStr)!
      const future = dailyMap.get(futureDateStr)!
      reachX.push(today.reach)
      messagingX.push(today.messaging)
      spendX.push(today.amount_spent)
      purchasesY.push(future.purchases)
    }
  }

  if (purchasesY.length < 3) {
    return { reach_r: null, messaging_r: null, spend_r: null, n: purchasesY.length }
  }

  return {
    reach_r: pearsonCorrelation(reachX, purchasesY),
    messaging_r: pearsonCorrelation(messagingX, purchasesY),
    spend_r: pearsonCorrelation(spendX, purchasesY),
    n: purchasesY.length,
  }
}

export interface LagResult {
  lag: number
  reach_r: number | null
  reach_p: number | null
  messaging_r: number | null
  messaging_p: number | null
  spend_r: number | null
  spend_p: number | null
  n: number
}

export interface LaggedCorrelationOutput {
  results: LagResult[]
  best_lag: number
  best_metric: 'reach' | 'messaging' | 'spend' | null
  best_r: number | null
  best_p: number | null
  has_data: boolean
}

export async function computeLaggedCorrelations(): Promise<LaggedCorrelationOutput> {
  const ads = await prisma.ad.findMany()

  if (ads.length === 0) {
    return { results: [], best_lag: 1, best_metric: null, best_r: null, best_p: null, has_data: false }
  }

  const dailyMap = expandAndAggregate(ads)
  const results: LagResult[] = []

  // Extended lag range: adds 2, 5, 14 to capture shorter cycles and bi-weekly patterns
  for (const lag of [1, 2, 3, 5, 7, 14]) {
    const corrs = computeLaggedPearson(dailyMap, lag)

    const reach_r = corrs.reach_r
    const messaging_r = corrs.messaging_r
    const spend_r = corrs.spend_r
    const n = corrs.n

    results.push({
      lag,
      reach_r,
      reach_p: reach_r !== null ? pearsonPValue(reach_r, n) : null,
      messaging_r,
      messaging_p: messaging_r !== null ? pearsonPValue(messaging_r, n) : null,
      spend_r,
      spend_p: spend_r !== null ? pearsonPValue(spend_r, n) : null,
      n,
    })
  }

  // Find best significant correlation; fall back to highest |r| if none are significant
  let best_lag = 1
  let best_r: number | null = null
  let best_p: number | null = null
  let best_metric: 'reach' | 'messaging' | 'spend' | null = null

  const tryUpdate = (r: number | null, p: number | null, metric: typeof best_metric, lag: number, requireSignificant: boolean) => {
    if (r === null || p === null) return
    if (requireSignificant && p >= 0.05) return
    if (best_r === null || Math.abs(r) > Math.abs(best_r)) {
      best_r = r; best_p = p; best_metric = metric; best_lag = lag
    }
  }

  // First pass: significant only
  for (const res of results) {
    tryUpdate(res.reach_r, res.reach_p, 'reach', res.lag, true)
    tryUpdate(res.messaging_r, res.messaging_p, 'messaging', res.lag, true)
    tryUpdate(res.spend_r, res.spend_p, 'spend', res.lag, true)
  }
  // Second pass: any if none significant
  if (best_r === null) {
    for (const res of results) {
      tryUpdate(res.reach_r, res.reach_p, 'reach', res.lag, false)
      tryUpdate(res.messaging_r, res.messaging_p, 'messaging', res.lag, false)
      tryUpdate(res.spend_r, res.spend_p, 'spend', res.lag, false)
    }
  }

  return { results, best_lag, best_metric, best_r, best_p, has_data: true }
}
