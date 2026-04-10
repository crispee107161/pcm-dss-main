# Data Catalog — PC Merchandise DSS

**Generated:** 2026-04-05  
**Project:** Linking Facebook Engagement to Sales: A Decision Support System for Targeted Marketing at PC Merchandise

This document maps every raw CSV file in `data/` to its corresponding ERD table, records actual data statistics, flags quality issues, and explains how each file feeds the DSS.

---

## Overview

The `data/` folder contains **13 CSV files** across 4 subfolders, all manually exported from Facebook (Insights and Ads Manager). Together they supply the four CSV-fed tables in the ERD (T3, T4, T9, T10). The remaining six ERD tables are system-managed.

```
data/
├── Ads/                      → T4 (Ads)
│   ├── ...-Sep-1-2025-Sep-30-2025.csv
│   ├── ...-Dec-1-2025-Dec-31-2025.csv
│   └── ...-Jan-1-2026-Jan-27-2026.csv
├── Organic Posts/            → T3 (Facebook_Posts)
│   └── Sep-01-2025_Sep-30-2025_....csv
├── Demographics/             → T10 (Page_Demographics)
│   ├── FollowerGender.csv
│   └── FollowerTopTerritories.csv
└── Page-Level Metrics/       → T9 (Page_Metrics)
    ├── FollowerHistory.csv
    ├── Follows.csv
    ├── Interactions.csv
    ├── Link clicks.csv
    ├── Viewers.csv
    ├── Views.csv
    └── Visits.csv
```

**Encoding note:** Files in `Ads/` and `Organic Posts/` are UTF-8 with BOM (`utf-8-sig`). Files in `Page-Level Metrics/` appear to be UTF-16 LE (wide-char output from Facebook's page export tool) — parse accordingly.

---

## 1. Ads CSVs → T4 (`ads`)

**Source:** Facebook Ads Manager, exported by John Bernard Olermo (Marketing Manager).  
**DSS role:** Core predictor dataset. `amount_spent` is the regression predictor; `purchases` is the outcome variable. These records drive Stages 1, 2, and 3 of the analytics pipeline.

### Files

| File | Period | Ad Records | PHP Spent | Records with Purchases | Total Purchases |
|---|---|---|---|---|---|
| `John-Bernard-Olermo-Ads-Sep-1-2025-Sep-30-2025.csv` | Sep 1–30, 2025 | 65 | ₱66,067.60 | 19 | 40 |
| `John-Bernard-Olermo-Ads-Dec-1-2025-Dec-31-2025.csv` | Dec 1–31, 2025 | 93 | ₱77,678.81 | 14 | 93 |
| `John-Bernard-Olermo-Ads-Jan-1-2026-Jan-27-2026.csv` | Jan 1–27, 2026 | 72 | ₱71,583.85 | 9 | 47 |
| **Total** | | **230 records** | **₱215,330.26** | **42 records** | **180 purchases** |

> The 42 purchase-bearing records across 3 files correspond exactly to the `n = 42` in the Chapter 3 regression equation (`Purchases = 1.8168 + 0.000705 × Amount Spent`, R² = 0.2658).

### Schema (T4 field mapping)

| CSV Column | DB Field | Notes |
|---|---|---|
| Ad name | `ad_name` | Part of UPSERT unique key |
| Reporting starts | `reporting_starts` | Part of UPSERT unique key |
| Reporting ends | `reporting_ends` | — |
| Ad set name | `ad_set_name` | — |
| Ad delivery | *(not stored)* | Operational status, excluded |
| Reach | `reach` | — |
| Impressions | `impressions` | — |
| Link clicks | `link_clicks` | 27% missing — retained, excluded from computations |
| Amount spent (PHP) | `amount_spent` | **Primary regression predictor** |
| Total messaging contacts | `total_messaging_contacts` | 43.5% missing — retained, excluded from computations |
| Purchases | `purchases` | **Regression outcome variable** — 81.7% missing |
| Results | `results` | 28.7% missing |
| Cost per results | `cost_per_result` | Stored as-is |
| Attribution setting | `attribution_setting` | Always "7-day click or 1-day view" |
| *(not in CSV)* | `category_id` | FK → T5 — assigned via categorization module |

### Ad set observed
All 3 files use a single ad set: `"ALL REELS SHOP"` (Dec/Jan) and `"VIDEO REELS"` (Sep). Products advertised include Ryzen 5 5600G builds, Ryzen 7 5700G/5700X builds, CCTV packages, laptop bundles, and computer shop packages — marketed to Metro Manila and Bulacan areas.

### Data quality
| Field | Missingness | Handling |
|---|---|---|
| `link_clicks` | ~27% | Retained; excluded from regression/correlation |
| `results` | ~28.7% | Retained |
| `total_messaging_contacts` | ~43.5% | Retained; excluded from computations |
| `purchases` | **81.7%** | Structural — only ads with conversion tracking have values; not a data error |

---

## 2. Organic Posts CSV → T3 (`facebook_posts`)

**Source:** Facebook Insights, page ID `100064197037125` ("PC Merchandise").  
**DSS role:** Organic engagement data. Used in Stage 1 (Spearman correlation) alongside ad data. Engagement rate is computed from these records.

### File

| File | Period | Records | Post Types | Total Reach |
|---|---|---|---|---|
| `Sep-01-2025_Sep-30-2025_2855862537940540.csv` | Sep 1–30, 2025 | 81 posts | Videos, Photos, Reels | 167,097 |

### Schema (T3 field mapping)

| CSV Column | DB Field | Notes |
|---|---|---|
| Post ID | `post_id` | Primary key |
| Publish time | `publish_time` | — |
| Post type | `post_type` | Videos / Photos / Reels |
| Title | `title` | Used for keyword matching in categorization |
| Description | `description` | **44.4% missing** (36/81 rows) — permalink shown in UI to compensate |
| Permalink | `permalink` | Shown in categorization UI for manual review |
| Reach | `reach` | — |
| Reactions, Comments and Shares | *(split)* | — |
| Reactions | `reactions` | — |
| Comments | `comments` | — |
| Shares | `shares` | — |
| Views | `views` | — |
| *(computed)* | `engagement_rate` | `(reactions + comments + shares) / reach × 100` |
| *(not in CSV)* | `category_id` | FK → T5 — assigned via categorization module |

**21+ columns excluded** from the original CSV (video duration breakdowns, redundant reach splits, boosted vs. organic splits, operational metadata).

### Data quality
| Field | Missingness | Handling |
|---|---|---|
| `description` | 44.4% (36/81) | Retained; `permalink` shown in categorization UI to allow manual reference |
| All other core fields | ~0% | No issues |

---

## 3. Demographics CSVs → T10 (`page_demographics`)

**Source:** Facebook Insights audience demographics.  
**DSS role:** Dashboard display only. Not used in any analytical computation (Spearman, regression, simulation). Deferred from MVP per `mvp.md`.

### Files

#### `FollowerGender.csv`
| Gender | Distribution |
|---|---|
| Male | 75% |
| Female | 24% |
| Other | 1% |

Columns: `Gender`, `Distribution`  
DB fields: `label` = gender value, `value` = distribution, `demographic_type` = `"gender"` (set during preprocessing)

#### `FollowerTopTerritories.csv`
| Territory | Distribution |
|---|---|
| PH (Philippines) | 70.4% |
| Others | 18.5% |
| US | 3.2% |
| AE | 1.5% |
| SA | 1.5% |
| TW | 1.5% |
| NZ, JP, QA, KW, KR | < 1% each |

Columns: `Top territories`, `Distribution`  
DB fields: `label` = territory code, `value` = distribution, `demographic_type` = `"territory"` (set during preprocessing)

**Preprocessing note:** Both files share the same schema (`label`, `value`). A `demographic_type` discriminator column and `export_date` are added during preprocessing. Both are inserted into T10 via the same UPSERT path.

---

## 4. Page-Level Metrics CSVs → T9 (`page_metrics`)

**Source:** Facebook Insights page-level exports (Sep 20, 2025 – Oct 17, 2025 range).  
**DSS role:** Dashboard display only. Not used in analytical pipeline. Deferred from MVP per `mvp.md`.

**Encoding:** These files appear to be UTF-16 LE (wide character output). Parse with appropriate encoding — `utf-16` or `utf-16-le` — not `utf-8`.

All 7 files merge into a single `page_metrics` table keyed on `date` via UPSERT. Files can be uploaded in any order without duplication.

### Files

| File | Metric(s) | DB Field(s) | Date Range | Rows |
|---|---|---|---|---|
| `FollowerHistory.csv` | Cumulative followers, daily change | `total_followers`, `daily_follower_change` | Aug 18 – Oct 16, 2025 | 60 |
| `Follows.csv` | New follows per day | `follows` | Sep 20 – Oct 17, 2025 | 28 |
| `Interactions.csv` | Content interactions per day | `interactions` | Sep 20 – Oct 17, 2025 | 28 |
| `Link clicks.csv` | Link clicks per day | `link_clicks` | Sep 20 – Oct 17, 2025 | 28 |
| `Viewers.csv` | Total, new, returning viewers | `total_viewers`, `new_viewers`, `returning_viewers` | Aug 19 – Oct 17, 2025 | 61 |
| `Views.csv` | Page views per day | `views` | Sep 20 – Oct 17, 2025 | 28 |
| `Visits.csv` | Page visits per day | `visits` | Sep 20 – Oct 17, 2025 | 28 |

### Key observations from the data

**Follower trajectory (`FollowerHistory.csv`):**  
- Page had ~22,551 followers on Aug 18, 2025, and ~22,780 by Oct 16.
- Strong growth spike in late August (+105 on Aug 21, +47 on Aug 23) — likely tied to the organic post viral period seen in `Viewers.csv`.
- From September onward, the page experienced consistent daily net losses of 1–7 followers, suggesting organic reach was not converting to follows during this period.

**Viewer spike (`Viewers.csv`):**  
- Massive viewer spike: Aug 19–28 saw 5,780 → 115,317 daily viewers (peak Aug 25).
- After Aug 29, viewers dropped to ~1,000/day or below, settling at 200–300/day through October.
- This spike correlates with the period before the September organic posts dataset begins, suggesting a viral post or boosted content drove the August surge.

**Steady page engagement (`Interactions.csv`, `Visits.csv`, `Link clicks.csv`):**  
- Daily interactions: consistently 83–197/day across the tracked period.
- Daily visits: consistently 860–1,466/day — stable page traffic.
- Daily link clicks: 383–627/day — high relative to interactions, indicating users are clicking through product links.

---

## Summary: CSV-to-ERD Mapping

| CSV File(s) | ERD Table | DSS Role | In MVP? |
|---|---|---|---|
| Ads Sep/Dec/Jan | T4 `ads` | Core analytics — regression + correlation | Yes |
| Organic Posts Sep | T3 `facebook_posts` | Core analytics — correlation + categorization | Yes |
| FollowerGender, FollowerTopTerritories | T10 `page_demographics` | Dashboard display only | No (deferred) |
| FollowerHistory, Follows, Interactions, Link clicks, Viewers, Views, Visits | T9 `page_metrics` | Dashboard display only | No (deferred) |

---

## Dataset Gaps and Limitations

| Gap | Impact | Notes |
|---|---|---|
| Only 3 months of ads data (Sep 2025, Dec 2025, Jan 2026) | Non-consecutive months block ARIMA/time-series | Planned: full 8-month dataset (Jan–Aug 2025) post-proposal approval |
| 42 purchase records out of 230 total | Regression constrained to 1 predictor | 10-observations-per-predictor convention; VIF of all candidates was 26–158 |
| Organic posts only cover September 2025 | Correlation limited to 1 month | Expected to expand with the full dataset |
| Page metrics cover only Sep 20 – Oct 17, 2025 | T9 is sparse | Dashboard display only — no analytical impact |
| Demographics are a single snapshot | No longitudinal audience data | Treated as static reference; no date-based trend possible |
| Facebook Insights CSV does not include `description` for 44.4% of posts | Keyword-based categorization partially impaired | Permalink exposed in UI for manual review |
