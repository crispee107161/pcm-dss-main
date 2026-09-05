import { describe, it, expect } from 'vitest'
import { computeAdLifecycle, type AdRowForLifecycle, type AdRowForFrequency } from './ad-lifecycle'
import { MESSAGING_RESULT_TYPE } from './ad-population-constants'

function row(overrides: Partial<AdRowForLifecycle> & { ad_id: string; reporting_starts: Date }): AdRowForLifecycle {
  return { amount_spent: 1000, total_messaging_contacts: 10, result_type: MESSAGING_RESULT_TYPE, ...overrides }
}

const d = (y: number, m: number) => new Date(Date.UTC(y, m, 1))

describe('computeAdLifecycle', () => {
  it('excludes non-messaging ads from the population entirely', () => {
    const ads: AdRowForLifecycle[] = [
      row({ ad_id: 'messaging', reporting_starts: d(2025, 0), total_messaging_contacts: 5 }),
      row({ ad_id: 'non-messaging', reporting_starts: d(2025, 0), total_messaging_contacts: null }),
      row({ ad_id: 'non-messaging', reporting_starts: d(2025, 1), total_messaging_contacts: null }),
    ]

    const result = computeAdLifecycle(ads, [], [2])

    const totalAds = result.maxMonthOfLifeDistribution.reduce((s, d) => s + d.n, 0)
    expect(totalAds).toBe(1)
  })

  it('computes month_of_life relative to each ad\'s own first month, not a calendar-wide origin', () => {
    // Ad A starts Jan 2025, Ad B starts Mar 2025 — both should register
    // month_of_life 0 in their own first month.
    const ads: AdRowForLifecycle[] = [
      row({ ad_id: 'A', reporting_starts: d(2025, 0) }), // Jan -> month_of_life 0
      row({ ad_id: 'A', reporting_starts: d(2025, 1) }), // Feb -> month_of_life 1
      row({ ad_id: 'B', reporting_starts: d(2025, 2) }), // Mar -> month_of_life 0
    ]

    const result = computeAdLifecycle(ads, [], [1])

    // Ad A survived to month_of_life 1 (cohort n=1), Ad B did not (max=0)
    const cohort = result.cohorts.find(c => c.minSurvivalMonths === 1)!
    expect(cohort.n).toBe(1)
  })

  it('sum-then-divides spend/results per month index, never averaging per-row CPI (ALG-09)', () => {
    const ads: AdRowForLifecycle[] = [
      row({ ad_id: 'A', reporting_starts: d(2025, 0), amount_spent: 500, total_messaging_contacts: 10 }),
      row({ ad_id: 'A', reporting_starts: d(2025, 1), amount_spent: 500, total_messaging_contacts: 10 }),
      row({ ad_id: 'B', reporting_starts: d(2025, 0), amount_spent: 300, total_messaging_contacts: 5 }),
      row({ ad_id: 'B', reporting_starts: d(2025, 1), amount_spent: 300, total_messaging_contacts: 5 }),
    ]

    const result = computeAdLifecycle(ads, [], [1])

    const cohort = result.cohorts.find(c => c.minSurvivalMonths === 1)!
    const month0 = cohort.curve.find(p => p.monthIndex === 0)!
    // spend = 500+300=800, results = 10+5=15, cpi = 800/15
    expect(month0.cpi).toBeCloseTo(800 / 15, 6)
  })

  // Raven's Analysis_Tab_Response_2026-9-6.md: 28 real rows carry a blank
  // result_type but real spend, on a month belonging to an otherwise-
  // messaging ad. That spend must not enter the CPI numerator for a month
  // that produced no messaging result — the ₱21.50-vs-₱21.39 discrepancy.
  it('excludes a non-messaging month\'s row entirely from an otherwise-messaging ad\'s curve', () => {
    const ads: AdRowForLifecycle[] = [
      row({ ad_id: 'A', reporting_starts: d(2025, 0), amount_spent: 500, total_messaging_contacts: 10 }),
      // Same ad, later month: blank result_type, real spend, no messaging result.
      row({
        ad_id: 'A',
        reporting_starts: d(2025, 1),
        amount_spent: 300,
        total_messaging_contacts: null,
        result_type: null,
      }),
    ]

    const result = computeAdLifecycle(ads, [], [1])

    // Ad A now has only ONE messaging row (month 0), so it never reaches the
    // "ran 2+ months" (minSurvivalMonths=1) cohort at all — the dropped row
    // must not count toward its survival either.
    const cohort = result.cohorts.find(c => c.minSurvivalMonths === 1)!
    expect(cohort.n).toBe(0)
    expect(cohort.curve.find(p => p.monthIndex === 1)).toBeUndefined()
  })

  // code-review-analyst (HIGH-2, 2026-09-06): an earlier version of this fix
  // zeroed a non-messaging row's spend/results but still pushed it into the
  // ad's row list, so a non-messaging row that happened to be an ad's
  // EARLIEST observed row became month-of-life index 0 (an always-empty
  // point), shifting every real messaging month's index by one. Pins the
  // fix: the non-messaging row is dropped before month-of-life indexing, so
  // month-of-life index 0 anchors on the ad's first MESSAGING row.
  it('anchors month-of-life on the first messaging row, not an earlier non-messaging one', () => {
    const ads: AdRowForLifecycle[] = [
      // Earliest row for this ad: non-messaging, real spend, would otherwise
      // become month-of-life index 0 if not dropped.
      row({
        ad_id: 'A',
        reporting_starts: d(2025, 0),
        amount_spent: 999,
        total_messaging_contacts: null,
        result_type: null,
      }),
      row({ ad_id: 'A', reporting_starts: d(2025, 1), amount_spent: 500, total_messaging_contacts: 10 }),
      row({ ad_id: 'A', reporting_starts: d(2025, 2), amount_spent: 300, total_messaging_contacts: 5 }),
    ]

    const result = computeAdLifecycle(ads, [], [1])

    const cohort = result.cohorts.find(c => c.minSurvivalMonths === 1)!
    expect(cohort.n).toBe(1)
    const month0 = cohort.curve.find(p => p.monthIndex === 0)!
    const month1 = cohort.curve.find(p => p.monthIndex === 1)!
    expect(month0.cpi).toBeCloseTo(500 / 10, 6)
    expect(month1.cpi).toBeCloseTo(300 / 5, 6)
    expect(cohort.curve.find(p => p.monthIndex === 2)).toBeUndefined()
  })

  it('returns null CPI (not 0 or Infinity) when a month index has zero results', () => {
    const ads: AdRowForLifecycle[] = [
      row({ ad_id: 'A', reporting_starts: d(2025, 0), total_messaging_contacts: 10 }),
      row({ ad_id: 'A', reporting_starts: d(2025, 1), total_messaging_contacts: 0 }),
    ]

    const result = computeAdLifecycle(ads, [], [1])

    const cohort = result.cohorts.find(c => c.minSurvivalMonths === 1)!
    const month1 = cohort.curve.find(p => p.monthIndex === 1)!
    expect(month1.cpi).toBeNull()
  })

  it('restricts each cohort to ads that survived to its own threshold (survivorship-bias guard)', () => {
    const ads: AdRowForLifecycle[] = [
      row({ ad_id: 'short', reporting_starts: d(2025, 0) }), // 1 month only
      row({ ad_id: 'long', reporting_starts: d(2025, 0) }),
      row({ ad_id: 'long', reporting_starts: d(2025, 1) }),
      row({ ad_id: 'long', reporting_starts: d(2025, 2) }),
    ]

    const result = computeAdLifecycle(ads, [], [2])

    const cohort = result.cohorts.find(c => c.minSurvivalMonths === 2)!
    expect(cohort.n).toBe(1) // only 'long' survived to month_of_life 2
  })

  it('truncates each cohort curve at its own survival threshold, dropping the ragged tail from longer-lived members', () => {
    const ads: AdRowForLifecycle[] = [
      // Both survive to month_of_life 2, satisfying the >=2 cohort.
      row({ ad_id: 'a', reporting_starts: d(2025, 0) }),
      row({ ad_id: 'a', reporting_starts: d(2025, 1) }),
      row({ ad_id: 'a', reporting_starts: d(2025, 2) }),
      row({ ad_id: 'b', reporting_starts: d(2025, 0) }),
      row({ ad_id: 'b', reporting_starts: d(2025, 1) }),
      row({ ad_id: 'b', reporting_starts: d(2025, 2) }),
      // 'b' alone runs a 4th month — a partial, survivorship-biased row
      // that must not appear in the >=2 cohort's curve.
      row({ ad_id: 'b', reporting_starts: d(2025, 3) }),
    ]

    const result = computeAdLifecycle(ads, [], [2])

    const cohort = result.cohorts.find(c => c.minSurvivalMonths === 2)!
    expect(cohort.curve.map(p => p.monthIndex)).toEqual([0, 1, 2])
    expect(cohort.curve.every(p => p.n === 2)).toBe(true)
  })

  it('truncates by month index reaching the threshold, not by n equalling cohort size, so a paused-then-resumed ad is not mistruncated', () => {
    const ads: AdRowForLifecycle[] = [
      row({ ad_id: 'steady', reporting_starts: d(2025, 0) }),
      row({ ad_id: 'steady', reporting_starts: d(2025, 1) }),
      row({ ad_id: 'steady', reporting_starts: d(2025, 2) }),
      // 'paused' has a gap at month_of_life 1 (no row that month), then
      // resumes and still reaches month_of_life 2 — n at index 1 is 1, not
      // 2, even though index 1 is within the guaranteed range.
      row({ ad_id: 'paused', reporting_starts: d(2025, 0) }),
      row({ ad_id: 'paused', reporting_starts: d(2025, 2) }),
    ]

    const result = computeAdLifecycle(ads, [], [2])

    const cohort = result.cohorts.find(c => c.minSurvivalMonths === 2)!
    // Both ads reached month_of_life 2, so both are cohort members and the
    // curve must still run through index 2 despite the gap at index 1.
    expect(cohort.n).toBe(2)
    expect(cohort.curve.map(p => p.monthIndex)).toEqual([0, 1, 2])
    const month1 = cohort.curve.find(p => p.monthIndex === 1)!
    expect(month1.n).toBe(1) // only 'steady' has a row at index 1
  })

  it('computes the single-month vs long-run (4+ months) overall CPI comparison', () => {
    const ads: AdRowForLifecycle[] = [
      row({ ad_id: 'single', reporting_starts: d(2025, 0), amount_spent: 100, total_messaging_contacts: 10 }),
      row({ ad_id: 'long', reporting_starts: d(2025, 0), amount_spent: 100, total_messaging_contacts: 5 }),
      row({ ad_id: 'long', reporting_starts: d(2025, 1), amount_spent: 100, total_messaging_contacts: 5 }),
      row({ ad_id: 'long', reporting_starts: d(2025, 2), amount_spent: 100, total_messaging_contacts: 5 }),
      row({ ad_id: 'long', reporting_starts: d(2025, 3), amount_spent: 100, total_messaging_contacts: 5 }),
    ]

    const result = computeAdLifecycle(ads, [])

    expect(result.singleMonthComparison.singleMonth.n).toBe(1)
    expect(result.singleMonthComparison.singleMonth.cpi).toBeCloseTo(10, 6)
    expect(result.singleMonthComparison.longRun.n).toBe(1)
    expect(result.singleMonthComparison.longRun.cpi).toBeCloseTo(400 / 20, 6)
  })

  it('computes the frequency-vs-CPI diagnostic from row-level frequency and spend/messaging-contacts', () => {
    const freqRows: AdRowForFrequency[] = Array.from({ length: 10 }, (_, i) => ({
      ad_id: `ad-${i}`,
      frequency: 1 + i * 0.2,
      amount_spent: 200 - i * 5, // falling spend
      total_messaging_contacts: 10, // constant messaging contacts -> falling CPI as frequency rises
    }))

    const result = computeAdLifecycle([], freqRows)

    expect(result.frequencyDiagnostic).not.toBeNull()
    expect(result.frequencyDiagnostic!.n).toBe(10)
    expect(result.frequencyDiagnostic!.adCount).toBe(10)
    expect(result.frequencyDiagnostic!.correlationWithCpi.rho).toBeLessThan(0) // rising freq, falling CPI
  })

  it('counts distinct advertisements separately from ad-month rows in the frequency diagnostic', () => {
    // Same two ads, three rows each (6 ad-month rows, 2 distinct ads) —
    // exercises the repeated-measures case the ad-month unit produces.
    const freqRows: AdRowForFrequency[] = ['a', 'b'].flatMap(adId =>
      Array.from({ length: 3 }, (_, i) => ({
        ad_id: adId,
        frequency: 1 + i * 0.3,
        amount_spent: 100,
        total_messaging_contacts: 10,
      }))
    )

    const result = computeAdLifecycle([], freqRows)

    expect(result.frequencyDiagnostic!.n).toBe(6)
    expect(result.frequencyDiagnostic!.adCount).toBe(2)
  })

  it('excludes non-messaging rows from the frequency diagnostic — mixing in a different "cost per result" objective would corrupt the correlation', () => {
    const freqRows: AdRowForFrequency[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        ad_id: `msg-${i}`,
        frequency: 1 + i * 0.2,
        amount_spent: 100,
        total_messaging_contacts: 10, // messaging row — eligible
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        ad_id: `other-${i}`,
        frequency: 1 + i * 0.2,
        amount_spent: 50,
        total_messaging_contacts: null, // non-messaging row (e.g. Reach-optimised) — must be excluded
      })),
    ]

    const result = computeAdLifecycle([], freqRows)

    expect(result.frequencyDiagnostic!.n).toBe(5)
  })

  it('returns a null frequencyDiagnostic when fewer than 3 rows qualify', () => {
    const result = computeAdLifecycle([], [{ ad_id: 'a', frequency: 1, amount_spent: 100, total_messaging_contacts: 10 }])
    expect(result.frequencyDiagnostic).toBeNull()
  })

  // Finding E (docs/raven/analysis-tab-memo-final.md): a messaging row with
  // no recorded reach (frequency null) must be counted as excluded, not
  // silently dropped from n with no trace — distinct from the non-messaging
  // rows above, which are excluded from the population entirely rather than
  // "excluded for lacking reach."
  it('counts messaging rows with no reach as excludedNoReach, separately from non-messaging rows', () => {
    const freqRows: AdRowForFrequency[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        ad_id: `msg-${i}`,
        frequency: 1 + i * 0.2,
        amount_spent: 100,
        total_messaging_contacts: 10,
      })),
      // messaging rows with no recorded reach (frequency null)
      { ad_id: 'no-reach-1', frequency: null, amount_spent: 50, total_messaging_contacts: 5 },
      { ad_id: 'no-reach-2', frequency: null, amount_spent: 50, total_messaging_contacts: 5 },
      // non-messaging row — excluded from the population, not counted as excludedNoReach
      { ad_id: 'other', frequency: 1, amount_spent: 50, total_messaging_contacts: null },
    ]

    const result = computeAdLifecycle([], freqRows)

    expect(result.frequencyDiagnostic!.n).toBe(5)
    expect(result.frequencyDiagnostic!.excludedNoFrequency).toBe(2)
  })

  // code-review-analyst (MEDIUM-1): the earlier test only covered
  // frequency: null. A stored 0 must count as excluded the same way, and
  // the footnote must not render (excludedNoFrequency === 0) when nothing
  // was actually dropped.
  it('counts a stored zero frequency as excluded, and reports zero when nothing is dropped', () => {
    const zeroFreqRows: AdRowForFrequency[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        ad_id: `msg-${i}`,
        frequency: 1 + i * 0.2,
        amount_spent: 100,
        total_messaging_contacts: 10,
      })),
      { ad_id: 'zero-freq', frequency: 0, amount_spent: 50, total_messaging_contacts: 5 },
    ]
    const withDrop = computeAdLifecycle([], zeroFreqRows)
    expect(withDrop.frequencyDiagnostic!.n).toBe(5)
    expect(withDrop.frequencyDiagnostic!.excludedNoFrequency).toBe(1)

    const cleanRows: AdRowForFrequency[] = Array.from({ length: 5 }, (_, i) => ({
      ad_id: `msg-${i}`,
      frequency: 1 + i * 0.2,
      amount_spent: 100,
      total_messaging_contacts: 10,
    }))
    const withoutDrop = computeAdLifecycle([], cleanRows)
    expect(withoutDrop.frequencyDiagnostic!.excludedNoFrequency).toBe(0)
  })
})
