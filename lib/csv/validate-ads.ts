import { parseIsoLocalAsManila } from './timezone'
import type { RowValidationResult } from './row-validation'
import { MESSAGING_RESULT_TYPE } from '../stats/ad-population-constants'

export interface AdRecord {
  reporting_starts: Date
  reporting_ends: Date
  ad_id: string
  ad_name: string
  ad_set_id: string
  ad_set_name: string
  campaign_id: string
  campaign_name: string
  attribution_setting: string
  reach: number | null
  impressions: number
  link_clicks: number | null
  amount_spent: number
  result_type: string | null
  frequency: number | null
  post_engagements: number | null
  views: number | null
  viewers: number | null
  total_messaging_contacts: number | null
  results: number | null
  cost_per_result: number | null
  inquiries: number | null
}

export function parseIntOrNull(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null
  const parsed = parseInt(value.replace(/,/g, '').trim(), 10)
  return isNaN(parsed) ? null : parsed
}

export function parseFloatOrNull(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null
  const parsed = parseFloat(value.replace(/,/g, '').trim())
  return isNaN(parsed) ? null : parsed
}

export function parseDate(value: string | undefined, fieldName: string): Date {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required date field: ${fieldName}`)
  }
  const trimmed = value.trim()
  // Pure ISO date (YYYY-MM-DD) is UTC-midnight per the ECMAScript spec — safe as-is.
  // Anything with a time component but no zone is ambiguous, so anchor it explicitly.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T00:00:00Z`)
    : parseIsoLocalAsManila(trimmed.replace(' ', 'T'))
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date for ${fieldName}: ${value}`)
  }
  return date
}

// FR-04/FR-07 — collects a parse error per row instead of throwing on the
// first one, so one malformed row no longer discards every other row in
// the file. Also folds in the within-file duplicate-key check (previously
// `assertNoDuplicateKeys`, which threw for the whole file) as a per-row
// rejection: the first occurrence of (Ad ID, Reporting starts) wins, later
// duplicates are rejected with a reason rather than aborting the upload.
export function validateAdsRows(rows: Record<string, string>[]): RowValidationResult<AdRecord> {
  const valid: AdRecord[] = []
  const rejected: RowValidationResult<AdRecord>['rejected'] = []
  const seenKeys = new Set<string>()

  rows.forEach((row, index) => {
    try {
      const reporting_starts = parseDate(row['Reporting starts'], 'Reporting starts')
      const reporting_ends = parseDate(row['Reporting ends'], 'Reporting ends')

      const ad_id = (row['Ad ID'] ?? '').trim()
      if (ad_id === '') {
        throw new Error('Missing required field: Ad ID')
      }
      const ad_set_id = (row['Ad set ID'] ?? '').trim()
      const campaign_id = (row['Campaign ID'] ?? '').trim()

      // Capped to keep a single malicious/garbage field from ballooning the
      // LLM prompts these values later get interpolated into (chat.ts, keywords.ts).
      const ad_name = (row['Ad name'] ?? '').trim().slice(0, 200)
      const ad_set_name = (row['Ad set name'] ?? '').trim().slice(0, 200)
      const campaign_name = (row['Campaign name'] ?? '').trim().slice(0, 200)
      const attribution_setting = (row['Attribution setting'] ?? row['Attribution Setting'] ?? '').trim()
      const result_type = (row['Result type'] ?? '').trim() || null

      const reach = parseIntOrNull(row['Reach'])

      const impressionsRaw = row['Impressions']
      if (!impressionsRaw || impressionsRaw.trim() === '') {
        throw new Error(`Missing required field: Impressions`)
      }
      const impressions = parseInt(impressionsRaw.replace(/,/g, '').trim(), 10)
      if (isNaN(impressions)) {
        throw new Error(`Invalid Impressions value: ${impressionsRaw}`)
      }

      const link_clicks = parseIntOrNull(row['Link clicks'] ?? row['Clicks (all)'])
      const frequency = parseFloatOrNull(row['Frequency'])
      const post_engagements = parseIntOrNull(row['Post engagements'])
      const views = parseIntOrNull(row['Views'])
      const viewers = parseIntOrNull(row['Viewers'])

      const amountRaw = row['Amount spent (PHP)'] ?? row['Amount spent']
      if (!amountRaw || amountRaw.trim() === '') {
        throw new Error(`Missing required field: Amount spent (PHP)`)
      }
      const amount_spent = parseFloat(amountRaw.replace(/,/g, '').trim())
      if (isNaN(amount_spent)) {
        throw new Error(`Invalid Amount spent value: ${amountRaw}`)
      }

      const results = parseIntOrNull(row['Results'])
      const cost_per_result = parseFloatOrNull(row['Cost per result'])
      // Cost per inquiry is computed only for messaging-optimised ads (data_catalog.md
      // §1) — Results only means "messaging conversations" when Result type says so.
      const total_messaging_contacts = result_type === MESSAGING_RESULT_TYPE ? results : null
      // Purchases/sales data is out of scope by policy (capstone retitled to drop all
      // sales/purchases/transaction framing — see DV-PIVOT-PLAN.md "Why this changed").
      const inquiries = null

      const dedupeKey = `${ad_id} ${reporting_starts.toISOString()}`
      if (seenKeys.has(dedupeKey)) {
        throw new Error(
          `Duplicate row for Ad ID "${ad_id}" on ${reporting_starts.toISOString().slice(0, 10)} — an earlier row in this file already covers this Ad ID and Reporting starts date.`
        )
      }
      seenKeys.add(dedupeKey)

      valid.push({
        reporting_starts,
        reporting_ends,
        ad_id,
        ad_name,
        ad_set_id,
        ad_set_name,
        campaign_id,
        campaign_name,
        attribution_setting,
        reach,
        impressions,
        link_clicks,
        amount_spent,
        result_type,
        frequency,
        post_engagements,
        views,
        viewers,
        total_messaging_contacts,
        results,
        cost_per_result,
        inquiries,
      })
    } catch (err) {
      rejected.push({ row: index + 1, reason: (err as Error).message })
    }
  })

  return { valid, rejected }
}
