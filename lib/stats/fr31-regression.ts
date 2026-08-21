// FR-31 — explanatory OLS regression of ln(cost per inquiry) on four ad
// ratio predictors (mvp.md's regression cut was reinstated per
// docs/raven/FR31_Regression_Specification.md, superseded on §3/§8 by
// docs/raven/FR31_Amendment_TypeScript_Implementation.md). This is a
// DIFFERENT model from the cut lib/stats/regression.ts (messaging
// conversations ~ reach + spend) — do not confuse the two, and do not
// extend regression.ts for this feature.
//
// Pure functions only, no prisma import (matches lib/stats/correlation-selection.ts's
// convention) — the caller queries Ad rows and passes them in.

import { olsFit, olsStandardErrors, hc3StandardErrors, olsPredict, type OlsFit } from './ols-core'
import { studentTPValue, fPValue, chiSquareUpperTailEvenDf, normalTwoTailedPValue } from './normal-dist'
import { shapiroWilk } from './shapiro-wilk'
import { median } from './descriptive'
import { seededKFoldIndices } from './seeded-random'
import { MIN_SPEND_THRESHOLD_PHP } from './budget-reallocation'

export const FR31_PREDICTORS = ['engagement_rate', 'frequency', 'ctr', 'cpm'] as const
export type Fr31Predictor = (typeof FR31_PREDICTORS)[number]
export type Fr31Term = 'intercept' | Fr31Predictor

// Shared with components/analytics/RegressionSection.tsx so the UI table
// and the warnings text below use identical wording for a predictor,
// instead of the raw snake_case key ("engagement_rate has VIF...") leaking
// into user-visible text in one place but not the other.
export const FR31_TERM_LABEL: Record<Fr31Term, string> = {
  intercept: 'Intercept',
  engagement_rate: 'Engagement Rate',
  frequency: 'Frequency',
  ctr: 'CTR',
  cpm: 'CPM',
}

export const FR31_RESULT_TYPE = 'Messaging conversations started'
export const FR31_MIN_SPEND_PHP = MIN_SPEND_THRESHOLD_PHP
export const FR31_MIN_N = 30
export const FR31_CV_FOLDS = 10
export const FR31_CV_SEED = 42
export const FR31_RESIDUAL_RATIO_THRESHOLD = 1.5
export const FR31_VIF_WARNING_THRESHOLD = 10
const FR31_SIGNIFICANCE_ALPHA = 0.05

export interface AdForRegression {
  ad_id: string
  ad_name: string
  amount_spent: number
  results: number | null
  result_type: string | null
  reach: number | null
  impressions: number
  link_clicks: number | null
  post_engagements: number | null
}

// ─── Dataset construction (spec §2, ALG-09 sum-then-divide) ───────────────

export interface RegressionObservation {
  ad_id: string
  ad_name: string
  spend: number
  results: number
  cpi: number
  lnCpi: number
  engagement_rate: number
  frequency: number
  ctr: number
  cpm: number
}

export interface DatasetExclusions {
  wrongResultType: number
  zeroSpendOrResults: number
  belowMinSpend: number
  nonFiniteRatio: number
}

export interface RegressionDataset {
  observations: RegressionObservation[]
  exclusions: DatasetExclusions
  minSpendFilter: number | null
  // ln(reach) ~ ln(spend) Pearson r, computed live rather than hardcoded
  // into UI copy — spec §2 cites r = 0.984 as the reason reach/spend are
  // excluded as predictors. null when fewer than 2 ads have both > 0.
  logReachSpendCorrelation: number | null
}

interface AggregatedAd {
  ad_id: string
  ad_name: string
  spend: number
  results: number
  reach: number
  impressions: number
  linkClicks: number
  postEngagements: number
}

// M7 (docs/raven/pr-review.md): returns null, not 0, when either variable
// has zero variance — a real 0 correlation and "undefined because one side
// never varies" are different findings, and the caller (the reach/spend
// collinearity note) reads a 0 as "not correlated, safe to include" when
// the honest answer is "can't tell." Callers already null-guard this
// field before rendering the collinearity sentence, so this makes the
// sentence disappear instead of self-contradicting ("they correlate at
// r = 0.000").
function pearsonR(x: number[], y: number[]): number | null {
  const n = x.length
  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n
  let num = 0
  let denX = 0
  let denY = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  const den = Math.sqrt(denX * denY)
  return den === 0 ? null : num / den
}

/**
 * Builds the FR-31 population per spec §2. Filter order: result type ->
 * spend > 0 -> results > 0 -> aggregate by Ad ID (sum-then-divide, ALG-09)
 * -> spend >= minSpend (primary spec only) -> drop non-finite ratios.
 *
 * Reach is SUMMED across months, not maxed, per Raven's confirmed decision
 * (docs/raven/FR31_Answers_HC3_and_Reach.md): Meta reports reach
 * deduplicated only WITHIN a period and publishes no cross-period figure,
 * so neither SUM nor MAX recovers true lifetime unique reach. SUM was
 * chosen because it keeps the ratio's numerator and denominator both
 * additive (impressions, link clicks, post engagements are genuinely
 * additive across months) and because it was validated against the
 * platform's own reported monthly frequency: SUM produces a median
 * frequency of 1.72 against Meta's own monthly-level median of 1.55 and the
 * 1.96 seen among single-month ads (where SUM and MAX are identical, so the
 * choice can't distort them) — MAX produces 3.24, roughly double both.
 * These ratios are period-aggregated rates, not person-deduplicated rates.
 * This is a deliberate divergence from lib/stats/regression.ts's own
 * MAX-based convention (written for a different, daily-export-era model),
 * not an oversight.
 */
export function buildRegressionDataset(
  ads: readonly AdForRegression[],
  options?: { minSpend?: number | null }
): RegressionDataset {
  const minSpend = options?.minSpend === undefined ? FR31_MIN_SPEND_PHP : options.minSpend

  const exclusions: DatasetExclusions = {
    wrongResultType: 0,
    zeroSpendOrResults: 0,
    belowMinSpend: 0,
    nonFiniteRatio: 0,
  }

  const perAd = new Map<string, AggregatedAd>()
  for (const ad of ads) {
    // M2 (docs/raven/pr-review.md): in production this branch never runs —
    // lib/data/analysis.ts and scripts/fr31-dump.ts both query with
    // `where: { result_type: FR31_RESULT_TYPE }`, so every row already
    // matches by the time it gets here. Kept as a defensive check (and
    // exercised directly by fr31-regression.test.ts, which calls this
    // function with mixed result_type fixtures) rather than trusting every
    // future caller to pre-filter identically.
    if (ad.result_type !== FR31_RESULT_TYPE) {
      exclusions.wrongResultType++
      continue
    }
    // Spec §2 phrases this as SUM(spend) > 0 AND SUM(Results) > 0 post-
    // aggregation (a HAVING), but this filters per-row before aggregating,
    // which would drop a whole month's spend/reach/impressions for any ad
    // that had a zero-result (or zero-spend) month. NOT fully equivalent on
    // this dataset (checked 2026-08-21, see docs/raven/pr-review.md H3):
    // live DB has zero rows with spend > 0 AND (results IS NULL OR
    // results = 0), but 4 rows DO have spend = 0 AND results > 0 (zero-
    // spend/zero-reach/zero-impression tail months with a small positive
    // results count) — per-row filtering drops those rows' results, while
    // a post-aggregation HAVING would keep them. Checked the actual impact
    // against lib/stats/__fixtures__/fr31-raw-ads.json: affects 4 of 187
    // ads, shifts `results` by 1-4 and CPI by <0.2%; `n` is unchanged at
    // 108/187 either way, and every predictor is untouched (those rows
    // carry no reach/impressions/clicks). Accepted as immaterial, not as
    // equivalent. Re-check BOTH directions (spend>0/results<=0 AND
    // spend<=0/results>0) if new CSV data is ingested.
    if (!(ad.amount_spent > 0) || !((ad.results ?? 0) > 0)) {
      exclusions.zeroSpendOrResults++
      continue
    }
    const existing = perAd.get(ad.ad_id) ?? {
      ad_id: ad.ad_id,
      ad_name: ad.ad_name,
      spend: 0,
      results: 0,
      reach: 0,
      impressions: 0,
      linkClicks: 0,
      postEngagements: 0,
    }
    perAd.set(ad.ad_id, {
      ad_id: ad.ad_id,
      ad_name: ad.ad_name,
      spend: existing.spend + ad.amount_spent,
      results: existing.results + (ad.results ?? 0),
      reach: existing.reach + (ad.reach ?? 0),
      impressions: existing.impressions + ad.impressions,
      linkClicks: existing.linkClicks + (ad.link_clicks ?? 0),
      postEngagements: existing.postEngagements + (ad.post_engagements ?? 0),
    })
  }

  const observations: RegressionObservation[] = []
  const reachSpendPairs: { logReach: number; logSpend: number }[] = []

  for (const a of perAd.values()) {
    if (minSpend != null && a.spend < minSpend) {
      exclusions.belowMinSpend++
      continue
    }

    const cpi = a.spend / a.results
    const engagement_rate = a.reach > 0 ? a.postEngagements / a.reach : NaN
    const frequency = a.reach > 0 ? a.impressions / a.reach : NaN
    const ctr = a.impressions > 0 ? a.linkClicks / a.impressions : NaN
    const cpm = a.impressions > 0 ? (1000 * a.spend) / a.impressions : NaN

    const ratios = [cpi, engagement_rate, frequency, ctr, cpm]
    if (ratios.some(r => !Number.isFinite(r))) {
      exclusions.nonFiniteRatio++
      continue
    }

    observations.push({
      ad_id: a.ad_id,
      ad_name: a.ad_name,
      spend: a.spend,
      results: a.results,
      cpi,
      lnCpi: Math.log(cpi),
      engagement_rate,
      frequency,
      ctr,
      cpm,
    })

    if (a.reach > 0 && a.spend > 0) {
      reachSpendPairs.push({ logReach: Math.log(a.reach), logSpend: Math.log(a.spend) })
    }
  }

  const logReachSpendCorrelation =
    reachSpendPairs.length >= 2
      ? pearsonR(reachSpendPairs.map(p => p.logReach), reachSpendPairs.map(p => p.logSpend))
      : null

  return { observations, exclusions, minSpendFilter: minSpend, logReachSpendCorrelation }
}

// ─── Result types ───────────────────────────────────────────────────────

export interface CoefficientRow {
  term: Fr31Term
  coefficient: number
  seOls: number
  seHc3: number
  tOls: number
  zHc3: number
  pOls: number
  pHc3: number
  vif: number | null
}

export interface OverallFit {
  n: number
  k: number
  dfModel: number
  dfResidual: number
  rSquared: number
  adjRSquared: number
  fStatistic: number
  fPValue: number
  residualStdError: number
}

export interface BreuschPaganResult {
  lm: number
  df: number
  pValue: number
  auxRSquared: number
  homoscedastic: boolean
}

export interface JarqueBeraResult {
  jb: number
  df: 2
  pValue: number
  skewness: number
  excessKurtosis: number
}

export interface NormalityDiagnostics {
  jarqueBera: JarqueBeraResult
  shapiroWilk: { w: number; p: number } | null
  shapiroWilkError: string | null
  residualsNormal: boolean
  narrative: string
}

export interface AccuracyMetrics {
  mae: number
  rmse: number
  mape: number
  rSquared: number | null
}

export interface CrossValidationResult extends AccuracyMetrics {
  folds: number
  seed: number
  foldSizes: number[]
}

export interface AccuracyPanel {
  inSample: AccuracyMetrics
  crossValidated: CrossValidationResult
  baselineMedian: AccuracyMetrics
  medianCpi: number
  maeImprovementVsBaseline: number
}

export interface ResidualRatioRow {
  ad_id: string
  ad_name: string
  spend: number
  actualCpi: number
  predictedCpi: number
  ratio: number
}

export interface ResidualDiagnostic {
  threshold: number
  rows: ResidualRatioRow[]
  flagged: ResidualRatioRow[]
  flaggedCount: number
  flaggedTotalSpend: number
  caption: string
}

export interface NumericalHealth {
  // min(diag)/max(diag) of R — the RECIPROCAL condition number (1/κ), not
  // κ itself (M6, docs/raven/pr-review.md). Close to 1 = well-conditioned;
  // near 0 = rank-deficient.
  reciprocalConditionNumber: number
  rankDeficient: boolean
  warnings: string[]
}

export interface Fr31Fit {
  status: 'ok'
  label: string
  minSpendFilter: number | null
  observations: RegressionObservation[]
  fit: OverallFit
  coefficients: CoefficientRow[]
  vif: Record<Fr31Predictor, number>
  breuschPagan: BreuschPaganResult
  normality: NormalityDiagnostics
  accuracy: AccuracyPanel | null
  residualDiagnostic: ResidualDiagnostic
  numerical: NumericalHealth
  logReachSpendCorrelation: number | null
  exclusions: DatasetExclusions
}

export interface Fr31Insufficient {
  status: 'insufficient_data'
  n: number
  minimum: number
  message: string
}

export type Fr31Result = Fr31Fit | Fr31Insufficient

const RESIDUAL_DIAGNOSTIC_CAPTION =
  "Compares each advertisement's recorded cost per inquiry against the level associated with its characteristics. Not a prediction of future performance."

// ─── Lower-level statistics (exported for direct testing) ─────────────────

/**
 * VIF_j = 1 / (1 - R^2_j), where R^2_j comes from regressing predictor j on
 * all OTHER predictors plus an intercept (spec §3.1's documented trap:
 * omitting the intercept from this auxiliary design inflates every VIF).
 */
export function computeVif(
  X: readonly number[][], // includes intercept column, columns [intercept, p1, p2, ...]
  predictorNames: readonly string[]
): Record<string, number> {
  const n = X.length
  if (n === 0) throw new Error('computeVif: X must have at least one row')
  const totalCols = X[0].length
  const predictorCols = totalCols - 1 // excludes intercept
  const result: Record<string, number> = {}

  for (let target = 0; target < predictorCols; target++) {
    const y = X.map(row => row[target + 1])
    const auxX = X.map(row => {
      const cols = [1]
      for (let j = 0; j < predictorCols; j++) if (j !== target) cols.push(row[j + 1])
      return cols
    })
    const auxFit = olsFit(auxX, y)
    const r2 = auxFit.rSquared
    result[predictorNames[target]] = r2 >= 1 ? Infinity : 1 / (1 - r2)
  }
  return result
}

/**
 * Koenker's studentized Breusch-Pagan (the variant statsmodels.het_breuschpagan
 * returns): regress squared residuals on the same predictors + intercept,
 * LM = n * R^2_aux, referred to chi-square with df = predictor count. This
 * is NOT the original Breusch & Pagan (1979) SSR/2 statistic — do not
 * "correct" it to that form, it produces a different number.
 */
export function breuschPagan(X: readonly number[][], residuals: readonly number[]): BreuschPaganResult {
  const n = residuals.length
  if (X.length === 0) throw new Error('breuschPagan: X must have at least one row')
  const df = X[0].length - 1 // predictor count, excluding intercept
  const eSquared = residuals.map(e => e * e)
  const auxFit = olsFit(X, eSquared)
  const lm = n * auxFit.rSquared
  const pValue = chiSquareUpperTailEvenDf(Math.max(lm, 1e-12), df)
  return { lm, df, pValue, auxRSquared: auxFit.rSquared, homoscedastic: pValue >= FR31_SIGNIFICANCE_ALPHA }
}

/**
 * Jarque-Bera using POPULATION (biased, divide-by-n) moments — matches
 * scipy's bias=True default and statsmodels.stats.stattools.jarque_bera.
 * Using the n-1-corrected G1/G2 estimators instead moves JB by several
 * units and would fail reproduction of the published reference numbers.
 */
export function jarqueBera(residuals: readonly number[]): JarqueBeraResult {
  const n = residuals.length
  const mean = residuals.reduce((a, b) => a + b, 0) / n
  const m2 = residuals.reduce((s, e) => s + (e - mean) ** 2, 0) / n
  const m3 = residuals.reduce((s, e) => s + (e - mean) ** 3, 0) / n
  const m4 = residuals.reduce((s, e) => s + (e - mean) ** 4, 0) / n

  const skewness = m2 > 0 ? m3 / m2 ** 1.5 : 0
  const excessKurtosis = m2 > 0 ? m4 / (m2 * m2) - 3 : 0
  const jb = (n / 6) * (skewness ** 2 + (excessKurtosis ** 2) / 4)
  const pValue = chiSquareUpperTailEvenDf(Math.max(jb, 1e-12), 2)

  return { jb, df: 2, pValue, skewness, excessKurtosis }
}

export function accuracyMetrics(
  actual: readonly number[],
  predicted: readonly number[],
  withR2: boolean
): AccuracyMetrics {
  const n = actual.length
  const errors = actual.map((a, i) => a - predicted[i])
  const mae = errors.reduce((s, e) => s + Math.abs(e), 0) / n
  const rmse = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / n)
  const mape = (100 * errors.reduce((s, e, i) => s + Math.abs(e) / actual[i], 0)) / n

  let rSquared: number | null = null
  if (withR2) {
    const meanActual = actual.reduce((a, b) => a + b, 0) / n
    const ssTotal = actual.reduce((s, a) => s + (a - meanActual) ** 2, 0)
    const ssResidual = errors.reduce((s, e) => s + e * e, 0)
    rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0
  }

  return { mae, rmse, mape, rSquared }
}

/**
 * 10-fold CV per spec §5.1: refit OLS on 9 training folds (on lnCpi),
 * predict the held-out fold, back-transform with plain exp() — no Duan
 * smearing or sigma^2/2 correction, which would break reproduction of the
 * published ₱4.15/19.1% reference numbers even though exp(fitted log-mean)
 * is a known-biased estimator of the conditional mean. Metrics computed on
 * out-of-fold predictions only, on the original CPI scale.
 *
 * Fold assignment will NOT byte-match Python's
 * sklearn.model_selection.KFold(shuffle=True, random_state=42) — see
 * lib/stats/seeded-random.ts's module comment. FR-31's amendment already
 * sanctions a tolerance band for this (CV R^2 0.39-0.41, MAPE 19-20%).
 */
export function crossValidate(
  X: readonly number[][],
  lnY: readonly number[],
  actualCpi: readonly number[],
  folds: number,
  seed: number
): CrossValidationResult {
  const n = X.length
  const foldIndices = seededKFoldIndices(n, folds, seed)
  const outOfFoldPredictedCpi = new Array(n).fill(NaN)

  for (let f = 0; f < foldIndices.length; f++) {
    const testIdx = new Set(foldIndices[f])
    const trainX: number[][] = []
    const trainY: number[] = []
    for (let i = 0; i < n; i++) {
      if (!testIdx.has(i)) {
        trainX.push(X[i])
        trainY.push(lnY[i])
      }
    }
    const fit = olsFit(trainX, trainY)
    const testX = foldIndices[f].map(i => X[i])
    const predictedLn = olsPredict(fit.beta, testX)
    foldIndices[f].forEach((i, j) => {
      outOfFoldPredictedCpi[i] = Math.exp(predictedLn[j])
    })
  }

  const metrics = accuracyMetrics(actualCpi, outOfFoldPredictedCpi, true)
  return { ...metrics, folds, seed, foldSizes: foldIndices.map(f => f.length) }
}

// ─── Full FR-31 fit ─────────────────────────────────────────────────────

function designMatrix(observations: readonly RegressionObservation[]): number[][] {
  return observations.map(o => [1, o.engagement_rate, o.frequency, o.ctr, o.cpm])
}

function fitOneSpecification(
  dataset: RegressionDataset,
  label: string,
  cvSeed: number,
  cvFolds: number,
  includeAccuracy: boolean
): Fr31Result {
  const { observations, exclusions, minSpendFilter, logReachSpendCorrelation } = dataset
  const n = observations.length

  if (n < FR31_MIN_N) {
    return {
      status: 'insufficient_data',
      n,
      minimum: FR31_MIN_N,
      message: `insufficient data: n = ${n}, minimum ${FR31_MIN_N}`,
    }
  }

  const X = designMatrix(observations)
  const lnY = observations.map(o => o.lnCpi)
  const olsResult: OlsFit = olsFit(X, lnY)

  const k = FR31_PREDICTORS.length
  const dfModel = k
  const dfResidual = n - k - 1
  const adjRSquared = 1 - (1 - olsResult.rSquared) * (n - 1) / dfResidual
  const fStatistic = (olsResult.rSquared / k) / ((1 - olsResult.rSquared) / dfResidual)
  const fP = fPValue(fStatistic, dfModel, dfResidual)
  const residualStdError = Math.sqrt(olsResult.sigmaSquared)

  const seOls = olsStandardErrors(olsResult)
  const seHc3 = hc3StandardErrors(olsResult, X)

  // L-series fix (docs/raven/pr-review.md): computed up front rather than filled in
  // after building `coefficients` with a `NaN` placeholder — the old
  // "filled below" hole would leak a NaN VIF into the coefficient table if
  // that follow-up loop was ever skipped or reordered.
  const vif = computeVif(X, FR31_PREDICTORS) as Record<Fr31Predictor, number>

  const terms: Fr31Term[] = ['intercept', ...FR31_PREDICTORS]
  const coefficients: CoefficientRow[] = terms.map((term, j) => {
    const tOls = olsResult.beta[j] / seOls[j]
    const zHc3 = olsResult.beta[j] / seHc3[j]
    return {
      term,
      coefficient: olsResult.beta[j],
      seOls: seOls[j],
      seHc3: seHc3[j],
      tOls,
      zHc3,
      // OLS column: Student-t, df = n - k - 1.
      pOls: studentTPValue(tOls, dfResidual),
      // HC3 column: standard normal. HC3 is an asymptotic sandwich
      // estimator, so its ratio is referred to the normal, not t
      // (statsmodels' cov_type='HC3' sets use_t=False) — confirmed against
      // FR-31's published reference numbers
      // (docs/raven/FR31_Answers_HC3_and_Reach.md §1).
      pHc3: normalTwoTailedPValue(zHc3),
      vif: term === 'intercept' ? null : vif[term as Fr31Predictor],
    }
  })

  const bp = breuschPagan(X, olsResult.residuals)

  const jb = jarqueBera(olsResult.residuals)
  let shapiroResult: { w: number; p: number } | null = null
  let shapiroError: string | null = null
  try {
    const sw = shapiroWilk(olsResult.residuals)
    shapiroResult = { w: sw.W, p: sw.p }
  } catch (e) {
    shapiroError = (e as Error).message
  }
  const residualsNormal = jb.pValue >= FR31_SIGNIFICANCE_ALPHA
  const normality: NormalityDiagnostics = {
    jarqueBera: jb,
    shapiroWilk: shapiroResult,
    shapiroWilkError: shapiroError,
    residualsNormal,
    narrative: residualsNormal
      ? 'Residuals are approximately normal.'
      : 'Residuals are non-normal, so robust (HC3) standard errors are reported.',
  }

  // Residual diagnostic (spec §6): in-sample, on the primary spec's own fit.
  const predictedCpi = olsResult.fitted.map(f => Math.exp(f))
  const residualRows: ResidualRatioRow[] = observations
    .map((o, i) => ({
      ad_id: o.ad_id,
      ad_name: o.ad_name,
      spend: o.spend,
      actualCpi: o.cpi,
      predictedCpi: predictedCpi[i],
      ratio: o.cpi / predictedCpi[i],
    }))
    .sort((a, b) => b.ratio - a.ratio)
  const flagged = residualRows.filter(r => r.ratio > FR31_RESIDUAL_RATIO_THRESHOLD)
  const residualDiagnostic: ResidualDiagnostic = {
    threshold: FR31_RESIDUAL_RATIO_THRESHOLD,
    rows: residualRows,
    flagged,
    flaggedCount: flagged.length,
    flaggedTotalSpend: flagged.reduce((s, r) => s + r.spend, 0),
    caption: RESIDUAL_DIAGNOSTIC_CAPTION,
  }

  let accuracy: AccuracyPanel | null = null
  if (includeAccuracy) {
    const actualCpi = observations.map(o => o.cpi)
    // rSquared here is the model's own R^2 (olsResult.rSquared, fit on the
    // ln(cpi) scale) rather than a recomputation from back-transformed
    // in-sample residuals on the CPI scale — the two are NOT the same
    // number (OLS minimizes SSE on the fitted scale, not on exp() of it),
    // and spec §5.4's "in-sample R² = 0.548" is the former. MAE/RMSE/MAPE
    // are still computed on the CPI scale, matching the published
    // ₱3.93/₱6.20/18.2% exactly.
    const inSample: AccuracyMetrics = {
      ...accuracyMetrics(actualCpi, predictedCpi, false),
      rSquared: olsResult.rSquared,
    }
    const crossValidated = crossValidate(X, lnY, actualCpi, cvFolds, cvSeed)
    const medianCpi = median(actualCpi)
    const baselinePredicted = actualCpi.map(() => medianCpi)
    // rSquared intentionally null: the median doesn't minimize SSE, so a
    // computed R^2 would come out slightly negative (spec §5.4 shows "-").
    const baselineMedian = accuracyMetrics(actualCpi, baselinePredicted, false)
    const maeImprovementVsBaseline = 1 - crossValidated.mae / baselineMedian.mae
    accuracy = { inSample, crossValidated, baselineMedian, medianCpi, maeImprovementVsBaseline }
  }

  const warnings: string[] = []
  for (const p of FR31_PREDICTORS) {
    if (vif[p] > FR31_VIF_WARNING_THRESHOLD) warnings.push(`${FR31_TERM_LABEL[p]} has VIF ${vif[p].toFixed(1)} (> ${FR31_VIF_WARNING_THRESHOLD})`)
  }
  for (const h of olsResult.hatDiagonal) {
    if (h > 1 - 1e-6) {
      warnings.push('a residual point has hat-diagonal leverage near 1; HC3 SEs may be unstable')
      break
    }
  }

  return {
    status: 'ok',
    label,
    minSpendFilter,
    observations,
    fit: {
      n,
      k,
      dfModel,
      dfResidual,
      rSquared: olsResult.rSquared,
      adjRSquared,
      fStatistic,
      fPValue: fP,
      residualStdError,
    },
    coefficients,
    vif,
    breuschPagan: bp,
    normality,
    accuracy,
    residualDiagnostic,
    numerical: {
      reciprocalConditionNumber: olsResult.reciprocalConditionNumber,
      rankDeficient: olsResult.rankDeficient,
      warnings,
    },
    logReachSpendCorrelation,
    exclusions,
  }
}

export function fitFr31Regression(
  ads: readonly AdForRegression[],
  options?: {
    minSpend?: number | null
    label?: string
    cvSeed?: number
    cvFolds?: number
    includeCrossValidation?: boolean
  }
): Fr31Result {
  const dataset = buildRegressionDataset(ads, { minSpend: options?.minSpend })
  return fitOneSpecification(
    dataset,
    options?.label ?? 'fr31',
    options?.cvSeed ?? FR31_CV_SEED,
    options?.cvFolds ?? FR31_CV_FOLDS,
    options?.includeCrossValidation ?? true
  )
}

// ─── Two-specification comparison (spec §4) ────────────────────────────

export interface SpecificationComparison {
  predictor: Fr31Predictor
  primaryCoefficient: number | null
  secondaryCoefficient: number | null
  signFlip: boolean
  robustSignificantPrimary: boolean
  robustSignificantSecondary: boolean
  stable: boolean
  note: string
}

export function compareSpecifications(
  primary: Fr31Fit,
  secondary: Fr31Fit,
  alpha: number = FR31_SIGNIFICANCE_ALPHA
): SpecificationComparison[] {
  return FR31_PREDICTORS.map(predictor => {
    const primaryRow = primary.coefficients.find(c => c.term === predictor)
    const secondaryRow = secondary.coefficients.find(c => c.term === predictor)
    const primaryCoefficient = primaryRow?.coefficient ?? null
    const secondaryCoefficient = secondaryRow?.coefficient ?? null
    const signFlip =
      primaryCoefficient != null && secondaryCoefficient != null && Math.sign(primaryCoefficient) !== Math.sign(secondaryCoefficient) && primaryCoefficient !== 0 && secondaryCoefficient !== 0
    const robustSignificantPrimary = primaryRow != null && primaryRow.pHc3 < alpha
    const robustSignificantSecondary = secondaryRow != null && secondaryRow.pHc3 < alpha
    // "Not robust across specifications" per spec §4: the sign flips, or it
    // fails to survive HC3 robust significance in at least one spec.
    const stable = !signFlip && robustSignificantPrimary && robustSignificantSecondary
    return {
      predictor,
      primaryCoefficient,
      secondaryCoefficient,
      signFlip,
      robustSignificantPrimary,
      robustSignificantSecondary,
      stable,
      note: stable ? 'stable across specifications' : 'not robust across specifications',
    }
  })
}

export function fitFr31BothSpecifications(ads: readonly AdForRegression[]): {
  primary: Fr31Result
  secondary: Fr31Result
  comparison: SpecificationComparison[] | null
} {
  const primary = fitFr31Regression(ads, { minSpend: FR31_MIN_SPEND_PHP, label: 'primary', includeCrossValidation: true })
  const secondary = fitFr31Regression(ads, { minSpend: null, label: 'secondary', includeCrossValidation: false })
  const comparison =
    primary.status === 'ok' && secondary.status === 'ok' ? compareSpecifications(primary, secondary) : null
  return { primary, secondary, comparison }
}
