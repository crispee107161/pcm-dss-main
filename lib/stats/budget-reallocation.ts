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
  // Median spend per ad within the group (docs/raven/budget-reallocation-memo-v3
  // finding G) — surfaces that the most-efficient group is also the
  // highest-spend group, the fact that makes the reallocation's
  // rate-holds-at-scale assumption plausible or not.
  medianSpend: number
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

const EMPTY_QUARTILES: QuartileSummary[] = [1, 2, 3, 4].map(q => ({ quartile: q as 1 | 2 | 3 | 4, n: 0, spend: 0, inquiries: 0, cpi: 0, medianSpend: 0 }))

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

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
// minimum into four CPI quartiles (rank-based split on the sorted list, index
// i lands in group floor(i*4/n) — this distributes any remainder across the
// leading groups rather than dropping it or dumping it all on one group, so
// group sizes differ by at most one ad when n isn't divisible by four; e.g.
// n=131 gives 33/33/33/32, not a fixed 32/32/32/32 that would silently
// discard the three costliest ads. Reproduces the reference 27/27/27/27
// split at the default ₱1,000 threshold, where n happens to divide evenly.
// docs/raven/budget-reallocation-memo-v3 finding A — verified this branch,
// not the discarding one).
//
// Ties at a group boundary: broken by Ad ID, not input row order — the
// callers' Prisma queries (page.tsx, report-data.ts, DashboardOverview.tsx)
// carry no `orderBy`, so Postgres row order is not guaranteed to be stable
// or meaningful, and can't be relied on as a tiebreaker. Ad ID makes the
// split deterministic regardless of what order the caller's query happens
// to return (docs/raven/budget-reallocation-memo-v3 finding H). No tie
// currently occurs in the data.
//
// The minimum-spend filter exists because an unfiltered split is confounded
// by regression to the mean: without it, the "worst" quartile is mostly
// low-volume ads with noisy CPI, not genuinely inefficient ones.
export function computeBudgetReallocation(ads: AdForReallocation[], minSpendThreshold: number): BudgetReallocationResult {
  const perAd = aggregateByAdId(ads)

  const eligible: ReallocationAd[] = [...perAd.entries()]
    .map(([ad_id, a]) => ({ ad_id, ad_name: a.ad_name, ad_set_name: a.ad_set_name, spend: a.spend, inquiries: a.inquiries, cpi: a.spend / a.inquiries }))
    .filter(a => a.inquiries > 0 && a.spend >= minSpendThreshold)
    .sort((a, b) => a.cpi - b.cpi || a.ad_id.localeCompare(b.ad_id))

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
    return {
      quartile: (i + 1) as 1 | 2 | 3 | 4,
      n: group.length,
      spend,
      inquiries,
      cpi: inquiries > 0 ? spend / inquiries : 0,
      medianSpend: median(group.map(a => a.spend)),
    }
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
