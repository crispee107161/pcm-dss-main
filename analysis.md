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
| `UploadLog` | Audit trail for every CSV upload | `upload_type`, `status`, `records_inserted`, `records_updated`, `error_message` |
| `Ad` | Core Facebook Ads data | `ad_name`, `ad_set_name`, `reporting_starts/ends`, `reach`, `impressions`, `link_clicks`, `amount_spent`, `purchases`, `total_messaging_contacts`, `cost_per_result`, `category_id` |
| `FacebookPost` | Organic post metrics | `post_id`, `publish_time`, `post_type`, `reach`, `reactions`, `comments`, `shares`, `views`, `engagement_rate`, `category_id` |
| `Category` | Ad/post categorization | `name` |
| `Keyword` | Keywords per category | `word`, `category_id` |
| `PageMetricDaily` | Daily page-level metrics (5 CSV types merged) | `date`, `follows`, `interactions`, `link_clicks`, `views`, `visits` |
| `FollowerHistory` | Daily follower counts | `date`, `followers`, `daily_change` |
| `PageViewers` | Daily viewer breakdown | `date`, `total_viewers`, `new_viewers`, `returning_viewers` |
| `FollowerGender` | Gender distribution snapshot | `gender`, `distribution` |
| `FollowerTerritory` | Territory distribution snapshot | `territory`, `distribution` |
| `RegressionModel` | Stored model record | `intercept`, `coefficient`, `coef_reach`, `coef_messaging`, `coef_amount_spent`, `coef_spend_sq`, `model_type`, `residual_std_error`, `best_lag`, `r_squared`, `n`, `trained_at` |
| `SimulationResult` | What-If run history | `reach_input`, `messaging_input`, `amount_spent_input`, `projected_purchases`, `interval_lower`, `interval_upper`, `model_id` |

**Unique constraints:**
- `Ad`: `(ad_name, reporting_starts)`
- `FacebookPost`: `post_id`
- `PageMetricDaily`: `date`
- `Keyword`: `word`

---

## Analytics Pipeline

### 1. Regression — 9-Algorithm Auto-Selection
**File:** `lib/stats/regression.ts`

The system fits **9 model variants** on every retrain and auto-selects the one with the highest **adjusted R²**:

| # | Model Type | Formula / Approach | Best For |
|---|---|---|---|
| 1 | `log_mlr` | `Purchases = β₀ + β₁·log(1+Reach) + β₂·log(1+Msgs) + β₃·log(1+Spend)` | Baseline log-transformed MLR |
| 2 | `plain_mlr` | Same but raw (untransformed) predictors | Linear spend-purchase relationship |
| 3 | `poly_mlr` | Adds `log(1+Spend)²` term | Diminishing returns on spend |
| 4 | `ridge_mlr` | Log MLR + L2 penalty λ=0.1 on non-intercept coefficients | Correlated predictors |
| 5 | `lasso_mlr` | Log features, L1 coordinate descent λ=0.1 | Zeros out weak predictors (good for small n) |
| 6 | `elastic_net_mlr` | Log features, L1+L2 mix α=0.5 λ=0.1 | Correlated predictors + feature selection |
| 7 | `wls_mlr` | Log MLR with 90-day half-life time-decay weights | Recent campaigns weighted more heavily |
| 8 | `robust_mlr` | IRLS with Huber loss δ=1.345σ̂ | Outlier campaign resistance |
| 9 | `log_log_mlr` | `log(1+Purchases) = β₀ + β·log(1+X)`, R² on back-transformed scale | Elasticity model — coefs = % change per 1% input |

**Solver:** Gaussian elimination with partial pivoting (OLS core); coordinate descent (lasso/elastic net); IRLS (robust Huber and WLS).

**Auto-retrains** after each Ads CSV upload when n ≥ 10 ads with purchases. Persists selected model to `RegressionModel` table including `model_type` string.

**Note:** `adj_r_squared` is used for in-memory model selection but is not persisted to the DB (`RegressionModel` only stores `r_squared`).

---

### 2. What-If Simulation
**File:** `lib/stats/simulation.ts`

- Applies current model to user-supplied (Reach, Messaging, AmountSpent) via `predictFromModel()`
- `predictFromModel()` dispatches all 9 model types — including log-log back-transform (`exp(ŷ) - 1`)
- Generates **80% prediction intervals** using the correct formula for a new observation:
  ```
  SE = RSE × √(1 + 1/n)
  interval = projected ± Z₈₀ × SE    where Z₈₀ = 1.2816
  ```
- Falls back to legacy SLR if no model exists
- Logs each run to `SimulationResult`

---

### 3. Budget Allocation Optimizer
**File:** `lib/stats/budget-allocator.ts`

- Groups ads by `ad_set_name`
- Computes **Laplace-smoothed efficiency** = `(purchases + 1) / (spend + CPA_estimate)` — prevents single-purchase ad sets from appearing artificially superior over well-tested ad sets
- Allocates user-specified budget proportionally to smoothed efficiency (top 8 ad sets)
- Projects reach, messaging, and purchases per set via the active model
- Prediction intervals use corrected SE = RSE × √(1 + 1/n)

---

### 4. Lagged Pearson Correlation
**File:** `lib/stats/laggedCorrelation.ts`

- Expands monthly ad records to daily metrics via uniform spread
- Tests **lags [1, 2, 3, 5, 7, 14] days**: Reach/Messaging/Spend (t) vs. Purchases (t+lag)
- Computes p-values via Fisher z-transform → normal CDF approximation (Abramowitz & Stegun)
- Identifies best significant correlation (p < 0.05) or highest |r| fallback

---

### 5. Spearman Rank-Order Correlation
**File:** `lib/stats/spearman.ts`

- Ranks arrays with tie-handling (average rank)
- Computes Spearman via Pearson on ranks
- Correlation matrix: Amount Spent, Reach, Impressions, Link Clicks vs. Purchases & Messaging

---

### 6. Campaign Health Scoring
**File:** `lib/stats/health-score.ts`

Composite score per ad (0–100):

| Metric | Weight | Direction | Normalization |
|---|---|---|---|
| CPA (Cost Per Acquisition) | 50% | Lower = better | 95th-percentile cap |
| Purchase Rate (Purchases / Reach) | 35% | Higher = better | 95th-percentile cap |
| Reach | 15% | Higher = better | 95th-percentile cap |

**Grades:** Excellent (80+), Good (60+), Fair (40+), Poor (20+), Critical (<20)

Uses 95th-percentile normalization ceiling (not absolute max) to prevent a single outlier campaign from compressing all other scores into a false "Excellent" band.

---

### 7. Holt-Winters Forecast
**File:** `lib/stats/forecast.ts`

**Triple exponential smoothing** with additive seasonality:
- α=0.3 (level), β=0.1 (trend), γ=0.3 (seasonal), period=7 (weekly)
- Falls back to **Holt linear** (double exponential smoothing) when n < 2 × period (< 14 points)
- Projects 7 days forward; history includes fitted values for chart overlay

---

### 8. AI Insights & ChatBot
**Files:** `actions/ai-insights.ts`, `actions/chat.ts`

- **Groq API** (llama-3.1-8b-instant)
- **AI Insights:** Summarizes KPIs in plain English for non-technical stakeholders
  - Interval display uses corrected formula: `RSE × 1.2816 × √(1 + 1/n)`
  - `InsightData` interface includes `n: number | null`
- **ChatBot:** Answers questions with live data context injected into the system prompt
  - Equation rendering is model-type-aware (`plain_mlr`, `poly_mlr`, `log_log_mlr`, `ridge_mlr`, etc.)

---

## CSV Upload Pipeline

### Supported File Types (6 total)

| Type | Encoding | Key Columns | Upsert Key |
|---|---|---|---|
| ADS_CSV | UTF-8 BOM | Ad name, Amount spent (PHP), Purchases, Reach | (ad_name, reporting_starts) |
| POSTS_CSV | UTF-8 BOM | Post ID, Publish time, Post type, Reach | post_id |
| PAGE_METRIC_CSV | UTF-16 LE | Date, metric value (filename determines column) | date |
| FOLLOWER_HISTORY_CSV | UTF-8 | Date, Followers, Difference | date |
| PAGE_VIEWERS_CSV | UTF-8 | Date, Total/New/Returning Viewers | date |
| DEMOGRAPHICS_CSV | UTF-8 | Gender or Territory + Distribution | gender / territory |

### Flow

```
CSV Upload
  ↓ detect.ts      — identify file type by header fingerprint + buffer sniff
  ↓ parse.ts       — handle UTF-16 LE (TextDecoder), UTF-8 BOM, plain UTF-8
  ↓ validate-*.ts  — reject malformed rows, invalid dates, negative spend
  ↓ upsert-*.ts    — Prisma UPSERT; returns inserted/updated counts
  ↓ UploadLog      — record attempt (success or error) with user + timestamp
  ↓ maybeRetrainRegression() — fits all 9 models, persists winner if n ≥ 10
```

---

## Role-Based Dashboard Structure

### MARKETING_MANAGER

| Page | Features |
|---|---|
| `/dashboard/marketing` | KPIs, model summary, recent uploads |
| `/upload` | CSV upload form (all 6 types) |
| `/categorize` | Assign categories to posts/ads; auto-categorize |
| `/keywords` | Add/delete keywords; AI keyword suggestions |
| `/regression` | Active model type + equation, R², RSE, full model history |
| `/correlation` | Lagged Pearson (6 lags) + Spearman tables |
| `/page-metrics` | Follows, Interactions, Link Clicks trends |
| `/trend-analysis` | Post engagement trends by type |
| `/campaign-rankings` | Top 10 ads by spend/reach/purchases |
| `/simulation` | What-If simulator with corrected 80% PI |
| `/report` | Printable analytics report with AI Insights |

### SALES_DIRECTOR

| Page | Features |
|---|---|
| `/dashboard/sales` | Monthly KPIs, ad trends, health scores, demographics |
| `/campaign-rankings` | Top ads by spend/purchases |
| `/correlation` | Correlation analysis (read-only) |
| `/regression` | Regression summary (read-only) |
| `/page-metrics` | Page metrics charts |
| `/trend-analysis` | Trend analysis |
| `/simulation` | What-If simulator |
| `/report` | Analytics report |

### BUSINESS_OWNER

| Page | Features |
|---|---|
| `/dashboard/owner` | ROI summary, follower snapshot, quick nav |
| `/administration` | User CRUD, upload audit logs |
| `/campaign-rankings` | Campaign rankings |
| `/correlation` | Correlation analysis (read-only) |
| `/regression` | Regression summary (read-only) |
| `/page-metrics` | Page metrics |
| `/trend-analysis` | Trend analysis |
| `/category-performance` | Category vs. category (paid + organic) |
| `/simulation` | What-If simulator |
| `/report` | Analytics report |

---

## Current Data State

| Source | Coverage | Records |
|---|---|---|
| Ads CSVs (Sep, Dec 2025, Jan 2026 partial) | ~3 months | ~230 total; **~42 with purchases** |
| Organic Posts (Sep 2025 only) | 1 month | 81 posts |
| Page-Level Metrics | Sep 2025 – Jan 2026 | ~120 daily rows |
| Demographics | Snapshots | Gender (3 rows), Territories (~12 rows) |

**The n=42 purchase records is the critical bottleneck.** All 9 regression models train on these 42 rows. More data improves model selection reliability and tightens prediction intervals.

---

## Feature Completeness

### Complete
- [x] CSV upload (6 file types, multi-encoding)
- [x] 9-algorithm regression with automatic model selection (adj-R²)
- [x] What-If simulation with corrected 80% prediction intervals (RSE × √(1+1/n))
- [x] Lagged Pearson correlation (6 lags: 1, 2, 3, 5, 7, 14 days)
- [x] Spearman rank correlation matrix
- [x] Campaign health scoring (95th-percentile normalized CPA, purchase rate, reach)
- [x] Budget allocation optimizer (Laplace-smoothed efficiency + corrected intervals)
- [x] Holt-Winters forecast (triple exponential smoothing, weekly seasonality)
- [x] AI Insights (Groq) with corrected interval display and n-aware formula
- [x] ChatBot with model-type-aware equation rendering
- [x] Content categorization + keyword management
- [x] Campaign rankings
- [x] Category performance analytics
- [x] Role-based auth + route guards (3 roles)
- [x] User management (BUSINESS_OWNER only)
- [x] Upload audit log
- [x] Printable reports

### Incomplete / Not Yet Built
- [ ] Synthetic data generation (`generate_synthetic_data.py` exists but has not been run — model underpowered at n=42)
- [ ] `adj_r_squared` not persisted to DB (used for in-memory model selection only)
- [ ] Custom date range filtering on dashboards
- [ ] Export to Excel/CSV (currently print-based only)
- [ ] Automated alerts / threshold notifications
- [ ] Real-time dashboard refresh

---

## Synthetic Data — What's Needed

| Algorithm | Current n | Recommended minimum | Status |
|---|---|---|---|
| Regression (9 models) | 42 (ads with purchases) | 100–200 | Underpowered |
| Spearman correlation | 230 (all ads) | 100+ | Thin but acceptable |
| Lagged correlation | ~120 daily rows | 365+ days | Cannot detect seasonality |
| Holt-Winters forecast | ~120 daily rows | 365+ days | No seasonal baseline |
| Budget allocator | ~3 months of ad sets | 6–12 months | Limited efficiency history |

**Priority for `generate_synthetic_data.py`:**
1. **Ads CSV** — extend to 12 months; target 150–200 purchase records while preserving the `amount_spent → reach → messaging → purchases` causal chain
2. **Page-Level Metrics** — extend daily series to 12–18 months for seasonality detection
3. **Organic Posts** — fill Oct 2025 – Jan 2026 (3 missing months)

Synthetic records must preserve inter-metric correlations. Data that breaks causal relationships will corrupt all 9 regression models rather than improve them.

---

## Key File Reference

| What | Path |
|---|---|
| Database schema | `prisma/schema.prisma` |
| Auth config | `lib/auth.ts` |
| CSV detection | `lib/csv/detect.ts` |
| CSV parsing | `lib/csv/parse.ts` |
| Regression (9 models) | `lib/stats/regression.ts` |
| Simulation | `lib/stats/simulation.ts` |
| Budget allocator | `lib/stats/budget-allocator.ts` |
| Lagged correlation | `lib/stats/laggedCorrelation.ts` |
| Spearman | `lib/stats/spearman.ts` |
| Health scoring | `lib/stats/health-score.ts` |
| Forecasting (Holt-Winters) | `lib/stats/forecast.ts` |
| AI Insights | `actions/ai-insights.ts` |
| ChatBot | `actions/chat.ts` |
| Server actions | `actions/` |
| Dashboards | `app/dashboard/[role]/` |
| Components | `components/` |
| Environment | `.env.example` |
| Synthetic data generator | `generate_synthetic_data.py` |
