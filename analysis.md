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
| `RegressionModel` | Stored MLR model | `intercept`, `coefficient`, `coef_reach`, `coef_messaging`, `coef_amount_spent`, `residual_std_error`, `best_lag`, `r_squared`, `n`, `trained_at` |
| `SimulationResult` | What-If run history | `reach_input`, `messaging_input`, `amount_spent_input`, `projected_purchases`, `interval_lower`, `interval_upper`, `model_id` |

**Unique constraints:**
- `Ad`: `(ad_name, reporting_starts)`
- `FacebookPost`: `post_id`
- `PageMetricDaily`: `date`
- `Keyword`: `word`

---

## Analytics Pipeline

### 1. Multiple Linear Regression (MLR)
**File:** `lib/stats/regression.ts`

Formula (log-transformed inputs):
```
Purchases = β₀ + β₁·log(1+Reach) + β₂·log(1+Messaging) + β₃·log(1+AmountSpent)
```
- Solves normal equations via Gaussian elimination with partial pivoting
- Outputs: intercept, coefficients, R², residual standard error (RSE)
- **Auto-retrains** after each Ads CSV upload when n ≥ 10 ads with purchases
- Persists new model to `RegressionModel` table

**Previous SLR baseline (from old analysis, for historical reference):**
```
Purchases = 1.8168 + 0.000705 × Amount Spent   (R² = 0.2658, n = 42)
```
The current MLR supersedes this — it is a backward-compatible upgrade.

---

### 2. What-If Simulation
**File:** `lib/stats/simulation.ts`

- Applies current MLR model to user-supplied (Reach, Messaging, AmountSpent)
- Generates **80% prediction intervals** using Z = 1.2816 × RSE
- Falls back to legacy SLR if no MLR model exists
- Logs each run to `SimulationResult`

---

### 3. Budget Allocation Optimizer
**File:** `lib/stats/budget-allocator.ts`

- Groups ads by `ad_set_name`
- Computes efficiency = `purchases / amount_spent` per group
- Allocates a user-specified budget **proportionally to efficiency** (top 8 ad sets)
- Projects reach, messaging, and purchases per allocated set

---

### 4. Lagged Pearson Correlation
**File:** `lib/stats/laggedCorrelation.ts`

- Expands monthly ad records to daily metrics
- Tests **Lag 1, 3, 7 days**: Reach/Messaging/Spend (t) vs. Purchases (t+lag)
- Computes p-values via Fisher z-transform → normal CDF approximation
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

| Metric | Weight | Direction |
|---|---|---|
| CPA (Cost Per Acquisition) | 50% | Lower = better |
| Purchase Rate (Purchases / Reach) | 35% | Higher = better |
| Reach | 15% | Higher = better |

**Grades:** Excellent (80+), Good (60+), Fair (40+), Poor (20+), Critical (<20)

---

### 7. 7-Day Moving Average Forecast
**File:** `lib/stats/forecast.ts`

- Simple 7-day moving average window on time series data
- Projects 7 days forward using last MA value as baseline

---

### 8. AI Insights & ChatBot
**Files:** `actions/ai-insights.ts`, `actions/chat.ts`

- **Groq API** (llama-3.1-8b-instant)
- AI Insights: Summarizes KPIs (R², CPA, lag, forecast) in plain language for non-technical stakeholders
- ChatBot: Answers user questions with live data context injected into prompt

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
  ↓ maybeRetrainRegression() — refit MLR if n ≥ 10 purchase records
```

**Encoding note:** Page Metric CSVs are UTF-16 LE with a `sep=,` junk line. The parser sniffs the first 2 bytes for the BOM (`0xFF 0xFE`) and routes to `TextDecoder('utf-16le')` before PapaParse.

---

## Role-Based Dashboard Structure

### MARKETING_MANAGER

| Page | Features |
|---|---|
| `/dashboard/marketing` | KPIs, model summary, recent uploads |
| `/upload` | CSV upload form (all 6 types) |
| `/categorize` | Assign categories to posts/ads; auto-categorize |
| `/keywords` | Add/delete keywords; AI keyword suggestions |
| `/regression` | MLR equation, R², RSE, training history |
| `/correlation` | Lagged Pearson + Spearman tables |
| `/page-metrics` | Follows, Interactions, Link Clicks trends |
| `/trend-analysis` | Post engagement trends by type |
| `/campaign-rankings` | Top 10 ads by spend/reach/purchases |
| `/simulation` | What-If simulator |
| `/report` | Printable analytics report |

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

**The n=42 purchase records is the critical bottleneck.** The MLR is trained on these 42 rows. More data = more reliable regression and tighter prediction intervals.

---

## Feature Completeness

### Complete
- [x] CSV upload (6 file types, multi-encoding)
- [x] Multiple Linear Regression with log transformation (auto-retrain on upload)
- [x] What-If simulation with 80% prediction intervals
- [x] Lagged Pearson correlation (1/3/7 day)
- [x] Spearman rank correlation matrix
- [x] Campaign health scoring (CPA, purchase rate, reach)
- [x] Budget allocation optimizer
- [x] 7-day moving average forecast
- [x] AI Insights (Groq)
- [x] ChatBot with live data context
- [x] Content categorization + keyword management
- [x] Campaign rankings
- [x] Category performance analytics
- [x] Role-based auth + route guards (3 roles)
- [x] User management (BUSINESS_OWNER only)
- [x] Upload audit log
- [x] Printable reports

### Incomplete / Not Yet Built
- [ ] Synthetic data generation (no historical data before Sep 2025 → weak model)
- [ ] Custom date range filtering on dashboards
- [ ] Export to Excel/CSV (currently print-based only)
- [ ] Time series seasonal decomposition (STL)
- [ ] Automated alerts / threshold notifications
- [ ] Real-time dashboard refresh

---

## Synthetic Data — What's Needed

The DSS algorithms are constrained by the current data volume:

| Algorithm | Current n | Recommended minimum | Status |
|---|---|---|---|
| MLR regression | 42 (ads with purchases) | 100–200 | Underpowered |
| Spearman correlation | 230 (all ads) | 100+ | Thin but acceptable |
| Lagged correlation | ~120 daily rows | 365+ days | Cannot detect seasonality |
| Moving average forecast | ~120 daily rows | 365+ days | No seasonal baseline |
| Budget allocator | ~3 months of ad sets | 6–12 months | Limited efficiency history |

**Priority for synthetic data generation:**
1. **Ads CSV** — extend to 12 months; target 150–200 purchase records while preserving the `amount_spent → purchases` relationship
2. **Page-Level Metrics** — extend daily series to 12–18 months for trend/seasonality detection
3. **Organic Posts** — fill Oct 2025 – Jan 2026 (3 missing months)

Synthetic records must preserve inter-metric correlations (higher spend → higher reach → more messaging → purchases). Data that breaks these relationships will corrupt the MLR rather than improve it.

---

## Key File Reference

| What | Path |
|---|---|
| Database schema | `prisma/schema.prisma` |
| Auth config | `lib/auth.ts` |
| CSV detection | `lib/csv/detect.ts` |
| CSV parsing | `lib/csv/parse.ts` |
| Regression | `lib/stats/regression.ts` |
| Simulation | `lib/stats/simulation.ts` |
| Budget allocator | `lib/stats/budget-allocator.ts` |
| Lagged correlation | `lib/stats/laggedCorrelation.ts` |
| Spearman | `lib/stats/spearman.ts` |
| Health scoring | `lib/stats/health-score.ts` |
| Forecasting | `lib/stats/forecast.ts` |
| Server actions | `actions/` |
| Dashboards | `app/dashboard/[role]/` |
| Components | `components/` |
| Environment | `.env.example` |
