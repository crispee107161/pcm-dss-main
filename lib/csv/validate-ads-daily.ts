import { parseIntOrNull, parseFloatOrNull, parseDate, type AdRecord } from './validate-ads'
import { pairKey } from '@/lib/pair-key'

// Facebook's daily ad-level export reuses the same "Results" / "Cost per result"
// columns for every ad objective, keyed by "Result type" (Reach, Post engagements,
// ThruPlay, Messaging conversations started, or blank). Summing "Results" across
// row types silently mixes reach counts into a conversation count, so only rows
// tied to the messaging objective are convertible into AdRecords — everything
// else is dropped here, before any aggregation happens downstream.
const MESSAGING_RESULT_TYPE = 'Messaging conversations started'

export interface AdsDailyFilterSummary {
  totalRows: number
  keptRows: number
  rescuedBlankRows: number
  mergedDuplicateRows: number
  droppedByResultType: Record<string, number>
  supersededMonthlyRows: number
  unmatchedMonthlyRows: number
}

export interface AdsDailyValidationResult {
  records: AdRecord[]
  summary: AdsDailyFilterSummary
}

function adSetKey(adName: string, adSetName: string): string {
  return pairKey(adName.trim(), adSetName.trim())
}

function requireNumericField(raw: string | undefined, fieldName: string): number {
  if (!raw || raw.trim() === '') {
    throw new Error(`Missing required field: ${fieldName}`)
  }
  const parsed = parseFloat(raw.replace(/,/g, '').trim())
  if (isNaN(parsed)) {
    throw new Error(`Invalid ${fieldName} value: ${raw}`)
  }
  return parsed
}

export function validateAdsDailyRows(rows: Record<string, string>[]): AdsDailyValidationResult {
  // Facebook leaves "Result type" blank rather than emitting a zero-result
  // messaging row. Dropping every blank row (as if it were a non-messaging
  // objective row) censors the zero-conversion days out of the dataset — every
  // surviving observation would then have results >= 1, biasing spend totals
  // and any regression/correlation fit on this data toward optimism. A blank
  // row only gets rescued as a zero-result day when its (ad, ad set) pair is
  // known to run the messaging objective elsewhere in this same file; blanks
  // belonging exclusively to reach/engagement ad sets are genuinely not ours.
  const messagingAdSets = new Set<string>()
  for (const row of rows) {
    if ((row['Result type'] ?? '').trim() === MESSAGING_RESULT_TYPE) {
      messagingAdSets.add(adSetKey(row['Ad name'] ?? '', row['Ad set name'] ?? ''))
    }
  }

  const droppedByResultType: Record<string, number> = {}
  let rescuedBlankRows = 0
  const rawRecords: AdRecord[] = []

  rows.forEach((row, index) => {
    const resultType = (row['Result type'] ?? '').trim()
    const isMessagingRow = resultType === MESSAGING_RESULT_TYPE
    const isRescuableBlank =
      resultType === '' && messagingAdSets.has(adSetKey(row['Ad name'] ?? '', row['Ad set name'] ?? ''))

    if (!isMessagingRow && !isRescuableBlank) {
      const key = resultType === '' ? '(blank)' : resultType
      droppedByResultType[key] = (droppedByResultType[key] ?? 0) + 1
      return
    }

    try {
      // Rows are already daily-granular: "Day" is both the start and end of the
      // reporting window this record covers, unlike the monthly-aggregate export.
      // reporting_starts === reporting_ends here (span 0ms), which is what every
      // granularity check downstream (isDailyGranularity, aggregateAdsForTraining,
      // findSupersededMonthlyRowIds) relies on to classify a row as daily via
      // `reporting_ends - reporting_starts < ONE_DAY_MS`. If this ever changes to
      // set reporting_ends to end-of-day (span exactly 24h), that boundary flips
      // these rows to "monthly" — update the granularity checks in lockstep.
      const day = parseDate(row['Day'], 'Day')

      const ad_name = (row['Ad name'] ?? '').trim().slice(0, 200)
      const ad_set_name = (row['Ad set name'] ?? '').trim().slice(0, 200)
      const attribution_setting = (row['Attribution setting'] ?? '').trim()

      const reach = parseIntOrNull(row['Reach'])
      const impressions = requireNumericField(row['Impressions'], 'Impressions')
      const amount_spent = requireNumericField(row['Amount spent (PHP)'], 'Amount spent (PHP)')

      let results: number | null
      let cost_per_result: number | null
      if (isMessagingRow) {
        results = parseIntOrNull(row['Results'])
        cost_per_result = parseFloatOrNull(row['Cost per result'])
        rawRecords.push({
          reporting_starts: day,
          reporting_ends: day,
          ad_name,
          ad_set_name,
          attribution_setting,
          reach,
          impressions,
          link_clicks: null, // Not present in the daily export.
          amount_spent,
          // Same figure as `results` once filtered to the messaging objective — this
          // export has no separate "Total messaging contacts" column to alias.
          total_messaging_contacts: results,
          results,
          cost_per_result,
          inquiries: null, // Not present in the daily export (no "Purchases" column).
        })
      } else {
        rescuedBlankRows++
        rawRecords.push({
          reporting_starts: day,
          reporting_ends: day,
          ad_name,
          ad_set_name,
          attribution_setting,
          reach,
          impressions,
          link_clicks: null,
          amount_spent,
          total_messaging_contacts: 0,
          results: 0,
          cost_per_result: null,
          inquiries: null,
        })
      }
    } catch (err) {
      throw new Error(`Row ${index + 1}: ${(err as Error).message}`)
    }
  })

  // Facebook occasionally splits one ad/ad-set/day across more than one row
  // with no other distinguishing column in this export (no ad ID). The Ad
  // model's unique key is (ad_name, ad_set_name, reporting_starts), so these
  // must be merged before upsert or the second row would throw a duplicate-key
  // error (or silently clobber the first, depending on write order).
  const merged = new Map<string, AdRecord>()
  let mergedDuplicateRows = 0
  for (const record of rawRecords) {
    const key = pairKey(record.ad_name, record.ad_set_name, record.reporting_starts.toISOString())
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, record)
      continue
    }
    mergedDuplicateRows++
    const combinedResults = (existing.results ?? 0) + (record.results ?? 0)
    const combinedSpend = existing.amount_spent + record.amount_spent
    merged.set(key, {
      ...existing,
      reach: (existing.reach ?? 0) + (record.reach ?? 0),
      impressions: existing.impressions + record.impressions,
      amount_spent: combinedSpend,
      total_messaging_contacts: combinedResults,
      results: combinedResults,
      cost_per_result: combinedResults > 0 ? combinedSpend / combinedResults : null,
    })
  }

  const records = Array.from(merged.values())

  return {
    records,
    summary: {
      totalRows: rows.length,
      keptRows: records.length,
      rescuedBlankRows,
      mergedDuplicateRows,
      droppedByResultType,
      // Filled in by the caller once DB rows are inspected; this validator is pure.
      supersededMonthlyRows: 0,
      unmatchedMonthlyRows: 0,
    },
  }
}
