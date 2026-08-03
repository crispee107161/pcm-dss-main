import { prisma } from '@/lib/prisma'
import type { AdRecord } from '@/lib/csv/validate-ads'
import { emptyCounts, isUnchanged, type UpsertCounts } from '@/lib/db/upsert-counts'

/**
 * Two rows sharing (ad_name, ad_set_name, reporting_starts) within the same
 * upload would otherwise silently overwrite each other (last-write-wins) in
 * the upsert loop below, discarding one row's metrics with no signal to the
 * uploader. Throws on the first collision found.
 */
export function assertNoDuplicateKeys(records: AdRecord[]): void {
  const seenKeys = new Set<string>()
  for (const record of records) {
    const dedupeKey = `${record.ad_name} ${record.ad_set_name} ${record.reporting_starts.toISOString()}`
    if (seenKeys.has(dedupeKey)) {
      throw new Error(
        `Duplicate row for ad "${record.ad_name}" / ad set "${record.ad_set_name}" on ${record.reporting_starts.toISOString().slice(0, 10)} - remove the duplicate before re-uploading.`
      )
    }
    seenKeys.add(dedupeKey)
  }
}

export async function upsertAds(records: AdRecord[]): Promise<UpsertCounts> {
  assertNoDuplicateKeys(records)

  const counts = emptyCounts()

  for (const record of records) {
    // ad_set_name is part of the identity key: Facebook allows the same ad_name
    // to appear in more than one ad set, so (ad_name, reporting_starts) alone
    // isn't unique.
    const key = {
      ad_name: record.ad_name,
      ad_set_name: record.ad_set_name,
      reporting_starts: record.reporting_starts,
    }

    const existing = await prisma.ad.findUnique({
      where: { ad_name_ad_set_name_reporting_starts: key },
    })

    const update = {
      reporting_ends: record.reporting_ends,
      attribution_setting: record.attribution_setting,
      reach: record.reach,
      impressions: record.impressions,
      link_clicks: record.link_clicks,
      amount_spent: record.amount_spent,
      total_messaging_contacts: record.total_messaging_contacts,
      results: record.results,
      cost_per_result: record.cost_per_result,
      inquiries: record.inquiries,
    }

    if (!existing) {
      await prisma.ad.create({ data: { ...key, ...update } })
      counts.inserted++
    } else if (isUnchanged(existing, update)) {
      counts.unchanged++
    } else {
      await prisma.ad.update({ where: { ad_name_ad_set_name_reporting_starts: key }, data: update })
      counts.updated++
    }
  }

  return counts
}
