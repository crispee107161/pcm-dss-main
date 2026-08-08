import { predictFromModel } from '@/lib/stats/regression'
import { computeAdSetMetrics } from '@/lib/stats/ad-set-metrics'

export interface AdSetAllocation {
  ad_set_name: string
  allocated_spend: number
  pct: number
  projected_reach: number
  projected_inquiries: number
  interval_lower: number
  interval_upper: number
  historical_cpi: number | null
  historical_inquiries: number
}

export interface AllocationResult {
  total_budget: number
  total_projected_inquiries: number
  allocations: AdSetAllocation[]
  model_r_squared: number
  model_type: string
}

const Z_80 = 1.2816

export async function computeBudgetAllocation(totalBudget: number): Promise<AllocationResult> {
  const { model, eligible, globalReachPerPeso } = await computeAdSetMetrics()

  // Cap at top 8 ad sets by smoothed efficiency to keep the UI readable
  const top = [...eligible].sort((a, b) => b.efficiency - a.efficiency).slice(0, 8)

  const totalEfficiency = top.reduce((s, g) => s + g.efficiency, 0)

  const m = model
  const modelType = m.model_type ?? 'plain_mlr'

  const rse = m.residual_std_error ?? 1
  // Prediction interval for a new observation — sqrt(1 + 1/n) approximation
  const predSE = rse * Math.sqrt(1 + 1 / Math.max(m.n ?? 1, 1))

  const allocations: AdSetAllocation[] = top.map(g => {
    const pct = g.efficiency / totalEfficiency
    const allocated_spend = totalBudget * pct

    // Fall back to global average when an ad set has no historical data for a metric
    const projected_reach = Math.round(allocated_spend * (g.reach_per_peso || globalReachPerPeso))

    const projected_inquiries = Math.max(
      0,
      predictFromModel(m, projected_reach, allocated_spend),
    )

    return {
      ad_set_name: g.name,
      allocated_spend,
      pct,
      projected_reach,
      projected_inquiries,
      interval_lower: Math.max(0, projected_inquiries - Z_80 * predSE),
      interval_upper: projected_inquiries + Z_80 * predSE,
      historical_cpi: g.historical_cpi,
      historical_inquiries: g.historical_inquiries,
    }
  })

  const total_projected_inquiries = allocations.reduce((s, a) => s + a.projected_inquiries, 0)

  return {
    total_budget: totalBudget,
    total_projected_inquiries,
    allocations,
    model_r_squared: m.r_squared,
    model_type: modelType,
  }
}
