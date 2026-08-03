import { parseIsoLocalAsManila } from './timezone'

export interface AdRecord {
  reporting_starts: Date
  reporting_ends: Date
  ad_name: string
  ad_set_name: string
  attribution_setting: string
  reach: number | null
  impressions: number
  link_clicks: number | null
  amount_spent: number
  total_messaging_contacts: number | null
  results: number | null
  cost_per_result: number | null
  inquiries: number | null
}

function parseIntOrNull(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null
  const parsed = parseInt(value.replace(/,/g, '').trim(), 10)
  return isNaN(parsed) ? null : parsed
}

function parseFloatOrNull(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null
  const parsed = parseFloat(value.replace(/,/g, '').trim())
  return isNaN(parsed) ? null : parsed
}

function parseDate(value: string | undefined, fieldName: string): Date {
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

export function validateAdsRows(rows: Record<string, string>[]): AdRecord[] {
  return rows.map((row, index) => {
    try {
      const reporting_starts = parseDate(row['Reporting starts'], 'Reporting starts')
      const reporting_ends = parseDate(row['Reporting ends'], 'Reporting ends')

      // Capped to keep a single malicious/garbage field from ballooning the
      // LLM prompts these values later get interpolated into (chat.ts, keywords.ts).
      const ad_name = (row['Ad name'] ?? '').trim().slice(0, 200)
      const ad_set_name = (row['Ad set name'] ?? '').trim().slice(0, 200)
      const attribution_setting = (row['Attribution setting'] ?? row['Attribution Setting'] ?? '').trim()

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

      const amountRaw = row['Amount spent (PHP)'] ?? row['Amount spent']
      if (!amountRaw || amountRaw.trim() === '') {
        throw new Error(`Missing required field: Amount spent (PHP)`)
      }
      const amount_spent = parseFloat(amountRaw.replace(/,/g, '').trim())
      if (isNaN(amount_spent)) {
        throw new Error(`Invalid Amount spent value: ${amountRaw}`)
      }

      const total_messaging_contacts = parseIntOrNull(
        row['Total messaging contacts'] ?? row['Messaging conversations started']
      )
      const results = parseIntOrNull(row['Results'])
      const cost_per_result = parseFloatOrNull(row['Cost per result'])
      // 'Purchases' is Facebook's literal export header — external data we don't control.
      // We interpret this count as customer inquiries; map it to our internal field name here.
      const inquiries = parseIntOrNull(row['Purchases'] ?? row['Purchase'])

      return {
        reporting_starts,
        reporting_ends,
        ad_name,
        ad_set_name,
        attribution_setting,
        reach,
        impressions,
        link_clicks,
        amount_spent,
        total_messaging_contacts,
        results,
        cost_per_result,
        inquiries,
      }
    } catch (err) {
      throw new Error(`Row ${index + 1}: ${(err as Error).message}`)
    }
  })
}
