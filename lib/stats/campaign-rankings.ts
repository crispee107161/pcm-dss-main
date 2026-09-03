import { monthKey } from '@/lib/data/month-buckets'

// One row per advertisement per calendar month (mvp.md §6's 93-column
// monthly export). An advertisement that ran four months contributes four
// rows sharing one `ad_id` — every ranking and count below must sum those
// rows per `ad_id` before ranking, or an ad running N months is counted as
// N different ads (docs/raven/Top_Ads_Review.md §1).
export interface AdForRanking {
  ad_id: string
  ad_name: string
  ad_set_name: string
  amount_spent: number
  impressions: number
  link_clicks: number | null
  total_messaging_contacts: number | null
  reach: number | null
  reporting_starts: Date
  reporting_ends: Date
}

// One advertisement, totalled across every monthly row it had in the
// selected range.
export interface AggregatedAd {
  ad_id: string
  name: string
  adSetName: string
  amountSpent: number
  impressions: number
  linkClicks: number
  messagingContacts: number
  reach: number
  monthsRan: number
}

export interface RankedAd {
  name: string
  adSetName: string
  value: number
  monthsRan: number
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

// Dead since the schema rework to the 93-column monthly export (mvp.md §6):
// every `Ad` row is now one ad's one calendar month, so this always returns
// false and used to zero out every ranking table below. No longer used to
// filter here — kept only because lib/stats/laggedCorrelation.ts (unused,
// cut-regression-era code left in place per mvp.md §5) still imports it.
export function isDailyGranularity(ad: Pick<AdForRanking, 'reporting_starts' | 'reporting_ends'>): boolean {
  return ad.reporting_ends.getTime() - ad.reporting_starts.getTime() < ONE_DAY_MS
}

// Sums every additive metric per `ad_id` across however many monthly rows
// fall in the selected range — the same sum-then-divide convention
// data_catalog.md §4.3 states and lib/stats/ad-set-ranking.ts's
// aggregateByAdId / lib/data/dashboard.ts's aggregateAdsById already apply.
// `name`/`adSetName` take whichever row was last in iteration order, same as
// those two (Meta doesn't rename an ad or ad set mid-flight in this data).
//
// Reach is summed across an ad's months rather than deduplicated, matching
// lib/data/dashboard.ts's monthlyTrend. This is a different case from
// lib/stats/ad-set-metrics.ts's day-level rows, which take a MAX per ad
// because summing ~17 overlapping daily rows within one month wildly
// inflates reach; here the rows are already monthly, so at most 12 mostly
// non-overlapping windows are summed, the same coarseness spend and
// messaging contacts are already summed across.
export function aggregateAdsById(ads: AdForRanking[]): AggregatedAd[] {
  const perAd = new Map<string, AggregatedAd>()
  // monthsRan counts distinct Manila calendar months, not rows — the schema's
  // @@unique([ad_id, reporting_starts]) only guarantees one row per exact
  // reporting_starts instant, not one row per month, so a row count would
  // silently overcount ("N months") if a daily-grain upload ever landed
  // again (isDailyGranularity above exists precisely because this table has
  // held that shape before).
  const monthsSeen = new Map<string, Set<string>>()
  for (const ad of ads) {
    const existing = perAd.get(ad.ad_id) ?? {
      ad_id: ad.ad_id,
      name: ad.ad_name,
      adSetName: ad.ad_set_name,
      amountSpent: 0,
      impressions: 0,
      linkClicks: 0,
      messagingContacts: 0,
      reach: 0,
      monthsRan: 0,
    }
    perAd.set(ad.ad_id, {
      ad_id: ad.ad_id,
      name: ad.ad_name,
      adSetName: ad.ad_set_name,
      amountSpent: existing.amountSpent + ad.amount_spent,
      impressions: existing.impressions + ad.impressions,
      linkClicks: existing.linkClicks + (ad.link_clicks ?? 0),
      messagingContacts: existing.messagingContacts + (ad.total_messaging_contacts ?? 0),
      reach: existing.reach + (ad.reach ?? 0),
      monthsRan: existing.monthsRan,
    })
    const months = monthsSeen.get(ad.ad_id) ?? new Set<string>()
    months.add(monthKey(ad.reporting_starts))
    monthsSeen.set(ad.ad_id, months)
  }
  return [...perAd.values()].map(a => ({ ...a, monthsRan: monthsSeen.get(a.ad_id)!.size }))
}

function toRankedAd(ad: AggregatedAd, value: number): RankedAd {
  return { name: ad.name, adSetName: ad.adSetName, value, monthsRan: ad.monthsRan }
}

// Higher spend is better ("more volume"), rank descending.
export function rankBySpend(ads: AggregatedAd[], limit = DEFAULT_LIMIT): RankedAd[] {
  return ads
    .filter(a => a.amountSpent > 0)
    .map(a => toRankedAd(a, a.amountSpent))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// Higher messaging-conversation volume is better, rank descending.
export function rankByMessagingContacts(ads: AggregatedAd[], limit = DEFAULT_LIMIT): RankedAd[] {
  return ads
    .filter(a => a.messagingContacts > 0)
    .map(a => toRankedAd(a, a.messagingContacts))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// Higher reach is better, rank descending.
export function rankByReach(ads: AggregatedAd[], limit = DEFAULT_LIMIT): RankedAd[] {
  return ads
    .filter(a => a.reach > 0)
    .map(a => toRankedAd(a, a.reach))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// Lower cost per messaging conversation is better — rank ascending.
export function rankByCostPerInquiry(ads: AggregatedAd[], limit = DEFAULT_LIMIT): RankedAd[] {
  return ads
    .filter(a => a.amountSpent > 0 && a.messagingContacts >= MIN_INQUIRIES_FOR_CPI)
    .map(a => toRankedAd(a, a.amountSpent / a.messagingContacts))
    .sort((a, b) => a.value - b.value)
    .slice(0, limit)
}

// Higher click-through rate is better — rank descending.
export function rankByCtr(ads: AggregatedAd[], limit = DEFAULT_LIMIT): RankedAd[] {
  return ads
    .filter(a => a.impressions >= MIN_IMPRESSIONS_FOR_CTR && a.linkClicks > 0)
    .map(a => toRankedAd(a, a.linkClicks / a.impressions))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// Lower cost per click is better — rank ascending.
export function rankByCostPerClick(ads: AggregatedAd[], limit = DEFAULT_LIMIT): RankedAd[] {
  return ads
    .filter(a => a.amountSpent > 0 && a.linkClicks >= MIN_CLICKS_FOR_CPC)
    .map(a => toRankedAd(a, a.amountSpent / a.linkClicks))
    .sort((a, b) => a.value - b.value)
    .slice(0, limit)
}

// FR-18/22 — eligible-pool sizes for each efficiency ranking's methodology
// note, so "only ads with at least N ___" states how many actually cleared
// the floor, not just the floor's value. Mirrors each rank* function's own
// filter predicate exactly — kept as separate functions rather than having
// rank* return a count too, so the existing RankedAd[] return shape (used
// directly as RankRow elsewhere) doesn't need to change.
export function countEligibleForCostPerInquiry(ads: AggregatedAd[]): number {
  return ads.filter(a => a.amountSpent > 0 && a.messagingContacts >= MIN_INQUIRIES_FOR_CPI).length
}

export function countEligibleForCtr(ads: AggregatedAd[]): number {
  return ads.filter(a => a.impressions >= MIN_IMPRESSIONS_FOR_CTR && a.linkClicks > 0).length
}

export function countEligibleForCostPerClick(ads: AggregatedAd[]): number {
  return ads.filter(a => a.amountSpent > 0 && a.linkClicks >= MIN_CLICKS_FOR_CPC).length
}
