# Analysis tab (owner account) — response to your reply

**Date:** 6 September 2026
**Re:** `Analysis_Tab_Response_2026-9-6.md`
**Status:** the ₱21.50 source found and fixed, frequency count switched to both numbers, Finding H's scale-mixing addressed, Finding F's question answered with no change needed

---

## Finding A, continued — found where ₱21.50 comes from, fixed it

You were right to keep pushing. The 28 blank-result-type rows never reach `fr31-regression.ts` at all — they fail the `result_type !== FR31_RESULT_TYPE` gate before the per-row spend/results filter even runs, so the regression, accuracy, and residual panels were never exposed to them.

The leak was in `lib/stats/ad-lifecycle.ts`'s `computeMonthOfLife`, which feeds the month-of-life cohort curves and the single-month/long-run comparison. Its Prisma query (`lib/data/analysis.ts`, `loadAdLifecycleData`) pulls every ad row in the study period with no `result_type` filter at all, unlike every other aggregator on this screen. The function then summed `amount_spent` from **every row of an ad that ever had a messaging result**, with no per-row check on that row's own `result_type`. A blank-result-type month belonging to an otherwise-messaging ad had its real spend added to the CPI numerator every time, with nothing added to the denominator, since `total_messaging_contacts` is null on those rows. That's the ₱21.50 you traced: it's the month-of-life computation's own quiet inflation, not the ingestion doing anything wrong with the rows themselves — they're stored correctly, one real row per ad per month, just never gated the way `ad-set-ranking.ts`, `budget-reallocation.ts`, and `campaign-rankings.ts` already gate the same pattern.

Fixed: added `result_type` to `AdRowForLifecycle` and to the Prisma select, and gated both `spend` and `results` in `computeMonthOfLife` on `result_type === MESSAGING_RESULT_TYPE`, matching the other three aggregators' existing convention exactly. A non-messaging month's row still exists for month-index/gap-month bookkeeping, it just contributes 0 to both sides of the CPI ratio for that month, the same as a genuinely empty month already did.

New test in `ad-lifecycle.test.ts` pins this: an ad with one real messaging month and one blank-result-type month with real spend now shows that spend excluded from both the month-of-life curve and (by the same code path) the single-month/long-run comparison.

544/544 tests pass, `tsc --noEmit` clean, `npm run build` succeeds.

## Frequency panel's record count — switched to both

Per your call: the frequency panel headline now reads "Across 482 monthly records from 187 advertisements," not just one of the two. `frequencySentence` takes both `n` and `adCount` now.

## Finding H, escalated — addressed

Added a scale label under each value in the accuracy table's R² row: "log scale" under In-Sample, "peso scale" under 10-Fold CV. The two cells no longer sit side by side with nothing distinguishing what they're measuring against.

## Scale clause on the "How These Are Calculated" card — added

The advertisement engagement-rate line now states its own scale explicitly ("shown as a bare ratio, not a percentage") and names the specific place the mismatch shows up on screen: the category table above it displays organic engagement rate as a percentage (e.g. 0.85%), while the regression coefficient for the ad version is on the bare ratio.

## Finding F — answered, no change needed

Checked `compareSpecifications` in `fr31-regression.ts` directly: `robustSignificantPrimary`/`robustSignificantSecondary` are computed from `row.pHc3`, not `row.pOls`. The badge logic already reads the robust column, matching the panel's own statement that robust errors are the ones that count. No disagreement between the badges and the stated inference exists in the code as written.

---

Nothing else from your reply is outstanding. J–P (the "would be better" items) are still not started, unchanged from the prior response.
