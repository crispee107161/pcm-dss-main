# Data Catalog — PC Merchandise DSS

**Generated:** 2026-08-12 (updated same day — FR-25/FR-27/FR-30 revisions and the ads export policy folded in)
**Project:** A Web-Based Decision Support System for Facebook Content Performance and Advertising Efficiency at PC Merchandise
**Sources:** `docs/CHAPTER 1_Capstone.txt` (Chapter 1 & 3, FR-01…FR-24) and `docs/PCM_DSS_Developer_Handoff - New.md` (the authoritative handoff — Part 1+2+3 through §21; supersedes the archived `docs/archive/PCM_DSS_Developer_Handoff (1).md`).
**Verification status:** every structural and headline figure below was independently re-derived from the raw CSVs in `data/` on 2026-08-12, not copied from the handoff. Where a figure differs from the handoff, both numbers are shown with a note. FR-25's and FR-27's figures were revised the same day after a regression-to-the-mean check (FR-25) and a survivorship-bias check (FR-27); see `docs/mvp.md` §4.5 and §4.7 for the reasoning.

---

## Overview — the authoritative dataset

**One export set covers 1 August 2025 to 31 July 2026 (12 months) and is the only dataset this catalog documents in full:**

```
data/
├── New_FB_Ads_Data/        → Ads export           (12 files, 93 cols, 746 rows)
├── FB_OrganicPosts_Data/   → Organic posts export  (12 files, 32–34 cols, 730 rows)
└── FB_PageLevel_Data/      → Page-level export     (9 files: 6 daily series + 3 demographic snapshots)
```

**⚠️ Do not mix export dates.** Organic post figures are lifetime cumulative totals as of the export date — the handoff verified that a September re-export differed on every one of 81 posts compared to the original pull. Use only the files above; if the client re-exports later, replace the whole `FB_OrganicPosts_Data/` folder, don't merge into it.

**Encoding at a glance:** `New_FB_Ads_Data/` and `FB_OrganicPosts_Data/` are UTF-8 with BOM (`utf-8-sig`), header on row 1. The six daily series in `FB_PageLevel_Data/` are UTF-16 LE with a 2-line preamble before the header (see §3). The three demographic files in `FB_PageLevel_Data/` are a third shape again (see §3.3).

Five older folders (25 files total) predate this dataset and are **superseded** — see §5.

---

## 1. Ads export → `New_FB_Ads_Data/` (12 files)

**Source:** Facebook Ads Manager, exported by John Bernard Olermo (Marketing Manager).
**DSS role:** Core dataset for FR-11, FR-17, FR-21, FR-25, FR-26, FR-27. Cost per inquiry is the central advertising efficiency measure.

### Files (verified row/column counts)

| File | Period | Rows |
|---|---|---|
| `PCM-ADS-Aug-1-2025-to-Aug-31-2025.csv` | Aug 2025 | 65 |
| `PCM-ADS-Sep-1-2025-to-Sep-30-2025.csv` | Sep 2025 | 45 |
| `PCM-ADS-Oct-1-2025-to-Oct-31-2025.csv` | Oct 2025 | 40 |
| `PCM-ADS-Nov-1-2025-to-Nov-30-2025.csv` | Nov 2025 | 81 |
| `PCM-ADS-Dec-1-2025-to-Dec-31-2025.csv` | Dec 2025 | 54 |
| `PCM-ADS-Jan-1-2026-to-Jan-31-2026.csv` | Jan 2026 | 75 |
| `PCM-ADS-Feb-1-2026-to-Feb-28-2026.csv` | Feb 2026 | 99 |
| `PCM-ADS-Mar-1-2026-to-Mar-31-2026.csv` | Mar 2026 | 47 |
| `PCM-ADS-Apr-1-2026-to-Apr-30-2026.csv` | Apr 2026 | 57 |
| `PCM-ADS-May-1-2026-to-May-31-2026.csv` | May 2026 | 50 |
| `PCM-ADS-Jun-1-2026-to-Jun-30-2026.csv` | Jun 2026 | 51 |
| `PCM-ADS-Jul-1-2026-to-Jul-31-2026.csv` | Jul 2026 | 82 |
| **Total** | | **746 rows** |

All 12 files share **93 identical columns**. Encoding: UTF-8 with BOM, header row 1, no preamble.

**Grain:** one row per advertisement per reporting month. `(Ad ID, Reporting starts)` is unique — verified 746 unique pairs across 746 rows.

**Hierarchy:** 26 campaigns (26 unique `Campaign ID`) → **24 unique `Ad set name` values across 26 unique `Ad set ID` values** → 297 unique `Ad name` values across 309 unique `Ad ID` values. Single `Page ID`.

> ⚠️ **The handoff says "24 ad sets"; there are 24 ad set *names* but 26 ad set *IDs*.** This is the same name-reuse trap the handoff documents for ads: 12 `Ad name` values are reused across different `Ad ID`s, and the ad-set names have the identical problem at smaller scale. **Any aggregation (FR-26, dashboards) must group by `Ad set ID`, never `Ad set name`,** and display the name only as a label.

### Key columns

`Campaign name`, `Campaign ID`, `Ad set name`, `Ad set ID`, `Ad name`, `Ad ID`, `Page ID`, `Reporting starts`, `Reporting ends`, `Amount spent (PHP)`, `Result type`, `Results`, `Cost per result`, `Reach`, `Impressions`, `Frequency`, `Post engagements`, `Post reactions`, `Post comments`, `Post shares`, `Views`, `Viewers`, `Link clicks`, `Delivery status`, `Attribution setting`.

There is no `Objective` column — objective must be inferred from `Result type`.

### Result type distribution (verified, n = 746)

| Result type | Rows |
|---|---|
| Messaging conversations started | 486 |
| Reach | 198 |
| Post engagements | 20 |
| ThruPlay | 6 |
| *(blank)* | 36 |

**Cost per inquiry is computed only for the 486 "Messaging conversations started" rows**, aggregated by Ad ID before dividing (§4). 36 blank-`Result type` rows are excluded entirely from that metric.

### Empty columns — 15 of 93 are 100% null

`Result value type`, `Results ROAS`, `Bid`, `Messages delivered`, `Marketing messages CTR`, `Marketing messages read`, `Result value type` *(duplicate header)*, `Results value`, `Cost per message delivered`, `20-second phone calls`, `60-second phone calls`, `Event responses`, `Cost per join group request`, `Returning messaging contacts`, `Results (initial)`.

Do not require these in the validator.

### Data quality

| Field | Populated | Notes |
|---|---|---|
| `Post engagements` | 739/746 | Use this for `ad_engagement_rate` — **never** sum `Post reactions` + `Post comments` + `Post shares`, which are populated on only 670/360/388 rows respectively and would silently understate engagement on roughly half the rows |
| `Reach`, `Impressions`, `Views`, `Viewers`, `Frequency` | 746/746 | Complete |
| `Link clicks` | 730/746 | ~2% missing |

**Totals to reconcile (hard verification gate — see mvp.md §7):**

| Population | Spend |
|---|---|
| All 746 ads | **₱901,196.96** |
| Messaging-optimised only (486 rows) | **₱740,382.55** |

---

## 2. Organic posts export → `FB_OrganicPosts_Data/` (12 files)

**Source:** Facebook Insights, PC Merchandise page.
**DSS role:** FR-12 (categorisation), FR-19 (ranking comparison), FR-20 (category distribution), FR-28 (watch-through rate), FR-29 (post-type comparison).

### Files (verified row/column counts)

| File | Period | Cols | Rows |
|---|---|---|---|
| `Aug-01-2025_Aug-31-2025_1039829308656930.csv` | Aug 2025 | 33 | 51 |
| `Sep-01-2025_Sep-30-2025_1079717864577655.csv` | Sep 2025 | 33 | 81 |
| `Oct-01-2025_Oct-31-2025_3612542645569254.csv` | Oct 2025 | 33 | 83 |
| `Nov-01-2025_Nov-30-2025_2035041197114989.csv` | Nov 2025 | 32 | 65 |
| `Dec-01-2025_Dec-31-2025_1814339529551109.csv` | Dec 2025 | 33 | 47 |
| `Jan-01-2026_Jan-31-2026_1332077769010819.csv` | Jan 2026 | 32 | 59 |
| `Feb-01-2026_Feb-28-2026_1372715008380738.csv` | Feb 2026 | 34 | 52 |
| `Mar-01-2026_Mar-31-2026_1578612080329235.csv` | Mar 2026 | 33 | 84 |
| `Apr-01-2026_Apr-30-2026_1763477945086356.csv` | Apr 2026 | 32 | 46 |
| `May-01-2026_May-31-2026_1368234652112675.csv` | May 2026 | 32 | 33 |
| `Jun-01-2026_Jun-30-2026_1921724811836398.csv` | Jun 2026 | 32 | 68 |
| `Jul-01-2026_Jul-31-2026_2167928533773347.csv` | Jul 2026 | 32 | 61 |
| **Total** | | | **730 rows, 730 unique `Post ID`** |

Encoding: UTF-8 with BOM, header row 1, no preamble.

**Grain:** one row per post, lifetime cumulative totals.

### Column instability (why detection must match a subset, not the full tuple)

| Column count | Months | Cause |
|---|---|---|
| 33 (baseline) | Aug, Sep, Oct, Dec 2025; Mar 2026 | — |
| 32 | Nov 2025; Jan, Apr, May, Jun, Jul 2026 | missing `Negative feedback from users: Hide all` |
| 34 | Feb 2026 | adds `Negative feedback from users: Hide` |

Only these two negative-feedback columns vary. All measurement columns are stable across all 12 files. A validator that requires column-tuple equality would reject 7 of 12 files.

### Key columns

`Post ID`, `Page ID`, `Title`, `Description`, `Publish time`, `Permalink`, `Post type`, `Views`, `Reach`, `Reactions, Comments and Shares`, `Reactions`, `Comments`, `Shares`, `Duration (sec)`, `Average Seconds viewed`, `Total clicks`.

### Empty columns — 100% null across all 730 rows

`Languages`, `Custom labels`, `Funded content status`, `Data comment`.

### Post type distribution (verified, n = 730)

| Post type | n |
|---|---|
| Photos | 331 |
| Videos | 328 |
| Reels | 70 |
| Links | 1 |

### The caption trap (FR-12 precondition)

- `Title` populated 725/730; `Description` populated 379/730 — **not interchangeable**, and which holds the real caption varies by post type.
- Rule: `caption = Title if len(Title) >= len(Description) else Description`.
- **177 of 730 captions change under NFKC normalisation** (verified — the handoff's figure of 173 appears to count only the strict math-bold subset; 177 is the complete count of captions where `unicodedata.normalize('NFKC', caption) != caption`). Run NFKC on every caption before any keyword rule, LLM call, or storage. Store both raw and normalised text.
- 221 captions contain URLs. Emoji are present throughout and must **not** be stripped by normalisation — they may be signal for the entertainment category.

### Data quality

| Field | Populated | Notes |
|---|---|---|
| `Views` | 729/730 | 1 post has a blank `Views` — exclude explicitly from FR-19 ranking, never sort it to an end position |
| `Reach`, `Reactions, Comments and Shares` | 730/730 | Complete — `organic_engagement_rate` computable for all 730 posts, verified median **0.0069** |
| `Duration (sec)` + `Average Seconds viewed` both present | 397/730 (videos + reels) | Basis for FR-28 watch-through rate |

---

## 3. Page-level export → `FB_PageLevel_Data/` (9 files)

**Source:** Facebook Insights page-level exports, PC Merchandise page.
**DSS role:** Dashboard trend chart (§12.2 chart 9) and FR-30 "follows per 100 page visits" (see `mvp.md` §4.5 — not a funnel or conversion rate; visits and follows are independent daily series with no per-user link).

**⚠️ Only 6 of the 9 files are the 365-row daily series described by the handoff.** The other 3 are demographic snapshots with a different shape (§3.3). Treat them as separate ingest types.

### 3.1 Daily series (6 files — UTF-16 LE, 3-line preamble)

| File | Metric name (line 2) | DB field | Rows | Range | Total |
|---|---|---|---|---|---|
| `Follows (1).csv` | `Facebook follows` | `follows` | 365 | 2025-08-01 → 2026-07-31 | 11,386 |
| `Interactions (1).csv` | `Content interactions` | `interactions` | 365 | 2025-08-01 → 2026-07-31 | 95,522 |
| `Link clicks (1).csv` | `Facebook link clicks` | `link_clicks` | 365 | 2025-08-01 → 2026-07-31 | — |
| `Views (1).csv` | `Views` | `views` | 365 | 2025-08-01 → 2026-07-31 | — |
| `Viewers (1).csv` | `Viewers` | *(⚠️ see below)* | 365 | 2025-08-01 → 2026-07-31 | — |
| `Visits (1).csv` | `Facebook visits` | `visits` | 365 | 2025-08-01 → 2026-07-31 | 389,577 |

No gaps, no blank values in any of the 6 series (verified).

**File layout — the first two lines are not data:**
```
sep=,
"Facebook follows"
"Date","Primary"
"2025-08-01T00:00:00","20"
```
Line 1 is an Excel separator hint. Line 2 is the metric name — used to route the value into the correct DB column. Line 3 is the real header. The reader must skip 2 lines and route by the line-2 metric name.

> ✅ **Fixed 2026-08-23.** `Viewers` is now mapped to a dedicated `viewers` column on `PageMetricDaily` (`METRIC_NAME_MAP` in `lib/csv/parse.ts`, migration `20260823144735_add_page_metric_viewers`). `Viewers (1).csv` ingests like the other 5 daily series. Note this is a distinct metric from the `PageViewers` table (fed by `Viewers.csv`, headers `Date,Total Viewers,New Viewers,Returning Viewers`) — the two disagree in value on overlapping dates (e.g. 2025-08-19: `PageViewers.total_viewers` = 5780 vs `PageMetricDaily.viewers` = 8876), so they are not duplicates and neither should be dropped in favor of the other. Unlike `views` (displayed on `app/dashboard/owner/page-metrics`), no dashboard currently reads `PageMetricDaily.viewers` — it is ingested only, pending a future FR.

### 3.2 `Audience.csv` — not a single table (UTF-16 LE)

> ✅ **Ingested 2026-08-24.** `AUDIENCE_CSV` is a live upload type (`FollowerAgeGender` + `FollowerAudienceRank` tables, migration `20260824030000_add_audience_csv_tables`). Only blocks 1 and 2 below are actually ingested — see the per-block notes for why 3, 4, and 5 are deliberately skipped. `lib/csv/parse.ts`'s `parseAudienceBuffer` skips any unrecognized block by scanning to the next blank line, so this list isn't a hard contract the parser depends on — a future block Meta adds will be ignored safely rather than corrupting the scan.

This file is **five separate blocks** stacked in one CSV, each with its own mini-header, and must be parsed as distinct sections rather than one table:

1. `Age & gender` — a small age-bracket × gender percentage matrix (`18-24`, `25-34`, … `65+` rows). **Ingested** into `FollowerAgeGender`.
2. `Top cities` — one row of city names, one row of percentages. **Ingested** into `FollowerAudienceRank` (`category: 'city'`).
3. `Top countries` — same shape as top cities. **Not ingested** — verified byte-for-byte identical (same countries, same order, same values, just percent vs. fraction scale) to the country list already ingested from `FollowerTopTerritories (1).csv` into `FollowerTerritory` (§3.3). Parsing it again here would render two country charts with identical numbers under different headings.
4. `Top pages` — same shape as top cities, but a Meta affinity score (how much more likely the audience is to also follow that Page vs. the general population), not a percentage share — values can exceed 100 and don't sum to 100%. **Not ingested** (removed 2026-08-24) — not used anywhere in this app.
5. **`Follows`** — an embedded 365-row daily series, **identical in shape and content to `Follows (1).csv`**. **Not ingested** — it duplicates `Follows (1).csv` exactly and would double-count if both were upserted naively.

Blocks 3, 4, and 5 all fall through to the parser's generic "unrecognized block" skip path rather than being special-cased, so correctness doesn't depend on any of them appearing in a fixed position.

### 3.3 Demographic snapshots (2 files — UTF-8 BOM, single header row, no preamble)

| File | Header | Form | Example |
|---|---|---|---|
| `Gender.csv` | `Gender,Distribution` | Percent (0–100) | `Male,73.7` / `Female,26.3` |
| `FollowerTopTerritories (1).csv` | `Top Territories,Distribution` | Fraction (0–1) | `Philippines,0.601` |

> ✅ **Case-sensitivity problem fixed 2026-08-23.** `lib/csv/detect.ts` and `lib/csv/validate-demographics.ts` now match the `Top Territories`/`Top territories` column case-insensitively, so `FollowerTopTerritories (1).csv` detects and parses correctly regardless of export capitalization.
>
> The scale problem was already handled: `Gender.csv` is percent-form with no "Other" bucket (73.7 + 26.3 = 100 exactly), `FollowerTopTerritories` is fraction-form, and `validate-demographics.ts`'s fraction/percent auto-detection normalises both to one scale.

No FR currently depends on demographic data; treat as dashboard display only, same as the current MVP scope.

---

## 4. Metric definitions — implement exactly these

### 4.1 Organic engagement rate
```
organic_engagement_rate = "Reactions, Comments and Shares" / "Reach"
```
Computable for all 730 posts. Verified median ≈ **0.0069**.

### 4.2 Advertising engagement rate
```
ad_engagement_rate = "Post engagements" / "Reach"
```
Use the aggregate `Post engagements` column — **not** the sum of `Post reactions` + `Post comments` + `Post shares` (§1 data quality).

### 4.3 Cost per inquiry
```
Filter: Result type == "Messaging conversations started"
cost_per_inquiry = SUM("Amount spent (PHP)") / SUM("Results")   -- grouped by Ad ID
```
- Computed only for messaging-optimised ads; NULL (not zero) for all other result types.
- Exclude the 36 rows with blank `Result type`.
- Aggregate across months before dividing — never average the monthly `Cost per result` column (sum-then-divide, not mean-of-ratios; this rule applies at every aggregation level: ad, ad set, campaign, category, month).

**Reference figures (verified, must reproduce):**

| Filter | n ads | min | p25 | median | p75 | max |
|---|---|---|---|---|---|---|
| all messaging ads | 187 | 8.05 | 16.72 | 21.39 | 32.89 | 181.76 |
| spend ≥ ₱300 | 148 | 8.05 | 15.53 | 20.16 | 28.32 | 66.61 |
| spend ≥ ₱500 | 131 | 8.05 | 15.37 | 19.04 | 24.75 | 54.27 |
| spend ≥ ₱1000 | 108 | 8.05 | 15.34 | 18.09 | 22.45 | 54.27 |

> ⚠️ **Quartile figures depend on the interpolation method.** The p25/p75 figures above use Python's default `statistics.quantiles` (linear interpolation, exclusive method); the handoff's original figures (16.79/32.76 for the all-messaging row) used a slightly different convention. The *median* and *n* match exactly in both; only p25/p75 shift by ~0.1–0.2. **Pick one quantile convention (recommend: same as whatever charting/stats library the frontend uses, e.g. Recharts or a documented percentile function) and use it consistently across the dashboard, Chapter 4, and this catalog** — do not let the two disagree.

Total spend must reconcile to **₱901,196.96**; messaging-only spend to **₱740,382.55** (§1).

The minimum-spend threshold for the default dashboard/analysis population is a research decision for the team, not the developer — confirm which figure Chapter 1 uses (see `mvp.md` §9, open item 1).

---

## 5. Ingestion — detection signatures and natural keys

### 5.1 Detection order (required-column *subset*, never full-tuple equality)

```
1. Read first bytes → UTF-16 LE BOM (FF FE) → page-level family; else UTF-8-sig.
2. If line 1 == "sep=," → page-level daily series; header is line 3, metric routed by line 2's name.
3. Else read header row:
   - contains "Ad ID" and "Amount spent (PHP)"                    → ADS
   - contains "Post ID" and "Reactions, Comments and Shares"      → ORGANIC
   - contains "Gender" or "Top Territories"/"Top territories"     → DEMOGRAPHICS
   - otherwise                                                     → reject
```

Organic files vary 32/33/34 columns across the 12 months — match on a required subset, never the full tuple, or 7 of 12 valid files are rejected.

### 5.2 Required columns per type

| Type | Required |
|---|---|
| ADS | `Ad ID`, `Ad name`, `Ad set ID`, `Ad set name`, `Campaign ID`, `Campaign name`, `Reporting starts`, `Reporting ends`, `Amount spent (PHP)`, `Reach`, `Impressions`, `Result type`, `Results`, `Post engagements` |
| ORGANIC | `Post ID`, `Title`, `Description`, `Publish time`, `Post type`, `Permalink`, `Views`, `Reach`, `Reactions, Comments and Shares` |
| PAGE (daily) | `Date`, `Primary`, plus the metric name on line 2 |
| DEMOGRAPHICS | `Gender`+`Distribution` or `Top Territories`/`Top territories`+`Distribution` |

Everything else is optional; the validator must not fail a file for a missing optional column.

### 5.3 Natural keys and upsert behaviour

| Type | Natural key | Notes |
|---|---|---|
| ADS | `(Ad ID, Reporting starts)` | Verified unique — 746 rows, 746 unique pairs. **Never key on `Ad name`** (297 names across 309 IDs). |
| ORGANIC | `Post ID` | On update, **overwrite**, do not add — these are lifetime cumulative totals, not deltas |
| PAGE (daily) | `(metric, Date)` | Each file fills one column per date row |
| DEMOGRAPHICS | `label` (gender value or territory code) | Snapshot — no meaningful "update" history, latest wins |

Re-uploading the same month must update, not duplicate.

### 5.4 Ingestion summary requirement (FR-09)

Every upload must return and display: rows read, rows stored, rows updated, rows rejected with reasons, duplicates skipped — this is how the team reconciles against source files.

---

## 6. Superseded exports — do not re-upload

These files across several folders predate the current dataset. They are kept for the historical record only.

| Folder | Files | Replaced by | Notes |
|---|---|---|---|
| `data/Ads/` | 3 | `New_FB_Ads_Data/` | Original 3-month monthly export; carried a `Purchases` column now retired (see `DV-PIVOT-PLAN.md`) |
| `data/Organic Posts/` | 1 | `FB_OrganicPosts_Data/` | Single September 2025 pull with a different (older) column set |
| `data/Page-Level Metrics/` | 7 | `FB_PageLevel_Data/` | Sep 20–Oct 17, 2025 only — sparse partial-month coverage |
| `data/Demographics/` | 2 | `FB_PageLevel_Data/Gender.csv`, `FollowerTopTerritories (1).csv` | Older snapshot; fraction-form on both files (unlike the mixed percent/fraction forms in the current set — see §3.3) |

Never mix files from these folders into an ingestion run alongside the current dataset — organic lifetime totals drift between export dates (§0), and the schemas differ enough that natural-key collisions or silent overwrites are likely.

### 6.1 The daily ads export — not in this repository; not a system input

A second ads export shape was used once, historically, to compute the original FR-27 week-of-life figures: a 19-column export with a `Day` column but **no `Ad ID`** (keyed only on `Ad name`, which §1 documents as reused across 12 distinct advertisements). **This folder is not present anywhere in the current repository** — a full search found no CSV file with a `Day` column — so those original weekly figures (a cohort of 44 ads surviving ≥11 weeks, CPI ₱14.63→₱12.57) cannot currently be reproduced or verified from anything in `data/`.

**Decided 2026-08-12: this does not block the system.** The ads export policy is that the system ingests **only** the 93-column monthly export in `New_FB_Ads_Data/`, keyed on `Ad ID`. The daily shape is never wired into ingestion and never blended with monthly data in any metric — it would only ever have contributed one field (`Day`) at the cost of a weaker key and an ongoing ask for the client to export two files every month. FR-27 is rebuilt entirely on **month-of-life**, computed from the monthly export alone (see `mvp.md` §4.5 for the verified cohort figures, independently reproduced from `New_FB_Ads_Data/`). The daily export's specific weekly figures may still appear in Chapter 4 as archived supporting detail, but only if the source file is located or re-exported and the figures re-verified first — `docs/archive/verify_fr27.py` reproduces them if pointed at the correct 12 daily files.
