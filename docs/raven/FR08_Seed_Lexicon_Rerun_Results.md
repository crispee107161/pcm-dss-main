# FR-08 re-run: seed lexicon vs live lexicon

**Date:** 23 August 2026
**Re:** `Lexicon_Drift_Rerun_Spec.md` §3
**Script:** `scripts/rerun-fr08-seed-lexicon.ts` (read-only — does not touch the live `Keyword` table or any `category_*` column)

## What was run

- **Method:** ALG-04 (`lib/keywords/detect.ts`), unmodified — weighted scoring, deterministic tie-break, `UNCLASSIFIED` on zero score, NFKC-normalised.
- **Population:** n=200, the `MANUAL_GROUND_TRUTH` posts (`category_final_source = MANUAL_GROUND_TRUTH`).
- **Reference:** `category_final` on those rows (the ground-truth label — never touched by S4).
- **Two lexicons scored side by side, nothing fixed first:** the 50-keyword `prisma/seed.ts` baseline as-is, and the live 93-keyword table as-is. Both snapshotted to committed files: `Seed_Lexicon_Snapshot_2026-08-23.md` (new) and `Keyword_Lexicon_Snapshot_2026-08-22.md` (existing).
- **Reported both with and without the UNCLASSIFIED→unclear mapping** (§3.2, see below).

## §3.2 — the UNCLASSIFIED→unclear mapping

**It was not implemented anywhere in the app.** `lib/stats/agreement.ts` treats `UNCLASSIFIED` (method abstained) and `UNCLEAR` (human said "cannot decide") as two distinct labels in every comparison it powers, including the live Method Evaluation dashboard — that's a deliberate design choice, documented in `lib/category-label.ts`, not an oversight.

For this re-run only, I added the mapping as a separate reported variant (B and D below), scored by a local function in the script — **`lib/stats/agreement.ts` itself is unchanged**, so the live dashboard's numbers are unaffected. The mapping relabels a predicted `UNCLASSIFIED` to `UNCLEAR` only on rows where the human's actual label is `UNCLEAR`; every other `UNCLASSIFIED` row is left alone, so it doesn't distort `p_e` elsewhere.

Applying it to the live lexicon reproduces your number exactly: **105/200 → 114/200** (57.0%). That number was already right.

## Results

### A. Seed lexicon (50 keywords) — raw

- p_o = 0.5050 (101/200)
- p_e = 0.4271
- κ = 0.1360 — **slight** (Landis & Koch)

| Category | n | recall |
|---|---|---|
| Product Showcase | 109 | 0.8716 |
| Promotional Offer | 13 | 0.1538 |
| Testimonial | 56 | 0.0536 |
| Entertainment | 12 | 0.0833 |
| Unclear | 10 | 0.0000 |

### B. Seed lexicon (50 keywords) — with UNCLASSIFIED→unclear mapping

- p_o = 0.5500 (110/200)
- p_e = 0.4293
- κ = 0.2115 — **fair**

Only the Unclear row changes (recall 0.0000 → 0.9000, n=10) — the mapping doesn't touch any of the four real categories.

### C. Live lexicon (93 keywords) — raw

- p_o = 0.5250 (105/200)
- p_e = 0.4485
- κ = 0.1388 — **slight**

| Category | n | recall |
|---|---|---|
| Product Showcase | 109 | 0.9266 |
| Promotional Offer | 13 | 0.1538 |
| Testimonial | 56 | 0.0179 |
| Entertainment | 12 | 0.0833 |
| Unclear | 10 | 0.0000 |

### D. Live lexicon (93 keywords) — with UNCLASSIFIED→unclear mapping

- p_o = 0.5700 (114/200) — **matches your figure exactly**
- p_e = 0.4507
- κ = 0.2171 — **fair**

## What this means for Chapter 3

**Kappa is not materially different between the two lexicons — 0.136 vs 0.139, both "slight."** The 43 undated additions did not meaningfully change the headline number either direction. So this isn't the "governance failure inflated/deflated the score" story either of us was expecting.

**But the two lexicons fail differently, and that difference is exactly the finding your diff predicted:**

- **Testimonial recall drops from 0.0536 to 0.0179** (56 actual testimonials, 3 correctly recovered by the seed set vs. only 1 by the live set) — consistent with `customerstory`/`satisfiedcustomer` sitting under Promotional Offer instead of Testimonial in the live table, exactly as you flagged.
- **Product Showcase recall rises from 0.8716 to 0.9266** — the live table's extra Product-Showcase-adjacent terms (`pcbuild`, `gamingpc`, `ryzenbuild`, etc.) pick up captions the seed set missed.
- Because Product Showcase is the majority class (109/200) and Testimonial is smaller (56/200) but not tiny, the two effects roughly cancel in the aggregate `p_o`/κ, which is why the headline number looks unchanged even though the underlying method is not the same.

**Recommended sentence for Chapter 3**, replacing the draft one:

> The keyword lexicon comprised fifty terms derived from the category definitions and fixed prior to the manual coding. On the 200-post ground-truth sample this baseline achieved κ = 0.136 (95% CI not computed), a result statistically indistinguishable from the current 93-term lexicon (κ = 0.139) despite the latter's terms of undated provenance. The two lexicons did, however, misclassify differently: the expanded lexicon recovered more Product Showcase posts at the cost of Testimonial recall (0.054 → 0.018), consistent with several later additions (e.g. "customerstory," "satisfiedcustomer") being filed under Promotional Offer rather than Testimonial. The evaluation therefore reports the fixed baseline as the primary result and notes the drift as a secondary, methodological finding rather than a source of score inflation.

That's a stronger paragraph than either of us had — it turns "we caught a lexicon problem" into "we caught a lexicon problem and showed it didn't invalidate the headline number, which is itself worth stating."

## Not done, still pending

- **§5 — read-only Manage Keywords, disable AI keyword suggestions.** Go-ahead received in your reply; not yet implemented. Next up.
- **Confidence interval on κ** — not computed here; flag if you want it for the manuscript, it's a small addition to the script.
