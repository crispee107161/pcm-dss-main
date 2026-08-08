# MVP Analysis

**Date:** 2026-04-05

> **⚠️ Partially superseded (2026-08-08).** This is the original MVP scoping
> doc — the regression formula and terminology below predate the
> messaging-conversations DV pivot. Facebook's reported "Purchases" figure
> (interpreted here as `inquiries`) was found unusable as an outcome
> variable, and the daily export format that replaced the original 3-file
> monthly export carries no `Purchases` column at all. The outcome variable
> is now "Messaging conversations started" (`total_messaging_contacts`), and
> the regression dropped `messaging` from its predictor set since it can't
> be both predictor and outcome. See `DV-PIVOT-PLAN.md` for the full
> rationale and `ALGORITHMS.md` §1.4 for the current formula. Historical
> figures below (`n=42`, the `Inquiries = 1.8168 + 0.000705 × Amount Spent`
> equation) reflect the original 3-file dataset, not current state — current
> regression trains at n≈186 unique ads.

---

## Core Purpose

The DSS exists to do one thing: **let PC Merchandise upload Facebook CSV data and find out how ad spend relates to messaging conversations**, then simulate "what if I spend X amount?" This is the entire analytical value proposition. (Originally scoped around "inquiries" — see the superseded-doc note above.)

Everything else — trend charts, campaign rankings, demographic dashboards, report downloads, content categorization — is secondary to this core loop.

---

## The Core Loop (MVP)

```
Upload CSV → Preprocess → Store → Correlate → Regress → Simulate → Display
```

1. Marketing Manager uploads Facebook Ads Manager CSV
2. System validates, preprocesses, stores ad records
3. Spearman correlation identifies `amount_spent` as the strongest predictor
4. Multiple Linear Regression trains: `MessagingConversations = β₀ + β₁·Reach + β₂·AmountSpent` (originally Simple Linear Regression against `inquiries` — see superseded-doc note above)
5. Any user runs a What-If: "If I spend ₱X, how many messaging conversations?"
6. Results displayed on role-appropriate dashboard

---

## What IS the MVP

### Feature 1: Authentication + Role Routing (FR-01, FR-02)
- Login / Logout
- Three roles: Marketing Manager, Sales Director, Business Owner
- Each role redirected to their respective dashboard on login
- Server-side credential validation; error message on failure
- **Defer:** Password reset (requires email/SMTP setup — add in v2)
- **Defer:** Business Owner account management UI (seed users manually for MVP)

### Feature 2: CSV Upload + Preprocessing (FR-03 to FR-08)
- Upload **Facebook Insights CSV** → stores to `facebook_posts` table (T3)
- Upload **Facebook Ads Manager CSV** → stores to `ads` table (T4)
- Auto-detect file type by column structure
- Validate required fields; show specific error messages on failure
- Handle missing values: flag and retain, exclude from computations
- UPSERT duplicate detection: `(ad_name, reporting_starts)` for ads; `post_id` for posts
- Compute `engagement_rate` = `(reactions + comments + shares) / reach × 100`
- Log every upload attempt to `upload_logs` table (T2) — success or fail
- Show Marketing Manager: how many records inserted vs. updated

### Feature 3: Analytics Pipeline — 3 Stages (FR-12)
- **Stage 1 — Spearman Rank Correlation**
  - Between engagement metrics (reach, impressions, reactions, comments, shares, engagement_rate, amount_spent, link_clicks) and the outcome variable (`total_messaging_contacts`)
  - Show coefficient table + heatmap
  - Runs on all records currently in the database
- **Stage 2 — Multiple Linear Regression**
  - Uses Reach and Amount Spent as predictors against `total_messaging_contacts` (originally Simple Linear Regression against `inquiries` alone — see superseded-doc note above)
  - Displays regression equation, R² value, residual plot
  - Auto-retrains whenever a new ads CSV upload adds records with non-null messaging-conversation values, aggregated to one row per ad
  - Minimum sample check before retraining — skip if not met
- **Stage 3 — What-If Simulation**
  - Input: hypothetical Reach and Amount Spent values
  - Output: projected messaging-conversation count using stored regression equation
  - Displays alongside historical baseline comparison
  - Only available after Stage 2 has a trained model
  - Accessible to all three user roles
  - Log each simulation run to `simulation_results` table (T8)

### Feature 4: Role-Appropriate Dashboards (FR-14, basic)
- **Marketing Manager dashboard:** Upload interface + upload history + links to categorization + analytics summary
- **Sales Director dashboard:** Correlation results + regression outputs + simulation interface
- **Business Owner dashboard:** Regression equation, R² summary, simulation interface

### Feature 5: Basic KPI Display (FR-11, minimal)
- Engagement rate per post (already a stored derived field)
- Total reach, total spend, total messaging conversations per reporting month (simple GROUP BY aggregations on T4)
- These feed the dashboard summaries — no separate KPI module needed for MVP

---

## What is NOT the MVP

| Feature | Requirement | Why Deferred |
|---|---|---|
| Content Categorization (full UI) | FR-10 | Useful but not needed for the analytics pipeline to function |
| Keyword-Assisted Suggestions | FR-10.2 | Enhancement on top of categorization |
| Keyword Management interface | FR-10 | Same — defer with categorization |
| Trend Analysis (month-over-month charts) | FR-13 | Only 3 non-consecutive months; limited analytical value now |
| Campaign Performance Rankings | FR-16 | Secondary feature; top/bottom 25% labeling |
| Report Generation (downloadable) | FR-15 | Not critical for the core analytical loop |
| Page Metrics CSVs (T9) | — | Dashboard display only; no analytical role |
| Page Demographics CSVs (T10) | — | Dashboard display only; no analytical role |
| Password Reset | FR-01 | Requires email/SMTP; add in v2 |
| Business Owner account management UI | FR-01, FR-02 | Seed 3 users manually; add UI in v2 |
| Cloudflare Tunnel deployment | FR-17 | Run locally for MVP; tunnel config is deployment not features |
| ARIMA / time-series forecasting | — | Explicitly excluded by the spec due to data limitations |

---

## MVP Database Schema (5 active tables)

Only the tables the MVP actually needs:

| Table | Purpose | Populated By |
|---|---|---|
| `users` (T1) | Auth and role storage | Seeded manually / Django admin |
| `upload_logs` (T2) | Audit every upload attempt | System on each upload |
| `facebook_posts` (T3) | Organic post engagement data | Facebook Insights CSV |
| `ads` (T4) | Ad spend + messaging-conversation outcome data | Facebook Ads Manager CSV |
| `regression_model` (T7) | Trained SLR parameters | Auto-computed after upload |
| `simulation_results` (T8) | History of simulation runs | User-triggered simulation |

**T5, T6** (categories/keywords) — create the tables, seed with initial data, but don't build the UI yet.  
**T9, T10** (Page_Metrics, Page_Demographics) — skip entirely for MVP.

---

## Current Code vs. MVP Spec: Gaps to Fix

The existing codebase diverges from the Chapter 3 spec in important ways:

| Issue | Current Code | Spec (MVP) |
|---|---|---|
| Ads schema | Separate `Campaign` + `Ad` models + `PostCampaign` junction | Flat `Ads` table (T4) — `ad_name` + `reporting_starts` as unique key, no Campaign model |
| Sales data | `Sale` model (POS system) | No POS — outcome data comes from the Ads Manager CSV; originally the `Purchases` column (interpreted as customer inquiries, not sales), now the daily export's `Results`/`total_messaging_contacts` field since the DV pivot (see `DV-PIVOT-PLAN.md`) |
| Forecasting | `utils/forecasting.py` runs ARIMA | Explicitly not ARIMA — month-over-month aggregation only |
| `data_processor.py` | Maps many CSV column aliases for flexible ingestion | Should map exactly to the 11 known CSV sources from the spec |
| Models count | 12 models | MVP needs 6 active tables |

These need to be corrected before building further — the schema divergence will propagate bugs into the analytics pipeline.

---

## MVP Build Order

Build strictly in dependency order — each step depends on the previous being stable:

1. **Fix the schema** — Rewrite `models.py` to match the ERD from Chapter 3 (T1–T8, skip T9/T10). The flat `Ads` table replaces Campaign + Ad + PostCampaign. Remove `Sale`.
2. **Auth** — Login, logout, role-based redirect. Seed 3 test users. Confirm dashboards route correctly.
3. **Upload pipeline** — CSV upload view, file-type auto-detection, validation, preprocessing, UPSERT, upload log. Test with real CSV files from the client.
4. **Analytics pipeline** — Spearman (Stage 1) → SLR with auto-retrain (Stage 2) → What-If simulation (Stage 3). Each stage gated on the previous.
5. **Dashboards** — Wire analytics output into role-appropriate dashboard templates.
6. **Minimal KPIs** — Add aggregated monthly summaries to dashboards from the stored data.

---

## Definition of Done for MVP

The MVP is complete when:
- [ ] Marketing Manager can log in, upload a Facebook Insights CSV and an Ads Manager CSV, and see records stored in the database
- [ ] Spearman correlation runs and shows a coefficient table with heatmap
- [ ] Regression trains on records with non-null messaging conversations and shows the equation + R²
- [ ] Regression auto-retrains after a new upload adds messaging-conversation records
- [ ] Any user can run a What-If simulation and get a projected messaging-conversation estimate
- [ ] All three role dashboards load with relevant outputs
- [ ] Every upload is logged to `upload_logs` regardless of success or failure
- [ ] Invalid or malformed CSV files show specific error messages, not crashes
