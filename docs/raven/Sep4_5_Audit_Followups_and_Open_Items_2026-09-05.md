# Sep 4-5 housekeeping: one correction, one fix, two checks closed, three open confirmations

**Date:** 5 September 2026
**Re:** everything dated 4-5 September across `docs/raven/`
**Status:** we ran a full pass reconciling every Sep 4 and Sep 5 file against the current code, not just against what each memo claimed. §1 below corrects something we got wrong in our own first pass — flagging it plainly rather than quietly fixing the framing, since it's exactly the kind of number-provenance error the FR-table review was strict about. We ran the two checks that were sitting open. A handful of your questions are still unanswered in writing even though we now have the answers.

---

## 1. Correction: Budget Reallocation did NOT have the Top Ads / Ad-Set Ranking bug. We fixed a smaller, latent issue instead, with no effect on any current figure.

Your `Top_Ads_Accepted_and_Filter_Question.md` §2 asked whether FR-31's regression and Budget Reallocation apply the same "exclude non-messaging-month spend" filter that Top Ads and Ad-Set Ranking were fixed to apply. FR-31: yes, confirmed independently, see §2 below. Budget Reallocation: **we told you it had the same bug in our first pass. That was wrong.** Here's the correct picture.

`aggregateByAdId` in `lib/stats/budget-reallocation.ts` did sum an ad's spend across every uploaded month unconditionally, which looks identical to the pattern `2c1dddf` and `a295d79` fixed in Top Ads and Ad-Set Ranking. But in those two cases, the aggregation function ran on an *unfiltered* row set. Here, both callers' Prisma query already filtered to `total_messaging_contacts: { not: null }` before any row reached the aggregation function — so non-messaging rows never got there to be over-counted. The bug we described doesn't exist on this file.

The filter that was already there has a different, smaller problem: `total_messaging_contacts` is also null for a genuinely messaging-optimised row whose "Results" cell was blank in the CSV, so that filter was silently dropping real messaging spend, not adding fake spend. We checked this against the frozen 486-row messaging dump used for FR-31 (`lib/stats/__fixtures__/fr31-raw-ads.json`) and confirmed **zero rows have a blank Results cell**. So this was a latent risk with zero effect on any figure you've seen: `n`, the 27/27/27/27 split, `q1Cpi`, and the +3,079 counterfactual are all unchanged.

We fixed it anyway, since it's a real risk for any future upload with a blank Results cell, using the same approach as the (correct) Top Ads/Ad-Set Ranking fix: both call sites now select `result_type` and fetch the full study-period population, and `aggregateByAdId` filters on `result_type` internally so the function is correct regardless of what its caller's query does. New tests cover the blank-Results-row case directly (the earlier version of this change had a test for the wrong scenario — the hypothetical over-counting bug, not the actual under-counting risk — that's fixed too). 528/528 tests pass, `tsc --noEmit` clean, production build succeeds. Not committed yet, pending your read, per our usual process.

No before/after impact sizing is needed here, since we verified it's a no-op on current data rather than estimating one.

- [ ] Nothing needed here beyond acknowledgement. Recorded so the correct version is what's on file, not the first-pass version.

---

## 2. FR-31 and FR-12: confirmed independent of the Budget Reallocation dropdown

This closes `Budget_Reallocation_Review.md` §3.

**Answer:** Yes. FR-11's regression and FR-12's residual diagnostic both use the fixed `MIN_SPEND_THRESHOLD_PHP` constant regardless of what the Budget Reallocation screen's dropdown is set to. The dropdown only ever affects `computeBudgetReallocation`'s own quartile split — it has no path into the regression.

**Evidence:**

- `lib/stats/fr31-regression.ts:17,36` — `FR31_MIN_SPEND_PHP` is imported directly from `MIN_SPEND_THRESHOLD_PHP` in `lib/stats/budget-reallocation.ts`, the same named constant, per §8 of the FR-31 specification ("make the ₱1,000 threshold the same named constant FR-25 uses").
- `lib/stats/fr31-regression.ts:150` — `buildRegressionDataset` defaults to `FR31_MIN_SPEND_PHP` whenever no explicit `minSpend` override is passed.
- `lib/stats/fr31-regression.ts:794-804` (`fitFr31BothSpecifications`) — the production caller fits two specs: `primary` at line 799 with the fixed `FR31_MIN_SPEND_PHP`, and a `secondary` at line 800 with `minSpend: null` (unfiltered, n=187, matching spec §4's "all messaging ads" secondary model). The unfiltered `secondary` fit is real and is computed and DB-persisted, but `components/analytics/RegressionSection.tsx:342-346` confirms only `primary.residualDiagnostic` is ever rendered to the user, so the conclusion holds: the fixed-threshold spec is the only one shown on screen, and neither spec's `minSpend` is threaded from the Budget Reallocation dropdown regardless.
- `app/dashboard/owner/analysis/` (the S7 page that renders both the regression and the residual diagnostic) has **no `searchParams` or `minSpend` handling at all** — unlike `app/dashboard/owner/budget-reallocation/page.tsx`, which is the only screen that reads a `?minSpend=` query param.
- The residual diagnostic (FR-12) is computed inside the same fit as the regression — `lib/data/analysis.ts:211-212` reads `fit.residualDiagnostic.flaggedCount`/`flaggedTotalSpend` off the object returned by `fitFr31Regression`, so it inherits that same fixed `minSpend` rather than taking one of its own.

There is no code path by which changing the Budget Reallocation screen's threshold selector could change the population, coefficients, or residual flags reported on the Analysis screen. Chapter 4's n = 108 and every coefficient in it are independent of that dropdown.

**Status:** §3 closes. Nothing to change in code, this was a verification request, not a bug. Combined with the fixes already landed for §2/§4/§5 (commit `7e1bc1f`) and §0.1/§0.2 (same commit, confirmed no em dashes remain in `budget-reallocation/page.tsx` or `BudgetReallocation.tsx`), the only remaining item from `Budget_Reallocation_Review.md` is the Definition-of-Terms rewording in §3's second half, which is manuscript text outside this repo and not something code can close.

- [ ] Nothing needed here. Recorded so it isn't re-asked.

---

## 3. Five Analysis screen confirmations from `Analysis_Screen_Landed_Open_Questions_2026-09-05.md` are still open

None of these blocked the commit (it's landed, `f8c8522`), and none are urgent, but none have an answer on record either:

- [ ] §1 — treat `FR31_Regression_Specification.md` as current (r = 0.958, amended display rule).
- [ ] §2 — leave the two older memos citing r = 0.984 as dated correspondence, or amend them too.
- [ ] §3 — confirm the month-of-life headline should always quote the most inclusive cohort with a usable curve.
- [ ] §4 — confirm the residual diagnostic's exception to the disclosure pattern (visible by default, not collapsed) is the right call.
- [ ] §5 — confirm bare `—` table placeholders (missing R², no secondary specification) are outside the em-dash rule's scope.

Priority order, per that memo: §4 first (easiest to misjudge reading the screen cold), then §1, then §2/§3/§5 as time allows.

---

## 4. Two smaller items, now checked

- [x] **NFKC-normalization** (`Export_Verified_Repair_Approved.md`): both methods do. `lib/keywords/detect.ts:41,45` normalizes both the caption and each keyword with NFKC before matching (173/730 captions use stylised Unicode, e.g. mathematical-bold text, that wouldn't substring-match otherwise); `actions/classify-posts.ts:271` normalizes the caption with NFKC before it's sent to the LLM. Confirmed by reading both call sites directly, not inferred.
- [ ] ⚠ **TESTIMONIAL-category customer-naming risk** (`Account_Items_Reply_2026-09-04.md`): the risk is real, not hypothetical. We pulled and read all 214 live TESTIMONIAL-labeled captions. 212 are generic (brand name, product spec, or a term like "Bossing"/"ka-PCMerch" used as a general term of address, not identifying anyone). **Two captions name an actual customer:**
  - post `1433640675452487`: "Thank you for trusting PC Merchandise, sir Sorro."
  - post `1411972634285958`: "Thank you for buying this build, Bossing Xtian! 💯"

  - [ ] Confirm how you want these handled before the panel sees any caption sample or export: redact the name in any manuscript excerpt, exclude these two posts from illustrative examples, or something else. We made no changes to the data or the app, this is read-only pending your call.

---

## 5. Still waiting on you

- [x] ~~Pooled inter-coder ceiling~~ **Already closed — this was stale by the time this memo was drafted.** You sent it in `Live_Lexicon_and_Pooled_Ceiling.md` §6 (n=707, 84.44% agreement, κ=0.7572) and it was imported and confirmed live in `Lexicon_State_and_Pooled_Ceiling_Imported_2026-09-05.md` §4, both before this memo was written. No action needed. Sorry for the noise — this section of the audit predates that exchange and wasn't refreshed before send.
- [ ] **Groq account post-defence arrangement and NDA-signatory confirmation** (`Groq_Account_Ownership_and_Remaining_Items.md`): still open, and not something code can resolve.

Separately, the `Live_Lexicon_and_Pooled_Ceiling.md` / `Lexicon_State_and_Pooled_Ceiling_Imported_2026-09-05.md` / `Keyword_Backfill_Approved.md` / `Keyword_Backfill_Complete_2026-09-05.md` thread also closed out the stale keyword-kappa figures (0.1388/0.1494 → 0.1360/0.1566, backfill run, 866 rows written) — this whole thread happened in parallel with the audit this memo is built from and isn't otherwise reflected here. Flagging so it isn't treated as still open just because this memo doesn't mention it elsewhere.

---

## 5a. One item from your own review we haven't closed out yet

`Rankings_Review.md` — the captions-from-same-rows fix landed (`c74c9bf`), but we haven't gone back through §2.1 (the computed one-to-one sentence), §4 (the confounding-caveat rewrite), and §5 (the plain-language headline) line by line to confirm each landed as described. Not claiming these are wrong, just flagging that only the captions piece has been independently re-verified so far. We'll run that pass and report back rather than leaving it silently unconfirmed.

- [ ] No action needed from you here — noting it so it isn't mistaken for closed.

---

## 6. Priority

1. **§4**, the two named-customer captions. This is the one item with a real, already-identified instance sitting in front of a panel review.
2. **§3**, the five Analysis screen confirmations, at your convenience.
3. **§5**, the Groq account decisions, whenever you're ready. Nothing here blocks other work.
4. **§1** is a correction for the record, not an ask — no figure moved and nothing needs deciding, just flagging that our first-pass audit was wrong about the bug.
