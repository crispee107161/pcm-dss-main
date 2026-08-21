# MVP Scope — PC Merchandise DSS

**Date:** 2026-08-12 (updated same day — FR-25/FR-27/FR-30 revisions and the ads export policy folded in)
**Sources:** `docs/CHAPTER 1_Capstone.txt` (Objectives of the Study, FR-01…FR-24) and `docs/PCM_DSS_Developer_Handoff - New.md` — the authoritative handoff, Part 1+2+3 through §21, which cuts three previously-planned analytics features, adds FR-25…FR-30, and adds a defensibility self-audit. It supersedes the archived `docs/archive/PCM_DSS_Developer_Handoff (1).md`. Section numbers §14–§20 are unchanged between the two versions; only §21 is new.

> **Figures refreshed 2026-08-13.** The verified figures in §4.5 and the Definition of Done (§8) were originally computed from the dataset as it stood when this doc was written (2026-08-12); the live dataset has since grown (more organic-post and page-metric files were re-uploaded/backfilled — see `docs/PROGRESS.md` steps 8–13 for the per-feature detail). §4.5/§8 below now show the 2026-08-13 live-recomputed values, produced by calling this app's own production stats functions (`computeAdLifecycle`, `computePostTypePerformance`, the dashboard's page-funnel totals) directly against the database — not re-derived by hand. The original 2026-08-12 figures are kept in a footnote under each changed table for traceability, since Chapter 3/4 of the capstone write-up may still cite them and would need reconciling separately (not done as part of this refresh).

> **⚠️ This replaces the previous MVP scoping doc (2026-04-05) entirely.** That version was built around a 3-file monthly ads export, `inquiries`/`Purchases` as the regression outcome, Simple/Multiple Linear Regression, What-If simulation, and a Sales Director role. None of those premises survive Chapter 1 or the handoff. See §6 for what that means for the current codebase.

---

## 1. Core purpose

The DSS consolidates the three Facebook exports PC Merchandise already holds (page-level, organic posts, advertising), classifies organic content into the four categories the client uses, and reports **efficiency, not volume** — cost per inquiry for advertising, engagement rate for organic content — so that promotion and budget decisions rest on recorded evidence instead of view counts, recollection, and unwritten attribution.

This is **not** "predict inquiries from ad spend." Predictive/causal modelling (regression, simulation, forecasting) is explicitly cut — see §5.

---

## 2. Roles — three, not four

| Role | Who | Notes |
|---|---|---|
| Owner | business owner | advertising and budget decisions; full access |
| Marketing Manager | Sir Dan | heads the marketing team; **owns final category assignment (FR-13)** |
| Marketing Team Member | creatives | produce content, report to the marketing manager |

**There is no Sales Director role and no fourth "admin manager" role.** The admin manager handles Facebook messages outside the marketing team and is not a system user — any figures they need reach them through reports exported by the three roles above (FR-23).

FR-13 (final category assignment) is restricted to the Marketing Manager. FR-03 (account management) is restricted to the Owner.

---

## 3. Screens and access

| # | Screen | Purpose | FRs | Owner | Marketing Manager | Marketing Team |
|---|---|---|---|---|---|---|
| S1 | Dashboard | period overview (§4.1) | FR-16, FR-18, FR-30 | Full | Full | View |
| S2 | Upload Data | file upload, type detection, ingestion summary | FR-04–FR-09 | Full | Full | — |
| S3 | Content Library | all organic posts: caption, type, date, views, engagement rate, category | FR-10, FR-13 | View | Full | View |
| S4 | Categorisation Review | queue of uncategorised/low-confidence posts; accept or override in bulk | FR-12, FR-13, FR-14 | View | **Full (only role that finalises)** | Suggest only |
| S5 | Advertising Performance | ads by campaign/ad set/ad; spend, results, CPI; **FR-25, FR-26 tabs** | FR-11, FR-17, FR-25, FR-26 | Full | View | — |
| S6 | Content Performance | organic posts by category and month; engagement rate; **FR-28, FR-29** | FR-11, FR-17, FR-28, FR-29 | View | Full | View — this is their screen |
| S7 | Analysis | FR-19 ranking comparison, FR-20 category distribution, FR-21 correlation, FR-22 interpretation; **FR-27 lifecycle**; **FR-31 regression** | FR-19–FR-22, FR-27, FR-31 | Full | Full | View |
| S8 | Method Evaluation | keyword vs. LLM agreement, kappa, confusion matrix | FR-15 | View | Full | — |
| S9 | Reports | build and export PDF/CSV | FR-23 | Full | Full | View |
| S10 | User Management | create, edit, deactivate accounts; reset credentials | FR-03 | **Full (only role)** | — | — |
| S11 | Audit Log | all uploads and category assignments | FR-24 | Full | View | — |

**Rules:**
1. **Hide, don't disable.** A role that cannot use a screen should not see it in the sidebar.
2. **S4 finalisation is exclusive to the Marketing Manager** (FR-13). Team members may propose a change; it stays pending until accepted.
3. **S10 is exclusive to the Owner** (FR-03).
4. **Route-level enforcement, not just UI** — check role server-side on every request, not only in the sidebar.
5. **Landing screen after login:** Owner → S1; Marketing Manager → S4 if the uncategorised queue is non-empty, else S1; everyone else → S1.

---

## 4. In scope

### 4.1 Dashboard (FR-16, FR-18) — one screen, period selector at top

Default: last complete month; presets for 3/6/12 months and custom range.

**KPI cards:** total ad spend (Δ vs. previous period), inquiries generated (Δ), **median** cost per inquiry with IQR subtitle (median, not mean — the distribution is right-skewed, max ≈8× median) and colour-correct change indicator (down is good), median organic engagement rate (Δ), posts published split categorised/uncategorised.

**Charts:** spend vs. inquiries by month (dual-axis), cost-per-inquiry distribution (histogram/box), performance by content category with **n labelled on each bar**, page reach/views trend, and **FR-30 follows per 100 page visits** (visits, follows, and the ratio, monthly series).

**Tables:** top 10 / bottom 10 most and least efficient ads by CPI, recent uploads (last 5, from the audit trail).

**Alerts strip** (only when true): uncategorised post count, missing-month gaps, ads with spend but no results.

**Analysis results (FR-19–FR-22) do not belong on the dashboard** — they belong on S7. The dashboard answers "how are we doing"; Analysis answers "is our method sound."

### 4.2 Ingestion (FR-04–FR-10) — see `data_catalog.md` §5 for full detail

Accepts the three export types in native format; auto-detects type from a required-column subset; validates and cleans (BOM/encoding handling, numeric parsing, NFKC text normalisation); computes derived measures; shows an ingestion summary (rows read/stored/updated/rejected/duplicate) after every upload; upserts idempotently on natural keys.

### 4.3 Categorisation (FR-12–FR-15)

Four categories: product showcase, promotional offer, testimonial, entertainment. Two suggestion methods compared honestly:

- **Keyword method** — weighted lexicon scoring with a deterministic tie-break; returns `UNCLASSIFIED` on zero score rather than forcing a guess. Do not over-tune the lexicon to beat the LLM — the FR-15 comparison must be honest (verified baseline: ~19% no-match, ~24% multi-match on this dataset).
- **LLM method** — single-label classification via a prompted LLM, `temperature=0`, structured JSON output, retried once on parse failure then marked `UNCLASSIFIED`. Async to ingestion; never blocks an upload.
- **Storage (FR-15 hard requirement):** three permanent columns per post — `category_keyword`, `category_llm`, `category_final` — not a throwaway comparison script.
- **Agreement (FR-15/ALG-06):** Cohen's kappa + percentage agreement per method against `category_final`, on a manually-labelled sample (recommend 150–200 posts, not all 730 — see §9). `UNCLASSIFIED` counts as a fifth label in the confusion matrix; report n and the confusion matrix alongside kappa.

### 4.4 Analysis (FR-19–FR-22)

- **FR-19 ranking comparison (organic only):** Spearman rank correlation between `Views` rank and `organic_engagement_rate` rank; top-10%/20% overlap. Exclude the 1 post with blank `Views` explicitly.
- **FR-20 category distribution:** distribution of `Views` and `organic_engagement_rate` per category, n shown per category (entertainment may be sparse).
- **FR-21 correlation with method selection (ads only):** Shapiro-Wilk normality test on `ad_engagement_rate` and `cost_per_inquiry` (n=187) **decides** Pearson vs. Spearman at runtime — never compute both and show the more favourable one. Persist the assumption-test result and chosen method.
- **FR-22 interpretation:** every result shows coefficient + n + significance together, with wording keyed to magnitude (|ρ|<0.2 negligible, 0.2–0.4 weak, 0.4–0.6 moderate, >0.6 strong), not p-value alone.

### 4.5 Additional features (FR-25–FR-30) — added by handoff §16, not yet in the Objectives (see §9)

Every figure below is verified against the actual data in `data_catalog.md`.

**FR-25 — Budget reallocation analysis (build first; highest client value).** Owner-facing.

> ⚠️ **Revised 2026-08-12: apply a minimum-spend filter before quartiling.** An unfiltered split by CPI is confounded by regression to the mean — the worst quartile isn't "bad ads," it's "low-volume ads" (unfiltered Q4's median spend is ₱333 against Q1's ₱5,587; an ad with 8 inquiries has an extremely noisy CPI). **Build the filtered version.**

Ranks messaging ads with spend ≥ the configured threshold (**default ₱1,000, provisional** — see §9) by CPI into quartiles. Verified figures at the default threshold (n=108):

| Quartile | Ads | Spend | Inquiries | CPI |
|---|---|---|---|---|
| Q1 (best) | 27 | ₱375,809.90 | 31,875 | ₱11.79 |
| Q2 | 27 | ₱170,739.45 | 10,360 | ₱16.48 |
| Q3 | 27 | ₱104,309.29 | 5,116 | ₱20.39 |
| Q4 (worst) | 27 | ₱59,745.30 | 1,988 | ₱30.05 |

Headline: Q4's ₱59,745 bought 1,988 inquiries; at Q1's rate that same spend would have bought ≈5,067 (**+3,079**), for zero additional spend. The spend threshold must be **configurable** and default to whatever value Chapter 1 states; display the threshold and resulting n on screen. (The unfiltered, unthresholded population — n=187, +2,103 inquiries — is kept only as a reconciliation reference, not for display.)

Screen must show the quartile table, the counterfactual, a reallocation slider, and the Q4 ad list by name — plus the **mandatory caption**: *"Retrospective comparison of recorded results. Past efficiency does not guarantee the same rate at higher spend."* Never label this "forecast", "projection", or "simulation."

**FR-26 — Ad set / campaign efficiency ranking.** Owner-facing. Group messaging ads by **`Ad set ID`** (not `Ad set name` — see `data_catalog.md` §1 for the name-reuse trap) and by `Campaign ID`; report spend, inquiries, CPI, ad count; sort by CPI ascending. Flag groups with fewer than 3 ads as low-confidence. **Confounding caveat to surface on screen:** ad sets ran in different periods with different targeting, so this compares what happened, not a controlled test — a well-performing ad set may reflect the season as much as the content.

**FR-27 — Ad lifecycle and frequency diagnostics (revised 2026-08-12 — month-of-life, monthly export only).** Owner-facing.

> ⚠️ **Two corrections applied.** First, a raw week-of-life curve is contaminated by survivorship bias: it mixes ads killed early with ads that ran long, so "CPI improves with age" could just be bad ads leaving the denominator — the cohort must be restricted to ads that actually survived to the horizon before the curve is trusted. Second, week-level granularity requires the daily 19-column ads export, which the system does not and will not ingest (see the two-export policy below) and which is not currently available in this repository to verify against — so FR-27 is rebuilt on **month-of-life**, computed entirely from the monthly export the system already ingests, keyed correctly on `Ad ID`.

**Method:**
```
month_of_life(ad, row) = row.Reporting_starts.month_index − min(Reporting_starts.month_index for that Ad ID)
cohort  = ads whose max month_of_life >= N          (N configurable, default 2)
curve   = for each month index: SUM(spend) / SUM(results)   ← sum-then-divide, per data_catalog.md §4
```

**Verified figures, live-recomputed 2026-08-13** (n=187 messaging ads; max month-of-life distribution: 0→42 ads, 1→22, 2→64, 3→59):

| Cohort | n | Month 0 | Month 1 | Month 2 | Month 3 |
|---|---|---|---|---|---|
| ≥2 months survived | 123 | ₱15.66 | ₱15.37 | ₱13.64 | ₱13.10 |
| ≥3 months survived | 59 | ₱14.90 | ₱14.68 | ₱12.90 | ₱13.10 |

Single-month ads (n=42) run an overall CPI of ₱14.56 against ₱13.75 for ads spanning 4 or more calendar months (n=59) — same monotonic-decreasing direction as the original finding, just against a larger dataset than the 2026-08-12 figures below.

<sub>Original 2026-08-12 figures, kept for traceability against Chapter 3/4 if those cite this table: max month-of-life distribution 0→48, 1→25, 2→64, 3→50; ≥2mo cohort n=114 (₱15.53→₱15.29→₱13.58→₱13.03); ≥3mo cohort n=50 (₱14.66→₱14.49→₱12.71→₱13.03); single-month n=48 at ₱14.66 vs. 4+-month n=50 at ₱13.58.</sub>

**Display requirements:** cohort size (n ads) shown prominently; configurable minimum-survival threshold, default 2 months; single-month vs. ≥4-month CPI shown side by side. **Frequency diagnostic alongside (unchanged, reproduces almost exactly 2026-08-13):** `Frequency = Impressions/Reach`, Spearman ρ = −0.2411 (p=8.3e-8, n=482) against CPI, median frequency 1.545 — no ad fatigue is detectable at this account's frequency levels; retiring ads early is more likely costing inquiries than saving them.

**The daily-export weekly figures (₱14.63→₱12.57 across an 11-week cohort of 44 ads) are not part of the system and are not currently verified from any file in this repository** — they may appear in Chapter 4 as archived supporting detail only if the daily source is located and the figures re-run against it first (see `docs/archive/verify_fr27.py`, which reproduces them if pointed at the correct 19-column daily files).

**FR-28 — Video watch-through rate.** Marketing-team-facing. `watch_through_rate = "Average Seconds viewed" / "Duration (sec)"`, computable for 397/730 posts. Correlates with engagement rate at ρ=0.363 (p<0.001, n=397) — a stronger content-quality signal than views. Guard `Duration (sec)` ≤ 0.

**FR-29 — Post type performance comparison.** Marketing-team-facing.

**Live-recomputed 2026-08-13** (916 posts total, up from 730 — see `docs/PROGRESS.md` step 8 for why):

| Post type | n | Median reach | Median engagement rate | Median views |
|---|---|---|---|---|
| Photos | 430 | 1,436 | 0.0059 | 2,396.5 |
| Videos | 337 | 1,791 | 0.0071 | 2,188.5 |
| Reels | 147 | 1,262 | 0.0107 | 1,498 |
| Links | 1 | 430 | 0.0116 | 769 |
| Text | 1 | 1,378 | 0.0022 | 2,229 |

<sub>Original 2026-08-12 figures (730 posts, no Text row): Photos n=331, reach 1,301, engagement 0.0059, views 2,368; Videos n=328, reach 1,884, engagement 0.0070, views 2,276; Reels n=70, reach 1,086, engagement 0.0108, views 1,372; Links n=1, reach 430, engagement 0.0116, views 769.</sub>

Reels get ~2× the engagement rate of photos but the lowest reach; videos get the widest reach — same pattern as the original figures. Show n per row (reels n=147 must not read as equally solid, though it's a healthier sample than the original n=70); footnote the single Links post and single Text post. **Confounding caveat to surface on screen:** Meta distributes reels differently from photos, so this reflects both content quality and algorithmic distribution — present as a trade-off, never as a ranking of "which content is better."

**FR-30 — Follows per 100 page visits** *(renamed 2026-08-12 from "page growth funnel").* Owner + Marketing-Manager-facing, lives on S1 Dashboard (§4.1).

> ⚠️ **Do not call this a conversion rate or a funnel.** Visits and follows are two independently-collected daily series with no per-user link — a person can follow without visiting the page tracked here, and vice versa. "Funnel" or "conversion rate" implies an attribution the data cannot support.

**Live-recomputed 2026-08-13**: 635,893 visits, 16,576 new follows — **2.61 follows per 100 page visits**, over the full uploaded page-metric history (579 daily rows now, more than the original ~365-day/12-month span — see `docs/PROGRESS.md` step 13).

<sub>Original 2026-08-12 figures: 389,577 visits, 11,386 new follows, 2.92 follows per 100 page visits over 12 months; monthly follows range 652–1,641.</sub>

### 4.5A FR-31 — Regression analysis (reinstated 2026-08-17/18, after being cut in §5 on 2026-08-12)

Owner + Marketing-Manager-facing (Marketing Team: View), lives on S7 Analysis as a new section alongside FR-19–FR-22 and FR-27.

> ⚠️ **Not the multiple-linear-regression this document originally cut.** The version cut on 12 Aug (log(CPI) on reach + spend, VIF≈500) is the exact methodological exposure this reinstated version avoids. FR-31 drops reach and spend entirely — they're excluded as predictors (r=0.984 on the log scale) in favour of four ratios (engagement rate, frequency, CTR, CPM), all VIF 1.10–1.35. It is explanatory, not predictive: **no what-if slider, no forecast, no simulation** — that prohibition is unchanged from §5.

**Population:** messaging ads (`Result type = "Messaging conversations started"`), aggregated to Ad ID (sum-then-divide, ALG-09). Primary specification: spend ≥ the same configurable threshold FR-25 uses (default ₱1,000, n=108). Secondary specification: unfiltered (n=187) — both shown side by side, not just the primary.

**Model:** OLS of `ln(cost per inquiry)` on engagement_rate, frequency, CTR, CPM. Full diagnostic suite required and displayed: VIF, Breusch-Pagan, Jarque-Bera (with Shapiro-Wilk shown alongside as a corroborating check), HC3 robust standard errors (residuals are non-normal, so both OLS and HC3 significance are reported — HC3 referred to the standard normal distribution, OLS to Student-t, since HC3 is an asymptotic estimator). 10-fold cross-validated accuracy (seed 42, named constant) against a median-CPI baseline. A residual diagnostic flags ads whose actual CPI exceeds 1.5× the level their own characteristics would predict.

**The finding the feature is built to surface, not hide:** `engagement_rate`'s coefficient flips sign between the two specifications and does not survive HC3 robust significance in either — flagged on screen as *"not robust across specifications"*, not reported as if settled. `cpm` (positive) and `ctr` (negative) are stable across both specifications and are the defensible results.

Full specification, exact reference numbers, and the TypeScript implementation decisions: `docs/raven/FR31_Regression_Specification.md`, `docs/raven/FR31_Amendment_TypeScript_Implementation.md`, `docs/raven/FR31_Answers_HC3_and_Reach.md`.

### 4.6 Audit trail (FR-24)

Log user, timestamp, affected records for every upload and every manual category assignment. This is the system's direct answer to Chapter 1's Condition 5 (attribution collected verbally, never retained) — it will be pointed to at defence.

### 4.7 Ads export policy (decided 2026-08-12)

Two ads export shapes have existed for this dataset: the 93-column monthly export (`data/New_FB_Ads_Data/`, the system's sole input, keyed on `Ad ID`) and a 19-column daily export with a `Day` column but no `Ad ID` (used once, historically, to compute the original FR-27 week-of-life figures). **The system ingests the monthly export only.** The daily export is never wired into ingestion and never blended with monthly data in any metric — it contributed exactly one field the monthly export lacks (`Day`), at the cost of a weaker key (`Ad name`, which is known to be reused across distinct `Ad ID`s) and an ongoing ask for the client to export two files every month. FR-27 is built entirely on month-of-life (§4.5) as a result. See `data_catalog.md` §5 for the resulting detection-signature implication.

### 4.8 Defensibility notes for FR-25–FR-30

Every one of these six features is descriptive or comparative — it reports what the client's own recorded data shows, which is defensible almost by construction under the same framing the study uses (Gorry & Scott Morton, 1971): supply the analysis, leave the choice with the decision-maker. They become indefensible the moment the UI implies causation or prediction.

| FR | Risk identified | Mitigation applied |
|---|---|---|
| FR-25 Budget reallocation | Regression to the mean (worst quartile = low-volume, not low-quality) | Minimum-spend filter (§4.5); mandatory retrospective caption |
| FR-26 Ad set ranking | Period/targeting differ across ad sets | Confounding caveat added to the write-up (§4.5) |
| FR-27 Lifecycle | Survivorship bias (raw curve mixes early-killed and long-lived ads) | Cohort-restricted curve, rebuilt on month-of-life (§4.5) — finding held under the correction |
| FR-28 Watch-through | Replay/loop outliers could inflate the rate | Cap display at 100%; footnote the 1 outlier post |
| FR-29 Post type | Algorithmic distribution confounds content quality | Confounding caveat added to the write-up (§4.5) |
| FR-30 Page funnel | "Funnel"/"conversion rate" implies a per-user link the data doesn't have | Renamed to "follows per 100 page visits" (§4.5) |

**Language to avoid on these screens:**

| Don't write | Write instead |
|---|---|
| "will generate", "predicted", "forecast" | "would have generated, based on recorded results" |
| "simulation", "projection" | "retrospective comparison" |
| "X causes lower CPI" | "X is associated with lower CPI" |
| "best content type" | "highest engagement rate / widest reach" (state the trade-off) |
| "conversion rate" (FR-30) | "follows per 100 page visits" |

---

## 5. Explicitly cut — do not build

Per handoff §15, none of the following appears in the Objectives of the Study, so nothing needs to be defended or written up as a limitation. If code for these already exists in the repository, leave it out of the build rather than reworking it — see §6.

| Feature | Reason |
|---|---|
| What-if / Monte Carlo simulation | Rests on a regression explaining ~40–55% of variance in an observational, non-experimental sample. A "what if I change X" slider implies a causal lever the data cannot support. Still cut even after FR-31 reinstated regression itself — see §4.5A. |
| Holt-Winters / seasonal forecasting | Needs ≥2 complete seasonal cycles; only 12 monthly observations exist (exactly one cycle). FR-18 month-over-month comparison covers the same real need (Condition 4) without model assumptions. |
| Lagged correlation / Fisher z | No organic↔ads join key exists (§1.2 below) — nothing to lag. |
| Campaign health score | Composite weights would be arbitrary; FR-25/FR-26 give the same answer from raw figures without an invented weighting scheme. |

### 5.1 The no-join-key constraint

There is no key linking an organic post to the advertisement it became (verified exhaustively in `data_catalog.md`: different ID namespaces, zero ID matches, ad-name-to-caption fuzzy match tops out at 0.45). Consequences:
- No FK between the posts table and the ads table.
- FR-21 (correlation) runs entirely within ads data.
- FR-19 (ranking) runs entirely within organic data.
- The only cross-source link is the calendar month (FR-17, FR-18).
- "Content category → ad efficiency" is permanently blocked by this — do not attempt it (§5.2).

### 5.2 Checked and rejected — do not re-investigate

| Idea | Why not |
|---|---|
| Best day of week to post | Engagement rate flat across all 7 days (0.0066–0.0072) — no signal |
| Best hour to post | 367/730 posts publish 00:00–06:00, almost certainly scheduling artefact, not audience behaviour |
| Meta Quality/Engagement rate ranking | Blank on 697/746 rows — unusable |
| Negative feedback (hides) analysis | 10 non-zero rows across 12 months |
| Content category → ad efficiency | Blocked by §5.1, no join key |
| ROAS / revenue metrics | No purchase or revenue data; messaging inquiries are the terminal recorded event |
| Organic vs. boosted split on posts | Not available as a Meta export option (confirmed with client) |

---

## 6. Current code vs. this spec — gap register

The existing codebase was built for a different system. This section is the actionable output of the rewrite: each row names a real file/symbol so the gap is checkable, not just described.

| Area | Current state | Spec requires | Impact |
|---|---|---|---|
| **Role enum** | `Role` = `MARKETING_MANAGER \| SALES_DIRECTOR \| BUSINESS_OWNER` (`prisma/schema.prisma`) | Owner, Marketing Manager, Marketing Team Member — no Sales Director | `app/dashboard/sales/**`, `app/print/sales/**`, and the sales branch of `app/api/reports/[role]/pdf/route.ts` are out of scope under the new spec. `middleware.ts`'s `roleRoutes` map and `Role` enum need a Marketing Team Member value in place of Sales Director. |
| **Ad natural key** | `Ad` model: `@@unique([ad_name, ad_set_name, reporting_starts])`; no `ad_id`, `ad_set_id`, `campaign_id`, `campaign_name`, `post_engagements`, `frequency`, `views`, `viewers` fields | Key on `(Ad ID, Reporting starts)`, never `Ad name` (297 names across 309 IDs — verified) | Schema change is unavoidable and is the first blocker before any ingestion work on the new export. |
| **Category storage** | `FacebookPost.category_id` and `Ad.category_id` — single nullable FK each, no `duration_sec`/`avg_seconds_viewed` on `FacebookPost` | FR-15 needs three permanent columns (`category_keyword`, `category_llm`, `category_final`) plus `UNCLASSIFIED` as a fifth label; FR-28 needs duration + avg-seconds-viewed fields | Categorisation method-evaluation (S8) cannot be built on the current schema at all — the comparison data doesn't exist to compare. |
| **Keyword categorisation** | `lib/keywords/detect.ts`: `detectCategoryFromText` returns the **first** substring match, no scoring, no tie-break, no `UNCLASSIFIED`, no NFKC | ALG-04: weighted lexicon scoring, deterministic tie-break, `UNCLASSIFIED` on zero score, NFKC-normalised input | Current logic can't be honestly compared against an LLM method for FR-15 — it isn't scoring anything. |
| **LLM usage** | `actions/keywords.ts` calls Groq to **suggest keywords** for the lexicon (human-reviewed); no Groq call classifies a post | ALG-05: LLM classifies each post into one of the four categories, temp=0, structured JSON, retry-then-`UNCLASSIFIED` | ALG-05 is entirely unbuilt. |
| **Correlation method selection** | `lib/stats/spearman.ts` computes Spearman unconditionally; no Shapiro-Wilk anywhere in the codebase | FR-21/ALG-08: Shapiro-Wilk normality test on both variables **decides** Pearson vs. Spearman at runtime; only the selected coefficient displays | Graded requirement per the handoff — the selection order matters, not just the final number. |
| **Agreement statistics** | No Cohen's kappa implementation anywhere (`grep` for `kappa\|shapiro\|wilk\|agreement\|normality` returns only the handoff docs themselves) | ALG-06: Cohen's kappa + percentage agreement, `UNCLASSIFIED` as a 5th label, confusion matrix | S8 Method Evaluation screen doesn't exist and can't be built without this. |
| **CSV detection** | `lib/csv/detect.ts`'s `ADS_CSV` signature (`Ad name`, `Reporting starts`, `Amount spent (PHP)`, `Purchases`) matches the historical monthly export, not `New_FB_Ads_Data/`'s 93-column `PCM-ADS-*` files, which carry `Ad ID` and no `Purchases` column at all | Detection must key on `Ad ID` + `Amount spent (PHP)` per `data_catalog.md` §5.1 | Uploading a current ads file would either mis-route or reject under the existing detector — needs a new signature, not a patch. |
| **`ADS_DAILY_CSV` type** | `lib/csv/detect.ts` and the `UploadType` enum in `prisma/schema.prisma` both carry a distinct `ADS_DAILY_CSV` type built for the 19-column `Day`-keyed export, with `validate-ads-daily.ts` handling it | §4.7: the system never ingests the daily export | This detection branch, its validator, and the enum value should be retired as part of the schema rework — not merely reworked to match the new monthly file, since the daily shape isn't a supported input at all under the current policy. |
| **Demographics detection** | Signature requires exact `Top territories` (lowercase t) | `FB_PageLevel_Data/FollowerTopTerritories (1).csv` header is `Top Territories` (capital T) | File fails detection as-is; case-insensitive match or an explicit alias is needed. |
| **Page-metric names** | `METRIC_NAME_MAP` in `lib/csv/parse.ts` has no `Viewers` entry | `Viewers (1).csv`'s line-2 metric name is `Viewers` | Upload throws "Unknown page metric name" today. |
| **Hardcoded year** | `validate-follower-history.ts` and `validate-page-viewers.ts` hardcode year 2025 for the old `"August 18"`-style dates (a format that does not appear in the current UTF-16 daily series, which carry full ISO dates) | N/A for the current dataset's page-level files, but flagged since the parsers still exist and could be reused incorrectly | Should be retired or clearly scoped to the superseded `data/Page-Level Metrics/` format only. |
| **Cut analytics code** | `lib/stats/regression.ts`, `simulation.ts`, `forecast.ts`, `laggedCorrelation.ts`, `health-score.ts`, plus `RegressionModel`/`SimulationResult` Prisma models and their dashboard routes, all still exist and are exercised by tests | §5: all five are cut | No deletion is proposed by this document — leave the code in place per handoff §15 ("if code already exists, leave it out of the build rather than reworking it") until the team makes an explicit removal decision. |

---

## 7. Build order (handoff §18 — supersedes the earlier §14 order)

1. Auth + roles (3 roles) — FR-01–FR-03
2. Ingestion — FR-04–FR-09, ALG-01–ALG-03
3. Repository + derived measures — FR-10, FR-11, ALG-09 → **hard stop: verify totals reconcile to ₱901,196.96 (all ads) / ₱740,382.55 (messaging) before continuing**
4. Content Library + manual categorisation — FR-13
5. Dashboard — §4.1, plus FR-30
6. **FR-25 budget reallocation** — highest client value; do not defer
7. **FR-26 ad set/campaign ranking**
8. Performance screens — FR-17, plus FR-29
9. Categorisation algorithms — FR-12, FR-14, ALG-04, ALG-05
10. Method evaluation — FR-15, ALG-06
11. Analysis screen — FR-19–FR-22, ALG-07, ALG-08, plus FR-28
12. **FR-27 lifecycle diagnostics**
13. Reports + audit log — FR-23, FR-24
14. **FR-31 regression analysis** (reinstated 2026-08-17/18 — see §4.5A)

Steps 6–7 are deliberately promoted ahead of the older step 8 order: they are cheap (group-by aggregations over data already ingested) and directly answer "where is the money going" — the panel's stated concern about the system delivering no profitable insight.

---

## 8. Definition of done

- [x] Ingesting all 12 ads files + 12 organic files + 6 page-level daily series reconciles to ₱901,196.96 total spend / ₱740,382.55 messaging spend, 746 ad rows *(2026-08-13: exact match. Organic post count has since grown to 916 (from 730) and page-level coverage to 579 rows (from ~365) via later re-uploads/backfills — see `docs/PROGRESS.md` step 8/13 — so those two counts are intentionally no longer 730/365-with-no-gaps; the ads-spend reconciliation itself, which this item is really guarding, is untouched and exact.)*
- [x] CPI reference figures reproduce: n=187, median ₱21.50 (all messaging, was ₱21.39 in the 2026-08-12 dataset); n=155/131/108 at the ₱300/500/1000 thresholds (was 148/131/108) *(2026-08-13 re-check — see `docs/PROGRESS.md`; ₱500/₱1000 exact, ₱300 shifted with dataset growth, no filter bug found)*
- [x] Organic engagement rate reproduces median ≈0.0069 across all 730 posts *(2026-08-13: n=916 now, median 0.007041 as a fraction — same figure, later dataset)*
- [x] FR-15: three category columns stored permanently; Cohen's kappa + percentage agreement computed and displayed with n and a confusion matrix, `UNCLASSIFIED` included as a label *(built; ground-truth CSV import pipeline ready — see `docs/PROGRESS.md` step 10 — external labelling pass with the marketing team still pending)*
- [x] FR-21: Shapiro-Wilk decides Pearson vs. Spearman at runtime (not hardcoded); only the selected coefficient is displayed
- [x] FR-25 filtered quartile table (spend ≥₱1,000, n=108) and counterfactual (+3,079 inquiries) reproduce; mandatory non-prediction caption is present on screen *(exact match, unchanged by the dataset growth)*
- [x] FR-27 month-of-life cohort curves reproduce (2026-08-13: ≥2mo n=123: ₱15.66→₱13.10; ≥3mo n=59: ₱14.90→₱13.10 — was ≥2mo n=114: ₱15.53→₱13.03; ≥3mo n=50: ₱14.66→₱13.03 in the 2026-08-12 dataset; same monotonic-decreasing pattern holds); daily-export ingestion is not implemented and `ADS_DAILY_CSV` is retired
- [x] FR-30 labelled "follows per 100 page visits" nowhere reads as "funnel" or "conversion rate" *(2026-08-13: grep-verified across every user-facing label)*
- [ ] FR-26 groups by `Ad set ID`/`Campaign ID`, not by name
- [ ] Every analytical output on S7 shows coefficient + n + significance + magnitude wording together
- [ ] Every role sees only its permitted screens in the sidebar; server-side role check on every route
- [ ] Every upload attempt is logged to the audit trail regardless of success or failure
- [ ] Invalid or malformed CSV files show specific error messages, not crashes
- [ ] Re-uploading the same month updates rather than duplicates

---

## 9. Open items for the team (not the developer's call)

1. **Minimum-spend threshold** for the CPI population — Chapter 1 must state it; the system default must match. FR-25's quartile filter currently defaults to **₱1,000, provisionally** (`data_catalog.md` §4.3 has the reference figures at ₱300/500/1000 thresholds to choose from) — confirm against whatever figure Chapter 1 settles on.
2. **Views vs. Viewers** — the owner referenced "viewers" first and "views" second in interview; the organic export has `Views` but no `Viewers` field. Confirm which he means before FR-19/FR-20 ship.
3. **FR-15 manual labelling sample** — labelling all 730 posts before defence is unrealistic. Plan for a random sample of 150–200 and state the exact n in Chapter 3.
4. **FR-02 currently says four roles** in Chapter 1's requirements table (a leftover from before the admin-manager decision) — must be corrected to three when Chapter 3 is finalised.
5. **FR-25–FR-30 are not yet in the Objectives of the Study.** They support Objective 3 (reporting) and Objective 4 (examining current promotion practice), but the Objectives section in Chapter 1 doesn't name them. Either fold them under those objectives explicitly, or flag to the adviser that the FR list is intentionally broader than the objectives — a decision the team should make deliberately, not by omission.
6. **Whether to delete the cut-feature code** (`lib/stats/regression.ts`, `simulation.ts`, `forecast.ts`, `laggedCorrelation.ts`, `health-score.ts`, `RegressionModel`/`SimulationResult` models, and their dashboard routes) or leave it dormant. Handoff §15 says leave it for now; this is a housekeeping decision for later, not a blocker.
