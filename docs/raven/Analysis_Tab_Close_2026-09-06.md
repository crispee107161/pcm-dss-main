# Analysis tab (owner account) — closing memo

**Date:** 6 September 2026
**Re:** `analysis-tab-memo-final.md`, `Analysis_Tab_Response_2026-09-06.md`, `Analysis_Tab_Response_2026-9-6.md`
**Status:** everything through Finding I closed, the ₱21.50 discrepancy independently reconciled against the live DB, K/M/N/O closed, J's residual-caveat clause added, P left exactly as you scoped it (not now), and **one open decision for you: Finding L**

---

## The row-count discrepancy, reconciled

Before closing this out we re-derived your 28-row, 24-advertisement, ₱1,174.32 figure independently against the live DB, not against your numbers. First pass didn't match: querying every row with a blank `result_type` and positive spend returned 34 rows across 28 advertisements, ₱1,305.21. Same direction, wrong count.

The gap was scope, not data: your 28/24/₱1,174.32 is specifically the blank rows that **belong to an advertisement with a messaging row elsewhere** ("They belong to advertisements that have messaging rows elsewhere," your phrase). Restricting the query the same way — blank `result_type`, any spend including the two ₱0 rows, ad_id present among ads with at least one `Messaging conversations started` row — reproduces 28 rows, 24 advertisements, ₱1,174.32 exactly, to the peso. The other 8 rows (6 advertisements, ₱130.89) are blank-type months on ads that never ran a messaging month at all in this data — a different, uninteresting bucket your scan correctly excluded and ours initially didn't.

## The fix, verified independently

`lib/stats/ad-lifecycle.ts`'s `computeMonthOfLife` (feeds the month-of-life cohort curves and the single-month/long-run comparison) queried every ad row in the study period with no `result_type` filter, then summed `amount_spent` from every row of an ad that ever had a messaging result — with no per-row check on that row's own `result_type`. A blank-type month belonging to an otherwise-messaging ad had its real spend counted toward that ad's CPI with nothing on the other side of the ratio, since `total_messaging_contacts` is null on those rows. That's the leak: not the ingestion, which stores each row correctly, but this one aggregator's missing gate — the same gate `ad-set-ranking.ts`, `budget-reallocation.ts`, and `campaign-rankings.ts` already apply.

Fixed by adding `result_type` to `AdRowForLifecycle` and gating both `spend` and `results` on `result_type === MESSAGING_RESULT_TYPE`, matching those three files' existing convention exactly. A non-messaging month's row still exists for month-index and gap tracking; it now contributes 0 to both sides of the ratio instead of leaking spend into it.

Independently reran the same 187-advertisement median-CPI comparison against the live DB, before and after the fix, without going through the app's own code path a second time:

| | n | Median CPI |
|---|---|---|
| Old (unfixed) aggregation | 187 | ₱21.50 |
| New (fixed) aggregation | 187 | ₱21.39 |

Both match your two reference numbers exactly. `n` is unchanged, confirming this only touches which spend counts toward CPI, not which ads qualify.

New test in `ad-lifecycle.test.ts` pins the scenario directly: an ad with one real messaging month and one blank-`result_type` month carrying real spend, confirming that spend is excluded from the month's CPI.

## The rest of the "would be better" list

Went through K, L, M, N, O, P and closed what was safe to close without a design or methodology decision from you:

- **K (rounding).** `RegressionSection.tsx`'s MAE-improvement footnote used `toFixed(0)` while `analysis-narrative.ts`'s headline sentence for the same figure used `toFixed(1)`. Both now round to one decimal.
- **M (duplicate CSV headers).** Confirmed deliberate, not accidental: Papa Parse's `header: true` mode renames every repeated header after the first to `<name>_1`, so `row['Ad ID']` always reads the first "Ad ID" column and the duplicate's cells sit unread under a different key — not overwritten, not merged. Documented this in a comment on `validateAdsRows` so the next person doesn't have to re-derive it, including the one caveat worth carrying forward: if a future export ever disagreed between the two copies, the file would silently keep reading the first one.
- **N (semicolons).** Split both into two sentences: the category-distribution headline (`analysis-narrative.ts`) and the correlation panel's method-selection footnote (`AnalysisView.tsx`).
- **O (baseline dash).** Added a tooltip on the accuracy table's baseline-fit cell explaining the dash is deliberate (a median baseline has no fit statistic), not a missing value.
- **J, follow-up.** Added the clause you asked for to the residual diagnostic's caption: predictions from a log-scale fit estimate a typical value, not an average.

**Needs a decision from you — not closed:**
- **L (category significance test).** The current headline states the two category rates as a comparison, not a causal claim ("X has the highest... Y has the lowest"), without asserting significance — a defensible reading of "description, not finding" as it stands today. But we didn't pick that as the final answer; building the rank test instead is real work with a methodology choice behind it (which test, how pairwise follow-up is presented), and that's not ours to decide unilaterally five weeks out. **Please tell us which you want:** (a) leave the headline as description, no test, considered closed as-is, or (b) add the rank test — either you run it from the categorized export as you offered, or you tell us to build it. Nothing further happens on this finding until you answer.

**Left alone, on purpose (no decision needed):**
- **P (visual hierarchy).** Exactly as you scoped it: not now. Didn't touch the capitalized-label removal or the coverage line, since both are visual/IA decisions and you'd already flagged this as Chapter 5.

544/544 tests pass, `tsc --noEmit` clean, `npm run build` succeeds. Nothing has been committed yet.
