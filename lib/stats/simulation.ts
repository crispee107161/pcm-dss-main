import { prisma } from '@/lib/prisma'
import type { SimulationOutput } from '@/types/index'

// z* for 80% two-sided prediction interval
const Z_80 = 1.2816

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

  let projected_purchases: number
  let interval_lower: number
  let interval_upper: number
  let equation: string

  if (latestModel.coef_reach != null && latestModel.coef_messaging != null && latestModel.coef_amount_spent != null) {
    // MLR with log-transform
    const x1 = Math.log1p(reach)
    const x2 = Math.log1p(messaging)
    const x3 = Math.log1p(amountSpent)
    projected_purchases = latestModel.intercept
      + latestModel.coef_reach * x1
      + latestModel.coef_messaging * x2
      + latestModel.coef_amount_spent * x3

    const rse = latestModel.residual_std_error ?? 1
    interval_lower = projected_purchases - Z_80 * rse
    interval_upper = projected_purchases + Z_80 * rse

    const s = (v: number) => (v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4))
    equation = `${latestModel.intercept.toFixed(4)} ${s(latestModel.coef_reach)}·log(1+Reach) ${s(latestModel.coef_messaging)}·log(1+Msgs) ${s(latestModel.coef_amount_spent)}·log(1+Spend)`
  } else {
    // Legacy SLR fallback
    projected_purchases = latestModel.intercept + latestModel.coefficient * amountSpent
    interval_lower = projected_purchases - Z_80
    interval_upper = projected_purchases + Z_80
    equation = `${latestModel.intercept.toFixed(4)} + ${latestModel.coefficient.toFixed(6)} × Amount Spent`
  }

  await prisma.simulationResult.create({
    data: {
      user_id: userId,
      reach_input: reach,
      messaging_input: messaging,
      amount_spent_input: amountSpent,
      projected_purchases,
      interval_lower: Math.max(0, interval_lower),
      interval_upper,
      model_id: latestModel.id,
    },
  })

  return {
    reach_input: reach,
    messaging_input: messaging,
    amount_spent_input: amountSpent,
    projected_purchases,
    interval_lower: Math.max(0, interval_lower),
    interval_upper,
    model: {
      intercept: latestModel.intercept,
      coef_reach: latestModel.coef_reach ?? 0,
      coef_messaging: latestModel.coef_messaging ?? 0,
      coef_amount_spent: latestModel.coef_amount_spent ?? latestModel.coefficient,
      r_squared: latestModel.r_squared,
      residual_std_error: latestModel.residual_std_error ?? 0,
      n: latestModel.n,
      equation,
    },
  }
}
