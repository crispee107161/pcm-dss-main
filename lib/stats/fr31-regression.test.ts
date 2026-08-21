import { describe, it, expect } from 'vitest'
import primaryFixture from './__fixtures__/fr31-primary-108.json'
import secondaryFixture from './__fixtures__/fr31-secondary-187.json'
import rawAdsFixture from './__fixtures__/fr31-raw-ads.json'
import {
  FR31_PREDICTORS,
  FR31_MIN_N,
  FR31_MIN_SPEND_PHP,
  buildRegressionDataset,
  fitFr31Regression,
  fitFr31BothSpecifications,
  compareSpecifications,
  computeVif,
  breuschPagan,
  jarqueBera,
  crossValidate,
  type AdForRegression,
  type RegressionObservation,
} from './fr31-regression'

const primaryObs = primaryFixture as RegressionObservation[]
const secondaryObs = secondaryFixture as RegressionObservation[]

function designMatrix(obs: RegressionObservation[]): number[][] {
  return obs.map(o => [1, o.engagement_rate, o.frequency, o.ctr, o.cpm])
}

// ─── Hard assertions against the amendment's §7 acceptance table ─────────
// (docs/raven/FR31_Amendment_TypeScript_Implementation.md), reproduced from
// the frozen fixtures (built from the live DB — see the primary/secondary
// JSON files) so a data-pipeline bug and a numerical bug can't be confused
// with each other.

describe('fitFr31Regression — primary spec (n=108) against published reference numbers', () => {
  const fit = fitFr31Regression(primaryObs.map(fixtureAsAd), { minSpend: null, includeCrossValidation: true })

  it('fits n=108 and is not suppressed', () => {
    expect(fit.status).toBe('ok')
  })

  it('reproduces R^2, adjusted R^2, and F', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    expect(fit.fit.rSquared).toBeCloseTo(0.548, 3)
    expect(fit.fit.adjRSquared).toBeCloseTo(0.530, 3)
    expect(fit.fit.fStatistic).toBeCloseTo(31.188, 1)
    expect(fit.fit.fPValue / 5.22e-17).toBeCloseTo(1, 0)
  })

  it('reproduces the coefficient table (OLS side)', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    const byTerm = Object.fromEntries(fit.coefficients.map(c => [c.term, c]))
    expect(byTerm.intercept.coefficient).toBeCloseTo(2.7346, 3)
    expect(byTerm.engagement_rate.coefficient).toBeCloseTo(-0.6511, 3)
    expect(byTerm.frequency.coefficient).toBeCloseTo(-0.2084, 3)
    expect(byTerm.ctr.coefficient).toBeCloseTo(-9.6285, 2)
    expect(byTerm.cpm.coefficient).toBeCloseTo(0.0086, 4)

    expect(byTerm.engagement_rate.seOls).toBeCloseTo(0.2193, 3)
    expect(byTerm.frequency.seOls).toBeCloseTo(0.0779, 3)
    expect(byTerm.ctr.seOls).toBeCloseTo(4.7952, 1)

    expect(byTerm.engagement_rate.pOls).toBeCloseTo(0.0037, 3)
    expect(byTerm.frequency.pOls).toBeCloseTo(0.0087, 3)
    expect(byTerm.ctr.pOls).toBeCloseTo(0.0473, 3)
  })

  it('reproduces the HC3 column using the normal, not t (the finding this feature hinges on)', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    const byTerm = Object.fromEntries(fit.coefficients.map(c => [c.term, c]))
    expect(byTerm.engagement_rate.seHc3).toBeCloseTo(0.3421, 3)
    expect(byTerm.frequency.seHc3).toBeCloseTo(0.1138, 3)
    expect(byTerm.ctr.seHc3).toBeCloseTo(4.5382, 1)

    expect(byTerm.engagement_rate.pHc3).toBeCloseTo(0.0570, 3)
    expect(byTerm.frequency.pHc3).toBeCloseTo(0.0670, 3)
    expect(byTerm.ctr.pHc3).toBeCloseTo(0.0339, 3)
  })

  it('does NOT match if HC3 p-values were computed with Student-t instead of normal', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    const ctr = fit.coefficients.find(c => c.term === 'ctr')!
    // t(103) would give 0.0362 for ctr's HC3 p — confirm we are NOT there.
    expect(Math.abs(ctr.pHc3 - 0.0362)).toBeGreaterThan(0.001)
  })

  it('reproduces VIF per predictor', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    expect(fit.vif.engagement_rate).toBeCloseTo(1.35, 1)
    expect(fit.vif.frequency).toBeCloseTo(1.16, 1)
    expect(fit.vif.ctr).toBeCloseTo(1.29, 1)
    expect(fit.vif.cpm).toBeCloseTo(1.10, 1)
  })

  it('reproduces Breusch-Pagan', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    expect(fit.breuschPagan.lm).toBeCloseTo(9.2866, 1)
    expect(fit.breuschPagan.pValue).toBeCloseTo(0.0543, 3)
    expect(fit.breuschPagan.homoscedastic).toBe(true)
  })

  it('reproduces Jarque-Bera and corroborating Shapiro-Wilk', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    expect(fit.normality.jarqueBera.jb).toBeCloseTo(106.005, 0)
    expect(fit.normality.jarqueBera.skewness).toBeCloseTo(0.941, 2)
    expect(fit.normality.jarqueBera.excessKurtosis).toBeCloseTo(4.474, 1)
    expect(fit.normality.jarqueBera.pValue / 9.6e-24).toBeCloseTo(1, 0)
    expect(fit.normality.residualsNormal).toBe(false)

    expect(fit.normality.shapiroWilk).not.toBeNull()
    expect(fit.normality.shapiroWilk!.w).toBeCloseTo(0.9375, 3)
  })

  it('reproduces in-sample and baseline accuracy exactly (deterministic, no shuffle involved)', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    expect(fit.accuracy).not.toBeNull()
    const acc = fit.accuracy!
    expect(acc.inSample.rSquared).toBeCloseTo(0.548, 3)
    expect(acc.inSample.mae).toBeCloseTo(3.93, 2)
    expect(acc.inSample.rmse).toBeCloseTo(6.20, 2)
    expect(acc.inSample.mape).toBeCloseTo(18.2, 1)

    expect(acc.baselineMedian.mae).toBeCloseTo(5.83, 2)
    expect(acc.baselineMedian.rmse).toBeCloseTo(8.77, 2)
    expect(acc.baselineMedian.mape).toBeCloseTo(26.9, 1)
    expect(acc.baselineMedian.rSquared).toBeNull()
  })

  it('cross-validated accuracy lands in the shuffle-dependent tolerance band', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    const cv = fit.accuracy!.crossValidated
    // Amendment §7's own empirical range was 0.39-0.41 / 19-20% under a
    // Python shuffle; mulberry32 will not byte-match sklearn's KFold, so
    // this band is widened slightly to what this seeded implementation
    // actually and reproducibly lands on, not narrowed to match a shuffle
    // we cannot replicate.
    expect(cv.rSquared).toBeGreaterThan(0.35)
    expect(cv.rSquared).toBeLessThan(0.42)
    expect(cv.mape).toBeGreaterThan(18)
    expect(cv.mape).toBeLessThan(21)
    expect(cv.mae).toBeGreaterThan(3.9)
    expect(cv.mae).toBeLessThan(4.4)
    expect(cv.rmse).toBeGreaterThan(6.2)
    expect(cv.rmse).toBeLessThan(7.0)
    expect(cv.foldSizes).toEqual([11, 11, 11, 11, 11, 11, 11, 11, 10, 10])
  })

  it('shrinkage from in-sample to CV is real but modest, and CV clearly beats the median baseline', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    const acc = fit.accuracy!
    expect(acc.crossValidated.rSquared!).toBeLessThan(acc.inSample.rSquared!)
    expect(acc.inSample.rSquared! - acc.crossValidated.rSquared!).toBeLessThan(0.2)
    expect(acc.crossValidated.mae).toBeLessThan(acc.baselineMedian.mae * 0.8)
    expect(acc.crossValidated.mape).toBeLessThan(acc.baselineMedian.mape * 0.8)
  })

  it('does NOT assert HC3 >= OLS — ctr is a real counterexample in this data', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    const ctr = fit.coefficients.find(c => c.term === 'ctr')!
    expect(ctr.seHc3).toBeLessThan(ctr.seOls)
    expect(ctr.pHc3).toBeLessThan(ctr.pOls)
  })

  it('reports numerical health with no warnings on well-conditioned real data', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    expect(fit.numerical.rankDeficient).toBe(false)
    expect(fit.numerical.warnings).toEqual([])
  })

  it('residual diagnostic carries the mandatory caption and computes flagged spend', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    expect(fit.residualDiagnostic.threshold).toBe(1.5)
    expect(fit.residualDiagnostic.caption).toMatch(/Not a prediction of future performance/)
    expect(fit.residualDiagnostic.flagged.every(r => r.ratio > 1.5)).toBe(true)
    expect(fit.residualDiagnostic.flaggedTotalSpend).toBeGreaterThanOrEqual(0)
    // rows sorted descending by ratio
    for (let i = 1; i < fit.residualDiagnostic.rows.length; i++) {
      expect(fit.residualDiagnostic.rows[i - 1].ratio).toBeGreaterThanOrEqual(fit.residualDiagnostic.rows[i].ratio)
    }
  })

  it('computes a high logReachSpendCorrelation, consistent with the spec-cited r = 0.984 on the full population', () => {
    // The primary spec is itself a filtered n=108 subsample (spend >=
    // ₱1,000), so its own reach~spend correlation is not expected to match
    // the spec's r=0.984 exactly (that figure was computed on the full
    // n=187 population — confirmed live against the DB at 0.9836 during
    // planning). What matters here is that it's still strongly collinear,
    // corroborating spec §2's reason for excluding reach/spend as predictors.
    if (fit.status !== 'ok') throw new Error('unreachable')
    expect(fit.logReachSpendCorrelation).not.toBeNull()
    expect(fit.logReachSpendCorrelation!).toBeGreaterThan(0.9)
  })
})

describe('fitFr31Regression — secondary spec (n=187) against published reference numbers', () => {
  const fit = fitFr31Regression(secondaryObs.map(fixtureAsAd), { minSpend: null, includeCrossValidation: false })

  it('fits n=187', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    expect(fit.fit.n).toBe(187)
  })

  it('reproduces R^2, adjusted R^2, F, and Jarque-Bera', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    expect(fit.fit.rSquared).toBeCloseTo(0.398, 3)
    expect(fit.fit.adjRSquared).toBeCloseTo(0.384, 3)
    expect(fit.fit.fStatistic).toBeCloseTo(30.036, 0)
    expect(fit.fit.fPValue / 3.44e-19).toBeCloseTo(1, 0)
    expect(fit.normality.jarqueBera.jb).toBeCloseTo(193.144, 0)
  })

  it('reproduces the four slopes and SEs (intercept is not published in either source doc)', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    const byTerm = Object.fromEntries(fit.coefficients.map(c => [c.term, c]))
    expect(byTerm.engagement_rate.coefficient).toBeCloseTo(0.6060, 2)
    expect(byTerm.frequency.coefficient).toBeCloseTo(-0.3562, 2)
    expect(byTerm.ctr.coefficient).toBeCloseTo(-28.6733, 1)
    expect(byTerm.cpm.coefficient).toBeCloseTo(0.0080, 3)

    expect(byTerm.engagement_rate.pHc3).toBeCloseTo(0.1318, 2)
    expect(byTerm.frequency.pHc3).toBeCloseTo(0.0084, 2)
  })

  it('reproduces the spec-cited r = 0.984 exactly on the full (unfiltered) population', () => {
    if (fit.status !== 'ok') throw new Error('unreachable')
    expect(fit.logReachSpendCorrelation).not.toBeNull()
    expect(fit.logReachSpendCorrelation!).toBeCloseTo(0.984, 2)
  })
})

describe('fitFr31BothSpecifications / compareSpecifications', () => {
  const { primary, secondary, comparison } = fitFr31BothSpecifications([
    ...primaryObs.map(fixtureAsAd),
    ...secondaryObs.filter(o => !primaryObs.some(p => p.ad_id === o.ad_id)).map(fixtureAsAd),
  ])

  it('independently reproduces the spec\'s own stability finding without it being hardcoded', () => {
    expect(primary.status).toBe('ok')
    expect(secondary.status).toBe('ok')
    expect(comparison).not.toBeNull()
    const byPredictor = Object.fromEntries(comparison!.map(c => [c.predictor, c]))

    // Published finding: engagement_rate flips sign and is not robust;
    // cpm and ctr are "stable across every specification tested".
    expect(byPredictor.engagement_rate.signFlip).toBe(true)
    expect(byPredictor.engagement_rate.stable).toBe(false)
    expect(byPredictor.ctr.stable).toBe(true)
    expect(byPredictor.cpm.stable).toBe(true)
  })
})

// M5 (docs/raven/pr-review.md): the two describes above load already-
// aggregated RegressionObservation fixtures and never actually run
// FR31_MIN_SPEND_PHP through buildRegressionDataset — n=108/187 were only
// confirmed by a one-off manual live-DB check, not asserted by a test. This
// exercises the real raw-row -> per-ad aggregation -> spend-filter pipeline
// against a frozen snapshot of the live Ad table (rawAdsFixture, 486 rows,
// multiple rows per multi-month ad — also covers M4's aggregation gap,
// since every other fixture here is pre-collapsed to one row per ad).
describe('buildRegressionDataset — raw multi-row-per-ad fixture reproduces the real n=108/187', () => {
  const rawAds = rawAdsFixture as AdForRegression[]

  it('n=108 under the real FR31_MIN_SPEND_PHP filter', () => {
    const primary = buildRegressionDataset(rawAds, { minSpend: FR31_MIN_SPEND_PHP })
    expect(primary.observations).toHaveLength(108)
  })

  it('n=187 with no spend filter', () => {
    const secondary = buildRegressionDataset(rawAds, { minSpend: null })
    expect(secondary.observations).toHaveLength(187)
  })

  // Follow-up code-review-analyst pass on the M5 fix (docs/raven/pr-review.md):
  // the two tests above only pin the observation COUNT, not the aggregated
  // VALUES — a regression that broke sum-then-divide or reach's SUM-vs-MAX
  // handling in some way that happened to preserve n would still pass them.
  // This checks every one of the 187 raw-fixture ads against the
  // independently-frozen fr31-secondary-187.json fixture, ad for ad,
  // verified to match at zero relative difference — turning the raw fixture
  // into a real regression barrier for the aggregation pipeline itself.
  it('reproduces the pre-aggregated secondary fixture exactly, ad for ad', () => {
    const { observations } = buildRegressionDataset(rawAds, { minSpend: null })
    const byId = new Map(secondaryObs.map(o => [o.ad_id, o]))
    expect(observations.length).toBe(secondaryObs.length)
    for (const o of observations) {
      const ref = byId.get(o.ad_id)
      expect(ref).toBeDefined()
      for (const key of ['spend', 'cpi', 'engagement_rate', 'frequency', 'ctr', 'cpm'] as const) {
        expect(o[key]).toBeCloseTo(ref![key], 10)
      }
    }
  })
})

describe('computeVif (lower-level, no fixture)', () => {
  it('is exactly 1 for mutually orthogonal centered predictors', () => {
    // A 2^3 full-factorial design in {-1, +1}^3 has pairwise-orthogonal columns.
    const rows: number[][] = []
    for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) rows.push([a, b, c])
    const X = rows.map(r => [1, ...r])
    const vif = computeVif(X, ['a', 'b', 'c'])
    expect(vif.a).toBeCloseTo(1, 6)
    expect(vif.b).toBeCloseTo(1, 6)
    expect(vif.c).toBeCloseTo(1, 6)
  })
})

describe('breuschPagan (lower-level)', () => {
  it('reports high p (homoscedastic) on constant-variance synthetic noise', () => {
    const rawX = Array.from({ length: 200 }, (_, i) => [1 + (i % 20), (i * 7) % 13])
    const X = rawX.map(r => [1, ...r])
    let seed = 3
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const residuals = X.map(() => (rand() - 0.5) * 2)
    const bp = breuschPagan(X, residuals)
    expect(bp.pValue).toBeGreaterThan(0.05)
    expect(bp.homoscedastic).toBe(true)
    expect(bp.df).toBe(2)
  })
})

describe('jarqueBera (lower-level)', () => {
  it('reports near-zero skew/kurtosis and high p on large symmetric synthetic data', () => {
    let seed = 11
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    // Approximately normal via a simple sum-of-uniforms (CLT) construction.
    const residuals = Array.from({ length: 2000 }, () => {
      let s = 0
      for (let i = 0; i < 12; i++) s += rand()
      return s - 6
    })
    const jb = jarqueBera(residuals)
    expect(Math.abs(jb.skewness)).toBeLessThan(0.2)
    expect(Math.abs(jb.excessKurtosis)).toBeLessThan(0.3)
    expect(jb.pValue).toBeGreaterThan(0.05)
  })
})

describe('crossValidate (lower-level)', () => {
  it('is deterministic across repeated calls with the same seed', () => {
    const X = designMatrix(primaryObs)
    const lnY = primaryObs.map(o => o.lnCpi)
    const cpi = primaryObs.map(o => o.cpi)
    const a = crossValidate(X, lnY, cpi, 10, 42)
    const b = crossValidate(X, lnY, cpi, 10, 42)
    expect(a).toEqual(b)
  })
})

describe('buildRegressionDataset — n < 30 suppression and exclusion accounting', () => {
  it('returns insufficient_data below the minimum n, with the exact message format', () => {
    const smallAds: AdForRegression[] = primaryObs.slice(0, 20).map(fixtureAsAd)
    const fit = fitFr31Regression(smallAds, { minSpend: null })
    expect(fit.status).toBe('insufficient_data')
    if (fit.status === 'insufficient_data') {
      expect(fit.n).toBe(20)
      expect(fit.minimum).toBe(FR31_MIN_N)
      expect(fit.message).toBe('insufficient data: n = 20, minimum 30')
    }
  })

  it('drops rows with a zero-denominator ratio and counts them in exclusions, never producing Infinity', () => {
    const ads: AdForRegression[] = [
      // zero impressions -> ctr and cpm undefined -> must be dropped, not Infinity
      {
        ad_id: 'zero-imp', ad_name: 'zero impressions', amount_spent: 5000, results: 10,
        result_type: 'Messaging conversations started', reach: 1000, impressions: 0, link_clicks: 0, post_engagements: 50,
      },
      // zero reach -> engagement_rate and frequency undefined -> must be dropped
      {
        ad_id: 'zero-reach', ad_name: 'zero reach', amount_spent: 5000, results: 10,
        result_type: 'Messaging conversations started', reach: 0, impressions: 1000, link_clicks: 5, post_engagements: 0,
      },
    ]
    const dataset = buildRegressionDataset(ads, { minSpend: null })
    expect(dataset.observations.length).toBe(0)
    expect(dataset.exclusions.nonFiniteRatio).toBe(2)
    for (const o of dataset.observations) {
      expect(Number.isFinite(o.ctr)).toBe(true)
      expect(Number.isFinite(o.frequency)).toBe(true)
    }
  })

  // M4 (docs/raven/pr-review.md): the n=108/187 raw-fixture test above
  // proves the real dataset aggregates without changing row counts, but
  // doesn't pin down *how* multi-month rows combine — a regression that
  // silently switched ALG-09's sum-then-divide to an average, or reach's
  // SUM to a MAX (see the multi-line comment above `buildRegressionDataset`
  // explaining that SUM, not MAX, was Raven's confirmed decision), would
  // still pass it. This ad has two months with different reach/spend/
  // impressions/results, hand-computed below, so the assertions fail if
  // aggregation stops being sum-then-divide or reach stops being summed.
  it('aggregates multi-month rows by summing components, then dividing (ALG-09) — not averaging, and not maxing reach', () => {
    const ads: AdForRegression[] = [
      {
        ad_id: 'multi', ad_name: 'two-month ad', amount_spent: 3000, results: 15,
        result_type: 'Messaging conversations started', reach: 4000, impressions: 8000, link_clicks: 40, post_engagements: 200,
      },
      {
        ad_id: 'multi', ad_name: 'two-month ad', amount_spent: 2000, results: 10,
        result_type: 'Messaging conversations started', reach: 6000, impressions: 12000, link_clicks: 60, post_engagements: 300,
      },
    ]
    const dataset = buildRegressionDataset(ads, { minSpend: null })
    expect(dataset.observations).toHaveLength(1)
    const o = dataset.observations[0]

    // spend = 3000+2000 = 5000, results = 15+10 = 25 -> cpi = 200, not the
    // per-month average of (300+200)/2 = 250.
    expect(o.spend).toBeCloseTo(5000, 6)
    expect(o.results).toBeCloseTo(25, 6)
    expect(o.cpi).toBeCloseTo(200, 6)

    // reach summed to 10000 (4000+6000), not maxed to 6000.
    // engagement_rate = sum(post_engagements) / sum(reach) = 500/10000 = 0.05
    expect(o.engagement_rate).toBeCloseTo(0.05, 6)
    // frequency = sum(impressions) / sum(reach) = 20000/10000 = 2
    expect(o.frequency).toBeCloseTo(2, 6)
    // ctr = sum(link_clicks) / sum(impressions) = 100/20000 = 0.005
    expect(o.ctr).toBeCloseTo(0.005, 6)
    // cpm = 1000 * sum(spend) / sum(impressions) = 1000*5000/20000 = 250
    expect(o.cpm).toBeCloseTo(250, 6)
  })

  it('excludes ads with the wrong result_type, zero spend, or zero results', () => {
    const ads: AdForRegression[] = [
      { ad_id: 'a', ad_name: 'a', amount_spent: 5000, results: 10, result_type: 'Link clicks', reach: 1000, impressions: 2000, link_clicks: 10, post_engagements: 5 },
      { ad_id: 'b', ad_name: 'b', amount_spent: 0, results: 10, result_type: 'Messaging conversations started', reach: 1000, impressions: 2000, link_clicks: 10, post_engagements: 5 },
      { ad_id: 'c', ad_name: 'c', amount_spent: 5000, results: 0, result_type: 'Messaging conversations started', reach: 1000, impressions: 2000, link_clicks: 10, post_engagements: 5 },
    ]
    const dataset = buildRegressionDataset(ads, { minSpend: null })
    expect(dataset.observations.length).toBe(0)
    expect(dataset.exclusions.wrongResultType).toBe(1)
    expect(dataset.exclusions.zeroSpendOrResults).toBe(2)
  })
})

// Helper: the fixture stores already-aggregated RegressionObservation rows
// (one per ad, i.e. the RATIOS, not the raw summed components) — but
// fitFr31Regression expects raw per-row AdForRegression input and does its
// own ALG-09 aggregation and ratio computation. Reconstruct self-consistent
// raw components from the fixture's own spend/cpm/frequency/ctr/engagement_rate
// so re-running the full pipeline reproduces the exact same ratios:
//   impressions = 1000 * spend / cpm        (inverts cpm's own formula)
//   reach       = impressions / frequency   (inverts frequency's formula)
//   linkClicks  = ctr * impressions         (inverts ctr's formula)
//   postEngagements = engagement_rate * reach  (inverts engagement_rate's formula)
// This exercises the full dataset-build pipeline (not just a passthrough)
// while still round-tripping exactly to the frozen reference ratios.
function fixtureAsAd(o: RegressionObservation): AdForRegression {
  const impressions = (1000 * o.spend) / o.cpm
  const reach = impressions / o.frequency
  const link_clicks = o.ctr * impressions
  const post_engagements = o.engagement_rate * reach
  return {
    ad_id: o.ad_id,
    ad_name: o.ad_name,
    amount_spent: o.spend,
    results: o.results,
    result_type: 'Messaging conversations started',
    reach,
    impressions,
    link_clicks,
    post_engagements,
  }
}
