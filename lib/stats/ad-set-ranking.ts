// FR-26 (mvp.md §4.5): groups messaging ads by Ad set ID or Campaign ID —
// never by name. data_catalog.md §1 documents the name-reuse trap: 24
// distinct `Ad set name` values are spread across 26 distinct `Ad set ID`s,
// so grouping by name silently merges two different ad sets into one row.

export interface AdForGroupRanking {
  ad_id: string
  ad_set_id: string
  ad_set_name: string
  campaign_id: string
  campaign_name: string
  amount_spent: number
  total_messaging_contacts: number | null
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
function aggregateByAdId(ads: AdForGroupRanking[], groupId: (a: AdForGroupRanking) => string, groupName: (a: AdForGroupRanking) => string) {
  const perAd = new Map<string, { groupId: string; groupName: string; spend: number; inquiries: number }>()
  for (const ad of ads) {
    const existing = perAd.get(ad.ad_id) ?? { groupId: groupId(ad), groupName: groupName(ad), spend: 0, inquiries: 0 }
    perAd.set(ad.ad_id, {
      groupId: groupId(ad),
      groupName: groupName(ad),
      spend: existing.spend + ad.amount_spent,
      inquiries: existing.inquiries + (ad.total_messaging_contacts ?? 0),
    })
  }
  return perAd
}

function rankByGroup(ads: AdForGroupRanking[], groupId: (a: AdForGroupRanking) => string, groupName: (a: AdForGroupRanking) => string): GroupRankingRow[] {
  // Messaging-optimised ads only, matching the FR-25/data_catalog §4.3 filter
  // — total_messaging_contacts is null for every non-messaging ad.
  const messagingAds = ads.filter(a => a.total_messaging_contacts !== null)
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
