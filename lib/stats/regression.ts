import { prisma } from '@/lib/prisma'
import { pairKey } from '@/lib/pair-key'

export type ModelType = 'plain_mlr'
export const CURRENT_MODEL_TYPE: ModelType = 'plain_mlr'

// Solve Ax = b using Gaussian elimination with partial pivoting.
// Returns `singular: true` when a pivot was too close to zero to invert
// safely — previously this silently left the corresponding coefficient at 0,
// which can misread as "this predictor doesn't matter" when the system was
// actually numerically singular. Callers must surface `singular` as a
// warning instead of trusting the coefficient at face value.
function gaussianElimination(A: number[][], b: number[]): { x: number[]; singular: boolean } {
  const n = A.length
  const M = A.map((row, i) => [...row, b[i]])
  let singular = false

  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
    }
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]

    const pivot = M[col][col]
    if (Math.abs(pivot) < 1e-12) {
      singular = true
      continue
    }

    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / pivot
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j]
    }
  }

  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(M[i][i]) < 1e-12) {
      singular = true
      continue
    }
    x[i] = M[i][n]
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j]
    x[i] /= M[i][i]
  }
  return { x, singular }
}

export interface TrainingData {
  reach: number
  amount_spent: number
  messaging_conversations: number
}

interface FitResult {
  modelType: ModelType
  intercept: number
  coef_reach: number
  coef_amount_spent: number
  r_squared: number
  adj_r_squared: number
  residual_std_error: number
  n: number
  equation: string
  singular?: boolean
  collinearity_warning?: string
}

export interface MLRResult {
  intercept: number
  coef_reach: number
  coef_amount_spent: number
  r_squared: number
  residual_std_error: number
  n: number
  equation: string
  singular?: boolean
  collinearity_warning?: string
}

function fmt(v: number): string {
  return v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4)
}

// Pearson product-moment correlation coefficient between two equal-length
// numeric arrays. Used here for the Reach/Spend VIF check below.
export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = a.length
  if (n === 0) return 0
  const meanA = a.reduce((s, v) => s + v, 0) / n
  const meanB = b.reduce((s, v) => s + v, 0) / n
  let num = 0
  let denA = 0
  let denB = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA
    const db = b[i] - meanB
    num += da * db
    denA += da * da
    denB += db * db
  }
  const den = Math.sqrt(denA * denB)
  return den === 0 ? 0 : num / den
}

// This project's own methodology treats VIF > 10 as the collinearity
// threshold worth surfacing.
const VIF_WARNING_THRESHOLD = 10

// Plain OLS: MessagingConversations = β₀ + β₁·Reach + β₂·Spend
function fitPlainMLR(data: TrainingData[]): FitResult {
  const n = data.length
  const y = data.map(d => d.messaging_conversations)
  const X = data.map(d => [1, d.reach, d.amount_spent])
  const p = 3

  const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0))
  for (let i = 0; i < p; i++)
    for (let j = 0; j < p; j++)
      for (let k = 0; k < n; k++)
        XtX[i][j] += X[k][i] * X[k][j]

  const Xty = new Array(p).fill(0)
  for (let i = 0; i < p; i++)
    for (let k = 0; k < n; k++)
      Xty[i] += X[k][i] * y[k]

  const { x: beta, singular } = gaussianElimination(XtX, Xty)
  const [intercept, coef_reach, coef_amount_spent] = beta

  const meanY = y.reduce((a, b) => a + b, 0) / n
  const ssTot = y.reduce((s, yi) => s + (yi - meanY) ** 2, 0)
  let ssRes = 0
  for (let k = 0; k < n; k++) {
    const yhat = beta.reduce((s, b, j) => s + b * X[k][j], 0)
    ssRes += (y[k] - yhat) ** 2
  }

  const r_squared = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  const numPredictors = 2
  const adj_r_squared = n > numPredictors + 1
    ? 1 - (1 - r_squared) * (n - 1) / (n - numPredictors - 1)
    : 0
  const residual_std_error = n > p ? Math.sqrt(ssRes / (n - p)) : 0

  // VIF check: with exactly two predictors (Reach, Spend), VIF is the same
  // for both and reduces to 1 / (1 - r²) where r is their pairwise
  // correlation. Surface a warning instead of proceeding silently — a
  // near-singular fit here can misread as "spend doesn't matter" when it's
  // actually numerical collinearity between the two predictors.
  const reachArr = data.map(d => d.reach)
  const spendArr = data.map(d => d.amount_spent)
  const r = pearsonCorrelation(reachArr, spendArr)
  const vif = r * r >= 1 ? Infinity : 1 / (1 - r * r)
  let collinearity_warning: string | undefined
  if (vif > VIF_WARNING_THRESHOLD) {
    collinearity_warning = `Reach and Spend are highly collinear (VIF=${vif.toFixed(1)}); coefficients may be unstable.`
    console.warn(`[regression] ${collinearity_warning}`)
  }

  return {
    modelType: 'plain_mlr',
    intercept, coef_reach, coef_amount_spent,
    r_squared, adj_r_squared, residual_std_error, n,
    equation: `MessagingConversations = ${intercept.toFixed(4)} ${fmt(coef_reach)}·Reach ${fmt(coef_amount_spent)}·Spend`,
    singular: singular || undefined,
    collinearity_warning,
  }
}

// ─── Aggregation ────────────────────────────────────────────────────────────

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export interface AdRowForTraining {
  ad_name: string
  ad_set_name: string
  reach: number | null
  amount_spent: number
  total_messaging_contacts: number | null
  reporting_starts: Date
  reporting_ends: Date
}

// Collapses ad-day rows to one training observation per unique
// (ad_name, ad_set_name) pair. The real daily export produces ~4,986 ad-day
// rows across only ~186 unique ads (median 17 rows/ad) — training on raw
// ad-day rows is pseudo-replication and deflates standard errors, so every
// caller that fits or evaluates the regression model must aggregate to the
// ad level first.
//
// - amount_spent / messaging_conversations: SUMMED across the group — both
//   are period totals, so summing daily contributions is correct.
// - reach: MAX across the group, NOT summed. Facebook's `Reach` is
//   deduplicated per reporting period (a person seen on day 1 and day 3 of
//   the same ad counts once, not twice), so summing daily reach overstates
//   lifetime reach. Taking the max single-day reach is a conservative
//   floor-estimate of true lifetime reach, not a full fix — true lifetime
//   reach lies somewhere between this max and the (overstated) sum. This is
//   a documented tradeoff, not a silently-picked shortcut.
//
// Daily-granularity rows only: a multi-day (monthly-aggregate) row that
// survives supersession — e.g. an ad renamed between the monthly and daily
// exports, unmatchable by name — must never enter training or any
// model-consistent read of the training population as a month-sized outlier
// alongside per-day observations. Enforced here, not by callers, so it can't
// be forgotten at a new call site.
export function aggregateAdsForTraining(ads: AdRowForTraining[]): TrainingData[] {
  const grouped = new Map<string, { reach: number; amount_spent: number; messaging_conversations: number }>()

  for (const ad of ads) {
    if (ad.reporting_ends.getTime() - ad.reporting_starts.getTime() >= ONE_DAY_MS) continue
    const key = pairKey(ad.ad_name, ad.ad_set_name)
    const existing = grouped.get(key) ?? { reach: 0, amount_spent: 0, messaging_conversations: 0 }
    grouped.set(key, {
      reach: Math.max(existing.reach, ad.reach ?? 0),
      amount_spent: existing.amount_spent + ad.amount_spent,
      messaging_conversations: existing.messaging_conversations + (ad.total_messaging_contacts ?? 0),
    })
  }

  return [...grouped.values()]
}

// ─── Public prediction ────────────────────────────────────────────────────────

export function predictFromModel(
  model: {
    model_type?: string | null
    intercept: number
    coef_reach?: number | null
    coef_amount_spent?: number | null
    coef_messaging?: number | null
    coefficient: number
  },
  reach: number,
  spend: number,
): number {
  // coef_messaging is only ever non-null on a pre-pivot 4-predictor model
  // trained against the old "Inquiries" formula (see
  // scripts/purge-inquiry-regression-models.ts). Predicting from one would
  // silently return inquiry-scale numbers mislabeled as messaging
  // conversations, so fail loudly instead — this should only ever fire if
  // the purge script was skipped after a fresh migration/seed.
  if (model.coef_messaging != null) {
    throw new Error(
      'This regression model was trained under the old inquiries-based formula and cannot be used to predict messaging conversations. Run scripts/purge-inquiry-regression-models.ts and retrain.'
    )
  }
  return model.intercept
    + (model.coef_reach ?? 0) * reach
    + (model.coef_amount_spent ?? model.coefficient) * spend
}

// ─── Public exports ───────────────────────────────────────────────────────────

export function fitMLR(data: TrainingData[]): MLRResult {
  const result = fitPlainMLR(data)
  return {
    intercept: result.intercept,
    coef_reach: result.coef_reach,
    coef_amount_spent: result.coef_amount_spent,
    r_squared: result.r_squared,
    residual_std_error: result.residual_std_error,
    n: result.n,
    equation: result.equation,
    singular: result.singular,
    collinearity_warning: result.collinearity_warning,
  }
}

export async function maybeRetrainRegression(): Promise<boolean> {
  const ads = await prisma.ad.findMany({ where: { total_messaging_contacts: { not: null } } })
  const data = aggregateAdsForTraining(ads)
  if (data.length < 10) return false

  const result = fitPlainMLR(data)

  const collinearity_warning = result.singular
    ? 'Model fit is numerically singular — Reach and Spend coefficients are unreliable and should not be trusted at face value.'
    : result.collinearity_warning ?? null

  await prisma.regressionModel.create({
    data: {
      intercept: result.intercept,
      coefficient: result.coef_amount_spent,
      coef_reach: result.coef_reach,
      coef_messaging: null,
      coef_amount_spent: result.coef_amount_spent,
      coef_spend_sq: null,
      coef_link_clicks: null,
      model_type: result.modelType,
      r_squared: result.r_squared,
      adj_r_squared: result.adj_r_squared,
      residual_std_error: result.residual_std_error,
      n: result.n,
      collinearity_warning,
    },
  })

  return true
}
