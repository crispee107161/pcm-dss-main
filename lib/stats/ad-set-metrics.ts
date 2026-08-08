import { prisma } from '@/lib/prisma'
import { pairKey } from '@/lib/pair-key'

export interface AdSetMetrics {
  name: string
  total_spend: number
  efficiency: number
  reach_per_peso: number
  historical_cpi: number | null
  historical_inquiries: number
}

export interface AdSetMetricsResult {
  model: NonNullable<Awaited<ReturnType<typeof prisma.regressionModel.findFirst>>>
  eligible: AdSetMetrics[]
  zeroInquiry: AdSetMetrics[]
  globalReachPerPeso: number
}

// Groups ad spend/messaging-conversations/reach by ad set and computes a
// Laplace-smoothed efficiency score (messaging conversations per peso),
// shared by the budget allocator and the cost-cutting scenario recommender.
//
// `historical_cpi` and `historical_inquiries` keep their legacy names —
// renaming them would cascade into components/analytics/BudgetAllocator.tsx
// and components/analytics/CostCuttingScenario.tsx, which are out of scope
// for this pass — but both now carry messaging-conversation semantics: CPI
// here means cost per messaging conversation, and `historical_inquiries` is
// a count of historical messaging conversations.
//
// `eligible` excludes ad sets with zero messaging conversations — right for
// the budget allocator, which can't rank something with no signal.
// `zeroInquiry` carries those sets separately (efficiency 0) so cost-cutting,
// which needs to see pure-waste spend, doesn't have to re-derive them from
// `eligible`.
export interface AdRowForSetAggregation {
  ad_name: string
  ad_set_name: string
  amount_spent: number
  total_messaging_contacts: number | null
  reach: number | null
}

export interface AdSetAggregate {
  total_spend: number
  total_messaging: number
  total_reach: number
}

// Step 1: collapse ad-day rows to one row per ad, taking MAX reach per ad —
// the same aggregation `aggregateAdsForTraining` (lib/stats/regression.ts)
// uses to fit the model. Summing daily reach directly (the previous
// approach here) mixes Facebook's per-period-deduplicated reach across many
// days into one inflated total, which is a different scale than what
// `coef_reach` was fit against — projected reach fed back into
// `predictFromModel` would then be off by roughly the average number of
// daily rows per ad (~17x on the real dataset). Summing those per-ad
// maxes across the ads in an ad set is still an approximation (it can't
// account for audience overlap between different ads in the same set),
// but it matches the unit the model was trained on, unlike a raw daily sum.
//
// Step 2: group the per-ad rows by ad set.
export function aggregateAdsBySet(ads: AdRowForSetAggregation[]): Map<string, AdSetAggregate> {
  const perAd = new Map<string, { ad_set_name: string; spend: number; messaging: number; reach: number }>()
  for (const ad of ads) {
    const key = pairKey(ad.ad_name, ad.ad_set_name)
    const existing = perAd.get(key) ?? { ad_set_name: ad.ad_set_name, spend: 0, messaging: 0, reach: 0 }
    perAd.set(key, {
      ad_set_name: ad.ad_set_name,
      spend: existing.spend + ad.amount_spent,
      messaging: existing.messaging + (ad.total_messaging_contacts ?? 0),
      reach: Math.max(existing.reach, ad.reach ?? 0),
    })
  }

  const grouped = new Map<string, AdSetAggregate>()
  for (const { ad_set_name, spend, messaging, reach } of perAd.values()) {
    const existing = grouped.get(ad_set_name) ?? {
      total_spend: 0, total_messaging: 0, total_reach: 0,
    }
    grouped.set(ad_set_name, {
      total_spend:    existing.total_spend + spend,
      total_messaging: existing.total_messaging + messaging,
      total_reach:    existing.total_reach + reach,
    })
  }

  return grouped
}

export async function computeAdSetMetrics(): Promise<AdSetMetricsResult> {
  const [model, ads] = await Promise.all([
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.ad.findMany({
      select: {
        ad_name: true,
        ad_set_name: true,
        amount_spent: true,
        total_messaging_contacts: true,
        reach: true,
      },
    }),
  ])

  if (!model) throw new Error('No regression model trained yet. Upload ad data first.')
  if (ads.length === 0) throw new Error('No ad data available. Upload an Ads CSV first.')

  const grouped = aggregateAdsBySet(ads)

  // Only include ad sets with spend > 0 and at least 1 messaging conversation
  const eligible: AdSetMetrics[] = [...grouped.entries()]
    .filter(([, g]) => g.total_spend > 0 && g.total_messaging > 0)
    .map(([name, g]) => {
      // Laplace-smoothed efficiency: add a pseudo-count of 1 messaging
      // conversation at the group's own cost-per-conversation so that ad
      // sets with very few conversations don't appear artificially superior
      const cpiEstimate = g.total_spend / Math.max(g.total_messaging, 1)
      const smoothedMessaging = g.total_messaging + 1
      const smoothedSpend = g.total_spend + cpiEstimate
      return {
        name,
        total_spend: g.total_spend,
        efficiency: smoothedMessaging / smoothedSpend,
        reach_per_peso: g.total_reach / g.total_spend,
        historical_cpi: g.total_spend / g.total_messaging,
        historical_inquiries: g.total_messaging,
      }
    })

  if (eligible.length === 0) throw new Error('No ad sets with messaging conversation data found. Ensure your uploaded ads include messaging conversation counts.')

  // Spend with zero messaging conversations: no ratio to rank by, so
  // efficiency is 0 — the worst possible score, sorting these first for
  // cost-cutting.
  const zeroInquiry: AdSetMetrics[] = [...grouped.entries()]
    .filter(([, g]) => g.total_spend > 0 && g.total_messaging === 0)
    .map(([name, g]) => ({
      name,
      total_spend: g.total_spend,
      efficiency: 0,
      reach_per_peso: g.total_reach / g.total_spend,
      historical_cpi: null,
      historical_inquiries: 0,
    }))

  // Global average ratio — fallback when an ad set has no historical reach data
  const globalReachPerPeso = eligible.reduce((s, g) => s + g.reach_per_peso, 0) / eligible.length

  return { model, eligible, zeroInquiry, globalReachPerPeso }
}
