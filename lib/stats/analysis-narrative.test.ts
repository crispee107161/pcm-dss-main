import { describe, it, expect } from 'vitest'
import {
  rankingOverlapSentence,
  viewsReachSentence,
  categorySignificanceSentence,
  categoryCoverageSentence,
  monthOfLifeSentence,
  correlationWithMethodSentence,
  frequencySentence,
  accuracySentence,
  residualSentence,
  predictorStabilitySentence,
  budgetReallocationFindingSentence,
  sameGroupingsSentence,
  rankingsFindingSentence,
} from './analysis-narrative'
import type { RankingComparisonResult } from './ranking-comparison'
import type { CategoryDistributionRow } from './category-distribution'
import type { CategorySignificanceResult, PairwiseComparison } from './category-significance'
import type { CategoryLabel } from '@/app/generated/prisma/client'
import type { CorrelationSelectionResult } from './correlation-selection'
import type { CohortCurve } from './ad-lifecycle'
import type { AccuracyPanel, ResidualDiagnostic, SpecificationComparison } from './fr31-regression'
import type { BudgetReallocationResult } from './budget-reallocation'
import type { GroupRankingRow } from './ad-set-ranking'

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

function pairwise(a: CategoryLabel, b: CategoryLabel, overrides: Partial<PairwiseComparison> = {}): PairwiseComparison {
  return { a, b, rawP: 0.5, adjustedP: 0.5, significant: false, ...overrides }
}

function significance(pairs: PairwiseComparison[], overrides: Partial<CategorySignificanceResult> = {}): CategorySignificanceResult {
  return { n: 100, groups: [], h: 1, df: 1, p: 0.5, significant: false, pairwise: pairs, ...overrides }
}

describe('categorySignificanceSentence', () => {
  it('excludes UNCLEAR from the comparison the same way it excludes UNCLASSIFIED', () => {
    const rows: CategoryDistributionRow[] = [
      categoryRow({ category: 'UNCLEAR', n: 18, engagementRate: { median: 99, q1: 90, q3: 99 } }), // would win on a pure sort
      categoryRow({ category: 'ENTERTAINMENT', n: 23, engagementRate: { median: 0.98, q1: 0.5, q3: 1.5 } }),
      categoryRow({ category: 'TESTIMONIAL', n: 15, engagementRate: { median: 0.52, q1: 0.3, q3: 0.7 } }),
    ]
    const sig = significance([pairwise('ENTERTAINMENT', 'TESTIMONIAL', { significant: true })], { significant: true })
    const s = categorySignificanceSentence(rows, sig)
    expect(s).not.toBeNull()
    expect(s).not.toContain('Unclear')
    expect(s).toContain('Entertainment')
    expect(s).toContain('Testimonial')
  })

  it('returns null when fewer than 2 real categories are eligible', () => {
    const rows: CategoryDistributionRow[] = [categoryRow({ category: 'ENTERTAINMENT', n: 5 })]
    expect(categorySignificanceSentence(rows, null)).toBeNull()
  })

  it('reports "not distinguishable," not "equal," when no pairwise comparison is significant', () => {
    const rows: CategoryDistributionRow[] = [
      categoryRow({ category: 'ENTERTAINMENT', n: 5, engagementRate: { median: 0.82, q1: 0.5, q3: 1 } }),
      categoryRow({ category: 'TESTIMONIAL', n: 5, engagementRate: { median: 0.51, q1: 0.3, q3: 0.7 } }),
    ]
    const sig = significance([pairwise('ENTERTAINMENT', 'TESTIMONIAL', { significant: false })])
    const s = categorySignificanceSentence(rows, sig)
    expect(s).toContain('not')
    expect(s).toContain('distinguishable')
  })

  it('reports a tie as "similar" when medians are exactly equal and nothing is significant', () => {
    const rows: CategoryDistributionRow[] = [
      categoryRow({ category: 'ENTERTAINMENT', n: 5, engagementRate: { median: 1, q1: 1, q3: 1 } }),
      categoryRow({ category: 'TESTIMONIAL', n: 5, engagementRate: { median: 1, q1: 1, q3: 1 } }),
    ]
    const sig = significance([pairwise('ENTERTAINMENT', 'TESTIMONIAL', { significant: false })])
    const s = categorySignificanceSentence(rows, sig)
    expect(s).toContain('similar')
  })

  // Finding L §1.3's proposed shape: name the lower category specifically,
  // and state the rest are not distinguishable rather than silently omitting
  // them.
  it('names the significantly lower category against the ones it is distinguishable from', () => {
    const rows: CategoryDistributionRow[] = [
      categoryRow({ category: 'ENTERTAINMENT', n: 65, engagementRate: { median: 0.82, q1: 0.5, q3: 1.2 } }),
      categoryRow({ category: 'PRODUCT_SHOWCASE', n: 238, engagementRate: { median: 0.71, q1: 0.4, q3: 1 } }),
      categoryRow({ category: 'PROMOTIONAL_OFFER', n: 29, engagementRate: { median: 0.71, q1: 0.4, q3: 1 } }),
      categoryRow({ category: 'TESTIMONIAL', n: 156, engagementRate: { median: 0.51, q1: 0.3, q3: 0.7 } }),
    ]
    const sig = significance(
      [
        pairwise('ENTERTAINMENT', 'TESTIMONIAL', { significant: false }),
        pairwise('ENTERTAINMENT', 'PRODUCT_SHOWCASE', { significant: false }),
        pairwise('ENTERTAINMENT', 'PROMOTIONAL_OFFER', { significant: false }),
        pairwise('PRODUCT_SHOWCASE', 'TESTIMONIAL', { significant: true }),
        pairwise('PRODUCT_SHOWCASE', 'PROMOTIONAL_OFFER', { significant: false }),
        pairwise('TESTIMONIAL', 'PROMOTIONAL_OFFER', { significant: false }),
      ],
      { significant: true }
    )
    const s = categorySignificanceSentence(rows, sig)
    expect(s).toContain('Testimonial posts earn a significantly lower rate than Product Showcase posts')
    expect(s).toContain('not distinguishable from one another at this sample size')
  })

  it('does not append the "other categories" clause when every category is covered by some significant pair', () => {
    const rows: CategoryDistributionRow[] = [
      categoryRow({ category: 'ENTERTAINMENT', n: 5, engagementRate: { median: 1, q1: 1, q3: 1 } }),
      categoryRow({ category: 'TESTIMONIAL', n: 5, engagementRate: { median: 0.5, q1: 0.3, q3: 0.7 } }),
    ]
    const sig = significance([pairwise('ENTERTAINMENT', 'TESTIMONIAL', { significant: true })], { significant: true })
    const s = categorySignificanceSentence(rows, sig)
    expect(s).not.toContain('not distinguishable from one another')
  })

  // Finding D (docs/raven/analysis-tab-memo-final.md): the count must be
  // the total across every REAL category, including one too small (n<3) to
  // be part of the test — and must still exclude UNCLASSIFIED/UNCLEAR.
  it('counts every real category toward the total, including one too small for the test, but excludes UNCLASSIFIED/UNCLEAR', () => {
    const rows: CategoryDistributionRow[] = [
      categoryRow({ category: 'ENTERTAINMENT', n: 23, engagementRate: { median: 0.98, q1: 0.5, q3: 1.5 } }),
      categoryRow({ category: 'TESTIMONIAL', n: 15, engagementRate: { median: 0.52, q1: 0.3, q3: 0.7 } }),
      categoryRow({ category: 'PRODUCT_SHOWCASE', n: 2, engagementRate: { median: 0.7, q1: 0.5, q3: 0.9 } }), // n<3, excluded from the test only
      categoryRow({ category: 'UNCLEAR', n: 18 }),
    ]
    const sig = significance([pairwise('ENTERTAINMENT', 'TESTIMONIAL', { significant: false })])
    const s = categorySignificanceSentence(rows, sig)
    expect(s).toContain('Across 40 categorised posts') // 23 + 15 + 2, not the 18 UNCLEAR
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
    const s = monthOfLifeSentence([cohort({})], 187)
    expect(s).toContain('do not get more expensive')
    expect(s).toContain('₱15.66')
    expect(s).toContain('₱13.64')
    expect(s).toContain('187')
  })

  it('reports a rising CPI as advertisements getting more expensive', () => {
    const rising = cohort({
      curve: [
        { monthIndex: 0, n: 50, spend: 100, results: 10, cpi: 10 },
        { monthIndex: 1, n: 50, spend: 100, results: 10, cpi: 12 },
      ],
    })
    expect(monthOfLifeSentence([rising], 50)).toContain('get more expensive')
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
    const s = monthOfLifeSentence([loose, strict], 123)
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
    const s = frequencySentence(-0.24, 0.001, 482, 187)
    expect(s).not.toMatch(/retiring|early|costing|saving/i)
    expect(s).toContain('does not rise')
    expect(s).toContain('482')
    expect(s).toContain('187')
  })

  it('stays descriptive on a positive (rising-CPI) relationship', () => {
    expect(frequencySentence(0.3, 0.01, 482, 187)).toContain('tends to rise')
  })

  it('reports no clear relationship when not significant', () => {
    expect(frequencySentence(-0.3, 0.2, 482, 187)).toContain('not clearly related')
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
    expect(accuracySentence(accuracy(), 108)).toContain('28.5')
  })

  it('states plainly, without a negative percentage, when the model does not beat the baseline', () => {
    const s = accuracySentence(accuracy({ maeImprovementVsBaseline: -0.05 }), 108)
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
    ], 108, 187)
    expect(s).toContain('CPM')
    expect(s).toContain('CTR')
    expect(s).toContain('Engagement Rate')
    expect(s).toContain('Frequency')
    expect(s).toContain('neither can')
    expect(s).toContain('108')
    expect(s).toContain('187')
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
    ], 108, 187)
    expect(s).toContain('so it cannot be relied on')
    expect(s).not.toContain('so it can be relied on')
  })

  it('joins three or more predictors with a serial comma, not repeated "and"', () => {
    const s = predictorStabilitySentence([
      comp({ predictor: 'cpm', stable: false }),
      comp({ predictor: 'ctr', stable: false }),
      comp({ predictor: 'frequency', stable: false }),
      comp({ predictor: 'engagement_rate', stable: false }),
    ], 108, 187)
    expect(s).not.toMatch(/and \w+ and/)
  })

  it('returns null when there is nothing to compare', () => {
    expect(predictorStabilitySentence(null, 108, 187)).toBeNull()
  })

  // Finding F (docs/raven/analysis-tab-memo-final.md): the live data has
  // engagement_rate reverse sign (-0.6511 -> +0.6060) but frequency stay
  // negative in both specs while losing HC3 significance (-0.2083 ->
  // -0.3561) — a "changes direction" claim for both would be wrong for
  // frequency. The sentence must only claim a reversal for the predictor
  // that actually reverses.
  it('only claims a direction reversal for the predictor that actually flips sign', () => {
    const s = predictorStabilitySentence([
      comp({ predictor: 'ctr', stable: true }),
      comp({ predictor: 'cpm', stable: true }),
      comp({ predictor: 'engagement_rate', stable: false, signFlip: true }),
      comp({ predictor: 'frequency', stable: false, signFlip: false }),
    ], 108, 187)
    expect(s).toContain('Engagement Rate reverses direction')
    expect(s).toContain('Frequency changes in strength')
    expect(s).not.toContain('Frequency reverses direction')
    expect(s).toContain('neither can be relied on')
  })

  it('uses "none of them" only when three or more predictors are unstable', () => {
    const s = predictorStabilitySentence([
      comp({ predictor: 'ctr', stable: false, signFlip: false }),
      comp({ predictor: 'cpm', stable: false, signFlip: false }),
      comp({ predictor: 'engagement_rate', stable: false, signFlip: true }),
      comp({ predictor: 'frequency', stable: true }),
    ], 108, 187)
    expect(s).toContain('none of them can be relied on')
  })

  // code-review-analyst (HIGH-1): "!stable && !signFlip" used to be treated
  // as one bucket ("changes in strength"), which is false for a predictor
  // that was never significant in EITHER specification — nothing about it
  // changed, it just never showed an association to begin with.
  it('says "not clearly associated" rather than "changes in strength" for a predictor significant in neither spec', () => {
    const s = predictorStabilitySentence([
      comp({ predictor: 'cpm', stable: true }),
      comp({ predictor: 'ctr', stable: true }),
      comp({
        predictor: 'frequency',
        stable: false,
        signFlip: false,
        robustSignificantPrimary: false,
        robustSignificantSecondary: false,
      }),
    ], 108, 187)
    expect(s).toContain('Frequency is not clearly associated with cost per inquiry in either selection')
    expect(s).not.toContain('Frequency changes in strength')
  })

  it('names the count of advertisements in both specifications, not just the spend-filtered one', () => {
    const s = predictorStabilitySentence([
      comp({ predictor: 'cpm', stable: false, signFlip: false }),
    ], 108, 187)
    expect(s).toContain('108 advertisements at or above the spend threshold')
    expect(s).toContain('187')
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

describe('sameGroupingsSentence', () => {
  it('states the one-to-one fact plainly when every campaign has exactly one ad set', () => {
    const s = sameGroupingsSentence({ allOneToOne: true, multiAdSetCampaignCount: 0 })
    expect(s).toContain('exactly one ad set')
    expect(s).toContain('same advertisements under different names')
  })

  it('names the count and switches to the "differ" wording when some campaigns have more than one ad set', () => {
    const s = sameGroupingsSentence({ allOneToOne: false, multiAdSetCampaignCount: 3 })
    expect(s).toContain('3 campaigns contain more than one ad set')
    expect(s).toContain('the two groupings differ')
  })

  it('uses singular grammar for exactly one affected campaign', () => {
    const s = sameGroupingsSentence({ allOneToOne: false, multiAdSetCampaignCount: 1 })
    expect(s).toContain('1 campaign contains more than one ad set')
    expect(s).not.toContain('1 campaigns')
  })
})

function groupRow(overrides: Partial<GroupRankingRow> & { id: string }): GroupRankingRow {
  return {
    name: overrides.id,
    adCount: 5,
    spend: 1000,
    inquiries: 100,
    cpi: 10,
    lowConfidence: false,
    ...overrides,
  }
}

describe('rankingsFindingSentence', () => {
  it('names the most and least efficient group by CPI, and the group count that recorded conversations', () => {
    const rows = [
      groupRow({ id: 'a', cpi: 12 }),
      groupRow({ id: 'b', cpi: 26 }),
      groupRow({ id: 'c', cpi: 18 }),
    ]
    const s = rankingsFindingSentence(rows, 'ad set')
    expect(s).toContain('₱12')
    expect(s).toContain('₱26')
    expect(s).toContain('3 ad sets')
  })

  it('excludes zero-conversion groups (null CPI) from the count', () => {
    const rows = [
      groupRow({ id: 'a', cpi: 12 }),
      groupRow({ id: 'b', cpi: 26 }),
      groupRow({ id: 'c', cpi: null }),
    ]
    const s = rankingsFindingSentence(rows, 'campaign')
    expect(s).toContain('2 campaigns')
  })

  it('returns null when fewer than two groups have a CPI to compare', () => {
    expect(rankingsFindingSentence([groupRow({ id: 'a', cpi: 12 })], 'ad set')).toBeNull()
    expect(rankingsFindingSentence([], 'ad set')).toBeNull()
  })
})
