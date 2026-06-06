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

// Returns log-space mean/variance (for leverage) and raw-space min/max (for range checks)
function computeTrainingStats(vals: number[]) {
  const lv = vals.map(v => Math.log1p(v))
  const logMean = lv.reduce((s, v) => s + v, 0) / lv.length
  const logVariance = lv.reduce((s, v) => s + (v - logMean) ** 2, 0) / Math.max(lv.length - 1, 1)
  const rawMin = vals.reduce((m, v) => (v < m ? v : m), Infinity)
  const rawMax = vals.reduce((m, v) => (v > m ? v : m), -Infinity)
  return { logMean, logVariance, rawMin, rawMax }
}

export async function runSimulation(
  userId: number,
  reach: number,
  messaging: number,
  amountSpent: number
): Promise<SimulationOutput> {
  const [latestModel, trainingAds] = await Promise.all([
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.ad.findMany({
      where: { purchases: { not: null } },
      select: { reach: true, total_messaging_contacts: true, amount_spent: true },
    }),
  ])

  if (!latestModel) {
    throw new Error('No regression model available. Please upload ad data first so the model can be trained.')
  }

  const projected_purchases = predictFromModel(latestModel, reach, messaging, amountSpent)
  const rse = latestModel.residual_std_error ?? 1
  const n = latestModel.n ?? 1

  // ── Training stats (computed once, used for both leverage and range checks) ──
  const trainN = trainingAds.length
  const reachStats = trainN > 0 ? computeTrainingStats(trainingAds.map(a => a.reach ?? 0)) : null
  const msgStats = trainN > 0 ? computeTrainingStats(trainingAds.map(a => a.total_messaging_contacts ?? 0)) : null
  const spendStats = trainN > 0 ? computeTrainingStats(trainingAds.map(a => a.amount_spent)) : null

  // ── Prediction interval with approximate leverage ──────────────────────────
  // True prediction interval requires x^T (X^TX)^{-1} x (the hat-matrix diagonal).
  // We approximate it via standardized squared distance from the training centroid
  // in log-space: predictions far from familiar inputs automatically get wider intervals.
  let leverage = 1 / Math.max(n, 1)
  if (reachStats && reachStats.logVariance > 0)
    leverage += (Math.log1p(reach) - reachStats.logMean) ** 2 / ((n - 1) * reachStats.logVariance)
  if (msgStats && msgStats.logVariance > 0)
    leverage += (Math.log1p(messaging) - msgStats.logMean) ** 2 / ((n - 1) * msgStats.logVariance)
  if (spendStats && spendStats.logVariance > 0)
    leverage += (Math.log1p(amountSpent) - spendStats.logMean) ** 2 / ((n - 1) * spendStats.logVariance)

  const predSE = rse * Math.sqrt(1 + leverage)
  const interval_lower = Math.max(0, projected_purchases - Z_80 * predSE)
  const interval_upper = projected_purchases + Z_80 * predSE

  // ── Out-of-range warnings ─────────────────────────────────────────────────
  const warnings: string[] = []

  if (reachStats && reach > 0 && (reach < reachStats.rawMin || reach > reachStats.rawMax)) {
    warnings.push(
      `Reach (${reach.toLocaleString()}) is outside the model's training range (${reachStats.rawMin.toLocaleString()}–${reachStats.rawMax.toLocaleString()}). The prediction interval is automatically widened to reflect this.`
    )
  }
  if (msgStats && messaging > 0 && (messaging < msgStats.rawMin || messaging > msgStats.rawMax)) {
    warnings.push(
      `Messaging Contacts (${messaging.toLocaleString()}) is outside the training range (${msgStats.rawMin.toLocaleString()}–${msgStats.rawMax.toLocaleString()}). Treat this result as approximate.`
    )
  }
  if (spendStats && (amountSpent < spendStats.rawMin || amountSpent > spendStats.rawMax)) {
    warnings.push(
      `Ad Spend (₱${amountSpent.toLocaleString()}) is outside the training range (₱${spendStats.rawMin.toLocaleString()}–₱${spendStats.rawMax.toLocaleString()}). Extrapolation beyond observed spend levels reduces accuracy.`
    )
  }
  if (latestModel.r_squared < 0.5) {
    warnings.push(
      `Model fit is low (R² = ${(latestModel.r_squared * 100).toFixed(1)}%). Less than half of purchase variation is explained — uploading more diverse ad data will improve reliability.`
    )
  }
  if (n < 20) {
    warnings.push(
      `The model was trained on only ${n} ad record${n === 1 ? '' : 's'}. Predictions become more reliable with 20+ records.`
    )
  }

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
    warnings,
    training_ranges: reachStats && msgStats && spendStats
      ? {
          reach: [reachStats.rawMin, reachStats.rawMax],
          messaging: [msgStats.rawMin, msgStats.rawMax],
          spend: [spendStats.rawMin, spendStats.rawMax],
        }
      : undefined,
  }
}
