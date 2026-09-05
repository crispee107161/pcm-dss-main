# FR-08: scoring against the 707-post corpus, implemented

**Date:** 5 September 2026
**Re:** `Backlog_Coding_Complete_v2.md` §3
**Status:** implemented, reviewed, tested (523 passing), not committed yet — pending your read before it goes in.

---

## 1. Answer to §3

**Yes, straightforward.** FR-08 now scores both methods against `MANUAL_GROUND_TRUTH` alone (n=200, unchanged) and against `MANUAL_GROUND_TRUTH` + `MANUAL_CODEBOOK_ASSIGNMENT` combined (n=707), computed from a single query split by source so a row can never land in both buckets or neither. The Method Evaluation screen now shows both sections side by side — "Pre-specified reference sample" and "Full corpus, reference + backlog combined" — with the 200-only figures kept exactly where they were, per your instruction not to replace them.

Per-category recall (new) is included below the confusion matrix on every card.

---

## 2. Recomputed figures

### 2.1 Reference sample only (n=200) — unchanged from before this change

**Keyword method**

| n | % agreement | Cohen's kappa |
|---|---|---|
| 200 | 52.50% | 0.1388 (slight) |

Recall by category: product_showcase 92.7% (n=109) · promotional_offer 15.4% (n=13) · testimonial 1.8% (n=56) · entertainment 8.3% (n=12) · unclear 0.0% (n=10)

Confusion matrix (predicted × actual, nonzero cells):

| predicted \ actual | showcase | promo | testimonial | entertainment | unclear |
|---|---|---|---|---|---|
| showcase | 101 | 11 | 50 | 1 | — |
| promo | 2 | 2 | 3 | — | 1 |
| testimonial | — | — | 1 | — | — |
| entertainment | — | — | — | 1 | — |
| unclassified | 6 | — | 2 | 10 | 9 |

**LLM method**

| n | % agreement | Cohen's kappa |
|---|---|---|
| 200 | 64.50% | 0.4443 (moderate) |

Recall by category: product_showcase 76.1% (n=109) · promotional_offer 38.5% (n=13) · testimonial 53.6% (n=56) · entertainment 91.7% (n=12) · unclear 0.0% (n=10)

Confusion matrix (predicted × actual, nonzero cells):

| predicted \ actual | showcase | promo | testimonial | entertainment | unclear |
|---|---|---|---|---|---|
| showcase | 83 | 3 | 23 | — | — |
| promo | 12 | 5 | 3 | — | — |
| testimonial | 2 | — | 30 | 1 | — |
| entertainment | 12 | 5 | — | 11 | 10 |

---

### 2.2 Full corpus, reference + backlog combined (n=707)

**Keyword method**

| n | % agreement | Cohen's kappa |
|---|---|---|
| 707 | 49.65% | 0.1494 (slight) |

Recall by category: product_showcase 96.3% (n=348) · promotional_offer 23.8% (n=42) · testimonial 2.4% (n=212) · entertainment 1.3% (n=77) · unclear 0.0% (n=28)

Confusion matrix (predicted × actual, nonzero cells):

| predicted \ actual | showcase | promo | testimonial | entertainment | unclear |
|---|---|---|---|---|---|
| showcase | 335 | 30 | 190 | 21 | — |
| promo | 3 | 10 | 8 | 1 | 2 |
| testimonial | — | — | 5 | 6 | — |
| entertainment | — | 1 | — | 1 | — |
| unclassified | 10 | 1 | 9 | 48 | 26 |

**LLM method**

| n | % agreement | Cohen's kappa |
|---|---|---|
| 707 | 66.76% | 0.4981 (moderate) |

Recall by category: product_showcase 78.4% (n=348) · promotional_offer 61.9% (n=42) · testimonial 52.8% (n=212) · entertainment 79.2% (n=77) · unclear 0.0% (n=28)

Confusion matrix (predicted × actual, nonzero cells):

| predicted \ actual | showcase | promo | testimonial | entertainment | unclear |
|---|---|---|---|---|---|
| showcase | 273 | 7 | 83 | 5 | 1 |
| promo | 34 | 26 | 14 | 2 | 1 |
| testimonial | 5 | — | 112 | 9 | 2 |
| entertainment | 36 | 9 | 3 | 61 | 21 |
| unclassified | — | — | — | — | 3 |

---

## 3. What moves and what doesn't, at 707 vs 200

The keyword method barely moves (κ 0.139 → 0.149) and its per-category recall gets *more* lopsided, not less: it still only really catches `product_showcase` (92.7% → 96.3%), while `entertainment` recall actually drops from 8.3% to 1.3%. It's not that the keyword method degrades on more data — it's that the 200-post sample already overstated its balance across categories, and the fuller corpus exposes that it's functionally a showcase-detector.

The LLM method improves on both axes (κ 0.444 → 0.498, % agreement 64.5% → 66.8%) and its recall is more even across categories at 707 than at 200 (promo recall roughly doubles, 38.5% → 61.9%). `unclear` recall is 0.0% for both methods at both scopes — neither suggestion pipeline ever predicts `UNCLEAR`, which is expected (see `computeRecallByCategory`'s doc comment: no suggestion method produces it as a prediction), not a new finding.

Worth stating as its own observation in Chapter 4, not just "more data, same conclusion": the wider corpus doesn't just tighten the confidence interval on the 200-post result, it changes the qualitative read on the keyword method specifically.

---

## 4. One caveat surfaced during review, now handled — flagging so it's visible

The screen also carries a "human inter-coder kappa (ceiling)" banner — the inter-coder agreement figure from your original 200-post blind-coding session (κ=0.6505), shown as the ceiling the two methods can't be expected to exceed. Your memo's §2 records a *second*, separate inter-coder session for the 507-post backlog (κ=0.7966) — a different session, deliberately not merged with the first.

Before this change there was only one ground-truth section, so the ceiling banner unambiguously matched it. Now that there are two sections (reference vs. combined), I scoped the ceiling banner to render only above the reference section, and only when it matches that section's n exactly — it won't render at all above the combined section, since no single inter-coder ceiling covers a set spanning two separate blind-coding sessions. If the second session's figure (n=507, κ=0.7966) ever gets imported via `import-inter-coder-reliability.ts`, this scoping keeps it from silently getting shown as the ceiling for the 200-post reference figure instead.

Nothing for you to check here — just flagging the reasoning in case it looks like an odd omission on screen.

---

## 5. Where this lives

- `lib/stats/agreement.ts` — `computeRecallByCategory()`, new.
- `lib/data/method-evaluation.ts` — `loadGroundTruthMethodEvaluation()` now returns `{ referenceOnly, combined }`, both scored by the same source-agnostic `scoreGroundTruthPosts()` (exported, unit-tested).
- `app/dashboard/marketing/method-evaluation/page.tsx` — two sections, reference then combined.
- `components/analytics/MethodAgreementCard.tsx` — recall row added to each card.
- Tests: `lib/stats/agreement.test.ts`, `lib/data/method-evaluation.test.ts` (new file — asserts the two buckets never leak into each other).

523/523 tests pass, `tsc --noEmit` clean, production build succeeds. Reviewed before writing this memo; one HIGH finding (the ceiling-banner scoping in §4) and two MEDIUM hardening items (a `category_final IS NOT NULL` guard, and a test for the split logic itself) came out of that pass and are already applied above.

Not committed — will commit once you've had a look, per our usual process.
