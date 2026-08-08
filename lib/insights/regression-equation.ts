import type { RegressionModel } from '@/app/generated/prisma/client'

export interface ModelMeta {
  label: string
  description: string
}

const MODEL_LABELS: Record<string, ModelMeta> = {
  log_mlr:   { label: 'Log-Linear MLR',   description: 'Log-transformed predictors capture diminishing returns' },
  plain_mlr: { label: 'Plain MLR',         description: 'Linear relationship between Reach, Spend, and Messaging Conversations' },
  poly_mlr:  { label: 'Polynomial MLR',    description: 'Quadratic spend term captures non-linear ad response curves' },
  ridge_mlr: { label: 'Ridge MLR',         description: 'Regularized to reduce overfitting from correlated predictors' },
}

export function getModelMeta(model: RegressionModel): ModelMeta {
  const type = model.model_type ?? (model.coef_reach != null ? 'plain_mlr' : 'slr')
  return MODEL_LABELS[type] ?? { label: 'Simple Linear Regression', description: 'Predicts messaging conversations from spend only' }
}

// Legacy model types (log_mlr, poly_mlr, ridge_mlr, ...) predate the DV
// pivot and are no longer trained by maybeRetrainRegression (only
// 'plain_mlr' is produced now) — any surviving rows are stale and get
// purged by scripts/purge-inquiry-regression-models.ts. The `?? 0`
// fallbacks below (replacing the old `!` non-null assertions on
// coef_messaging) are defensive only, so a stale row can't crash this
// function before the purge runs.
export function buildEquation(model: RegressionModel): string {
  const s = (v: number) => (v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4))
  const type = model.model_type ?? (model.coef_reach != null ? 'plain_mlr' : 'slr')

  if (type === 'plain_mlr' && model.coef_reach != null && model.coef_amount_spent != null) {
    return `MessagingConversations = ${model.intercept.toFixed(4)} ${s(model.coef_reach)}·Reach ${s(model.coef_amount_spent)}·Spend`
  }
  if (type === 'poly_mlr' && model.coef_reach != null) {
    return `MessagingConversations = ${model.intercept.toFixed(4)} ${s(model.coef_reach)}·log(1+Reach) ${s(model.coef_amount_spent ?? 0)}·log(1+Spend) ${s(model.coef_spend_sq ?? 0)}·log(1+Spend)²`
  }
  if (model.coef_reach != null && model.coef_amount_spent != null) {
    const suffix = type === 'ridge_mlr' ? ' [ridge λ=0.1]' : ''
    return `MessagingConversations = ${model.intercept.toFixed(4)} ${s(model.coef_reach)}·log(1+Reach) ${s(model.coef_amount_spent)}·log(1+Spend)${suffix}`
  }
  return `MessagingConversations = ${model.intercept.toFixed(4)} + ${model.coefficient.toFixed(6)} × Amount Spent`
}

export function computeAdjR2(r2: number, n: number, modelType: string | null, isMLR: boolean): number {
  // poly_mlr's equation (buildEquation above) has 3 predictor terms
  // (log Reach, log Spend, log Spend²) since the DV pivot dropped Messaging
  // as a predictor — p must match, or adjusted R² penalizes for a 4th
  // predictor that isn't actually in the fitted equation. Only reachable via
  // legacy rows predating the pivot; scripts/purge-inquiry-regression-models.ts
  // removes them going forward.
  const p = modelType === 'poly_mlr' ? 3 : isMLR ? 2 : 1
  if (n <= p + 1) return 0
  return 1 - (1 - r2) * (n - 1) / (n - p - 1)
}
