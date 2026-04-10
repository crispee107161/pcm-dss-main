import { prisma } from '@/lib/prisma'
import type { SimulationOutput } from '@/types/index'

export async function runSimulation(
  userId: number,
  amountSpent: number
): Promise<SimulationOutput> {
  const latestModel = await prisma.regressionModel.findFirst({
    orderBy: { trained_at: 'desc' },
  })

  if (!latestModel) {
    throw new Error(
      'No regression model available. Please upload ad data first so the model can be trained.'
    )
  }

  const projected_purchases =
    latestModel.intercept + latestModel.coefficient * amountSpent

  await prisma.simulationResult.create({
    data: {
      user_id: userId,
      amount_spent_input: amountSpent,
      projected_purchases,
      model_id: latestModel.id,
    },
  })

  const equation = `Purchases = ${latestModel.intercept.toFixed(4)} + ${latestModel.coefficient.toFixed(6)} × Amount Spent`

  return {
    amount_spent_input: amountSpent,
    projected_purchases,
    model: {
      intercept: latestModel.intercept,
      coefficient: latestModel.coefficient,
      r_squared: latestModel.r_squared,
      n: latestModel.n,
      equation,
    },
  }
}
