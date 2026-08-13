import { describe, it, expect } from 'vitest'
import { computeAdLifecycle, type AdRowForLifecycle, type AdRowForFrequency } from './ad-lifecycle'

function row(overrides: Partial<AdRowForLifecycle> & { ad_id: string; reporting_starts: Date }): AdRowForLifecycle {
  return { amount_spent: 1000, total_messaging_contacts: 10, ...overrides }
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
      frequency: 1 + i * 0.2,
      amount_spent: 200 - i * 5, // falling spend
      total_messaging_contacts: 10, // constant messaging contacts -> falling CPI as frequency rises
    }))

    const result = computeAdLifecycle([], freqRows)

    expect(result.frequencyDiagnostic).not.toBeNull()
    expect(result.frequencyDiagnostic!.n).toBe(10)
    expect(result.frequencyDiagnostic!.correlationWithCpi.rho).toBeLessThan(0) // rising freq, falling CPI
  })

  it('excludes non-messaging rows from the frequency diagnostic — mixing in a different "cost per result" objective would corrupt the correlation', () => {
    const freqRows: AdRowForFrequency[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        frequency: 1 + i * 0.2,
        amount_spent: 100,
        total_messaging_contacts: 10, // messaging row — eligible
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        frequency: 1 + i * 0.2,
        amount_spent: 50,
        total_messaging_contacts: null, // non-messaging row (e.g. Reach-optimised) — must be excluded
      })),
    ]

    const result = computeAdLifecycle([], freqRows)

    expect(result.frequencyDiagnostic!.n).toBe(5)
  })

  it('returns a null frequencyDiagnostic when fewer than 3 rows qualify', () => {
    const result = computeAdLifecycle([], [{ frequency: 1, amount_spent: 100, total_messaging_contacts: 10 }])
    expect(result.frequencyDiagnostic).toBeNull()
  })
})
