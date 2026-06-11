import { prisma } from '@/lib/prisma'
import { predictFromModel } from '@/lib/stats/regression'

export interface AdSetAllocation {
  ad_set_name: string
  allocated_spend: number
  pct: number
  projected_reach: number
  projected_messaging: number
  projected_purchases: number
  interval_lower: number
  interval_upper: number
  historical_cpa: number | null
  historical_purchases: number
}

export interface AllocationResult {
  total_budget: number
  total_projected_purchases: number
  allocations: AdSetAllocation[]
  model_r_squared: number
  model_type: string
}

const Z_80 = 1.2816

export async function computeBudgetAllocation(totalBudget: number): Promise<AllocationResult> {
  const [model, ads] = await Promise.all([
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.ad.findMany({
      select: {
        ad_set_name: true,
        amount_spent: true,
        purchases: true,
        reach: true,
        total_messaging_contacts: true,
      },
    }),
  ])

  if (!model) throw new Error('No regression model trained yet. Upload ad data first.')
  if (ads.length === 0) throw new Error('No ad data available. Upload an Ads CSV first.')

  // Group by ad set
  const grouped = new Map<string, {
    total_spend: number
    total_purchases: number
    total_reach: number
    total_messaging: number
    count: number
  }>()

  for (const ad of ads) {
    const key = ad.ad_set_name
    const existing = grouped.get(key) ?? {
      total_spend: 0, total_purchases: 0, total_reach: 0,
      total_messaging: 0, count: 0,
    }
    grouped.set(key, {
      total_spend:     existing.total_spend + ad.amount_spent,
      total_purchases: existing.total_purchases + (ad.purchases ?? 0),
      total_reach:     existing.total_reach + (ad.reach ?? 0),
      total_messaging: existing.total_messaging + (ad.total_messaging_contacts ?? 0),
      count:           existing.count + 1,
    })
  }

  // Only include ad sets with spend > 0 and at least 1 purchase
  const eligible = [...grouped.entries()]
    .filter(([, g]) => g.total_spend > 0 && g.total_purchases > 0)
    .map(([name, g]) => {
      // Laplace-smoothed efficiency: add a pseudo-count of 1 purchase at the group's own CPA
      // so that ad sets with very few purchases don't appear artificially superior
      const cpaEstimate = g.total_spend / Math.max(g.total_purchases, 1)
      const smoothedPurchases = g.total_purchases + 1
      const smoothedSpend = g.total_spend + cpaEstimate
      return {
        name,
        efficiency: smoothedPurchases / smoothedSpend,
        reach_per_peso:     g.total_reach / g.total_spend,
        messaging_per_peso: g.total_messaging / g.total_spend,
        historical_cpa: g.total_purchases > 0 ? g.total_spend / g.total_purchases : null,
        historical_purchases: g.total_purchases,
      }
    })

  if (eligible.length === 0) throw new Error('No ad sets with purchase data found. Ensure your uploaded ads include purchase counts.')

  // Global average ratios — fallback when an ad set has no historical data for a metric
  const globalReachPerPeso     = eligible.reduce((s, g) => s + g.reach_per_peso, 0)     / eligible.length
  const globalMessagingPerPeso = eligible.reduce((s, g) => s + g.messaging_per_peso, 0) / eligible.length

  // Cap at top 8 ad sets by smoothed efficiency to keep the UI readable
  const top = eligible.sort((a, b) => b.efficiency - a.efficiency).slice(0, 8)

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
    const projected_reach     = Math.round(allocated_spend * (g.reach_per_peso     || globalReachPerPeso))
    const projected_messaging = Math.round(allocated_spend * (g.messaging_per_peso || globalMessagingPerPeso))

    const projected_purchases = Math.max(
      0,
      predictFromModel(m, projected_reach, projected_messaging, allocated_spend),
    )

    return {
      ad_set_name: g.name,
      allocated_spend,
      pct,
      projected_reach,
      projected_messaging,
      projected_purchases,
      interval_lower: Math.max(0, projected_purchases - Z_80 * predSE),
      interval_upper: projected_purchases + Z_80 * predSE,
      historical_cpa: g.historical_cpa,
      historical_purchases: g.historical_purchases,
    }
  })

  const total_projected_purchases = allocations.reduce((s, a) => s + a.projected_purchases, 0)

  return {
    total_budget: totalBudget,
    total_projected_purchases,
    allocations,
    model_r_squared: m.r_squared,
    model_type: modelType,
  }
}
