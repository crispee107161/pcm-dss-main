export interface AdForRanking {
  ad_name: string
  ad_set_name: string
  amount_spent: number
  impressions: number
  link_clicks: number | null
  total_messaging_contacts: number | null
  reporting_starts: Date
  reporting_ends: Date
}

export interface RankedAd {
  name: string
  adSetName: string
  value: number
  reportingStarts: Date
  reportingEnds: Date
}

// Minimum sample size before a ratio metric is trusted for ranking. Without
// these floors, an ad with e.g. 12 impressions and 1 click reports an 8.3%
// CTR and would top the table over a genuinely strong ad with 80,000
// impressions at 3.8% — the small-sample noise outranks the real signal.
export const MIN_IMPRESSIONS_FOR_CTR = 1000
export const MIN_CLICKS_FOR_CPC = 30
// Below this many messaging conversations, a single lucky conversion on tiny
// spend would otherwise top the "best cost per messaging conversation" table.
export const MIN_INQUIRIES_FOR_CPI = 5

const DEFAULT_LIMIT = 10
const ONE_DAY_MS = 24 * 60 * 60 * 1000

// Monthly-granularity Ad rows (legacy aggregate rows left in place because
// their ad name couldn't be matched to the daily export - see
// findSurvivingMonthlyRows in lib/db/upsert-ads.ts) must never be ranked
// alongside daily rows: a full month's totals/ratios aren't comparable to a
// single day's, in either direction, and would otherwise dominate or
// distort every ranking here.
export function isDailyGranularity(ad: Pick<AdForRanking, 'reporting_starts' | 'reporting_ends'>): boolean {
  return ad.reporting_ends.getTime() - ad.reporting_starts.getTime() < ONE_DAY_MS
}

function toRankedAd(ad: AdForRanking, value: number): RankedAd {
  return {
    name: ad.ad_name,
    adSetName: ad.ad_set_name,
    value,
    reportingStarts: ad.reporting_starts,
    reportingEnds: ad.reporting_ends,
  }
}

// Lower cost per messaging conversation is better — rank ascending.
export function rankByCostPerInquiry(ads: AdForRanking[], limit = DEFAULT_LIMIT): RankedAd[] {
  return ads
    .filter(a => isDailyGranularity(a) && a.amount_spent > 0 && (a.total_messaging_contacts ?? 0) >= MIN_INQUIRIES_FOR_CPI)
    .map(a => toRankedAd(a, a.amount_spent / (a.total_messaging_contacts as number)))
    .sort((a, b) => a.value - b.value)
    .slice(0, limit)
}

// Higher click-through rate is better — rank descending.
export function rankByCtr(ads: AdForRanking[], limit = DEFAULT_LIMIT): RankedAd[] {
  return ads
    .filter(a => isDailyGranularity(a) && a.impressions >= MIN_IMPRESSIONS_FOR_CTR && (a.link_clicks ?? 0) > 0)
    .map(a => toRankedAd(a, (a.link_clicks as number) / a.impressions))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// Lower cost per click is better — rank ascending.
export function rankByCostPerClick(ads: AdForRanking[], limit = DEFAULT_LIMIT): RankedAd[] {
  return ads
    .filter(a => isDailyGranularity(a) && a.amount_spent > 0 && (a.link_clicks ?? 0) >= MIN_CLICKS_FOR_CPC)
    .map(a => toRankedAd(a, a.amount_spent / (a.link_clicks as number)))
    .sort((a, b) => a.value - b.value)
    .slice(0, limit)
}
