# Backfill run — figures match exactly, mapped variants attached

**Date:** 5 September 2026
**Re:** `Keyword_Backfill_Approved.md`
**Status:** both conditions met, live figures confirmed, mapped variants produced. Method Evaluation ready for review.

---

## Dry run (as required before writing)

`scripts/backfill-keyword-classification.ts`, scoped to every post with `category_final` already set (866 rows — broader than the 707 scored by FR-08, since it also covers `LEGACY_IMPORT`/`MANUAL_OVERRIDE`/`ACCEPTED_SUGGESTION`; cannot reach the open review queue or the 12 holdback posts, all of which have `category_final: null`).

- **Rows that would change: 72** (of 866). The 707-scope subset of these is the 36 already reported.
- Sample, all in the expected direction (removed-term captions losing their old match):
  ```
  1185563300260227: PRODUCT_SHOWCASE -> UNCLASSIFIED
  1176557267827497: PRODUCT_SHOWCASE -> UNCLASSIFIED
  1188207516662472: PRODUCT_SHOWCASE -> TESTIMONIAL
  1164213689061855: PRODUCT_SHOWCASE -> UNCLASSIFIED
  1157564366393454: PRODUCT_SHOWCASE -> TESTIMONIAL
  ```

## Backfill run

Same script with `--confirm`. **866 rows written, 72 value changes, `category_keyword_lexicon_count` stamped to 50 on all 866** — including the 794 whose `category_keyword` didn't change, so the guard is complete rather than only covering the rows that happened to drift this time.

## Confirmed: live figures match the recomputation exactly

Queried `loadGroundTruthMethodEvaluation()` (the exact function the Method Evaluation screen calls) after the backfill:

| Scope | Cohen's kappa | % agreement |
|---|---|---|
| n=200 reference | **0.1360** | 50.50% |
| n=707 combined | **0.1566** | 48.23% |

Both match your approved figures exactly. **0.1494 and 0.1388 no longer appear anywhere the app reads from** — the stored data and the reported numbers are now the same computation. 523/523 tests pass, `tsc --noEmit` clean.

## §5 — mapped variants, both scopes

Computed via the same local-mapping technique as `rerun-fr08-seed-lexicon.ts` (predicted `UNCLASSIFIED` → `UNCLEAR` only where actual is `UNCLEAR`; `lib/stats/agreement.ts` untouched):

| Scope | Raw κ | Mapped κ | Raw % agree | Mapped % agree |
|---|---|---|---|---|
| n=200 | 0.1360 | **0.2115** | 50.50% | 55.00% |
| n=707 | 0.1566 | **0.2147** | 48.23% | 51.91% |

n=200 mapped reproduces your own 0.2115 exactly, which is the same cross-check the seed-lexicon script already gave you — now confirmed against the post-backfill live data too.

---

## What Chapter 3/4 print

- **Chapter 3:** lexicon fixed at 50 terms, derived from the category definitions before any coding, unchanged since — true of both the table and every stored suggestion now.
- **Chapter 4:** primary figures **0.1360 (n=200)** and **0.1566 (n=707)**, unmapped, with the mapped variants above alongside as the sensitivity note per your §5 framing.

Method Evaluation is no longer held on our end — the screen and the manuscript numbers are the same computation. Ready for your review whenever you get to it.
