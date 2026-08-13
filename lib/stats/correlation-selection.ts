import { shapiroWilk } from './shapiro-wilk'
import { pearsonCorrelation, rankArray } from './spearman'
import { studentTPValue } from './normal-dist'

export interface AdForCorrelationSelection {
  ad_id: string
  amount_spent: number
  total_messaging_contacts: number | null
  reach: number | null
  post_engagements: number | null
}

interface PerAdTotals {
  spend: number
  messaging: number
  reach: number
  engagements: number
}

// Same sum-then-divide-per-Ad-ID aggregation as every other CPI/engagement
// figure in the app (ALG-09) — a monthly-export ad can have up to 12 rows.
function aggregateByAdId(ads: AdForCorrelationSelection[]): Map<string, PerAdTotals> {
  const perAd = new Map<string, PerAdTotals>()
  for (const ad of ads) {
    const existing = perAd.get(ad.ad_id) ?? { spend: 0, messaging: 0, reach: 0, engagements: 0 }
    perAd.set(ad.ad_id, {
      spend: existing.spend + ad.amount_spent,
      messaging: existing.messaging + (ad.total_messaging_contacts ?? 0),
      reach: existing.reach + (ad.reach ?? 0),
      engagements: existing.engagements + (ad.post_engagements ?? 0),
    })
  }
  return perAd
}

export type CorrelationMethod = 'PEARSON' | 'SPEARMAN'

export interface NormalityTestResult {
  W: number
  p: number
  isNormal: boolean // p > 0.05
}

export interface CorrelationSelectionResult {
  n: number
  method: CorrelationMethod
  coefficient: number
  p: number
  shapiroX: NormalityTestResult // ad_engagement_rate
  shapiroY: NormalityTestResult // cost_per_inquiry
}

function pearsonPValue(r: number, n: number): number {
  if (n <= 2) return 1
  if (Math.abs(r) >= 1) return 0
  const t = (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r)
  return studentTPValue(t, n - 2)
}

// ALG-08 (FR-21) — Shapiro-Wilk on both `ad_engagement_rate` (Post
// engagements / Reach) and `cost_per_inquiry`, for the full messaging-ad
// population (spend > 0, messaging contacts > 0 — same n=187 population as
// the dashboard's median-CPI KPI). Only Pearson when BOTH pass normality
// (p > 0.05); Spearman otherwise. The order matters: never compute both and
// display the more favourable one (mvp.md ALG-08's explicit prohibition) —
// this function returns exactly one coefficient, decided before it's known
// which one is "nicer".
export function selectCorrelation(ads: AdForCorrelationSelection[]): CorrelationSelectionResult {
  const perAd = aggregateByAdId(ads)

  const x: number[] = [] // ad_engagement_rate
  const y: number[] = [] // cost_per_inquiry
  for (const totals of perAd.values()) {
    if (totals.messaging <= 0 || totals.reach <= 0) continue
    x.push(totals.engagements / totals.reach)
    y.push(totals.spend / totals.messaging)
  }

  const n = x.length
  if (n < 3) {
    throw new Error('selectCorrelation: fewer than 3 ads with both a defined engagement rate and cost per inquiry')
  }

  const swX = shapiroWilk(x)
  const swY = shapiroWilk(y)
  const shapiroX: NormalityTestResult = { W: swX.W, p: swX.p, isNormal: swX.p > 0.05 }
  const shapiroY: NormalityTestResult = { W: swY.W, p: swY.p, isNormal: swY.p > 0.05 }

  if (shapiroX.isNormal && shapiroY.isNormal) {
    const coefficient = pearsonCorrelation(x, y)
    return { n, method: 'PEARSON', coefficient, p: pearsonPValue(coefficient, n), shapiroX, shapiroY }
  }

  const rankedX = rankArray(x) as number[]
  const rankedY = rankArray(y) as number[]
  const coefficient = pearsonCorrelation(rankedX, rankedY)
  return { n, method: 'SPEARMAN', coefficient, p: pearsonPValue(coefficient, n), shapiroX, shapiroY }
}
