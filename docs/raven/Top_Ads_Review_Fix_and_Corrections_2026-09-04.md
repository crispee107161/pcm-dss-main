# Top Ads: fixed, plus three corrections to your review

**Date:** 4 September 2026
**Re:** Owner and Marketing accounts, Top Ads
**Status:** §1 (ranking unit) and §2 (title) landed. §3 and §4 landed. §5 and §0.1 still open.

---

## 1. What shipped

**§1, the ranking unit.** Every panel and both KPI cards now group by `ad_id` and sum across an advertisement's months before ranking or dividing, the same convention Rankings and Budget Reallocation already use (`data_catalog.md` §4.3).

- `lib/stats/campaign-rankings.ts` gained `aggregateAdsById`, which sums spend, impressions, link clicks, messaging conversations, and reach per `ad_id` and counts how many monthly rows each advertisement contributed. Every ranking function (`rankBySpend`, `rankByMessagingContacts`, `rankByReach`, `rankByCostPerInquiry`, `rankByCtr`, `rankByCostPerClick`) and eligible-count function now runs against that aggregated array, not raw monthly rows.
- Both KPI cards ("Total Ads Tracked", "Ads with Messaging Conversations") now count distinct advertisements from the same aggregated array, not row counts.
- The volume panels (Spend, Messaging Conversations, Reach) used to be ranked in the database with `orderBy` + `take: 10` before grouping was possible — moved to a single query that fetches every ad-month row in range, then ranks in JS after aggregation, matching how the efficiency panels already had to work.
- The three eligible-pool counts in the efficiency panels' methodology notes ("*N* ads cleared that floor") are part of the same bug family and are now grouped counts too, not row counts.

**Reach is summed across an ad's months, not deduplicated.** This differs from how `lib/stats/ad-set-metrics.ts` handles reach (it takes a MAX per ad across *daily* rows, because summing ~17 overlapping days within one month wildly inflates the total). Here the rows are already monthly, so summing at most 12 mostly non-overlapping windows is the same coarseness spend and messaging conversations are already summed at. Flagging this explicitly in case there's a reason to want something stricter.

**§2, the title.** Both pages now read **Top Ads** in the page title, matching the sidebar and breadcrumb. The subtitle was already correct and untouched.

**§3, the Period column.** Replaced with **Months Active** — the number of monthly rows that fed into each row's total (e.g. "4 months"), which is the low-confidence signal you asked for and doesn't require a single period an aggregated row no longer has.

**§4, resolved dates under "All time".** `DateRangeFilter` gained an optional prop that shows a resolved date range beneath the "All time" label, the same treatment the custom-range picker already had. This was new work in two places, not a copy of existing dashboard behavior — the dashboard's own "All time" doesn't currently show resolved dates either (see correction below). The two boundary dates are Manila-timezone-anchored via new `STUDY_PERIOD_START_DAY`/`STUDY_PERIOD_END_DAY` constants in `lib/data/study-period.ts`, so the dates can't drift a day off from the underlying UTC-stored instants the way a naive `.getFullYear()`/`.getDate()` read would (the same trap `month-buckets.ts`'s `manilaYearMonth` documents). No mention of "study period" anywhere in the copy — just the two dates, per §0.3.

**Two things caught in review, fixed before this went out:**
- "Months Active" originally counted rows rather than distinct calendar months. Harmless today (this table is monthly-only), but nothing enforces that — a future daily-grain upload would have silently shown "17 months" instead of the true count. Now derived from distinct Manila months of each row's Reporting starts date, so the label is correct regardless of upload grain.
- All six methodology notes and the Reach panel's caption still described the old per-row computation after the numbers underneath changed — a numbers-vs-description mismatch on the exact screen this whole thread is about. All six now state the per-advertisement summation explicitly, and the Reach caption now says reach is summed across months (so an account reached in two different months is counted twice), rather than claiming it's still a unique-account count.

All 454 tests pass (including a rewritten `campaign-rankings.test.ts`), `tsc --noEmit` is clean, and `npm run build` succeeds.

---

## 2. Three corrections to the original review

Recomputing your own figures against the source CSVs turned up three things worth fixing in the write-up, none of which change §1's conclusion:

1. **§1.2's "roughly four distinct advertisements"** undercounts — the two example top-tens actually contained 7 and 8 distinct `Ad ID`s, not 4. The "R5 5600G 8 MID PARANAQUE appears five times" example also conflates three genuinely different advertisements with similar names (`✅`, `📈` ×3, `📈OK G` suffixes are different `Ad ID`s) with two real duplicates ("6 trad san mateo" ×2). The §1.3 table is exact and doesn't have this problem — worth using that instead if this goes into a client-facing version.
2. **§5's "₱18.48"** example doesn't match either the old or the corrected screen's numbers (the corrected top-10 CPI range is ₱8.05–₱11.99). Wherever that figure came from, it isn't reproducible from the data — flagging before it goes further.
3. **§4's premise** that this "is the same treatment the dashboard selector now has" wasn't quite right — the dashboard's own "All time" doesn't render resolved dates either today (its picker only shows them for an explicit custom range). Not a blocker, just means this was new work rather than a copy, which is now done on both.

---

## 3. Still open

- **§5, plain-language findings.** Not started. This is a bigger piece than §1–§4 — six panels each need a sentence generated from the same computation as the figures beside it, per your rule. Wanted to land the correctness fix first rather than build narrative text on top of numbers that were about to change. Will scope this separately.
- **§0.1, em dashes.** Not touched here — bundling with the same pass elsewhere, as you suggested.
- **One data question, not code:** `data_catalog.md` §4.3 says cost-per-inquiry should exclude rows with a blank `Result type` (non-messaging-optimised months). This screen's CPI panel doesn't apply that filter, and never did — it's pre-existing, not something this fix touched. If an advertisement has a mix of messaging and non-messaging months, its non-messaging months' spend currently still counts toward the CPI numerator. Rankings' own equivalent (`ad-set-ranking.ts`) does apply this filter. Worth telling me whether that's worth closing as its own item, or whether it's immaterial in this account's data.
- **One traceability note:** `Priority_List_Complete_Response_2026-08-25.md` confirmed FR-15a "matches Top Ads exactly" before this bug was known. With §1 now fixed, that confirmation is true again — flagging in case `Closing_the_FR_Table.md` wants a note either way.
