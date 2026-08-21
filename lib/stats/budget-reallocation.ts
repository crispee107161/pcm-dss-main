// Shared with FR-31 (see lib/stats/fr31-regression.ts), which the FR-31 spec
// explicitly requires to use "the same named constant" as FR-25 for its
// ≥₱1,000 population filter — hoisted here rather than left as separate
// private literals in app/dashboard/owner/budget-reallocation/page.tsx and
// lib/reports/report-data.ts.
export const MIN_SPEND_THRESHOLD_PHP = 1000

export interface AdForReallocation {
  ad_id: string
  ad_name: string
  ad_set_name: string
  amount_spent: number
  total_messaging_contacts: number | null
}

export interface ReallocationAd {
  ad_id: string
  ad_name: string
  ad_set_name: string
  spend: number
  inquiries: number
  cpi: number
}

export interface QuartileSummary {
  quartile: 1 | 2 | 3 | 4
  n: number
  spend: number
  inquiries: number
  cpi: number
}

export interface BudgetReallocationResult {
  minSpendThreshold: number
  n: number
  quartiles: QuartileSummary[]
  q1Cpi: number
  q4Spend: number
  q4Inquiries: number
  q4Ads: ReallocationAd[]
  // Inquiries Q4's actual spend would have bought at Q1's rate, based on
  // recorded results — a retrospective comparison, never a forecast.
  counterfactualInquiries: number
  additionalInquiries: number
}

const EMPTY_QUARTILES: QuartileSummary[] = [1, 2, 3, 4].map(q => ({ quartile: q as 1 | 2 | 3 | 4, n: 0, spend: 0, inquiries: 0, cpi: 0 }))

// A monthly-export ad can have up to 12 rows (one per uploaded month) — sum
// spend/inquiries per Ad ID first, then compute one CPI per ad, matching the
// aggregation rule in data_catalog.md §4.3 (sum-then-divide, never mean-of-ratios).
function aggregateByAdId(ads: AdForReallocation[]) {
  const perAd = new Map<string, { ad_name: string; ad_set_name: string; spend: number; inquiries: number }>()
  for (const ad of ads) {
    const existing = perAd.get(ad.ad_id) ?? { ad_name: ad.ad_name, ad_set_name: ad.ad_set_name, spend: 0, inquiries: 0 }
    perAd.set(ad.ad_id, {
      ad_name: ad.ad_name,
      ad_set_name: ad.ad_set_name,
      spend: existing.spend + ad.amount_spent,
      inquiries: existing.inquiries + (ad.total_messaging_contacts ?? 0),
    })
  }
  return perAd
}

// FR-25 (mvp.md §4.5): ranks messaging ads with spend at/above a configurable
// minimum into four equal-size CPI quartiles (rank-based split, so n divides
// evenly whenever possible — reproduces the reference 27/27/27/27 split at
// the default ₱1,000 threshold), then compares Q4's (worst) actual inquiries
// against what its spend would have bought at Q1's (best) rate.
//
// The minimum-spend filter exists because an unfiltered split is confounded
// by regression to the mean: without it, the "worst" quartile is mostly
// low-volume ads with noisy CPI, not genuinely inefficient ones.
export function computeBudgetReallocation(ads: AdForReallocation[], minSpendThreshold: number): BudgetReallocationResult {
  const perAd = aggregateByAdId(ads)

  const eligible: ReallocationAd[] = [...perAd.entries()]
    .map(([ad_id, a]) => ({ ad_id, ad_name: a.ad_name, ad_set_name: a.ad_set_name, spend: a.spend, inquiries: a.inquiries, cpi: a.spend / a.inquiries }))
    .filter(a => a.inquiries > 0 && a.spend >= minSpendThreshold)
    .sort((a, b) => a.cpi - b.cpi)

  const n = eligible.length

  if (n === 0) {
    return {
      minSpendThreshold,
      n: 0,
      quartiles: EMPTY_QUARTILES,
      q1Cpi: 0,
      q4Spend: 0,
      q4Inquiries: 0,
      q4Ads: [],
      counterfactualInquiries: 0,
      additionalInquiries: 0,
    }
  }

  const groups: ReallocationAd[][] = [[], [], [], []]
  eligible.forEach((ad, i) => {
    groups[Math.min(3, Math.floor((i * 4) / n))].push(ad)
  })

  const quartiles: QuartileSummary[] = groups.map((group, i) => {
    const spend = group.reduce((s, a) => s + a.spend, 0)
    const inquiries = group.reduce((s, a) => s + a.inquiries, 0)
    return { quartile: (i + 1) as 1 | 2 | 3 | 4, n: group.length, spend, inquiries, cpi: inquiries > 0 ? spend / inquiries : 0 }
  })

  const q1 = quartiles[0]
  const q4 = quartiles[3]

  const counterfactualInquiries = q1.cpi > 0 ? q4.spend / q1.cpi : q4.inquiries
  const additionalInquiries = counterfactualInquiries - q4.inquiries

  return {
    minSpendThreshold,
    n,
    quartiles,
    q1Cpi: q1.cpi,
    q4Spend: q4.spend,
    q4Inquiries: q4.inquiries,
    q4Ads: groups[3],
    counterfactualInquiries,
    additionalInquiries,
  }
}
