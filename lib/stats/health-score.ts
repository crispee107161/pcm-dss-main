export interface AdForHealth {
  id: number
  ad_name: string
  ad_set_name: string
  amount_spent: number
  purchases: number | null
  reach: number | null
  reporting_starts: Date
  reporting_ends: Date
}

export interface ScoredAd extends AdForHealth {
  cpa: number | null
  purchase_rate: number | null
  score: number
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'
  breakdown: { cpa_score: number; rate_score: number; reach_score: number }
}

export function computeHealthScores(ads: AdForHealth[]): ScoredAd[] {
  if (ads.length === 0) return []

  const withPurchases = ads.filter(a => (a.purchases ?? 0) > 0 && (a.reach ?? 0) > 0 && a.amount_spent > 0)

  const cpas         = withPurchases.map(a => a.amount_spent / (a.purchases!))
  const rates        = withPurchases.map(a => (a.purchases!) / (a.reach!))
  const reaches      = ads.filter(a => (a.reach ?? 0) > 0).map(a => a.reach!)

  // Use 95th-percentile cap instead of absolute max to prevent a single outlier
  // from compressing the entire score distribution into a false "Excellent" band
  function pct95(arr: number[]): number {
    if (arr.length === 0) return 1
    const sorted = [...arr].sort((a, b) => a - b)
    const idx = Math.min(Math.ceil(sorted.length * 0.95) - 1, sorted.length - 1)
    return sorted[idx]
  }

  const minCpa   = cpas.length   ? Math.min(...cpas)  : 0
  const maxCpa   = cpas.length   ? pct95(cpas)        : 1
  const maxRate  = rates.length  ? pct95(rates)       : 1
  const maxReach = reaches.length ? pct95(reaches)    : 1

  function normalize(val: number, min: number, max: number, invert = false): number {
    if (max === min) return invert ? 0 : 100
    const n = (val - min) / (max - min)
    return Math.round((invert ? 1 - n : n) * 100)
  }

  function toGrade(score: number): ScoredAd['grade'] {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    if (score >= 20) return 'Poor'
    return 'Critical'
  }

  return ads.map(ad => {
    const purchases = ad.purchases ?? 0
    const reach     = ad.reach ?? 0

    const cpa           = purchases > 0 && ad.amount_spent > 0 ? ad.amount_spent / purchases : null
    const purchase_rate = purchases > 0 && reach > 0 ? purchases / reach : null

    let cpa_score   = 0
    let rate_score  = 0
    let reach_score = 0

    if (cpa !== null && cpas.length > 0)
      cpa_score = normalize(cpa, minCpa, maxCpa, true)

    if (purchase_rate !== null && rates.length > 0)
      rate_score = normalize(purchase_rate, 0, maxRate)

    if (reach > 0 && reaches.length > 0)
      reach_score = normalize(reach, 0, maxReach)

    const score = Math.round(cpa_score * 0.50 + rate_score * 0.35 + reach_score * 0.15)

    return {
      ...ad,
      cpa,
      purchase_rate,
      score,
      grade: toGrade(score),
      breakdown: { cpa_score, rate_score, reach_score },
    }
  })
}
