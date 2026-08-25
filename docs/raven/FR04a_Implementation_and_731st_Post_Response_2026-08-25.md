# FR-04a implemented; the 731st post identified — 731 is correct, not 730

**Date:** 25 August 2026
**Re:** `August_2025_Gap_and_Revised_Order.md` §2.1 (the 731st post) and §4-5 item 1 (FR-04a)
**Method:** live queries via `scripts/find-august-2025-gap.ts` (read-only) for §1 below; code changes for §2. `npm test` (371/371) and `npm run build` both clean after every change described here.

---

## 1. The 731st post: `1142974524519105` — it's real, in-period data. 731 stands.

Diffed the DB's 52 August-2025-Manila `FacebookPost` rows against your 51 canonical `post_id`s. The one extra row is:

```
post_id:       1142974524519105
publish_time:  2025-07-31T19:57:00.000Z  (03:57 Aug 1, Manila local)
post_type:     Photos
category_final_source: LEGACY_IMPORT
```

This is the second boundary post your own `Study_Period_Scope_Response_2026-08-25.md` §0 already flagged — the one you called "correctly in-period" alongside the ground-truth post. It's the same failure mode as the ground-truth post, just running the other direction: it publishes late enough in Manila local time to belong to August, but the **raw export tool bucketed it into the July 2025 file** (naive UTC or a different boundary convention on Meta's side), not the August file. That's why it's genuinely absent from your 51 — your list was drawn from the August export, and this post was never in that export.

`UploadLog` confirms the mechanics: `Jul-01-2025_Jul-31-2025_3278883872271730.csv` inserted 43 rows (matching your raw Jul 2025 export count exactly), and this post is one of them. The ingestion pipeline's Manila-anchored `publish_time` correctly reclassifies it into August regardless of which file it arrived in — which is the ingestion code doing exactly what it's for.

**Both readings from your §2.1 collapse to the same answer here, but for a different reason than either candidate**: it's not a re-pull artifact and not a content-level duplicate — it's a genuine August-2025-Manila post whose *source file* was mislabeled by the export tool, not the DB. **731 is the correct in-period corpus. Please update the manuscript's 730 to 731** (Table 2, Chapter 3). Confirmed zero ground-truth posts affected, so this doesn't touch any of the four kappa figures.

---

## 2. FR-04a: implemented per your §4 constraints

Built exactly as specified — no settings screen, no migration, retain-not-delete, boundaries in a version-controlled constants module.

**`lib/data/study-period.ts`** (new) — `STUDY_PERIOD_START` / `STUDY_PERIOD_END` (Manila-anchored via `parseIsoLocalAsManila`, same helper `lib/csv/timezone.ts` uses at ingestion), overridable via `STUDY_PERIOD_START`/`STUDY_PERIOD_END` env vars for tests, defaulting to the declared Aug 2025–Jul 2026 range. Exports `STUDY_PERIOD_POST_WHERE` (a `Prisma.FacebookPostWhereInput`, mirroring `lib/categorize/content-filter.ts`'s `whereForFilter` pattern) and `withStudyPeriod(where?)` to AND it onto an existing filter. 9 unit tests, including the two boundary posts from §0/§1 above, confirming both land in-period under the Manila anchor. Out-of-period rows are never deleted — every call site below only adds a `WHERE`, nothing writes.

**Every analytical/queue query against `FacebookPost` that previously read the table unfiltered now scopes to the study period.** Full list, since you asked to confirm nothing still computes on 916:

- `lib/data/analysis.ts` — `loadAnalysisScreenData` (FR-19 ranking comparison, FR-20 category distribution)
- `lib/data/dashboard.ts` — S1 KPIs (median engagement, categorized/uncategorized counts), category breakdown, organic reach/views trend
- `lib/data/method-evaluation.ts` — ground-truth comparison (no-op: already 100% in-period per your audit), suggestion acceptance rate, S4 finalisation-queue comparison
- `lib/data/category-flags.ts` — `recomputeQueueFlagReasons` (the queue itself — this is what makes the backlog 519, not 704/730, going forward)
- `lib/reports/report-data.ts` — FR-23 CSV/PDF export post-type data
- `app/dashboard/{owner,marketing}/post-type-performance/page.tsx` — FR-28 post-type/watch-through
- `app/dashboard/owner/category-performance/page.tsx`
- `app/dashboard/{owner,marketing}/categorize/page.tsx` — S4 needs-review/all/unassigned views
- `app/dashboard/{owner,marketing}/page-metrics/page.tsx` — post count/aggregate/type-breakdown widgets
- `components/analytics/pages/TrendAnalysisView.tsx`
- `actions/categorize.ts` — `autoCategorizeAll` (the keyword bulk pass — this is what stops future runs from re-polluting out-of-period rows the way the original 574 happened)
- `actions/classify-posts.ts` — `runLlmClassification` (the LLM bulk pass, same reasoning)
- `actions/chat.ts` — AI chat's dataset-summary aggregate

**Left deliberately unfiltered** (both intentional, not oversights): `actions/upload.ts`'s re-upload overlap check (detects whether *any* existing data collides with an incoming file's date range — a re-upload guard, not an analytical output) and `lib/upload/coverage.ts`'s min/max aggregate (feeds the upload-coverage widget that's supposed to show the *actual* full data range, gaps included, independent of the declared study scope). One-off `scripts/*.ts` diagnostic/audit tools are also untouched by design — they're meant to see everything when auditing.

**Upload-side reporting**, per your §4 ask: `actions/upload.ts` now counts how many rows in a `POSTS_CSV` upload fall outside the study period (still upserts all of them — retain, not delete) and surfaces it two ways: `UploadLog.warning_message` (already had a rendering slot in `UploadHistory.tsx` that was wired but never populated) and a live warning on the upload form itself (`UploadForm.tsx`) right where the success summary shows.

Sizing came in under your rough estimate — no migration needed once the settings-table idea was dropped, so it was closer to half a day than the day-to-a-day-and-a-half you sized against the (larger) settings-table version.

---

## What's next per your §5 order

Item 2 (§1 above) is closed. Item 3 — nulling the 574 `LEGACY_IMPORT` rows — is unblocked now that FR-04a is live and operating on the in-period set; ready for the dry run whenever you want it, per your instruction to see that before it runs for real.
