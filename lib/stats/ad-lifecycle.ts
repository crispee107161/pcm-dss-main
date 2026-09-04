import { median } from './descriptive'
import { rankArray, pearsonCorrelation } from './spearman'
import { studentTPValue } from './normal-dist'

export interface AdRowForLifecycle {
  ad_id: string
  reporting_starts: Date
  amount_spent: number
  total_messaging_contacts: number | null
}

export interface AdRowForFrequency {
  ad_id: string
  frequency: number | null
  // amount_spent/total_messaging_contacts for THIS row, not Facebook's raw
  // "Cost per result" column — that column reflects whatever objective the
  // ad itself optimised for (Reach, Link Clicks, etc.), a different metric
  // per row that isn't comparable across ads and would corrupt this
  // correlation if mixed with messaging-ads CPI (see ALG note below).
  amount_spent: number
  total_messaging_contacts: number | null
}

export interface MonthOfLifePoint {
  monthIndex: number
  n: number // number of ad-rows contributing to this point (not distinct ads)
  spend: number
  results: number
  cpi: number | null // null when SUM(results) = 0, never 0 or Infinity
}

export interface CohortCurve {
  minSurvivalMonths: number
  n: number // distinct ads in the cohort
  curve: MonthOfLifePoint[]
}

export interface SingleMonthComparison {
  singleMonth: { n: number; cpi: number | null }
  longRun: { n: number; cpi: number | null; thresholdMonths: number }
}

export interface FrequencyDiagnostic {
  n: number // ad-month rows, not distinct advertisements — see adCount
  adCount: number // distinct advertisements contributing those n rows; each
  // contributes ~n/adCount observations on average, so a Spearman p-value
  // here is anti-conservative (repeated-measures, not independent draws)
  medianFrequency: number
  correlationWithCpi: { rho: number; p: number }
}

export interface AdLifecycleResult {
  maxMonthOfLifeDistribution: { monthIndex: number; n: number }[]
  cohorts: CohortCurve[] // one per requested minSurvivalMonths
  singleMonthComparison: SingleMonthComparison
  frequencyDiagnostic: FrequencyDiagnostic | null
}

function monthIndex(d: Date): number {
  return d.getUTCFullYear() * 12 + d.getUTCMonth()
}

// A monthly-export ad's row IS one ad-month; month_of_life(ad, row) =
// row's calendar month index minus the ad's earliest observed month index
// (mvp.md §4.5, revised 2026-08-12 to month-of-life after the week-of-life
// figures' source file went missing — see ALG note on survivorship bias
// below). Only ads restricted to a survival cohort avoid the bias: an
// unrestricted curve mixes ads killed early with ads that ran long, so
// "CPI improves with age" could just be bad ads leaving the denominator.
// Same "messaging ads" population as FR-21/FR-25 (SUM(total_messaging_contacts)
// > 0 per Ad ID) — a non-messaging ad's rows must not enter this map at all,
// since they'd otherwise inflate cohort/distribution counts with 0-result
// months rather than being correctly excluded from the population.
function computeMonthOfLife(ads: AdRowForLifecycle[]): Map<string, { monthIndex: number; spend: number; results: number }[]> {
  const byAd = new Map<string, { monthIndex: number; spend: number; results: number }[]>()
  for (const ad of ads) {
    const rows = byAd.get(ad.ad_id) ?? []
    rows.push({
      monthIndex: monthIndex(ad.reporting_starts),
      spend: ad.amount_spent,
      results: ad.total_messaging_contacts ?? 0,
    })
    byAd.set(ad.ad_id, rows)
  }

  const result = new Map<string, { monthIndex: number; spend: number; results: number }[]>()
  for (const [adId, rows] of byAd) {
    const totalMessaging = rows.reduce((s, r) => s + r.results, 0)
    if (totalMessaging <= 0) continue

    const minMonth = Math.min(...rows.map(r => r.monthIndex))
    result.set(
      adId,
      rows.map(r => ({ monthIndex: r.monthIndex - minMonth, spend: r.spend, results: r.results }))
    )
  }
  return result
}

function buildCurve(adRows: Map<string, { monthIndex: number; spend: number; results: number }[]>, minSurvivalMonths: number): CohortCurve {
  const cohortAdIds = [...adRows.entries()]
    .filter(([, rows]) => Math.max(...rows.map(r => r.monthIndex)) >= minSurvivalMonths)
    .map(([adId]) => adId)

  const byMonthIndex = new Map<number, { spend: number; results: number }>()
  for (const adId of cohortAdIds) {
    for (const row of adRows.get(adId)!) {
      const existing = byMonthIndex.get(row.monthIndex) ?? { spend: 0, results: 0 }
      byMonthIndex.set(row.monthIndex, { spend: existing.spend + row.spend, results: existing.results + row.results })
    }
  }

  const nPerMonth = new Map<number, number>()
  for (const adId of cohortAdIds) {
    for (const row of adRows.get(adId)!) {
      nPerMonth.set(row.monthIndex, (nPerMonth.get(row.monthIndex) ?? 0) + 1)
    }
  }

  // Truncate at minSurvivalMonths: cohort membership above guarantees every
  // member REACHES that index (max(monthIndex) >= minSurvivalMonths), so
  // this is the last index NOT subject to the survivorship artefact (a
  // later index is only reached by whichever members happened to run
  // longest, so a CPI change there reflects who is left, not a real trend).
  // "Reaches" is not "has a row at" — a paused-then-resumed ad can have a
  // gap row missing from an early index while still reaching a later one,
  // so per-point n can still vary within the truncated range (see the
  // "paused-then-resumed" test below). That composition drift is real and
  // visible on screen (the Ad-Months column), but it is a gap-month
  // artefact, not the survivorship artefact this truncation removes — the
  // two must not be confused when someone next looks at a wobbling n.
  // Filtering by month index rather than by "n equals cohort size" is what
  // keeps a gap-month ad from being wrongly dropped as if it had left the
  // cohort.
  const curve: MonthOfLifePoint[] = [...byMonthIndex.entries()]
    .filter(([monthIndex]) => monthIndex <= minSurvivalMonths)
    .sort(([a], [b]) => a - b)
    .map(([monthIndex, { spend, results }]) => ({
      monthIndex,
      n: nPerMonth.get(monthIndex) ?? 0,
      spend,
      results,
      cpi: results > 0 ? spend / results : null,
    }))

  return { minSurvivalMonths, n: cohortAdIds.length, curve }
}

// FR-27 — month-of-life cohort curves (Owner-facing). Restricts to ads that
// survived to each cohort's minimum-months threshold before showing a CPI
// trend, plus a simple single-month-vs-long-run comparison and the
// (unrelated, "alongside") frequency-vs-CPI diagnostic.
export function computeAdLifecycle(
  ads: AdRowForLifecycle[],
  frequencyRows: AdRowForFrequency[],
  cohortThresholds: number[] = [2, 3]
): AdLifecycleResult {
  const adRows = computeMonthOfLife(ads)

  const maxByAd = [...adRows.values()].map(rows => Math.max(...rows.map(r => r.monthIndex)))
  const distributionMap = new Map<number, number>()
  for (const m of maxByAd) distributionMap.set(m, (distributionMap.get(m) ?? 0) + 1)
  const maxMonthOfLifeDistribution = [...distributionMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([monthIndex, n]) => ({ monthIndex, n }))

  const cohorts = cohortThresholds.map(threshold => buildCurve(adRows, threshold))

  // Single-month ads (max month-of-life = 0) vs. ads spanning 4+ calendar
  // months (max month-of-life >= 3) — an overall (not per-month-index) CPI
  // comparison, mvp.md §4.5's simpler companion figure to the cohort curve.
  const singleMonthAdIds = [...adRows.entries()].filter(([, rows]) => Math.max(...rows.map(r => r.monthIndex)) === 0).map(([id]) => id)
  const longRunAdIds = [...adRows.entries()].filter(([, rows]) => Math.max(...rows.map(r => r.monthIndex)) >= 3).map(([id]) => id)

  const overallCpi = (adIds: string[]): number | null => {
    let spend = 0
    let results = 0
    for (const adId of adIds) {
      for (const row of adRows.get(adId)!) {
        spend += row.spend
        results += row.results
      }
    }
    return results > 0 ? spend / results : null
  }

  const singleMonthComparison: SingleMonthComparison = {
    singleMonth: { n: singleMonthAdIds.length, cpi: overallCpi(singleMonthAdIds) },
    longRun: { n: longRunAdIds.length, cpi: overallCpi(longRunAdIds), thresholdMonths: 4 },
  }

  const frequencyDiagnostic = computeFrequencyDiagnostic(frequencyRows)

  return { maxMonthOfLifeDistribution, cohorts, singleMonthComparison, frequencyDiagnostic }
}

// Frequency = Impressions/Reach (already computed and stored per row).
// Correlated against that same row's own CPI — restricted to messaging-ads
// rows (total_messaging_contacts > 0), the same "CPI" definition used
// everywhere else in this app (spend/messaging contacts). Mixing in
// non-messaging rows' Facebook-reported "Cost per result" would average
// together incomparable objectives (cost per reach, cost per link click,
// cost per messaging conversation) and can flip the correlation's sign —
// confirmed against the live DB: doing that gave rho=+0.51 on n=706, while
// restricting to messaging rows (n=482, matching mvp.md's reference figure
// exactly) gives the expected negative relationship.
function computeFrequencyDiagnostic(rows: AdRowForFrequency[]): FrequencyDiagnostic | null {
  const eligible = rows
    .filter(
      (r): r is { ad_id: string; frequency: number; amount_spent: number; total_messaging_contacts: number } =>
        r.frequency !== null && r.frequency > 0 && r.total_messaging_contacts !== null && r.total_messaging_contacts > 0
    )
    .map(r => ({ ad_id: r.ad_id, frequency: r.frequency, cost_per_result: r.amount_spent / r.total_messaging_contacts }))
  const n = eligible.length
  if (n < 3) return null

  const adCount = new Set(eligible.map(r => r.ad_id)).size
  const frequencies = eligible.map(r => r.frequency)
  const cpis = eligible.map(r => r.cost_per_result)
  const rankedFreq = rankArray(frequencies) as number[]
  const rankedCpi = rankArray(cpis) as number[]
  const rho = pearsonCorrelation(rankedFreq, rankedCpi)
  const t = Math.abs(rho) >= 1 ? Infinity : (rho * Math.sqrt(n - 2)) / Math.sqrt(1 - rho * rho)
  const p = Number.isFinite(t) ? studentTPValue(t, n - 2) : 0

  return { n, adCount, medianFrequency: median(frequencies), correlationWithCpi: { rho, p } }
}
