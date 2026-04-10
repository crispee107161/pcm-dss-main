import { prisma } from '@/lib/prisma'
import type { MonthlyKpi } from '@/types/index'

const TARGET_MONTHS = [
  { label: 'September 2025', year: 2025, month: 9 },
  { label: 'December 2025', year: 2025, month: 12 },
  { label: 'January 2026', year: 2026, month: 1 },
]

export async function getMonthlyKpis(): Promise<MonthlyKpi[]> {
  const kpis: MonthlyKpi[] = []

  for (const target of TARGET_MONTHS) {
    const startDate = new Date(target.year, target.month - 1, 1)
    const endDate = new Date(target.year, target.month, 0, 23, 59, 59)

    const ads = await prisma.ad.findMany({
      where: {
        reporting_starts: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    kpis.push({
      period: target.label,
      total_spend: ads.reduce((sum, a) => sum + a.amount_spent, 0),
      total_purchases: ads.reduce((sum, a) => sum + (a.purchases ?? 0), 0),
      total_reach: ads.reduce((sum, a) => sum + (a.reach ?? 0), 0),
      ad_count: ads.length,
    })
  }

  return kpis
}

export interface CampaignRankings {
  bySpend: Array<{ name: string; adSetName: string; value: number; reportingStarts: Date | null; reportingEnds: Date | null }>
  byPurchases: Array<{ name: string; adSetName: string; value: number; reportingStarts: Date | null; reportingEnds: Date | null }>
  byReach: Array<{ name: string; adSetName: string; value: number; reportingStarts: Date | null; reportingEnds: Date | null }>
}

export async function getCampaignRankings(): Promise<CampaignRankings> {
  const [topSpend, topPurchases, topReach] = await Promise.all([
    prisma.ad.findMany({
      orderBy: { amount_spent: 'desc' },
      take: 10,
      select: { ad_name: true, ad_set_name: true, amount_spent: true, reporting_starts: true, reporting_ends: true },
    }),
    prisma.ad.findMany({
      where: { purchases: { not: null } },
      orderBy: { purchases: 'desc' },
      take: 10,
      select: { ad_name: true, ad_set_name: true, purchases: true, reporting_starts: true, reporting_ends: true },
    }),
    prisma.ad.findMany({
      where: { reach: { not: null } },
      orderBy: { reach: 'desc' },
      take: 10,
      select: { ad_name: true, ad_set_name: true, reach: true, reporting_starts: true, reporting_ends: true },
    }),
  ])

  return {
    bySpend: topSpend.map(a => ({
      name: a.ad_name ?? 'Unknown',
      adSetName: a.ad_set_name ?? '',
      value: a.amount_spent,
      reportingStarts: a.reporting_starts,
      reportingEnds: a.reporting_ends,
    })),
    byPurchases: topPurchases.map(a => ({
      name: a.ad_name ?? 'Unknown',
      adSetName: a.ad_set_name ?? '',
      value: a.purchases ?? 0,
      reportingStarts: a.reporting_starts,
      reportingEnds: a.reporting_ends,
    })),
    byReach: topReach.map(a => ({
      name: a.ad_name ?? 'Unknown',
      adSetName: a.ad_set_name ?? '',
      value: a.reach ?? 0,
      reportingStarts: a.reporting_starts,
      reportingEnds: a.reporting_ends,
    })),
  }
}
