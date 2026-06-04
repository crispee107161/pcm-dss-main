import { prisma } from '@/lib/prisma'
import type { AdRecord } from '@/lib/csv/validate-ads'

export async function upsertAds(records: AdRecord[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0

  for (const record of records) {
    const existing = await prisma.ad.findUnique({
      where: {
        ad_name_reporting_starts: {
          ad_name: record.ad_name,
          reporting_starts: record.reporting_starts,
        },
      },
    })

    await prisma.ad.upsert({
      where: {
        ad_name_reporting_starts: {
          ad_name: record.ad_name,
          reporting_starts: record.reporting_starts,
        },
      },
      create: {
        reporting_starts: record.reporting_starts,
        reporting_ends: record.reporting_ends,
        ad_name: record.ad_name,
        ad_set_name: record.ad_set_name,
        attribution_setting: record.attribution_setting,
        reach: record.reach,
        impressions: record.impressions,
        link_clicks: record.link_clicks,
        amount_spent: record.amount_spent,
        total_messaging_contacts: record.total_messaging_contacts,
        results: record.results,
        cost_per_result: record.cost_per_result,
        purchases: record.purchases,
      },
      update: {
        reporting_ends: record.reporting_ends,
        ad_set_name: record.ad_set_name,
        attribution_setting: record.attribution_setting,
        reach: record.reach,
        impressions: record.impressions,
        link_clicks: record.link_clicks,
        amount_spent: record.amount_spent,
        total_messaging_contacts: record.total_messaging_contacts,
        results: record.results,
        cost_per_result: record.cost_per_result,
        purchases: record.purchases,
      },
    })

    if (existing) {
      updated++
    } else {
      inserted++
    }
  }

  return { inserted, updated }
}
