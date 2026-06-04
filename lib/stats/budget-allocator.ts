import { prisma } from '@/lib/prisma'

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
  is_mlr: boolean
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
    const existing = grouped.get(key) ?? { total_spend: 0, total_purchases: 0, total_reach: 0, total_messaging: 0, count: 0 }
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
    .map(([name, g]) => ({
      name,
      efficiency: g.total_purchases / g.total_spend,
      reach_per_peso: g.total_spend > 0 ? g.total_reach / g.total_spend : 0,
      messaging_per_peso: g.total_spend > 0 ? g.total_messaging / g.total_spend : 0,
      historical_cpa: g.total_purchases > 0 ? g.total_spend / g.total_purchases : null,
      historical_purchases: g.total_purchases,
    }))

  if (eligible.length === 0) throw new Error('No ad sets with purchase data found. Ensure your uploaded ads include purchase counts.')

  // Cap at top 8 ad sets by efficiency to keep the UI readable
  const top = eligible.sort((a, b) => b.efficiency - a.efficiency).slice(0, 8)

  const totalEfficiency = top.reduce((s, g) => s + g.efficiency, 0)

  const m = model
  const isMLR = m.coef_reach != null && m.coef_messaging != null && m.coef_amount_spent != null

  function predict(reach: number, messaging: number, spend: number) {
    if (isMLR) {
      return m.intercept
        + (m.coef_reach ?? 0) * Math.log1p(reach)
        + (m.coef_messaging ?? 0) * Math.log1p(messaging)
        + (m.coef_amount_spent ?? m.coefficient) * Math.log1p(spend)
    }
    return m.intercept + m.coefficient * spend
  }

  const rse = m.residual_std_error ?? 1

  const allocations: AdSetAllocation[] = top.map(g => {
    const pct = g.efficiency / totalEfficiency
    const allocated_spend = totalBudget * pct
    const projected_reach     = Math.round(allocated_spend * g.reach_per_peso)
    const projected_messaging = Math.round(allocated_spend * g.messaging_per_peso)
    const projected_purchases = Math.max(0, predict(projected_reach, projected_messaging, allocated_spend))
    return {
      ad_set_name: g.name,
      allocated_spend,
      pct,
      projected_reach,
      projected_messaging,
      projected_purchases,
      interval_lower: Math.max(0, projected_purchases - Z_80 * rse),
      interval_upper: projected_purchases + Z_80 * rse,
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
    is_mlr: isMLR,
  }
}
