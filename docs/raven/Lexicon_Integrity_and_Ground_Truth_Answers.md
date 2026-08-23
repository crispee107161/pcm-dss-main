# Answers: lexicon integrity and ground-truth import status

**Date:** 22 August 2026
**Re:** `App_Inventory_Review.md` §1 and §2 (blocking)

---

## §2 — Ground truth is imported and persisted. §7 of the inventory is stale.

Queried the live DB directly rather than trusting either document:

- `FacebookPost` rows with `category_final_source = MANUAL_GROUND_TRUTH`: **200**
- `InterCoderReliability` (latest row): n=200, κ=0.6505, 78.5% agreement, computed 2026-08-13T15:37:07Z, notes: "Two independent coders, blind, 200 randomly-sampled posts, 2026-08-13; 43 disagreements resolved after blind coding"

These match the screenshots exactly. `Response_Full_App_Inventory.md` §7's line — *"`groundTruth.n === 0` is the current live state until that lands"* — was wrong at the time it was written or has since gone stale. I've corrected it in that file.

`ground_truth_categories.csv` is imported. `scripts/import-ground-truth.ts` is the pipeline that did it — it sets `category_final` + `category_final_source = MANUAL_GROUND_TRUTH`, all-or-nothing validation, matches on internal PK or Facebook's string `post_id`.

**FR-15 computation path confirmed correct:** `lib/data/method-evaluation.ts`'s `loadGroundTruthMethodEvaluation()` filters strictly on `category_final_source = MANUAL_GROUND_TRUTH` — it never touches the S4 finalisation queue's own `category_final` values. The circularity you flagged on the n=775 panel does not apply to this path; there's a second function (`loadMethodEvaluation`) that filters on `category_final: { not: null }` — a superset that includes the 200 ground-truth rows, not a disjoint panel — kept as a labelled "diagnostic, not the FR-15 study number" and never conflated with the ground-truth comparison above it.

The two-coder labelling pass is done and correctly reflected in the app. Nothing to import, nothing to fix.

---

## §1 — No schema-level versioning, but a git-tracked baseline bounds the drift

The lexicon itself has no versioning, timestamps, or audit trail — but `prisma/seed.ts` gives us a dated baseline to diff against, so "has it changed since import?" has a real, quantified answer rather than a flat no.

Checked four places:

1. **`Keyword` model** (`prisma/schema.prisma`) — `id`, `word`, `category_id` only. No `created_at`, no `updated_at`, nothing.
2. **`actions/keywords.ts`** — `addKeyword`, `addKeywordsBulk`, `deleteKeyword` write straight to the `Keyword` table. None of them write to `CategoryAuditLog` or any other log.
3. **`CategoryAuditLog`** — exists, but its `action` enum and `facebook_post_id` field are scoped to category assignments on posts. It was never designed to track keyword-lexicon edits, and doesn't.
4. **`prisma/seed.ts`** — a git-tracked, categorised 50-keyword baseline (commits `5a3b8bd` initial, `f4f0ed7` adding the Entertainment set), both dated well before the 2026-08-13 ground-truth import. This is not runtime versioning, but it is an independent, dated record of lexicon state that predates the import — worth using.

So the direct answers, corrected from an earlier draft of this memo that missed #4:

1. Is the lexicon versioned or timestamped at the schema level? **No.**
2. Has it changed since ground truth was imported (2026-08-13)? **Partially answerable.** I diffed the live 93-keyword lexicon against the seed baseline: all **50** seed keywords are still present, **in their original categories** — zero deletions, zero recategorisations of the baseline set. The live lexicon is seed + **43** keywords added through the Manage Keywords UI at some undated point (could be before or after 2026-08-13 — the UI additions themselves carry no timestamp). So: the 50-word baseline is provably unmodified; drift is bounded to those 43 additions, whose timing relative to the import is unknown.
3. Can we recover the lexicon as it stood at import time and re-run keyword method against it? **Not exactly** — we can recover the 50-word baseline, but not the true import-day state if any of the 43 additions predate 2026-08-13. Re-running against just the baseline would understate whatever the keyword method actually saw in production on that date.

**A finding this bears on directly:** several of the 43 UI-added keywords are miscategorised relative to the seed's own pattern. Under Promotional Offer: `customerstory`, `satisfiedcustomer` (semantically Testimonial — the seed correctly has `satisfied`/`customer` under Testimonial). Under Testimonial: `bundlepackage`, `limitedoffer`, `negosyooffer`, `pcsale`, `pcbuilds` (semantically Promotional Offer or Product Showcase — the seed correctly has `bundle`/`package`/`limited` under Promotional Offer). This is a genuine post-seed category drift, not a snapshot artifact, and it's a concrete mechanism for part of the κ = 0.139 result — worth citing if a panelist asks why the keyword method underperforms.

**Current live state, snapshotted today:** 93 keywords across 4 categories (50 baseline + 43 undated additions), saved to `docs/raven/Keyword_Lexicon_Snapshot_2026-08-22.md` (manuscript appendix candidate).

**Not done yet** (pending your go-ahead, since it's a live nav/permissions change to a Manager-facing screen): making Manage Keywords read-only, disabling AI keyword suggestions, and enforcing read-only server-side. Flagging so it isn't mistaken for already landed.
