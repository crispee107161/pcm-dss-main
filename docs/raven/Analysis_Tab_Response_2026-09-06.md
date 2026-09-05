# Analysis tab (owner account) — response

**Date:** 6 September 2026
**Re:** `analysis-tab-memo-final.md`
**Status:** Finding A revised (not what was reported, but a real smaller issue exists), B/C/D/E/F/G/I fixed, H answered with no code change, J/K/L/M/N/O/P not yet started

---

## Finding A — revised

The specific claim doesn't reproduce. I checked three independent sources — a live query against the production DB, a direct scan of all twelve raw CSV exports in `data/New_FB_Ads_Data/`, and the codebase's own prior audit trail — and none show 28 rows, 24 advertisements, or ₱1,174 in spend matching "spent but returned zero results." Across all twelve months there are 486 messaging rows total and zero with `amount_spent > 0` and `results` null or zero, in the DB and in the CSVs alike.

There is a real asymmetry, though, just smaller and in the other direction, and it was already found and accepted once before (`fr31-regression.ts`'s own comment, dated 21 August): **4 rows, all Ad rows dated May 2026, have `amount_spent = 0` with `results` between 1 and 4** (reach and impressions are 0 too — these read as delayed-attribution conversions logged after spend stopped). Confirmed again just now against the live DB:

| Ad | Results (May 2026, zero-spend row) |
|---|---|
| Jun 28, 2025 - 6 trad san mateo | 3 |
| Aug 14, 2024 - RYZEN 5 PINK | 4 |
| Dec 17, 2024 - R5 5600G 8 MID PARANAQUE | 1 |
| Jan 9, 2025 - R7 5700X 4060 Y68 | 1 |

Month-of-life and the frequency diagnostic include these rows (no per-row filter, only a lifetime-total gate). The regression's per-row filter (`spend > 0 AND results > 0`, applied before aggregating) drops them, undercounting those 4 ads' total results by 1–4 each. Since spend on the dropped row is already ₱0, this doesn't remove any spend from the totals, but it does slightly overstate CPI for those 4 ads (same spend, fewer counted results). Measured impact: `n` unchanged at 108/187 either way, every predictor untouched (these rows carry no reach/impressions/clicks to contribute), CPI shift under 0.2% — the same magnitude the original comment already characterized and accepted as immaterial.

No code change made. If you want this reconciled formally rather than left as a documented, accepted, sub-0.2%-impact rounding difference, say so and I'll move the regression's filter to a post-aggregation check (spend/results summed first, then gated) — that's a larger change than it sounds, since the regression's pinned reference numbers and test fixtures are built against the current per-row behavior and would need regenerating against the real dataset. Given the size of the actual effect, I'd lean toward leaving it and just stating the rule, but it's your call.

---

## Finding B — fixed

- Panel now labeled "Studentized Breusch-Pagan, Koenker (heteroscedasticity)."
- The pass/fail tag no longer says "homoscedastic" — it reads "no significant unevenness at the 0.05 level" (pass) or "significant unevenness at the 0.05 level" (fail), and the tag's color no longer stays green for a narrow pass: `p < 0.10` while still `>= 0.05` now renders in the same warning tone as an outright fail.
- The normality narrative now names whichever diagnostics actually motivate HC3 instead of citing non-normality alone: on the real 108-ad fixture (p = 0.0543, a genuine narrow pass), it now reads that residuals are non-normal *and* variance unevenness is borderline, so HC3 covers both. Added a test pinned against this exact real case, not a synthetic one.

## Finding C — fixed

Frequency panel headline now states "This uses a rank-based (Spearman) correlation," matching the form the panel above it already uses for method disclosure.

## Finding D — fixed

All eight panels' headlines now carry a record count, threaded from the same computation that produced the panel rather than a hardcoded number (per your second bullet). One open question below on which count the frequency panel should show.

## Finding E — fixed

Frequency diagnostic now discloses the count of rows it drops for having no recorded frequency, in the same footnote style the organic panel already uses for its excluded post. Named for what the code actually checks (a missing/zero `frequency` value) rather than asserting reach as the cause, since `frequency` is its own stored column here, not derived from reach in this function.

## Finding F — fixed

The headline no longer claims every unstable predictor "changes direction." It now distinguishes three outcomes: a predictor that actually flips sign (only engagement rate, in the live data), a predictor that stays the same sign but changes in strength across specifications (frequency), and — new, not in your original finding but the same bug in a different shape — a predictor that was never significant in either specification, which now reads "not clearly associated" rather than "changes in strength." My code reviewer caught that last case: the underlying `stable` check is `!signFlip AND significant in both specs`, so `!stable AND !signFlip` was quietly covering two different findings.

## Finding G — fixed, revised once already

Added a "How These Are Calculated" card at the top of the screen with all six formulas, distinguishing the two engagement rates by name and scale. My own first draft of this card claimed "every figure is calculated the same way" and stated cost per inquiry as always summed-then-divided — both wrong, since the frequency diagnostic computes cost per inquiry per ad-month row, not summed per ad like every other panel. The card now says so explicitly instead of asserting a uniform rule the code doesn't follow. Also gated the four ad-only definitions (CTR, CPM, frequency, cost per inquiry) behind the same flag that hides the ad-efficiency panels from Marketing Team, since the first draft had leaked those definitions to a role that can't see the panels they describe.

## Finding H — answered, no code change

Confirmed by reading `crossValidate`/`accuracyMetrics` directly: the app already pools every fold's held-out predictions into one array before computing MAE/RMSE/MAPE/R², rather than averaging per-fold statistics — which is the more stable option your memo recommended switching to. It's computed on the peso (CPI) scale, not the log scale, which is why it doesn't land exactly on any of your three candidate numbers; it's closest to your "pooled, peso scale" definition (0.396 typical, 0.342–0.432 range), and the app's own reproducible test band (0.35–0.42, seed 42, `mulberry32` not `sklearn`) sits inside that range. No change needed on our end; this should answer your question 1.

## Finding I — done, answered your question 3

Trimmed the paused-ad gap-month caveat, since no advertisement in the current data has a gap and the sentence was defending against something not visible on screen. Kept the rest of the footnote (the spend-summed-over-results-summed line). To your question 3: yes, month-of-life genuinely computes the calendar difference from each ad's own first month (`row's calendar month index − the ad's earliest observed month index`), not the position of a row in a sequence — confirmed by reading the code, not inferred from the absence of gaps in this data.

---

## Open questions

1. **Frequency panel's record count** — I used 187 (distinct advertisements), matching your Finding D table exactly. But your own §1 describes this diagnostic as "482 records, 187 advertisements," and FR-18 asks for the count a result rests on — which is 482, the number the correlation is actually computed over. Both are defensible; let me know if you want 482 instead and I'll switch it.
2. Same-scale note: organic engagement rate is stored as a percentage (×100), ad engagement rate is a bare ratio. The "How These Are Calculated" card states the formulas but not this scale difference — want a clause added?

---

## Not started

J, K, L, M, N, O, P — the "would be better" polish items (scale-mixing in the accuracy table, rounding consistency, the untested category comparison, duplicate CSV headers, semicolons, the baseline-fit dash, and the Chapter 5 visual-hierarchy items). None of these are urgent per your own priority list; say the word if you want them worked through next.

All tests pass (543/543), `tsc --noEmit` is clean, and `npm run build` succeeds. Nothing has been committed yet.
