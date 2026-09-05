# Budget Reallocation §3: confirmed, FR-11 and FR-12 are independent of the screen's selector

**Date:** 5 September 2026
**Re:** `Budget_Reallocation_Review.md` §3

---

## Answer

**Yes.** FR-11's regression and FR-12's residual diagnostic both use the fixed `MIN_SPEND_THRESHOLD_PHP` constant regardless of what the Budget Reallocation screen's dropdown is set to. The dropdown only ever affects `computeBudgetReallocation`'s own quartile split — it has no path into the regression.

## Evidence

- `lib/stats/fr31-regression.ts:17,36` — `FR31_MIN_SPEND_PHP` is imported directly from `MIN_SPEND_THRESHOLD_PHP` in `lib/stats/budget-reallocation.ts`, the same named constant, per §8 of the FR-31 specification ("make the ₱1,000 threshold the same named constant FR-25 uses").
- `lib/stats/fr31-regression.ts:150` — `buildRegressionDataset` defaults to `FR31_MIN_SPEND_PHP` whenever no explicit `minSpend` override is passed.
- `lib/stats/fr31-regression.ts:794-804` (`fitFr31BothSpecifications`) — the production caller fits two specs: `primary` at line 799 with the fixed `FR31_MIN_SPEND_PHP`, and a `secondary` at line 800 with `minSpend: null` (unfiltered, n=187, matching spec §4's "all messaging ads" secondary model). **Correction, 2026-09-05:** an earlier draft of this memo said line 799 was "the one production call site... no caller ever overrides it" — that overstated it. The unfiltered `secondary` fit is real and is computed and DB-persisted, but `components/analytics/RegressionSection.tsx:342-346` confirms only `primary.residualDiagnostic` is ever rendered to the user, so the conclusion holds: the fixed-threshold spec is the only one shown on screen, and neither spec's `minSpend` is threaded from the Budget Reallocation dropdown regardless.
- `app/dashboard/owner/analysis/` (the S7 page that renders both the regression and the residual diagnostic) has **no `searchParams` or `minSpend` handling at all** — unlike `app/dashboard/owner/budget-reallocation/page.tsx:15,22-24`, which is the only screen that reads a `?minSpend=` query param.
- The residual diagnostic (FR-12) is computed inside the same fit as the regression — `lib/data/analysis.ts:211-212` reads `fit.residualDiagnostic.flaggedCount`/`flaggedTotalSpend` off the object returned by `fitFr31Regression`, so it inherits that same fixed `minSpend` rather than taking one of its own.

There is no code path by which changing the Budget Reallocation screen's threshold selector could change the population, coefficients, or residual flags reported on the Analysis screen. Chapter 4's n = 108 and every coefficient in it are independent of that dropdown.

## Status

§3 closes. Nothing to change in code — this was a verification request, not a bug. Combined with the fixes already landed for §2/§4/§5 (commit `7e1bc1f`) and §0.1/§0.2 (same commit, confirmed no em dashes remain in `budget-reallocation/page.tsx` or `BudgetReallocation.tsx`), the only remaining item from `Budget_Reallocation_Review.md` is the Definition-of-Terms rewording in §3's second half, which is manuscript text outside this repo and not something code can close.

**Superseded note, 2026-09-05:** this memo's content is now folded into `Sep4_5_Audit_Followups_and_Open_Items_2026-09-05.md` §2 as the single document sent to Raven — keeping this file for the standalone record and for anything that cites it by name, but treat the consolidated memo as current.

The paragraph originally here claimed the Sep 4 audit found a live CPI-inflation bug in Budget Reallocation "distinct, still-open" from this memo's scope. **That claim was wrong** and has been corrected in `Sep4_Files_Audit_and_Verification_2026-09-05.md` and in the consolidated memo §1: the live query already excluded non-messaging rows, so the bug as originally described did not exist. A smaller, latent, zero-impact issue was found and fixed instead — see the consolidated memo for the corrected account.
