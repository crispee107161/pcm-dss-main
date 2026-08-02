import { prisma } from '@/lib/prisma'
import type { AdRecord } from '@/lib/csv/validate-ads'
import { emptyCounts, isUnchanged, type UpsertCounts } from '@/lib/db/upsert-counts'

export async function upsertAds(records: AdRecord[]): Promise<UpsertCounts> {
  const counts = emptyCounts()

  for (const record of records) {
    const key = {
      ad_name: record.ad_name,
      reporting_starts: record.reporting_starts,
    }

    const existing = await prisma.ad.findUnique({
      where: { ad_name_reporting_starts: key },
    })

    const update = {
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
    }

    if (!existing) {
      await prisma.ad.create({ data: { ...key, ...update } })
      counts.inserted++
    } else if (isUnchanged(existing, update)) {
      counts.unchanged++
    } else {
      await prisma.ad.update({ where: { ad_name_reporting_starts: key }, data: update })
      counts.updated++
    }
  }

  return counts
}
