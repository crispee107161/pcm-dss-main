export interface AdForHealth {
  id: number
  ad_name: string
  ad_set_name: string
  amount_spent: number
  inquiries: number | null
  reach: number | null
  reporting_starts: Date
  reporting_ends: Date
}

export interface ScoredAd extends AdForHealth {
  cpi: number | null
  inquiry_rate: number | null
  score: number
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'
  breakdown: { cpi_score: number; rate_score: number; reach_score: number }
}

export function computeHealthScores(ads: AdForHealth[]): ScoredAd[] {
  if (ads.length === 0) return []

  const withInquiries = ads.filter(a => (a.inquiries ?? 0) > 0 && (a.reach ?? 0) > 0 && a.amount_spent > 0)

  const cpis         = withInquiries.map(a => a.amount_spent / (a.inquiries!))
  const rates        = withInquiries.map(a => (a.inquiries!) / (a.reach!))
  const reaches      = ads.filter(a => (a.reach ?? 0) > 0).map(a => a.reach!)

  // Use 95th-percentile cap instead of absolute max to prevent a single outlier
  // from compressing the entire score distribution into a false "Excellent" band
  function pct95(arr: number[]): number {
    if (arr.length === 0) return 1
    const sorted = [...arr].sort((a, b) => a - b)
    const idx = Math.min(Math.ceil(sorted.length * 0.95) - 1, sorted.length - 1)
    return sorted[idx]
  }

  const minCpi   = cpis.length   ? Math.min(...cpis)  : 0
  const maxCpi   = cpis.length   ? pct95(cpis)        : 1
  const maxRate  = rates.length  ? pct95(rates)       : 1
  const maxReach = reaches.length ? pct95(reaches)    : 1

  function normalize(val: number, min: number, max: number, invert = false): number {
    if (max === min) return invert ? 0 : 100
    const n = (val - min) / (max - min)
    const score = Math.round((invert ? 1 - n : n) * 100)
    // val can exceed max (or fall below min for the inverted/CPI case) since
    // max/min are a 95th-percentile cap, not the true range — clamp so a
    // single above-cap ad can't push a score past 100 or below 0.
    return Math.max(0, Math.min(100, score))
  }

  function toGrade(score: number): ScoredAd['grade'] {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    if (score >= 20) return 'Poor'
    return 'Critical'
  }

  return ads.map(ad => {
    const inquiries = ad.inquiries ?? 0
    const reach     = ad.reach ?? 0

    const cpi          = inquiries > 0 && ad.amount_spent > 0 ? ad.amount_spent / inquiries : null
    const inquiry_rate = inquiries > 0 && reach > 0 ? inquiries / reach : null

    let cpi_score   = 0
    let rate_score  = 0
    let reach_score = 0

    if (cpi !== null && cpis.length > 0)
      cpi_score = normalize(cpi, minCpi, maxCpi, true)

    if (inquiry_rate !== null && rates.length > 0)
      rate_score = normalize(inquiry_rate, 0, maxRate)

    if (reach > 0 && reaches.length > 0)
      reach_score = normalize(reach, 0, maxReach)

    const score = Math.round(cpi_score * 0.50 + rate_score * 0.35 + reach_score * 0.15)

    return {
      ...ad,
      cpi,
      inquiry_rate,
      score,
      grade: toGrade(score),
      breakdown: { cpi_score, rate_score, reach_score },
    }
  })
}
