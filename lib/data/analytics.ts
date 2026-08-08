import { prisma } from '@/lib/prisma'
import type { MonthlyKpi } from '@/types/index'

const TARGET_MONTHS = [
  { label: 'September 2025', year: 2025, month: 9 },
  { label: 'December 2025', year: 2025, month: 12 },
  { label: 'January 2026', year: 2026, month: 1 },
]

// `total_inquiries` keeps its legacy name (fixed by the `MonthlyKpi` type in
// types/index.ts, out of scope for this pass) but now sums messaging
// conversations, not Facebook-reported "Purchases" — that field is dropped
// entirely per the no-sales-framing policy.
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
      total_inquiries: ads.reduce((sum, a) => sum + (a.total_messaging_contacts ?? 0), 0),
      total_reach: ads.reduce((sum, a) => sum + (a.reach ?? 0), 0),
      ad_count: ads.length,
    })
  }

  return kpis
}

export interface CampaignRankings {
  bySpend: Array<{ name: string; adSetName: string; value: number; reportingStarts: Date | null; reportingEnds: Date | null }>
  byInquiries: Array<{ name: string; adSetName: string; value: number; reportingStarts: Date | null; reportingEnds: Date | null }>
  byReach: Array<{ name: string; adSetName: string; value: number; reportingStarts: Date | null; reportingEnds: Date | null }>
}

export async function getCampaignRankings(): Promise<CampaignRankings> {
  const [topSpend, topInquiries, topReach] = await Promise.all([
    prisma.ad.findMany({
      orderBy: { amount_spent: 'desc' },
      take: 10,
      select: { ad_name: true, ad_set_name: true, amount_spent: true, reporting_starts: true, reporting_ends: true },
    }),
    prisma.ad.findMany({
      where: { total_messaging_contacts: { not: null } },
      orderBy: { total_messaging_contacts: 'desc' },
      take: 10,
      select: { ad_name: true, ad_set_name: true, total_messaging_contacts: true, reporting_starts: true, reporting_ends: true },
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
    // `byInquiries` keeps its legacy name (this interface is local to this
    // file, but renaming would still be an unrelated diff) — ranks by
    // messaging conversations, not Facebook-reported "Purchases".
    byInquiries: topInquiries.map(a => ({
      name: a.ad_name ?? 'Unknown',
      adSetName: a.ad_set_name ?? '',
      value: a.total_messaging_contacts ?? 0,
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
