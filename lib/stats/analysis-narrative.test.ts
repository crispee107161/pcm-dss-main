import { describe, it, expect } from 'vitest'
import {
  rankingOverlapSentence,
  viewsReachSentence,
  categoryDistributionSentence,
  categoryCoverageSentence,
  monthOfLifeSentence,
  correlationWithMethodSentence,
  frequencySentence,
  accuracySentence,
  residualSentence,
  predictorStabilitySentence,
  budgetReallocationFindingSentence,
} from './analysis-narrative'
import type { RankingComparisonResult } from './ranking-comparison'
import type { CategoryDistributionRow } from './category-distribution'
import type { CorrelationSelectionResult } from './correlation-selection'
import type { CohortCurve } from './ad-lifecycle'
import type { AccuracyPanel, ResidualDiagnostic, SpecificationComparison } from './fr31-regression'
import type { BudgetReallocationResult } from './budget-reallocation'

function ranking(overrides: Partial<RankingComparisonResult> = {}): RankingComparisonResult {
  return {
    n: 100,
    excludedNullViews: 0,
    rho: 0.1,
    p: 0.5,
    overlaps: [
      { k: 10, topCount: 73, overlapCount: 5, overlapFraction: 5 / 73 },
      { k: 20, topCount: 146, overlapCount: 20, overlapFraction: 20 / 146 },
    ],
    viewsReachRho: 0.95,
    viewsReachP: 0.001,
    ...overrides,
  }
}

describe('rankingOverlapSentence', () => {
  it('reports the top-10% overlap counts from live data', () => {
    const s = rankingOverlapSentence(ranking())
    expect(s).toContain('73')
    expect(s).toContain('5')
    expect(s).toContain('mostly not')
  })

  it('reports full agreement distinctly when overlap equals top count', () => {
    const s = rankingOverlapSentence(
      ranking({ overlaps: [{ k: 10, topCount: 10, overlapCount: 10, overlapFraction: 1 }] })
    )
    expect(s).toContain('almost exactly')
  })

  it('reports near-total (not exact) overlap as agreement, not "mostly not"', () => {
    const s = rankingOverlapSentence(
      ranking({ overlaps: [{ k: 10, topCount: 73, overlapCount: 70, overlapFraction: 70 / 73 }] })
    )
    expect(s).toContain('almost exactly')
    expect(s).not.toContain('mostly not')
  })
})

describe('viewsReachSentence', () => {
  it('describes a strong positive correlation as an audience-size measure', () => {
    expect(viewsReachSentence(ranking({ viewsReachRho: 0.95 }))).toContain('audience size')
  })

  it('does not claim "rises in step" for a strong NEGATIVE correlation', () => {
    const s = viewsReachSentence(ranking({ viewsReachRho: -0.95 }))
    expect(s).not.toContain('rises almost exactly in step')
    expect(s).toContain('falls almost exactly in step')
  })

  it('describes a weak correlation as loosely related', () => {
    expect(viewsReachSentence(ranking({ viewsReachRho: 0.1 }))).toContain('loosely related')
  })
})

function categoryRow(overrides: Partial<CategoryDistributionRow>): CategoryDistributionRow {
  return {
    category: 'PRODUCT_SHOWCASE',
    n: 10,
    views: { median: 100, q1: 50, q3: 150 },
    engagementRate: { median: 1, q1: 0.5, q3: 1.5 },
    ...overrides,
  }
}

describe('categoryDistributionSentence', () => {
  it('excludes UNCLEAR from best/worst the same way it excludes UNCLASSIFIED', () => {
    const rows: CategoryDistributionRow[] = [
      categoryRow({ category: 'UNCLEAR', n: 18, engagementRate: { median: 99, q1: 90, q3: 99 } }), // would win on a pure sort
      categoryRow({ category: 'ENTERTAINMENT', n: 23, engagementRate: { median: 0.98, q1: 0.5, q3: 1.5 } }),
      categoryRow({ category: 'TESTIMONIAL', n: 15, engagementRate: { median: 0.52, q1: 0.3, q3: 0.7 } }),
    ]
    const s = categoryDistributionSentence(rows)
    expect(s).not.toBeNull()
    expect(s).not.toContain('Unclear')
    expect(s).toContain('Entertainment')
    expect(s).toContain('Testimonial')
  })

  it('returns null when fewer than 2 real categories are eligible', () => {
    const rows: CategoryDistributionRow[] = [categoryRow({ category: 'ENTERTAINMENT', n: 5 })]
    expect(categoryDistributionSentence(rows)).toBeNull()
  })

  it('reports a tie instead of an arbitrary best/worst when medians are equal', () => {
    const rows: CategoryDistributionRow[] = [
      categoryRow({ category: 'ENTERTAINMENT', n: 5, engagementRate: { median: 1, q1: 1, q3: 1 } }),
      categoryRow({ category: 'TESTIMONIAL', n: 5, engagementRate: { median: 1, q1: 1, q3: 1 } }),
    ]
    const s = categoryDistributionSentence(rows)
    expect(s).toContain('similar')
  })
})

describe('categoryCoverageSentence', () => {
  it('reports both uncategorised and no-category counts when both are present', () => {
    const rows: CategoryDistributionRow[] = [
      categoryRow({ category: 'UNCLASSIFIED', n: 12 }),
      categoryRow({ category: 'UNCLEAR', n: 18 }),
    ]
    const s = categoryCoverageSentence(rows)
    expect(s).toContain('12')
    expect(s).toContain('18')
    expect(s).toContain('both excluded')
  })

  it('does not say "both" when only one bucket is non-empty', () => {
    const rows: CategoryDistributionRow[] = [categoryRow({ category: 'UNCLEAR', n: 18 })]
    const s = categoryCoverageSentence(rows)
    expect(s).toContain('18')
    expect(s).not.toContain('both')
  })

  it('returns null once nothing remains uncategorised or unclear', () => {
    const rows: CategoryDistributionRow[] = [categoryRow({ category: 'PRODUCT_SHOWCASE', n: 100 })]
    expect(categoryCoverageSentence(rows)).toBeNull()
  })
})

function cohort(overrides: Partial<CohortCurve>): CohortCurve {
  return {
    minSurvivalMonths: 2,
    n: 123,
    curve: [
      { monthIndex: 0, n: 123, spend: 100, results: 10, cpi: 15.66 },
      { monthIndex: 1, n: 123, spend: 100, results: 10, cpi: 15.37 },
      { monthIndex: 2, n: 123, spend: 100, results: 10, cpi: 13.64 },
    ],
    ...overrides,
  }
}

describe('monthOfLifeSentence', () => {
  it('reports a falling CPI as advertisements not getting more expensive', () => {
    const s = monthOfLifeSentence([cohort({})])
    expect(s).toContain('do not get more expensive')
    expect(s).toContain('₱15.66')
    expect(s).toContain('₱13.64')
  })

  it('reports a rising CPI as advertisements getting more expensive', () => {
    const rising = cohort({
      curve: [
        { monthIndex: 0, n: 50, spend: 100, results: 10, cpi: 10 },
        { monthIndex: 1, n: 50, spend: 100, results: 10, cpi: 12 },
      ],
    })
    expect(monthOfLifeSentence([rising])).toContain('get more expensive')
  })

  it('prefers the most inclusive (smallest threshold) cohort over a stricter subset', () => {
    const loose = cohort({ minSurvivalMonths: 2 }) // n=123, ₱15.66 -> ₱13.64
    const strict = cohort({
      minSurvivalMonths: 3,
      curve: [
        { monthIndex: 0, n: 59, spend: 100, results: 10, cpi: 20 },
        { monthIndex: 3, n: 59, spend: 100, results: 10, cpi: 18 },
      ],
    })
    const s = monthOfLifeSentence([loose, strict])
    expect(s).toContain('₱15.66')
    expect(s).not.toContain('₱20.00')
  })
})

function correlation(overrides: Partial<CorrelationSelectionResult> = {}): CorrelationSelectionResult {
  return {
    n: 108,
    method: 'SPEARMAN',
    coefficient: -0.2,
    p: 0.03,
    shapiroX: { W: 0.9, p: 0.01, isNormal: false },
    shapiroY: { W: 0.9, p: 0.02, isNormal: false },
    ...overrides,
  }
}

describe('correlationWithMethodSentence', () => {
  it('names the rank-based method when normality fails', () => {
    expect(correlationWithMethodSentence(correlation())).toContain('rank-based method')
  })

  it('names a standard correlation when both variables pass normality', () => {
    const s = correlationWithMethodSentence(
      correlation({ shapiroX: { W: 0.99, p: 0.9, isNormal: true }, shapiroY: { W: 0.99, p: 0.9, isNormal: true } })
    )
    expect(s).toContain('standard correlation')
  })

  it('reports no relationship for a negligible coefficient', () => {
    expect(correlationWithMethodSentence(correlation({ coefficient: 0.05 }))).toContain('is not related to')
  })

  it('hedges with "though...weak" only for a weak relationship, not moderate or strong', () => {
    expect(correlationWithMethodSentence(correlation({ coefficient: -0.3 }))).toContain('though the relationship is weak')
    expect(correlationWithMethodSentence(correlation({ coefficient: -0.5 }))).not.toContain('though')
    expect(correlationWithMethodSentence(correlation({ coefficient: -0.8 }))).not.toContain('though')
  })
})

describe('frequencySentence', () => {
  it('never gives advice on a negative (falling-CPI) relationship', () => {
    const s = frequencySentence(-0.24, 0.001)
    expect(s).not.toMatch(/retiring|early|costing|saving/i)
    expect(s).toContain('does not rise')
  })

  it('stays descriptive on a positive (rising-CPI) relationship', () => {
    expect(frequencySentence(0.3, 0.01)).toContain('tends to rise')
  })

  it('reports no clear relationship when not significant', () => {
    expect(frequencySentence(-0.3, 0.2)).toContain('not clearly related')
  })
})

function accuracy(overrides: Partial<AccuracyPanel> = {}): AccuracyPanel {
  return {
    inSample: { mae: 4, rmse: 6, mape: 15, rSquared: 0.4 },
    crossValidated: { mae: 4.19, rmse: 6.5, mape: 19.3, rSquared: 0.38, folds: 10, seed: 42, foldSizes: [] },
    baselineMedian: { mae: 5.86, rmse: 8, mape: 27.1, rSquared: null },
    medianCpi: 13,
    maeImprovementVsBaseline: 0.285,
    ...overrides,
  }
}

describe('accuracySentence', () => {
  it('reports the MAE improvement over the baseline as a percentage', () => {
    expect(accuracySentence(accuracy())).toContain('28.5')
  })

  it('states plainly, without a negative percentage, when the model does not beat the baseline', () => {
    const s = accuracySentence(accuracy({ maeImprovementVsBaseline: -0.05 }))
    expect(s).not.toMatch(/-\d/)
    expect(s).toContain('not more accurate')
  })
})

describe('residualSentence', () => {
  it('names the flagged count, threshold, and combined spend', () => {
    const diagnostic: ResidualDiagnostic = {
      threshold: 1.5,
      rows: [],
      flagged: [],
      flaggedCount: 2,
      flaggedTotalSpend: 3087,
      caption: '',
    }
    const s = residualSentence(diagnostic)
    expect(s).toContain('2 advertisements')
    expect(s).toContain('1.5')
    expect(s).toContain('₱3,087')
  })

  it('uses singular grammar for exactly one flagged advertisement', () => {
    const diagnostic: ResidualDiagnostic = { threshold: 1.5, rows: [], flagged: [], flaggedCount: 1, flaggedTotalSpend: 1500, caption: '' }
    const s = residualSentence(diagnostic)
    expect(s).toContain('1 advertisement costs')
    expect(s).not.toContain('advertisements')
    expect(s).not.toContain('their own')
    expect(s).not.toContain('between them')
  })

  it('states plainly when nothing is flagged', () => {
    const diagnostic: ResidualDiagnostic = { threshold: 1.5, rows: [], flagged: [], flaggedCount: 0, flaggedTotalSpend: 0, caption: '' }
    expect(residualSentence(diagnostic)).toContain('No advertisements')
  })
})

describe('predictorStabilitySentence', () => {
  function comp(overrides: Partial<SpecificationComparison>): SpecificationComparison {
    return {
      predictor: 'cpm',
      primaryCoefficient: 1,
      secondaryCoefficient: 1,
      signFlip: false,
      robustSignificantPrimary: true,
      robustSignificantSecondary: true,
      stable: true,
      note: '',
      ...overrides,
    }
  }

  it('names both stable and unstable predictors when the set is mixed', () => {
    const s = predictorStabilitySentence([
      comp({ predictor: 'cpm', stable: true }),
      comp({ predictor: 'ctr', stable: true }),
      comp({ predictor: 'engagement_rate', stable: false }),
      comp({ predictor: 'frequency', stable: false }),
    ])
    expect(s).toContain('CPM')
    expect(s).toContain('CTR')
    expect(s).toContain('Engagement Rate')
    expect(s).toContain('Frequency')
    expect(s).toContain('none of them')
  })

  // The exact bug code-review-analyst caught: with one unstable predictor,
  // the sentence used to read "...so it CAN be relied on" — the opposite of
  // the finding, on the one element Raven called the most defensible thing
  // on the screen (§10, the NOT ROBUST badges).
  it('negates correctly when exactly one predictor is unstable', () => {
    const s = predictorStabilitySentence([
      comp({ predictor: 'cpm', stable: true }),
      comp({ predictor: 'ctr', stable: true }),
      comp({ predictor: 'engagement_rate', stable: true }),
      comp({ predictor: 'frequency', stable: false }),
    ])
    expect(s).toContain('so it cannot be relied on')
    expect(s).not.toContain('so it can be relied on')
  })

  it('joins three or more predictors with a serial comma, not repeated "and"', () => {
    const s = predictorStabilitySentence([
      comp({ predictor: 'cpm', stable: false }),
      comp({ predictor: 'ctr', stable: false }),
      comp({ predictor: 'frequency', stable: false }),
      comp({ predictor: 'engagement_rate', stable: false }),
    ])
    expect(s).not.toMatch(/and \w+ and/)
  })

  it('returns null when there is nothing to compare', () => {
    expect(predictorStabilitySentence(null)).toBeNull()
  })
})

function budgetReallocation(overrides: Partial<BudgetReallocationResult> = {}): BudgetReallocationResult {
  return {
    minSpendThreshold: 1000,
    n: 108,
    quartiles: [
      { quartile: 1, n: 27, spend: 318933, inquiries: 27045, cpi: 11.79 },
      { quartile: 2, n: 27, spend: 0, inquiries: 0, cpi: 0 },
      { quartile: 3, n: 27, spend: 0, inquiries: 0, cpi: 0 },
      { quartile: 4, n: 27, spend: 59745, inquiries: 1988, cpi: 30.05 },
    ],
    q1Cpi: 11.79,
    q4Spend: 59745,
    q4Inquiries: 1988,
    q4Ads: [],
    counterfactualInquiries: 5067,
    additionalInquiries: 3079,
    ...overrides,
  }
}

describe('budgetReallocationFindingSentence', () => {
  it('states the Q1/Q4 CPI comparison and the multiplier in plain language', () => {
    const s = budgetReallocationFindingSentence(budgetReallocation())
    expect(s).toContain('27 most efficient advertisements')
    expect(s).toContain('27 least efficient advertisements')
    expect(s).not.toMatch(/\bn\s*=/)
  })

  it('states the study period rather than a hardcoded month count', () => {
    const s = budgetReallocationFindingSentence(budgetReallocation())
    expect(s).toContain('spent real money over the same period (')
    expect(s).not.toContain('twelve months')
  })

  it('uses singular phrasing for a one-ad quartile instead of "The 1 most efficient advertisement"', () => {
    const s = budgetReallocationFindingSentence(
      budgetReallocation({
        quartiles: [
          { quartile: 1, n: 1, spend: 1000, inquiries: 100, cpi: 10 },
          { quartile: 2, n: 1, spend: 0, inquiries: 0, cpi: 0 },
          { quartile: 3, n: 1, spend: 0, inquiries: 0, cpi: 0 },
          { quartile: 4, n: 1, spend: 2000, inquiries: 50, cpi: 40 },
        ],
      })
    )
    expect(s).toContain('The single most efficient advertisement')
    expect(s).toContain('The single least efficient advertisement')
    expect(s).not.toMatch(/The 1 /)
  })

  it('drops the multiplier clause when Q1 and Q4 are near parity instead of saying "1 times as much"', () => {
    const s = budgetReallocationFindingSentence(
      budgetReallocation({
        quartiles: [
          { quartile: 1, n: 27, spend: 27000, inquiries: 2700, cpi: 10 },
          { quartile: 2, n: 27, spend: 0, inquiries: 0, cpi: 0 },
          { quartile: 3, n: 27, spend: 0, inquiries: 0, cpi: 0 },
          { quartile: 4, n: 27, spend: 27000, inquiries: 2500, cpi: 10.8 },
        ],
      })
    )
    expect(s).toContain('for about the same result')
    expect(s).not.toMatch(/1 times as much/)
  })

  it('rounds the multiplier to the nearest half rather than showing raw precision', () => {
    const s = budgetReallocationFindingSentence(
      budgetReallocation({
        quartiles: [
          { quartile: 1, n: 27, spend: 27000, inquiries: 2700, cpi: 10 },
          { quartile: 2, n: 27, spend: 0, inquiries: 0, cpi: 0 },
          { quartile: 3, n: 27, spend: 0, inquiries: 0, cpi: 0 },
          { quartile: 4, n: 27, spend: 27000, inquiries: 1080, cpi: 25 },
        ],
      })
    )
    expect(s).toContain('2.5 times as much')
  })

  it('says "twice" for a ratio close to two rather than a decimal', () => {
    const s = budgetReallocationFindingSentence(
      budgetReallocation({
        quartiles: [
          { quartile: 1, n: 27, spend: 27000, inquiries: 2700, cpi: 10 },
          { quartile: 2, n: 27, spend: 0, inquiries: 0, cpi: 0 },
          { quartile: 3, n: 27, spend: 0, inquiries: 0, cpi: 0 },
          { quartile: 4, n: 27, spend: 27000, inquiries: 1350, cpi: 20 },
        ],
      })
    )
    expect(s).toContain('twice as much')
  })

  it('returns null when a quartile has no eligible ads', () => {
    expect(
      budgetReallocationFindingSentence(
        budgetReallocation({
          quartiles: [
            { quartile: 1, n: 0, spend: 0, inquiries: 0, cpi: 0 },
            { quartile: 2, n: 0, spend: 0, inquiries: 0, cpi: 0 },
            { quartile: 3, n: 0, spend: 0, inquiries: 0, cpi: 0 },
            { quartile: 4, n: 0, spend: 0, inquiries: 0, cpi: 0 },
          ],
        })
      )
    ).toBeNull()
  })
})
