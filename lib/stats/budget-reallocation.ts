import { MIN_SPEND_THRESHOLD_PHP, MESSAGING_RESULT_TYPE } from './ad-population-constants'

// Re-exported so existing call sites (app/dashboard/owner/budget-reallocation/page.tsx,
// lib/reports/report-data.ts, components/dashboard/DashboardOverview.tsx,
// fr31-regression.ts) don't need to change their import for the spend
// threshold — the value lives in a leaf module with no imports of its own,
// so nothing that depends on it risks an import cycle. MESSAGING_RESULT_TYPE
// itself is not re-exported: import it from './ad-population-constants'
// directly, the same as every other consumer, so there's one canonical path.
export { MIN_SPEND_THRESHOLD_PHP }

export interface AdForReallocation {
  ad_id: string
  ad_name: string
  ad_set_name: string
  amount_spent: number
  total_messaging_contacts: number | null
  result_type: string | null
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

// q4Ads arrives in ascending-CPI order (least-bad-of-the-worst first, see
// computeBudgetReallocation below), so the true worst ads sit at the end.
// The UI's "worst 10" toggle needs them worst-first — extracted as a pure
// function so the sort direction is unit-testable without React.
export function sortQ4WorstFirst(q4Ads: ReallocationAd[]): ReallocationAd[] {
  return [...q4Ads].sort((a, b) => b.cpi - a.cpi)
}

// A monthly-export ad can have up to 12 rows (one per uploaded month) — sum
// spend/inquiries per Ad ID first, then compute one CPI per ad, matching the
// aggregation rule in data_catalog.md §4.3 (sum-then-divide, never mean-of-ratios).
//
// Spend is summed only from rows where result_type is MESSAGING_RESULT_TYPE,
// not gated on `total_messaging_contacts !== null`. Both callers already
// filter to messaging-only rows in their Prisma query, so on live data this
// makes no difference (verified 2026-09-05 against the frozen 187-ad
// messaging dump: zero rows have a blank Results cell). It matters if a
// future caller passes an unfiltered row set: total_messaging_contacts is
// null both for a genuinely non-messaging row AND for a messaging row whose
// "Results" cell was blank in the CSV, so gating on it there would either
// wrongly include non-messaging spend or wrongly drop real messaging spend
// depending on which check is used — the mistake already caught and fixed in
// lib/stats/campaign-rankings.ts and lib/stats/ad-set-ranking.ts
// (docs/raven/Top_Ads_Accepted_and_Filter_Question.md §2). Filtering on
// result_type here means this function is correct regardless of what its
// caller's query does.
function aggregateByAdId(ads: AdForReallocation[]) {
  const perAd = new Map<string, { ad_name: string; ad_set_name: string; spend: number; inquiries: number }>()
  for (const ad of ads) {
    const existing = perAd.get(ad.ad_id) ?? { ad_name: ad.ad_name, ad_set_name: ad.ad_set_name, spend: 0, inquiries: 0 }
    perAd.set(ad.ad_id, {
      ad_name: ad.ad_name,
      ad_set_name: ad.ad_set_name,
      spend: existing.spend + (ad.result_type === MESSAGING_RESULT_TYPE ? ad.amount_spent : 0),
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
