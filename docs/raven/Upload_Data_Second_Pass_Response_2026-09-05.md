# Upload Data, second pass — response

**Date:** 5 September 2026
**Re:** Owner account, Upload Data
**Status:** §2 and §4 resolved (no code change needed), §3.1 and §3.2 implemented, §5 confirmed correct as built

---

## §2 — Viewers anomaly: explained, not a bug

`Viewers` was only wired into `PageMetricDaily.viewers` by a fix that landed 23 August at 14:47:35 (`METRIC_NAME_MAP` in `lib/csv/parse.ts`, migration `20260823144735_add_page_metric_viewers`). The 03:54 PM upload you flagged ran an hour later, on the same day — it was the *first* successful ingestion of Viewers values into daily rows that already existed (created earlier by the other five page-metric series) with `viewers` still null. Null-to-value correctly registers as "Changed" for all 365 rows. The 08:37 re-upload then found matching values already stored, so it reported "Duplicate." The de-dup logic (`isUnchanged()` in `lib/db/upsert-counts.ts`) has no bug here — this is exactly the "one-off from an earlier ingestion change" you flagged as the closing possibility.

To your second question: Viewers is a fixed daily count, not cumulative or recalculated — same as the other five page-level series. Chapter 3's description doesn't need qualifying. One thing worth noting for your own reference: `PageViewers.total_viewers` (from `Viewers.csv`) and `PageMetricDaily.viewers` (from `Viewers (1).csv`) are two distinct daily metrics that can legitimately disagree in value — both fixed, neither wrong, just different columns from different exports.

## §3 — Out-of-period upload feedback, implemented

**§3.1.** FR-04a's out-of-period warning previously only covered Posts uploads. It's now computed and surfaced for every dated upload type: Ads, Page Metrics, Follower History, and Page Viewers, in addition to Posts. (Demographics and Audience have no per-record date — they're snapshot distributions, not daily series — so the concept doesn't apply to them.) The upload result now shows, e.g., "3 of 365 rows in this file fall outside the declared study period (Aug 2025 – Jul 2026) and are excluded from analysis." The message pulls its date range from the same `STUDY_PERIOD_LABEL` constant every other screen uses, so it can't drift out of sync if the study period ever changes.

**§3.2.** Added a static line beneath the existing drop-zone guidance: "Only records from Aug 2025 – Jul 2026 are included in the figures. Records outside that range are kept but not counted." Same source constant, placed where someone is about to upload, per your §3.3 instruction not to touch Coverage Status.

## §4 — Read column confirmed working

`records_read` is set on every upload branch and persisted to `UploadLog`. The dash you saw only appears when `records_read === 0` alongside nonzero other counts — i.e., only for the pre-migration historical rows from before the column existed. Any upload from here on populates it with a real figure. No change needed.

## §5 — Confirmed correct as built

No changes made to Coverage Status or the Marketing Manager coordination note. Agreed both are right as they stand.

---

**Verification:** 532/532 tests pass, `tsc --noEmit` clean, production build succeeds.
