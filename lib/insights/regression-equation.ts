import type { RegressionModel } from '@/app/generated/prisma/client'

export interface ModelMeta {
  label: string
  description: string
}

const MODEL_LABELS: Record<string, ModelMeta> = {
  log_mlr:   { label: 'Log-Linear MLR',   description: 'Log-transformed predictors capture diminishing returns' },
  plain_mlr: { label: 'Plain MLR',         description: 'Linear relationship between raw metrics and purchases' },
  poly_mlr:  { label: 'Polynomial MLR',    description: 'Quadratic spend term captures non-linear ad response curves' },
  ridge_mlr: { label: 'Ridge MLR',         description: 'Regularized to reduce overfitting from correlated predictors' },
}

export function getModelMeta(model: RegressionModel): ModelMeta {
  const type = model.model_type ?? (model.coef_reach != null ? 'plain_mlr' : 'slr')
  return MODEL_LABELS[type] ?? { label: 'Simple Linear Regression', description: 'Predicts purchases from spend only' }
}

export function buildEquation(model: RegressionModel): string {
  const s = (v: number) => (v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4))
  const type = model.model_type ?? (model.coef_reach != null ? 'plain_mlr' : 'slr')

  if (type === 'plain_mlr' && model.coef_reach != null) {
    return `Purchases = ${model.intercept.toFixed(4)} ${s(model.coef_reach)}·Reach ${s(model.coef_messaging!)}·Msgs ${s(model.coef_amount_spent!)}·Spend`
  }
  if (type === 'poly_mlr' && model.coef_reach != null) {
    return `Purchases = ${model.intercept.toFixed(4)} ${s(model.coef_reach)}·log(1+Reach) ${s(model.coef_messaging!)}·log(1+Msgs) ${s(model.coef_amount_spent!)}·log(1+Spend) ${s(model.coef_spend_sq ?? 0)}·log(1+Spend)²`
  }
  if (model.coef_reach != null && model.coef_messaging != null && model.coef_amount_spent != null) {
    const suffix = type === 'ridge_mlr' ? ' [ridge λ=0.1]' : ''
    return `Purchases = ${model.intercept.toFixed(4)} ${s(model.coef_reach)}·log(1+Reach) ${s(model.coef_messaging)}·log(1+Msgs) ${s(model.coef_amount_spent)}·log(1+Spend)${suffix}`
  }
  return `Purchases = ${model.intercept.toFixed(4)} + ${model.coefficient.toFixed(6)} × Amount Spent`
}

export function computeAdjR2(r2: number, n: number, modelType: string | null, isMLR: boolean): number {
  const p = modelType === 'poly_mlr' ? 4 : isMLR ? 3 : 1
  if (n <= p + 1) return 0
  return 1 - (1 - r2) * (n - 1) / (n - p - 1)
}
