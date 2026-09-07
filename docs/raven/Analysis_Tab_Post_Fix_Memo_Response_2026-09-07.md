# Response: Analysis tab post-fix memo

**Date:** 7 September 2026
**Replying to:** `docs/raven/analysis-tab-post-fix-memo.md`

---

## §3. The study window

**Are the boundaries constants or derived from the data? Constants.** `lib/data/study-period.ts` defines `STUDY_PERIOD_START`/`STUDY_PERIOD_END` as fixed values (Aug 2025–Jul 2026), read once at module load. They do not move with new uploads. That part of the memo's concern is confirmed.

**But they are not code-hardcoded literals — they are env-overridable**, and already were before this memo:

```ts
const START_RAW = process.env.STUDY_PERIOD_START ?? '2025-08-01T00:00:00'
const END_RAW = process.env.STUDY_PERIOD_END ?? '2026-07-31T23:59:59'
```

This was a deliberate choice from FR-04a (`docs/raven/FR04a_Implementation_and_731st_Post_Response_2026-08-25.md` §2): a constants/env module was explicitly requested there instead of a settings screen. Reading the two memos together, we think this already satisfies "a configurable setting is fine, and a hardcoded pair of dates is not" — extending the window after handover is a Vercel environment-variable change and a redeploy, not a code edit. No PR, no data migration.

What it is **not** yet is *documented* or *automated*. Two gaps worth naming honestly:

1. `STUDY_PERIOD_START`/`STUDY_PERIOD_END` aren't listed in any environment-variable reference the client would see (there's no `.env.example` in this repo at all, a pre-existing gap unrelated to this memo). Whoever owns deployment after handover needs to be told this lever exists.
2. Nothing reminds anyone to move the window. If nobody touches the env vars, uploads past 31 Jul 2026 keep landing in the tables (never deleted, per FR-04a §4) but keep getting excluded from every analytical output, silently, exactly as the memo describes.

**We're not silently resolving this by picking an approach** — it directly revisits an explicit prior decision, and the earlier memo's "no settings screen" framing and this memo's "silent failure" framing are in tension. What we've done instead, this pass:

- Confirmed the mechanism is real and already meets the letter of "configurable, not hardcoded."
- Made the exclusion visible per the memo's own suggestion (see below), so even an unmoved window degrades visibly rather than silently.
- Left the actual decision (settings screen vs. documented env var vs. an explicit yearly renewal step in the handover doc) open for you and the client to make together, since it's a product decision about who's expected to operate this after we're gone, not something the code can decide.

**Coverage strip now states exclusions.** `lib/data/analysis.ts`'s `AnalysisCoverage` gained `adsExcluded`/`postsExcluded`. `postsExcluded` is an exact row count (total posts minus in-period posts). `adsExcluded` is advertisements with NO in-period row at all — the Ad table is one row per advertisement per month, so an ad with some months inside the window and some outside it still counts toward the main figure, not this one, since it does have in-period activity. On the live data today that's:

> Aug 2025 – Jul 2026 · 309 advertisements in this period · 731 posts in this period (185 more uploaded outside it, not analysed)

(`adsExcluded` is 0 right now — every uploaded advertisement has at least one row inside the study window — so its parenthetical doesn't render; it appears automatically once an ad exists with none.) code-review-analyst caught the first draft attaching "uploaded" to the in-period figure, which produced a total that didn't reconcile with the true uploaded count whenever a straddling ad existed; the wording above states only what each number actually measures.

**Minimum-record guards, confirmed present, no code change needed:**
- Category test: `computeCategorySignificance` returns `null` when fewer than 2 categories have ≥3 posts (`lib/stats/category-significance.ts:161-162`), and `categorySignificanceSentence` falls back to a plain "not enough categorised posts yet" headline.
- Month-of-life: `monthOfLifeSentence` returns `null` (rendered as "Not enough advertisements have run long enough yet") unless a cohort has ≥2 curve points with a non-null CPI at both ends (`lib/stats/analysis-narrative.ts:289-293`).

Both guards predate this memo; we just verified they cover the "future upload leaves a group too small" scenario you asked about, rather than adding new ones.

---

## §4 Finding A — month-of-life reproducibility

`computeMonthOfLife` (`lib/stats/ad-lifecycle.ts:107-132`) already implements exactly your closest-match rule (row 3 of your table): it drops any row whose `result_type` isn't the messaging type before doing anything else, then anchors each remaining ad's month index on the **minimum month among its own messaging-only rows**, and only keeps ads whose messaging-only total is > 0. Both the month index and the CPI ratio are computed from that same messaging-only row set — there's no separate, looser population feeding either one.

That's the rule your reconstruction landed closest to (₱15.52/₱13.55 on n=111) against the live ₱15.53/₱13.58. We can't explain the remaining ₱0.01–0.03 from the code — it doesn't branch any differently than what's described above. Possible sources worth checking on your side: whether your manual reconstruction anchored on "first messaging row" per ad the same way (UTC calendar month via `getUTCFullYear()*12 + getUTCMonth()`, not first-of-any-kind), and whether the 187-vs-309 distinction from §4E affected which raw export rows you were summing. We don't have a code change to offer without knowing which of those, if either, differs — could you re-run row 3's rule with the population/anchor stated above and see if it closes the gap? Happy to pair on it directly if a re-run doesn't converge.

---

## §2 — the six dynamic headlines

Went through all six against your "what does this say if it reverses" test. All six already branch on the result rather than only interpolating numbers into a fixed sentence — including the two you flagged as most likely to break:

| Headline | Reverses to | Confirmed |
|---|---|---|
| Month-of-life direction | "gets more expensive" branch | `monthOfLifeSentence` branches on rose/fell/held steady |
| Views/engagement overlap | "almost exactly" branch | `rankingOverlapSentence` branches on overlap fraction ≥ 0.9 |
| Views-vs-reach | negative-correlation branch exists | `viewsReachSentence` branches on sign and magnitude |
| Frequency vs. CPI | "tends to rise" branch | `frequencySentence` branches on `rho < 0` |
| **Accuracy ("closer")** | "not more accurate than…" branch | `accuracySentence` branches on `improvement <= 0` — already has a working negative form, despite "closer" itself having none |
| **Residual outliers** | "No advertisements cost…" empty state | `residualSentence` branches on `flaggedCount === 0`, with singular/plural forms above that |

No code changes were needed here — this was a verification pass, not a fix. Flagging in case it's useful for your own re-verification: no unit test previously locked in the accuracy/residual negative branches specifically (they existed but weren't exercised by a reversal case), so we didn't add new coverage there either — the existing behavior was already correct, just unconfirmed.

---

## §4 Finding B — wrong record count

Fixed. `monthOfLifeSentence` now names the cohort that actually produced the result inline ("Among the 111 advertisements that ran…") and keeps the corpus total only as trailing context ("Of 187 advertisements that recorded a messaging conversation in total"), matching the frequency panel's pattern you pointed to. Test added (`lib/stats/analysis-narrative.test.ts`, "names the cohort that ran long enough...").

## §4 Finding C — definitions card overclaim

Fixed, using your suggested wording. Headline is now "The measures below are ratios of figures Facebook reports directly. The statistics computed from them are described in each panel."

## §4 Finding D — silent category comparison

Fixed. `categorySignificanceSentence` checks every pair of categories that both get named in the headline — not only pairs where both sit on the "higher" side of a comparison, but any two named categories, lower-lower or lower-higher included — and states explicitly when their own pairwise result isn't significant ("Entertainment and Product Showcase are not distinguishable from each other"). The first draft only checked the "higher" side, which code-review-analyst flagged as missing a silent pair when both categories are named on the "lower" side of different comparisons; the check is now unconditional on which side a category was named from. Confirmed this holds on the 731-post population, not just the 488-post subset your figure was drawn from — the sentence is generated from `computeCategorySignificance`'s live pairwise output, so it can't go stale the same way the old headline did. Test added.

## §4 Finding E — coverage strip vs. panel counts

Addressed as part of §3 above: the strip now says "advertisements/posts in this period" and states the excluded remainder when nonzero, naming what each excluded figure actually measures rather than implying a bare total-minus-analysed relationship. On the live data that's 309 in-period advertisements (0 currently excluded) and 731 in-period posts (185 excluded), visible on the strip itself instead of requiring the reader to reconcile two numbers on their own.

## §4 Finding F — carried over

- **En dash in the date range.** Left as-is. This is a range separator (`STUDY_PERIOD_LABEL`'s "Aug 2025 – Jul 2026"), the same typographic role as the table's null-value dash your §0.1 already exempts from the no-em-dash rule, not a prose dash. Tell us if you want this changed and we'll do it in one place (`lib/data/study-period.ts`).
- **"Closer" wording.** Not reworded further. The failure mode you flagged (no negative form) is already avoided structurally — a negative result takes an entirely different sentence ("not more accurate than…"), not a negated "closer" — so the loose word itself isn't a live risk, just imprecise phrasing in the positive case. Can tighten it if you'd still rather.

---

## Verification

566/566 tests pass, clean `tsc --noEmit`, clean production build. (Corrected from the 564/564 first reported here — the true count, including tests added by a code-review pass across this memo and the companion Budget Reallocation response memo below.)
