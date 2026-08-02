import { prisma } from '@/lib/prisma'
import { predictFromModel } from '@/lib/stats/regression'
import type { SimulationOutput } from '@/types/index'

const N_ITER = 1000

// Box-Muller transform — generates a standard normal sample
export function randNormal(): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2)
}

function buildEquation(model: {
  model_type?: string | null
  intercept: number
  coef_reach?: number | null
  coef_messaging?: number | null
  coef_amount_spent?: number | null
  coefficient: number
}): string {
  const s = (v: number) => (v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4))
  return `${model.intercept.toFixed(4)} ${s(model.coef_reach ?? 0)}·Reach ${s(model.coef_messaging ?? 0)}·Msgs ${s(model.coef_amount_spent ?? 0)}·Spend`
}

function computeTrainingStats(vals: number[]) {
  const rawMin = vals.reduce((m, v) => (v < m ? v : m), Infinity)
  const rawMax = vals.reduce((m, v) => (v > m ? v : m), -Infinity)
  return { rawMin, rawMax }
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

  const basePredict = predictFromModel(latestModel, reach, messaging, amountSpent)
  const rse = latestModel.residual_std_error ?? 1

  // Monte Carlo: run N_ITER samples with Gaussian noise from model residuals
  const samples: number[] = Array.from({ length: N_ITER }, () =>
    Math.max(0, basePredict + randNormal() * rse)
  )
  samples.sort((a, b) => a - b)

  const projected_purchases = samples[Math.floor(N_ITER / 2)]     // median
  const interval_lower      = samples[Math.floor(0.05 * N_ITER)]  // 5th percentile → 90% interval
  const interval_upper      = samples[Math.floor(0.95 * N_ITER)]  // 95th percentile

  // ── Out-of-range warnings ─────────────────────────────────────────────────
  const warnings: string[] = []
  const trainN = trainingAds.length

  let reachStats: { rawMin: number; rawMax: number } | null = null
  let msgStats:   { rawMin: number; rawMax: number } | null = null
  let spendStats: { rawMin: number; rawMax: number } | null = null

  if (trainN > 0) {
    reachStats = computeTrainingStats(trainingAds.map(a => a.reach ?? 0))
    msgStats   = computeTrainingStats(trainingAds.map(a => a.total_messaging_contacts ?? 0))
    spendStats = computeTrainingStats(trainingAds.map(a => a.amount_spent))
  }

  if (reachStats && reach > 0 && (reach < reachStats.rawMin || reach > reachStats.rawMax)) {
    warnings.push(
      `Reach (${reach.toLocaleString()}) is outside the model's training range (${reachStats.rawMin.toLocaleString()}–${reachStats.rawMax.toLocaleString()}). Treat this result as approximate.`
    )
  }
  if (msgStats && messaging > 0 && (messaging < msgStats.rawMin || messaging > msgStats.rawMax)) {
    warnings.push(
      `Messaging Contacts (${messaging.toLocaleString()}) is outside the training range (${msgStats.rawMin.toLocaleString()}–${msgStats.rawMax.toLocaleString()}). Treat this result as approximate.`
    )
  }
  if (spendStats && (amountSpent < spendStats.rawMin || amountSpent > spendStats.rawMax)) {
    warnings.push(
      `Ad Spend (₱${amountSpent.toLocaleString()}) is outside the training range (₱${spendStats.rawMin.toLocaleString()}–₱${spendStats.rawMax.toLocaleString()}). Extrapolation reduces accuracy.`
    )
  }
  if (latestModel.r_squared < 0.5) {
    warnings.push(
      `Model fit is low (R² = ${(latestModel.r_squared * 100).toFixed(1)}%). Uploading more diverse ad data will improve reliability.`
    )
  }
  if (latestModel.n < 20) {
    warnings.push(
      `The model was trained on only ${latestModel.n} ad record${latestModel.n === 1 ? '' : 's'}. Predictions become more reliable with 20+ records.`
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
      model_type: latestModel.model_type ?? 'plain_mlr',
      coef_spend_sq: 0,
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
