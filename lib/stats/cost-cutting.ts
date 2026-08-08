import { predictFromModel } from '@/lib/stats/regression'
import { computeAdSetMetrics, type AdSetMetrics } from '@/lib/stats/ad-set-metrics'

export interface CostCutAdSet {
  ad_set_name: string
  spend: number
  efficiency: number
  historical_cpi: number | null
  historical_inquiries: number
}

export interface CostCuttingResult {
  total_spend: number
  target_reduction_pct: number
  actual_reduction_pct: number
  spend_removed: number
  cut_ad_sets: CostCutAdSet[]
  kept_ad_sets: CostCutAdSet[]
  baseline_projected_inquiries: number
  after_cut_projected_inquiries: number
  inquiry_loss_pct: number
  model_r_squared: number
  model_type: string
}

function toRow(g: AdSetMetrics): CostCutAdSet {
  return {
    ad_set_name: g.name,
    spend: g.total_spend,
    efficiency: g.efficiency,
    historical_cpi: g.historical_cpi,
    historical_inquiries: g.historical_inquiries,
  }
}

export async function computeCostCuttingScenario(reductionPct: number): Promise<CostCuttingResult> {
  if (!(reductionPct > 0 && reductionPct < 1)) {
    throw new Error('Reduction percentage must be between 1% and 99%.')
  }

  const { model, eligible, zeroInquiry, globalReachPerPeso } = await computeAdSetMetrics()

  // Zero-inquiry ad sets are pure waste for a cost-cutting tool — spend with
  // no return — so unlike the budget allocator they belong in the pool, sorted
  // ahead of everything else (efficiency 0 is already the lowest possible score).
  const pool = [...eligible, ...zeroInquiry]

  const totalSpend = pool.reduce((s, g) => s + g.total_spend, 0)
  const targetRemoval = reductionPct * totalSpend

  // Sort ascending by efficiency: least efficient ad sets are cut first
  const sorted = [...pool].sort((a, b) => a.efficiency - b.efficiency)

  const cut: AdSetMetrics[] = []
  let spendRemoved = 0
  for (const g of sorted) {
    if (spendRemoved >= targetRemoval) break
    cut.push(g)
    spendRemoved += g.total_spend
  }

  const cutNames = new Set(cut.map(g => g.name))
  const kept = pool.filter(g => !cutNames.has(g.name))

  // Marginal contribution only (no intercept) — the intercept is a per-model
  // constant, not a per-ad-set one, so it must be added exactly once to a sum
  // over ad sets, not once per ad set. Multiplying it by ad-set count biased
  // the baseline/after-cut comparison by however many ad sets were cut.
  const marginalInquiries = (g: AdSetMetrics): number => {
    const projectedReach = g.total_spend * (g.reach_per_peso || globalReachPerPeso)
    return predictFromModel(model, projectedReach, g.total_spend) - model.intercept
  }

  const baselineProjectedInquiries = Math.max(0, model.intercept + pool.reduce((s, g) => s + marginalInquiries(g), 0))
  const afterCutProjectedInquiries = Math.max(0, model.intercept + kept.reduce((s, g) => s + marginalInquiries(g), 0))

  return {
    total_spend: totalSpend,
    target_reduction_pct: reductionPct,
    actual_reduction_pct: totalSpend > 0 ? spendRemoved / totalSpend : 0,
    spend_removed: spendRemoved,
    cut_ad_sets: cut.map(toRow),
    kept_ad_sets: kept.map(toRow),
    baseline_projected_inquiries: baselineProjectedInquiries,
    after_cut_projected_inquiries: afterCutProjectedInquiries,
    inquiry_loss_pct: baselineProjectedInquiries > 0
      ? (baselineProjectedInquiries - afterCutProjectedInquiries) / baselineProjectedInquiries
      : 0,
    model_r_squared: model.r_squared,
    model_type: model.model_type ?? 'plain_mlr',
  }
}
