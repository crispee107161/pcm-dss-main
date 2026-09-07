import { prisma } from '@/lib/prisma'
import { STUDY_PERIOD_POST_WHERE, STUDY_PERIOD_AD_WHERE, withStudyPeriodAd, STUDY_PERIOD_LABEL } from '@/lib/data/study-period'
import { latestUpload } from '@/lib/upload/coverage'
import { computeRankingComparison, type RankingComparisonResult } from '@/lib/stats/ranking-comparison'
import { computeCategoryDistribution, type CategoryDistributionRow } from '@/lib/stats/category-distribution'
import { computeCategorySignificance, groupEngagementRatesByCategory, type CategorySignificanceResult } from '@/lib/stats/category-significance'
import { selectCorrelation, type CorrelationSelectionResult } from '@/lib/stats/correlation-selection'
import { computeAdLifecycle, type AdLifecycleResult } from '@/lib/stats/ad-lifecycle'
import {
  fitFr31BothSpecifications,
  FR31_RESULT_TYPE,
  type Fr31Fit,
  type Fr31Result,
  type SpecificationComparison,
} from '@/lib/stats/fr31-regression'

// Finding P §3.1 (docs/raven/analysis-tab-finding-l-memo.md) — states the
// corpus once, above every panel, rather than leaving each panel's own
// record count as the reader's only way to piece together what this screen
// covers. No longer load-bearing for the population problem (Finding D
// already threads a count through every headline), so this is deliberately
// thin: the study period, the two counts, and when data was last uploaded.
export interface AnalysisCoverage {
  periodLabel: string
  adCount: number
  postCount: number
  lastUploadDate: Date | null
  // docs/raven/analysis-tab-post-fix-memo.md §3 — the study window silently
  // excludes rows outside it (FR-04a), which is invisible on screen unless
  // stated. postsExcluded is an exact row count (one row = one post).
  // adsExcluded is advertisements with NO in-period row at all — the Ad
  // table is one row per advertisement PER MONTH, so an ad with some months
  // in period and some outside it is not counted here (code-review-analyst,
  // MEDIUM-2, 2026-09-07: it still has in-period activity, so it belongs in
  // adCount, not this figure — this only counts ads absent from the period
  // entirely, and the UI states it that way).
  adsExcluded: number
  postsExcluded: number
}

export interface AnalysisScreenData {
  ranking: RankingComparisonResult // FR-19 / ALG-07
  categoryDistribution: CategoryDistributionRow[] // FR-20
  categorySignificance: CategorySignificanceResult | null // Finding L
  correlation: CorrelationSelectionResult // FR-21 / ALG-08
  coverage: AnalysisCoverage
}

// S7 Analysis screen (mvp.md §4.4). FR-19/20 run on organic posts, FR-21
// runs entirely on ads data — they're independent populations queried in
// parallel. FR-21's result is persisted to CorrelationAssumptionRun on every
// load (ALG-08: "persist the assumption-test result and chosen method") —
// cheap at n~187 and an audit trail of every run is more defensible for a
// graded requirement than a single overwritten row.
export async function loadAnalysisScreenData(): Promise<AnalysisScreenData> {
  const [posts, ads] = await Promise.all([
    prisma.facebookPost.findMany({
      where: STUDY_PERIOD_POST_WHERE,
      select: { views: true, engagement_rate: true, category_final: true, reach: true },
    }),
    prisma.ad.findMany({
      where: STUDY_PERIOD_AD_WHERE,
      select: { ad_id: true, amount_spent: true, total_messaging_contacts: true, reach: true, post_engagements: true },
    }),
  ])

  const ranking = computeRankingComparison(
    posts.map(p => ({ views: p.views, organic_engagement_rate: p.engagement_rate, reach: p.reach }))
  )
  const categoryDistribution = computeCategoryDistribution(
    posts.map(p => ({ views: p.views, organic_engagement_rate: p.engagement_rate, category_final: p.category_final }))
  )
  // Finding L (docs/raven/analysis-tab-finding-l-memo.md §1.2) — run on
  // exactly the population the panel displays (STUDY_PERIOD_POST_WHERE,
  // real categories only), not the 707 inter-coder reliability set and not
  // any smaller subset either side of the review could individually reach.
  const categorySignificance = computeCategorySignificance(groupEngagementRatesByCategory(posts))
  const correlation = selectCorrelation(ads)

  const [adUpload, postUpload, totalPostCount, totalAdIdCount] = await Promise.all([
    latestUpload(['ADS_CSV']),
    latestUpload(['POSTS_CSV']),
    prisma.facebookPost.count(),
    // code-review-analyst (MEDIUM-6, 2026-09-07): groupBy + length, not
    // findMany + distinct — the latter pulls every distinct ad_id string
    // over the wire just to count them, on a request path that already runs
    // three other queries plus a write.
    prisma.ad.groupBy({ by: ['ad_id'] }),
  ])
  const lastUploadDate =
    adUpload && postUpload
      ? adUpload.date > postUpload.date ? adUpload.date : postUpload.date
      : adUpload?.date ?? postUpload?.date ?? null
  // code-review-analyst (HIGH-1, 2026-09-06): `ads` is one row per
  // advertisement PER MONTH (Ad ID + Reporting starts is the table's key —
  // see validate-ads.ts's duplicate-key comment), not one row per
  // advertisement. `ads.length` here is ad-month rows (~700+), which would
  // have rendered as "advertisements" directly above panels stating the
  // real distinct-advertisement count (e.g. "Across 187 advertisements").
  const inPeriodAdCount = new Set(ads.map(a => a.ad_id)).size
  const coverage: AnalysisCoverage = {
    periodLabel: STUDY_PERIOD_LABEL,
    adCount: inPeriodAdCount,
    postCount: posts.length,
    lastUploadDate,
    adsExcluded: Math.max(0, totalAdIdCount.length - inPeriodAdCount),
    postsExcluded: Math.max(0, totalPostCount - posts.length),
  }

  await prisma.correlationAssumptionRun.create({
    data: {
      n: correlation.n,
      method: correlation.method,
      coefficient: correlation.coefficient,
      p_value: correlation.p,
      shapiro_x_w: correlation.shapiroX.W,
      shapiro_x_p: correlation.shapiroX.p,
      shapiro_y_w: correlation.shapiroY.W,
      shapiro_y_p: correlation.shapiroY.p,
    },
  })

  return { ranking, categoryDistribution, categorySignificance, correlation, coverage }
}

// FR-27 — Owner-facing month-of-life cohort curves, loaded separately from
// the rest of S7 since only the Owner route renders this section (mvp.md
// §4.5 explicitly scopes FR-27 as Owner-facing, unlike the rest of S7 which
// both Owner and Marketing Manager see in full).
export async function loadAdLifecycleData(): Promise<AdLifecycleResult> {
  const [lifecycleRows, frequencyRows] = await Promise.all([
    prisma.ad.findMany({
      where: STUDY_PERIOD_AD_WHERE,
      select: { ad_id: true, reporting_starts: true, amount_spent: true, total_messaging_contacts: true, result_type: true },
    }),
    prisma.ad.findMany({
      where: STUDY_PERIOD_AD_WHERE,
      select: { ad_id: true, frequency: true, amount_spent: true, total_messaging_contacts: true },
    }),
  ])

  return computeAdLifecycle(lifecycleRows, frequencyRows)
}

export interface RegressionAnalysisData {
  primary: Fr31Result
  secondary: Fr31Result
  comparison: SpecificationComparison[] | null
}

// FR-31 — kept as a SEPARATE loader from loadAnalysisScreenData rather than
// folded in, because lib/reports/report-data.ts also calls
// loadAnalysisScreenData; folding FR-31 in would silently add it to the
// FR-23 PDF/CSV exports and write RegressionRun rows on every report build,
// neither of which either FR-31 document asks for. Persists one
// RegressionRun row per specification per S7 load, mirroring
// CorrelationAssumptionRun's audit-trail pattern above — written for
// Chapter 4, never read back by the app.
export async function loadRegressionAnalysis(): Promise<RegressionAnalysisData> {
  const ads = await prisma.ad.findMany({
    where: withStudyPeriodAd({ result_type: FR31_RESULT_TYPE }),
    select: {
      ad_id: true,
      ad_name: true,
      amount_spent: true,
      results: true,
      result_type: true,
      reach: true,
      impressions: true,
      link_clicks: true,
      post_engagements: true,
    },
  })

  const { primary, secondary, comparison } = fitFr31BothSpecifications(ads)

  // Best-effort audit trail: a persistence failure here (a dropped DB
  // connection, or a rank-deficient/degenerate fit producing NaN/Infinity
  // that a NOT NULL float column can't take) must never take down the S7
  // page over data that's written for Chapter 4 and never read back by the
  // app. Each call catches its own failure so one specification's write
  // failing can't also prevent the other's, or reject this Promise.all.
  await Promise.all([
    persistRegressionRun('PRIMARY', primary).catch(err =>
      console.error('FR-31: failed to persist PRIMARY RegressionRun (page display unaffected)', err)
    ),
    persistRegressionRun('SECONDARY', secondary).catch(err =>
      console.error('FR-31: failed to persist SECONDARY RegressionRun (page display unaffected)', err)
    ),
  ])

  return { primary, secondary, comparison }
}

// Maps a completed FR-31 fit onto RegressionRun's flat column set. Split
// out from persistRegressionRun so the field mapping (long, but not
// complex) is separate from the write/validation logic.
function toRegressionRunRow(specification: 'PRIMARY' | 'SECONDARY', fit: Fr31Fit) {
  const byTerm = Object.fromEntries(fit.coefficients.map(c => [c.term, c])) as Record<
    Fr31Fit['coefficients'][number]['term'],
    Fr31Fit['coefficients'][number]
  >

  return {
    specification,
    n: fit.fit.n,
    min_spend_filter: fit.minSpendFilter,
    r_squared: fit.fit.rSquared,
    adj_r_squared: fit.fit.adjRSquared,
    f_statistic: fit.fit.fStatistic,
    f_p_value: fit.fit.fPValue,
    residual_std_error: fit.fit.residualStdError,

    intercept_coef: byTerm.intercept.coefficient,
    intercept_se_ols: byTerm.intercept.seOls,
    intercept_se_hc3: byTerm.intercept.seHc3,
    intercept_p_ols: byTerm.intercept.pOls,
    intercept_p_hc3: byTerm.intercept.pHc3,

    engagement_rate_coef: byTerm.engagement_rate.coefficient,
    engagement_rate_se_ols: byTerm.engagement_rate.seOls,
    engagement_rate_se_hc3: byTerm.engagement_rate.seHc3,
    engagement_rate_p_ols: byTerm.engagement_rate.pOls,
    engagement_rate_p_hc3: byTerm.engagement_rate.pHc3,
    engagement_rate_vif: byTerm.engagement_rate.vif ?? NaN,

    frequency_coef: byTerm.frequency.coefficient,
    frequency_se_ols: byTerm.frequency.seOls,
    frequency_se_hc3: byTerm.frequency.seHc3,
    frequency_p_ols: byTerm.frequency.pOls,
    frequency_p_hc3: byTerm.frequency.pHc3,
    frequency_vif: byTerm.frequency.vif ?? NaN,

    ctr_coef: byTerm.ctr.coefficient,
    ctr_se_ols: byTerm.ctr.seOls,
    ctr_se_hc3: byTerm.ctr.seHc3,
    ctr_p_ols: byTerm.ctr.pOls,
    ctr_p_hc3: byTerm.ctr.pHc3,
    ctr_vif: byTerm.ctr.vif ?? NaN,

    cpm_coef: byTerm.cpm.coefficient,
    cpm_se_ols: byTerm.cpm.seOls,
    cpm_se_hc3: byTerm.cpm.seHc3,
    cpm_p_ols: byTerm.cpm.pOls,
    cpm_p_hc3: byTerm.cpm.pHc3,
    cpm_vif: byTerm.cpm.vif ?? NaN,

    breusch_pagan_lm: fit.breuschPagan.lm,
    breusch_pagan_p: fit.breuschPagan.pValue,
    jarque_bera_jb: fit.normality.jarqueBera.jb,
    jarque_bera_p: fit.normality.jarqueBera.pValue,
    jarque_bera_skew: fit.normality.jarqueBera.skewness,
    jarque_bera_exkurt: fit.normality.jarqueBera.excessKurtosis,
    shapiro_wilk_w: fit.normality.shapiroWilk?.w ?? null,
    shapiro_wilk_p: fit.normality.shapiroWilk?.p ?? null,

    in_sample_mae: fit.accuracy?.inSample.mae ?? null,
    in_sample_rmse: fit.accuracy?.inSample.rmse ?? null,
    in_sample_mape: fit.accuracy?.inSample.mape ?? null,
    cv_r_squared: fit.accuracy?.crossValidated.rSquared ?? null,
    cv_mae: fit.accuracy?.crossValidated.mae ?? null,
    cv_rmse: fit.accuracy?.crossValidated.rmse ?? null,
    cv_mape: fit.accuracy?.crossValidated.mape ?? null,
    baseline_mae: fit.accuracy?.baselineMedian.mae ?? null,
    baseline_rmse: fit.accuracy?.baselineMedian.rmse ?? null,
    baseline_mape: fit.accuracy?.baselineMedian.mape ?? null,

    // M3 (docs/raven/pr-review.md): spec §6 mandates the ≥₱1,000 spend
    // filter on the residual diagnostic specifically, and warns against
    // including the unfiltered version — SECONDARY's population has no
    // spend filter, so its residual diagnostic is spec-noncompliant and
    // must not land in this audit trail (the UI already only shows
    // PRIMARY's; this keeps the dump script and DB in agreement with it).
    residual_flagged_count: specification === 'PRIMARY' ? fit.residualDiagnostic.flaggedCount : null,
    residual_flagged_total_spend: specification === 'PRIMARY' ? fit.residualDiagnostic.flaggedTotalSpend : null,
  }
}

async function persistRegressionRun(specification: 'PRIMARY' | 'SECONDARY', fit: Fr31Result): Promise<void> {
  if (fit.status !== 'ok') return // n < 30: nothing to record

  const data = toRegressionRunRow(specification, fit)

  // Guard against NaN/Infinity reaching a NOT NULL float column — a
  // rank-deficient fit, or a VIF of Infinity when an auxiliary regression's
  // R^2 hits 1, would otherwise risk a rejected or garbled insert into what
  // is meant to be a silent, best-effort audit trail. Skip the write
  // (logging why) rather than let it fail unpredictably.
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      console.error(`FR-31: skipping ${specification} RegressionRun persistence — non-finite ${key} (${value})`)
      return
    }
  }

  await prisma.regressionRun.create({ data })
}
