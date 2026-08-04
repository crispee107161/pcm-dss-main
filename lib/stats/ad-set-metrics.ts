import { prisma } from '@/lib/prisma'

export interface AdSetMetrics {
  name: string
  total_spend: number
  efficiency: number
  reach_per_peso: number
  messaging_per_peso: number
  historical_cpi: number | null
  historical_inquiries: number
}

export interface AdSetMetricsResult {
  model: NonNullable<Awaited<ReturnType<typeof prisma.regressionModel.findFirst>>>
  eligible: AdSetMetrics[]
  zeroInquiry: AdSetMetrics[]
  globalReachPerPeso: number
  globalMessagingPerPeso: number
}

// Groups ad spend/inquiries/reach/messaging by ad set and computes a
// Laplace-smoothed efficiency score (inquiries per peso), shared by the
// budget allocator and the cost-cutting scenario recommender.
//
// `eligible` excludes ad sets with zero inquiries — right for the budget
// allocator, which can't rank something with no signal. `zeroInquiry` carries
// those sets separately (efficiency 0) so cost-cutting, which needs to see
// pure-waste spend, doesn't have to re-derive them from `eligible`.
export async function computeAdSetMetrics(): Promise<AdSetMetricsResult> {
  const [model, ads] = await Promise.all([
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.ad.findMany({
      select: {
        ad_set_name: true,
        amount_spent: true,
        inquiries: true,
        reach: true,
        total_messaging_contacts: true,
      },
    }),
  ])

  if (!model) throw new Error('No regression model trained yet. Upload ad data first.')
  if (ads.length === 0) throw new Error('No ad data available. Upload an Ads CSV first.')

  const grouped = new Map<string, {
    total_spend: number
    total_inquiries: number
    total_reach: number
    total_messaging: number
  }>()

  for (const ad of ads) {
    const key = ad.ad_set_name
    const existing = grouped.get(key) ?? {
      total_spend: 0, total_inquiries: 0, total_reach: 0, total_messaging: 0,
    }
    grouped.set(key, {
      total_spend:     existing.total_spend + ad.amount_spent,
      total_inquiries: existing.total_inquiries + (ad.inquiries ?? 0),
      total_reach:     existing.total_reach + (ad.reach ?? 0),
      total_messaging: existing.total_messaging + (ad.total_messaging_contacts ?? 0),
    })
  }

  // Only include ad sets with spend > 0 and at least 1 inquiry
  const eligible: AdSetMetrics[] = [...grouped.entries()]
    .filter(([, g]) => g.total_spend > 0 && g.total_inquiries > 0)
    .map(([name, g]) => {
      // Laplace-smoothed efficiency: add a pseudo-count of 1 inquiry at the group's own CPI
      // so that ad sets with very few inquiries don't appear artificially superior
      const cpiEstimate = g.total_spend / Math.max(g.total_inquiries, 1)
      const smoothedInquiries = g.total_inquiries + 1
      const smoothedSpend = g.total_spend + cpiEstimate
      return {
        name,
        total_spend: g.total_spend,
        efficiency: smoothedInquiries / smoothedSpend,
        reach_per_peso:     g.total_reach / g.total_spend,
        messaging_per_peso: g.total_messaging / g.total_spend,
        historical_cpi: g.total_spend / g.total_inquiries,
        historical_inquiries: g.total_inquiries,
      }
    })

  if (eligible.length === 0) throw new Error('No ad sets with inquiry data found. Ensure your uploaded ads include inquiry counts.')

  // Spend with zero inquiries: no ratio to rank by, so efficiency is 0 —
  // the worst possible score, sorting these first for cost-cutting.
  const zeroInquiry: AdSetMetrics[] = [...grouped.entries()]
    .filter(([, g]) => g.total_spend > 0 && g.total_inquiries === 0)
    .map(([name, g]) => ({
      name,
      total_spend: g.total_spend,
      efficiency: 0,
      reach_per_peso:     g.total_reach / g.total_spend,
      messaging_per_peso: g.total_messaging / g.total_spend,
      historical_cpi: null,
      historical_inquiries: 0,
    }))

  // Global average ratios — fallback when an ad set has no historical data for a metric
  const globalReachPerPeso     = eligible.reduce((s, g) => s + g.reach_per_peso, 0)     / eligible.length
  const globalMessagingPerPeso = eligible.reduce((s, g) => s + g.messaging_per_peso, 0) / eligible.length

  return { model, eligible, zeroInquiry, globalReachPerPeso, globalMessagingPerPeso }
}
