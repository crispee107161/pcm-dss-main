# Cut pages deleted; §1's gating question and §3's cohort/threshold questions answered

**Date:** 2 September 2026
**Re:** `Delete_Cut_Pages_and_Browser_Pass_Gap.md`
**Status:** §1 done (deleted + answered), §3's three items answered. §2 (manual click-through) stays ours per your memo — nothing needed from you there.

---

## 1. The three pages and `/ui` are deleted, and the gating question is answered

**They were never reachable while logged out.** `middleware.ts` gates the whole `/dashboard/*` tree before any page file runs: no session → redirect to `/login`; session but wrong role → redirect to the caller's own dashboard (`BUSINESS_OWNER` → `/dashboard/owner`, everyone else bounced out of it). `correlation`, `regression`, and `simulation` all live under `/dashboard/owner/`, so reaching them required a valid session **and** the Owner role — the "no auth gating at all in their page files" phrasing in the prior sweep was accurate about the page files themselves (they had no in-page `auth()` check) but the route was never actually open, because middleware sits in front of the page. Confirmed independently by the earlier three-role sweep in `Three_Confirmations_Answered_2026-09-02.md` §3: `/dashboard/owner*` bounced every non-Owner account.

So: **FR-01 holds as written**, no qualification needed. The deletion stands on the Chapter 4 grounds alone, same as you framed it.

**Deleted, not just gated:**
- `app/dashboard/owner/correlation/page.tsx`
- `app/dashboard/owner/regression/page.tsx`
- `app/dashboard/owner/simulation/page.tsx`

These were already `notFound()` stubs from an earlier pass (`3380459`, "fix: 404 cut regression/simulation routes instead of rendering them") — gated but still present on disk at a guessable URL, rendering a 404 rather than absent entirely. Deleted outright now, per your reasoning that deleting beats gating. `lib/stats/regression.ts`, `lib/stats/simulation.ts`, `laggedCorrelation.ts` stay on disk (cut-feature legacy, `mvp.md` §5) since nothing routes to them.

**`/ui` deleted too.** It was a fully unauthenticated component showcase — outside the `/dashboard` prefix middleware matches, so it had zero gating of any kind, not even the "wrong role" bounce the owner routes had. Confirmed unreferenced anywhere in `.ts`/`.tsx` before removing it.

Verified: 385/385 tests still pass after the deletion; grepped the whole tree first for any link/import into any of the four routes and found none.

---

## 2. FR-27 (your FR-16) lifecycle cohort — it holds the cohort fixed

Your worry was pooling: does the curve at month 3 use the same advertisements as month 0, or does it silently swap in whatever's still alive at month 3?

**It holds the cohort fixed.** `buildCurve()` in `lib/stats/ad-lifecycle.ts` (lines 100–131) computes `cohortAdIds` once — every ad whose *maximum* observed month-of-life is `>= minSurvivalMonths` — and then aggregates every month-index point in the curve only from that fixed set. An ad that dies at month 1 never contributes to the ≥2-month cohort's month-0 point either; it's excluded from the whole curve, not just the later points. That's the correct read of "month-of-life cohort curves" and it's exactly what `mvp.md` §4.5 and §4.8's defensibility table describe as the fix for the survivorship bias you flagged in your own root-cause read (the code comment at lines 63–69 states the same reasoning you gave: an unrestricted curve mixes ads killed early with ads that ran long).

Two cohorts are computed by default (`cohortThresholds = [2, 3]`), both cohort-restricted the same way.

## 3. The two threshold values

**Cohort thresholds (the "minimum survival threshold" for the curve):** `[2, 3]` months, unit = calendar months of age, both computed and shown side by side — `computeAdLifecycle(ads, frequencyRows, cohortThresholds = [2, 3])` in `ad-lifecycle.ts:140`. Matches `mvp.md` §4.5's "≥2mo cohort" / "≥3mo cohort" figures exactly.

**The single-month-vs-long-run comparison (a separate, simpler companion figure, same file):** single-month = ads with max month-of-life `== 0`; long-run = ads with max month-of-life `>= 3`, labelled `thresholdMonths: 4` in the result type since month-index 3 is the 4th calendar month. This is the "single-month n=48 at ₱14.66 vs. 4+-month n=50 at ₱13.58" figure in `mvp.md` §4.5.

If Definition of Terms wants one named constant, it's the cohort pair `{2, 3}` months — that's what drives the curve you're citing as the corrected finding; the single/long-run split is a secondary comparison, not the cohort mechanism itself.

## 4. `MIN_SPEND_THRESHOLD_PHP` provenance

Defined once, never changed: `lib/stats/budget-reallocation.ts:6`, `export const MIN_SPEND_THRESHOLD_PHP = 1000`. Added in commit `bcd8864` ("feat: FR-31 explanatory regression analysis (S7)"), **2026-08-21 15:10:27 +0800**. `git log --follow -p` across the file's whole history shows exactly one addition of that line and zero subsequent modifications — the value has been ₱1,000 since it was introduced, and `fr31-regression.ts` imports the same constant rather than a second literal (already confirmed in `FR_Table_Clarifications_Response_2026-08-25.md`). Clean, as you expected.

---

## Where this leaves things

§1 is closed: pages deleted, FR-01 confirmed to hold without qualification. §3's cohort question and both threshold values are answered above with file/line citations. §2's browser click-through stays on our side, no action needed from you.

Open from `Lifecycle_Cohort_and_Threshold_Parameters.md`'s original ask: only the cohort-mechanics question was outstanding there and it's answered in §2 above — nothing else in that memo is still pending on my end.
