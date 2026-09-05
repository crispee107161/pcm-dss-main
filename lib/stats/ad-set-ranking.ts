// FR-26 (mvp.md §4.5): groups messaging ads by Ad set ID or Campaign ID —
// never by name. data_catalog.md §1 documents the name-reuse trap: 24
// distinct `Ad set name` values are spread across 26 distinct `Ad set ID`s,
// so grouping by name silently merges two different ad sets into one row.

import { MESSAGING_RESULT_TYPE } from './ad-population-constants'

export interface AdForGroupRanking {
  ad_id: string
  ad_set_id: string
  ad_set_name: string
  campaign_id: string
  campaign_name: string
  amount_spent: number
  total_messaging_contacts: number | null
  result_type: string | null
}

export interface GroupRankingRow {
  id: string
  // Display label only — never used as the grouping key (see the name-reuse
  // trap above). Takes the name last seen for this id, which is stable in
  // practice (Meta doesn't rename ad sets/campaigns mid-flight in this data).
  name: string
  adCount: number
  spend: number
  inquiries: number
  // null when the group has zero recorded messaging conversations — there's
  // no ratio to rank by, not a CPI of zero.
  cpi: number | null
  lowConfidence: boolean
}

// Below this many ads, a group's CPI is too noisy to present as a reliable
// signal — flagged on screen rather than hidden, per mvp.md §4.5.
export const MIN_ADS_FOR_CONFIDENCE = 3

// A monthly-export ad can have up to 12 rows (one per uploaded month) — sum
// spend/inquiries per Ad ID first, then group, matching the sum-then-divide
// aggregation rule in data_catalog.md §4.
//
// Spend is summed only from rows where result_type is MESSAGING_RESULT_TYPE
// ("Messaging conversations started"), not gated on
// `total_messaging_contacts !== null` — total_messaging_contacts is null both
// for a non-messaging row AND for a messaging row whose "Results" cell was
// blank in the CSV (lib/csv/validate-ads.ts's parseIntOrNull returns null,
// not 0, for a blank cell), so the null-proxy would silently drop that
// second case's real messaging spend too. Matches the same fix applied to
// lib/stats/campaign-rankings.ts's aggregateAdsById.
function aggregateByAdId(ads: AdForGroupRanking[], groupId: (a: AdForGroupRanking) => string, groupName: (a: AdForGroupRanking) => string) {
  const perAd = new Map<string, { groupId: string; groupName: string; spend: number; inquiries: number }>()
  for (const ad of ads) {
    const existing = perAd.get(ad.ad_id) ?? { groupId: groupId(ad), groupName: groupName(ad), spend: 0, inquiries: 0 }
    perAd.set(ad.ad_id, {
      groupId: groupId(ad),
      groupName: groupName(ad),
      spend: existing.spend + (ad.result_type === MESSAGING_RESULT_TYPE ? ad.amount_spent : 0),
      inquiries: existing.inquiries + (ad.total_messaging_contacts ?? 0),
    })
  }
  return perAd
}

function rankByGroup(ads: AdForGroupRanking[], groupId: (a: AdForGroupRanking) => string, groupName: (a: AdForGroupRanking) => string): GroupRankingRow[] {
  // Messaging-optimised ads only, matching the FR-25/data_catalog §4.3 filter.
  // Filtered on result_type directly, not total_messaging_contacts !== null
  // — see aggregateByAdId above for why the null-proxy under-counts.
  const messagingAds = ads.filter(a => a.result_type === MESSAGING_RESULT_TYPE)
  const perAd = aggregateByAdId(messagingAds, groupId, groupName)

  const perGroup = new Map<string, { name: string; spend: number; inquiries: number; adCount: number }>()
  for (const a of perAd.values()) {
    const existing = perGroup.get(a.groupId) ?? { name: a.groupName, spend: 0, inquiries: 0, adCount: 0 }
    perGroup.set(a.groupId, {
      name: a.groupName,
      spend: existing.spend + a.spend,
      inquiries: existing.inquiries + a.inquiries,
      adCount: existing.adCount + 1,
    })
  }

  return [...perGroup.entries()]
    .map(([id, g]) => ({
      id,
      name: g.name,
      adCount: g.adCount,
      spend: g.spend,
      inquiries: g.inquiries,
      cpi: g.inquiries > 0 ? g.spend / g.inquiries : null,
      lowConfidence: g.adCount < MIN_ADS_FOR_CONFIDENCE,
    }))
    .sort((a, b) => {
      // Groups with no ratio to rank by sort last, regardless of spend.
      if (a.cpi === null && b.cpi === null) return 0
      if (a.cpi === null) return 1
      if (b.cpi === null) return -1
      return a.cpi - b.cpi
    })
}

export function rankByAdSet(ads: AdForGroupRanking[]): GroupRankingRow[] {
  return rankByGroup(ads, a => a.ad_set_id, a => a.ad_set_name)
}

export function rankByCampaign(ads: AdForGroupRanking[]): GroupRankingRow[] {
  return rankByGroup(ads, a => a.campaign_id, a => a.campaign_name)
}

export interface CampaignAdSetMapping {
  // True when every campaign contains exactly one ad set — the structural
  // fact that makes "By Ad Set" and "By Campaign" identical
  // (docs/raven/Rankings_Review.md §2). Callers should pass the same
  // messaging-filtered rows that feed rankByAdSet/rankByCampaign, so this
  // can never disagree with the tables it's captioning. Must be recomputed
  // on every load, not assumed static — the client's data is one-to-one
  // today but a new campaign with two ad sets would make this false without
  // anything else on screen changing.
  allOneToOne: boolean
  multiAdSetCampaignCount: number
}

export function checkCampaignAdSetMapping(ads: AdForGroupRanking[]): CampaignAdSetMapping {
  const campaignToAdSets = new Map<string, Set<string>>()
  for (const ad of ads) {
    const adSetIds = campaignToAdSets.get(ad.campaign_id) ?? new Set<string>()
    adSetIds.add(ad.ad_set_id)
    campaignToAdSets.set(ad.campaign_id, adSetIds)
  }
  const multiAdSetCampaignCount = [...campaignToAdSets.values()].filter(adSetIds => adSetIds.size > 1).length
  return { allOneToOne: multiAdSetCampaignCount === 0, multiAdSetCampaignCount }
}
