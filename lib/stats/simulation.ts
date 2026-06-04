import { prisma } from '@/lib/prisma'
import { predictFromModel } from '@/lib/stats/regression'
import type { SimulationOutput } from '@/types/index'

// z* for 80% two-sided prediction interval
const Z_80 = 1.2816

function buildEquation(model: {
  model_type?: string | null
  intercept: number
  coef_reach?: number | null
  coef_messaging?: number | null
  coef_amount_spent?: number | null
  coef_spend_sq?: number | null
  coefficient: number
}): string {
  const s = (v: number) => (v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4))
  const type = model.model_type ?? (model.coef_reach != null ? 'log_mlr' : 'slr')

  if (type === 'plain_mlr') {
    return `${model.intercept.toFixed(4)} ${s(model.coef_reach!)}·Reach ${s(model.coef_messaging!)}·Msgs ${s(model.coef_amount_spent!)}·Spend`
  }
  if (type === 'poly_mlr') {
    return `${model.intercept.toFixed(4)} ${s(model.coef_reach!)}·log(1+Reach) ${s(model.coef_messaging!)}·log(1+Msgs) ${s(model.coef_amount_spent!)}·log(1+Spend) ${s(model.coef_spend_sq ?? 0)}·log(1+Spend)²`
  }
  if (type === 'log_log_mlr') {
    return `log(1+Purchases) = ${model.intercept.toFixed(4)} ${s(model.coef_reach!)}·log(1+Reach) ${s(model.coef_messaging!)}·log(1+Msgs) ${s(model.coef_amount_spent!)}·log(1+Spend) [elasticity]`
  }
  if (model.coef_reach != null && model.coef_messaging != null && model.coef_amount_spent != null) {
    const suffixMap: Record<string, string> = {
      ridge_mlr: ' [ridge λ=0.1]',
      lasso_mlr: ' [lasso λ=0.1]',
      elastic_net_mlr: ' [elastic net]',
      wls_mlr: ' [wls 90d decay]',
      robust_mlr: ' [robust huber]',
    }
    const suffix = suffixMap[type] ?? ''
    return `${model.intercept.toFixed(4)} ${s(model.coef_reach)}·log(1+Reach) ${s(model.coef_messaging)}·log(1+Msgs) ${s(model.coef_amount_spent)}·log(1+Spend)${suffix}`
  }
  return `${model.intercept.toFixed(4)} + ${model.coefficient.toFixed(6)} × Amount Spent`
}

export async function runSimulation(
  userId: number,
  reach: number,
  messaging: number,
  amountSpent: number
): Promise<SimulationOutput> {
  const latestModel = await prisma.regressionModel.findFirst({
    orderBy: { trained_at: 'desc' },
  })

  if (!latestModel) {
    throw new Error('No regression model available. Please upload ad data first so the model can be trained.')
  }

  const projected_purchases = predictFromModel(latestModel, reach, messaging, amountSpent)
  const rse = latestModel.residual_std_error ?? 1
  // Prediction interval for a new observation: SE = RSE * sqrt(1 + 1/n)
  // (approximate — full formula requires the leverage term x^T(X^TX)^{-1}x)
  const n = latestModel.n ?? 1
  const predSE = rse * Math.sqrt(1 + 1 / Math.max(n, 1))
  const interval_lower = Math.max(0, projected_purchases - Z_80 * predSE)
  const interval_upper = projected_purchases + Z_80 * predSE

  await prisma.simulationResult.create({
    data: {
      user_id: userId,
      reach_input: reach,
      messaging_input: messaging,
      amount_spent_input: amountSpent,
      projected_purchases,
      interval_lower,
      interval_upper,
      model_id: latestModel.id,
    },
  })

  return {
    reach_input: reach,
    messaging_input: messaging,
    amount_spent_input: amountSpent,
    projected_purchases,
    interval_lower,
    interval_upper,
    model: {
      intercept: latestModel.intercept,
      coef_reach: latestModel.coef_reach ?? 0,
      coef_messaging: latestModel.coef_messaging ?? 0,
      coef_amount_spent: latestModel.coef_amount_spent ?? latestModel.coefficient,
      r_squared: latestModel.r_squared,
      residual_std_error: latestModel.residual_std_error ?? 0,
      n: latestModel.n,
      equation: buildEquation(latestModel),
      model_type: latestModel.model_type ?? 'log_mlr',
      coef_spend_sq: latestModel.coef_spend_sq ?? 0,
    },
  }
}
