# PCM-DSS Current Codebase Analysis
# PC Merchandise Decision Support System — Next.js / TypeScript / PostgreSQL / Vercel

**Date:** 2026-06-05
**Analyst:** Claude Code
**Source:** Live codebase at `pcm-dss-main-main/`

---

## Overview

PC Merchandise DSS is a role-based analytics dashboard for Facebook ad campaign performance. It is fully migrated to Next.js 16.2 (App Router), TypeScript, Prisma ORM (PostgreSQL on Neon), NextAuth v5, and Recharts. The statistical pipeline runs server-side in TypeScript — no Python sidecar.

---

## Tech Stack (Current)

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Framework | Next.js 16.2 (App Router) |
| UI | React 19.2 + Recharts 3.8 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| ORM | Prisma 7.7 |
| Database | PostgreSQL (Neon serverless) |
| Auth | NextAuth v5 (Credentials + JWT) |
| CSV Parsing | PapaParse 5.5 |
| AI / LLM | Groq API (llama-3.1-8b-instant) |
| Deployment | Vercel |

---

## Database Schema

### Tables

| Table | Purpose | Key Fields |
|---|---|---|
| `User` | Auth + role | `email`, `password_hash`, `role` (MARKETING_MANAGER \| SALES_DIRECTOR \| BUSINESS_OWNER) |
| `UploadLog` | Audit trail for every CSV upload | `upload_type`, `status`, `records_inserted`, `records_updated`, `records_unchanged`, `error_message` |
| `Ad` | Core Facebook Ads data | `ad_name`, `ad_set_name`, `reporting_starts/ends`, `reach`, `impressions`, `link_clicks`, `amount_spent`, `inquiries`, `total_messaging_contacts`, `cost_per_result`, `category_id` |
| `FacebookPost` | Organic post metrics | `post_id`, `publish_time`, `post_type`, `reach`, `reactions`, `comments`, `shares`, `views`, `engagement_rate`, `category_id` |
| `Category` | Ad/post categorization | `name` |
| `Keyword` | Keywords per category | `word`, `category_id` |
| `PageMetricDaily` | Daily page-level metrics (5 CSV types merged) | `date`, `follows`, `interactions`, `link_clicks`, `views`, `visits` |
| `FollowerHistory` | Daily follower counts | `date`, `followers`, `daily_change` |
| `PageViewers` | Daily viewer breakdown | `date`, `total_viewers`, `new_viewers`, `returning_viewers` |
| `FollowerGender` | Gender distribution snapshot | `gender`, `distribution` |
| `FollowerTerritory` | Territory distribution snapshot | `territory`, `distribution` |
| `RegressionModel` | Stored model record | `intercept`, `coefficient`, `coef_reach`, `coef_messaging`, `coef_amount_spent`, `coef_spend_sq`, `coef_link_clicks`, `model_type`, `residual_std_error`, `best_lag`, `r_squared`, `adj_r_squared`, `n`, `trained_at` |
| `SimulationResult` | What-If run history | `reach_input`, `messaging_input`, `amount_spent_input`, `projected_inquiries`, `interval_lower`, `interval_upper`, `model_id` |

**Unique constraints:**
- `Ad`: `(ad_name, reporting_starts)`
- `FacebookPost`: `post_id`
- `PageMetricDaily`: `date`
- `Keyword`: `word`

---

## Analytics Pipeline

### 1. Regression — 10-Algorithm Auto-Selection with 5-Fold CV
**File:** `lib/stats/regression.ts`

The system fits **10 model variants** on every retrain. Model selection uses **5-fold cross-validation MSE** (lower = better generalisation), with adj-R² as tiebreaker. The winner is persisted to `RegressionModel`.

| # | Model Type | Formula / Approach | Best For |
|---|---|---|---|
| 1 | `log_mlr` | `Inquiries = β₀ + β₁·log(1+Reach) + β₂·log(1+Msgs) + β₃·log(1+Spend)` | Baseline |
| 2 | `plain_mlr` | Raw (untransformed) predictors | Linear relationships |
| 3 | `poly_mlr` | Adds `log(1+Spend)²` | Diminishing spend returns |
| 4 | `ridge_mlr` | Log MLR + L2 penalty λ=0.1 | Correlated predictors |
| 5 | `lasso_mlr` | L1 coordinate descent λ=0.1 | Feature selection at small n |
| 6 | `elastic_net_mlr` | L1+L2 mix α=0.5 λ=0.1 | Correlated predictors + selection |
| 7 | `wls_mlr` | Time-decay weights, 90-day half-life | Recent campaigns matter more |
| 8 | `robust_mlr` | IRLS Huber loss δ=1.345σ̂ | Outlier campaign resistance |
| 9 | `log_log_mlr` | `log(1+Inquiries) ~ log(1+X)`, back-transformed R² | Elasticity model |
| 10 | `expanded_mlr` | Adds `log(1+link_clicks)` as 4th predictor | Inquiry-intent signal |

**DB fields saved per retrain:** `model_type`, `intercept`, `coef_reach`, `coef_messaging`, `coef_amount_spent`, `coef_spend_sq`, `coef_link_clicks`, `r_squared`, `adj_r_squared`, `residual_std_error`, `n`

**Auto-retrains** after each Ads CSV upload when n ≥ 10 inquiry records.

---

### 2. What-If Simulation
**File:** `lib/stats/simulation.ts`

- Applies current model via `predictFromModel()` — dispatches all 10 model types including log-log back-transform and expanded_mlr link_clicks term
- **80% prediction intervals** (proper new-observation formula):
  ```
  SE = RSE × √(1 + 1/n)
  interval = projected ± Z₈₀ × SE    (Z₈₀ = 1.2816)
  ```
- Logs each run to `SimulationResult`

---

### 3. Budget Allocation Optimizer
**File:** `lib/stats/budget-allocator.ts`

- Groups ads by `ad_set_name`
- **Laplace-smoothed efficiency** = `(inquiries + 1) / (spend + CPI_estimate)` — resists single-inquiry flukes
- Proportional allocation across top 8 ad sets by smoothed efficiency
- Prediction intervals use corrected SE = RSE × √(1 + 1/n)

---

### 4. Lagged Pearson Correlation
**File:** `lib/stats/laggedCorrelation.ts`

- Expands monthly ad records to daily metrics
- Tests **lags [1, 2, 3, 5, 7, 14] days**: Reach/Messaging/Spend (t) vs. Inquiries (t+lag)
- p-values via Fisher z-transform → Abramowitz & Stegun normal CDF approximation
- Best = highest significant |r| (p < 0.05); fallback to highest |r| if none significant

---

### 5. Spearman Rank-Order Correlation
**File:** `lib/stats/spearman.ts`

- Ranks with tie-handling (average rank)
- Correlation matrix: Amount Spent, Reach, Impressions, Link Clicks vs. Inquiries & Messaging

---

### 6. Campaign Health Scoring
**File:** `lib/stats/health-score.ts`

| Metric | Weight | Direction | Normalization |
|---|---|---|---|
| CPI | 50% | Lower = better | 95th-percentile cap |
| Inquiry Rate | 35% | Higher = better | 95th-percentile cap |
| Reach | 15% | Higher = better | 95th-percentile cap |

**Grades:** Excellent (80+), Good (60+), Fair (40+), Poor (20+), Critical (<20)

---

### 7. Holt-Winters Forecast
**File:** `lib/stats/forecast.ts`

Triple exponential smoothing (additive seasonality): α=0.3, β=0.1, γ=0.3, period=7. Falls back to Holt linear when n < 14. Projects 7 days forward.

---

### 8. AI Insights & ChatBot
**Files:** `actions/ai-insights.ts`, `actions/chat.ts`

- Groq API (llama-3.1-8b-instant)
- Interval label uses corrected formula: `RSE × 1.2816 × √(1 + 1/n)`
- ChatBot equation display is model-type-aware for all 10 model types

---

## CSV Upload Pipeline

### Supported File Types (6 total)

| Type | Encoding | Key Columns | Upsert Key |
|---|---|---|---|
| ADS_CSV | UTF-8 BOM | Ad name, Amount spent (PHP), Purchases (→ inquiries), Reach | (ad_name, reporting_starts) |
| POSTS_CSV | UTF-8 BOM | Post ID, Publish time, Post type, Reach | post_id |
| PAGE_METRIC_CSV | UTF-16 LE | Date, metric value (filename determines column) | date |
| FOLLOWER_HISTORY_CSV | UTF-8 | Date, Followers, Difference | date |
| PAGE_VIEWERS_CSV | UTF-8 | Date, Total/New/Returning Viewers | date |
| DEMOGRAPHICS_CSV | UTF-8 | Gender or Territory + Distribution | gender / territory |

```
CSV Upload
  → detect.ts → parse.ts → validate-*.ts → upsert-*.ts → UploadLog
  → maybeRetrainRegression() — fits all 10 models, persists CV winner if n ≥ 10
```

---

## Synthetic Data

**Status: Generated and ready to seed.**

`generate_synthetic_data.py` has been run. Output:
- `data/Ads/synthetic/` — 14 monthly Ads CSVs, 306 rows, **163 inquiry records**
- `data/Page-Level Metrics/synthetic/` — 70 metric files (5 metrics × 14 months)

Combined with ~42 real inquiry records → **~205 total inquiry records** after seeding.

**To seed the database:**
```bash
# 1. Ensure .env has DATABASE_URL pointing to Neon
# 2. Push the updated schema (adds adj_r_squared + coef_link_clicks columns)
npx prisma db push
# 3. Bulk-load synthetic CSVs and retrain
npx tsx prisma/seed-synthetic.ts
```

Expected improvement after seeding:
- R² likely 0.40–0.60 (up from ~0.27)
- Prediction intervals ~30–40% narrower
- Holt-Winters seasonal patterns will emerge
- Lagged correlation can test multi-week lags meaningfully

---

## Date Range Filtering

**Status: Implemented on campaign rankings pages (all 3 roles).**

URL search params (`?from=YYYY-MM-DD&to=YYYY-MM-DD`) filter all Prisma `ad` queries by `reporting_starts`. The `DateRangeFilter` client component (`components/ui/DateRangeFilter.tsx`) renders date pickers and updates the URL on change.

---

## Role-Based Dashboard Structure

### MARKETING_MANAGER

| Page | Features |
|---|---|
| `/dashboard/marketing` | KPIs, model summary, recent uploads |
| `/upload` | CSV upload form (all 6 types) |
| `/categorize` | Assign categories to posts/ads |
| `/keywords` | Add/delete keywords; AI suggestions |
| `/regression` | Active model type, R², Adj R², RSE, model history |
| `/correlation` | Lagged Pearson (6 lags) + Spearman |
| `/page-metrics` | Daily page metric trends |
| `/trend-analysis` | Post engagement trends |
| `/campaign-rankings` | Top 10 ads — date-range filterable |
| `/simulation` | What-If simulator (80% PI) |
| `/report` | Printable report with AI Insights |

### SALES_DIRECTOR

| Page | Features |
|---|---|
| `/dashboard/sales` | Monthly KPIs, health scores, demographics |
| `/campaign-rankings` | Date-range filterable rankings |
| `/correlation` | Read-only |
| `/regression` | Read-only |
| `/page-metrics`, `/trend-analysis`, `/simulation`, `/report` | Standard |

### BUSINESS_OWNER

| Page | Features |
|---|---|
| `/dashboard/owner` | ROI summary, follower snapshot |
| `/administration` | User CRUD, upload audit logs |
| `/campaign-rankings` | Date-range filterable rankings |
| `/category-performance` | Category vs. category (paid + organic) |
| `/correlation`, `/regression`, `/page-metrics`, `/trend-analysis`, `/simulation`, `/report` | Standard |

---

## Current Data State

| Source | Real Data | Synthetic Data | After Seeding |
|---|---|---|---|
| Ads with inquiries | ~42 records | 163 records | ~205 |
| All ads | ~230 records | 306 records | ~536 |
| Daily page metrics | ~120 rows | ~420 rows (14 months) | ~540 |
| Organic posts | 81 (Sep 2025 only) | — | 81 |

---

## Feature Completeness

### Complete
- [x] CSV upload (6 file types, multi-encoding)
- [x] 10-algorithm regression, 5-fold CV model selection
- [x] `expanded_mlr` — link_clicks as 4th predictor
- [x] `adj_r_squared` persisted to DB and shown in model history
- [x] What-If simulation with corrected 80% PI
- [x] Lagged Pearson correlation (6 lags: 1, 2, 3, 5, 7, 14 days)
- [x] Spearman rank correlation matrix
- [x] Campaign health scoring (95th-percentile normalized)
- [x] Budget allocation optimizer (Laplace-smoothed efficiency)
- [x] Holt-Winters forecast (weekly seasonality)
- [x] AI Insights with n-aware corrected interval display
- [x] ChatBot with model-type-aware equation rendering
- [x] Date range filtering on campaign rankings (all 3 roles)
- [x] Synthetic data generated (ready to seed via `seed-synthetic.ts`)
- [x] Content categorization + keyword management
- [x] Campaign rankings, category performance
- [x] Role-based auth + route guards (3 roles)
- [x] User management, upload audit log, printable reports

### Not Yet Done
- [ ] **Seed the synthetic data** — run `prisma db push` + `seed-synthetic.ts` (needs `.env`)
- [ ] Custom date range filtering on correlation and trend-analysis pages
- [ ] Export to Excel/CSV (print-based only currently)
- [ ] Automated alerts / threshold notifications
- [ ] Real-time dashboard refresh

---

## Key File Reference

| What | Path |
|---|---|
| Database schema | `prisma/schema.prisma` |
| Regression (10 models, CV selection) | `lib/stats/regression.ts` |
| Simulation | `lib/stats/simulation.ts` |
| Budget allocator | `lib/stats/budget-allocator.ts` |
| Lagged correlation | `lib/stats/laggedCorrelation.ts` |
| Spearman | `lib/stats/spearman.ts` |
| Health scoring | `lib/stats/health-score.ts` |
| Holt-Winters forecast | `lib/stats/forecast.ts` |
| AI Insights | `actions/ai-insights.ts` |
| ChatBot | `actions/chat.ts` |
| Date range filter component | `components/ui/DateRangeFilter.tsx` |
| Synthetic data generator | `generate_synthetic_data.py` |
| Synthetic data seeder | `prisma/seed-synthetic.ts` |
| Synthetic Ads CSVs | `data/Ads/synthetic/` |
| Synthetic Page Metric CSVs | `data/Page-Level Metrics/synthetic/` |
| Dashboards | `app/dashboard/[role]/` |
