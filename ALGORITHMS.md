# Algorithms Used in PCM-DSS

This document catalogs every non-trivial algorithm implemented in the PC Merchandise Decision Support System, the feature each one powers, and how it works end to end — from raw uploaded data to what appears on screen.

---

## 1. Statistical & Predictive Algorithms (`lib/stats/`)

### 1.1 Spearman Rank Correlation
**File:** `lib/stats/spearman.ts` (`computeSpearmanMatrix`, `rankArray`, `spearmanFiltered`)
**Feature:** Correlation Analysis (`app/dashboard/*/correlation/`)

**What it does:** Measures how strongly two variables move together *without assuming a linear relationship* — e.g., "does more Reach tend to come with more Purchases?" — using rank order rather than raw values, which makes it robust to outliers (a single viral ad with 10x normal reach won't distort the whole matrix).

**How it's implemented:**
1. `rankArray()` converts each column of raw numbers (Amount Spent, Reach, Impressions, Link Clicks, Purchases, Messaging Contacts) into rank positions. Ties are handled with the standard **average rank** method: if two values tie for 3rd/4th place, both get rank 3.5.
2. Spearman's ρ is then computed as the **Pearson correlation of the two rank arrays** (this is mathematically equivalent to the classic Spearman formula and avoids a separate implementation).
3. `spearmanFiltered()` drops any row where either variable is `null` (missing data) before ranking, and requires at least 3 complete pairs or it returns `null` rather than a misleading number from too little data.
4. `computeSpearmanMatrix()` runs this for every predictor (Spend, Reach, Impressions, Link Clicks) against two outcomes (Purchases, Messaging Contacts), producing the correlation matrix rendered as a heatmap-style table in `components/analytics/CorrelationTable.tsx`.

---

### 1.2 Pearson Correlation Coefficient (shared building block)
**File:** `lib/stats/spearman.ts` (`pearsonCorrelation`)
**Feature:** Used inside both Correlation Analysis (on ranks, see above) and Lagged Correlation (on raw values, see below)

**How it's implemented:** Standard formula —

```
r = Σ(x - x̄)(y - ȳ) / √( Σ(x - x̄)² · Σ(y - ȳ)² )
```

Computed in a single pass: means are calculated first, then one loop accumulates the numerator and both denominator sums simultaneously. Returns `0` if either variable has zero variance (avoids division by zero).

---

### 1.3 Lagged Correlation with Statistical Significance
**File:** `lib/stats/laggedCorrelation.ts` (`computeLaggedCorrelations`)
**Feature:** Lagged Correlation Panel (`components/analytics/LaggedCorrelationPanel.tsx`)

**What it does:** Answers "if we spend more today, how many days later do we actually see more purchases?" by testing correlation at multiple time offsets (1, 2, 3, 5, 7, and 14 days) and reporting which lag has the strongest, statistically meaningful relationship.

**How it's implemented:**
1. **Daily aggregation** — each ad row spans a date range (`reporting_starts` → `reporting_ends`) with totals for the whole range. `expandAndAggregate()` spreads each ad's totals evenly across every day in its range (e.g., ₱700 spent over 7 days → ₱100/day) and sums overlapping ads into one map keyed by date.
2. **Lag construction** — for each candidate lag *L*, `computeLaggedPearson()` pairs "today's" reach/messaging/spend against "*L* days later's" purchases, keeping only dates where both the source and target day exist in the data.
3. **Pearson correlation** is computed per lag per metric (reach, messaging, spend) using the shared `pearsonCorrelation` function above.
4. **Statistical significance (p-value)** — `pearsonPValue()` converts *r* into a z-score via the **Fisher z-transformation** (`z = 0.5 · ln((1+r)/(1-r))`), then computes a two-tailed p-value using the **Abramowitz & Stegun polynomial approximation** of the normal cumulative distribution function (a classic closed-form approximation accurate to ~7.5×10⁻⁸, avoiding the need for a full statistics library just for one function).
5. **Best-lag selection** — the code first looks for the strongest correlation among lags where *p* < 0.05 (statistically significant at 95% confidence); if none qualify, it falls back to the single strongest |r| regardless of significance, so the UI always has something to display rather than an empty state.

---

### 1.4 Multiple Linear Regression (Ordinary Least Squares)
**File:** `lib/stats/regression.ts` (`fitMLR`, `fitPlainMLR`, `gaussianElimination`, `maybeRetrainRegression`)
**Feature:** Regression Model (`app/dashboard/*/regression/`), and the numeric engine behind Budget Allocation and What-If Simulation (Sections 1.5 and 1.6 depend on this model)

**What it does:** Fits the equation `Purchases = β₀ + β₁·Reach + β₂·MessagingContacts + β₃·AmountSpent` to historical ad data, so the system can predict purchases from hypothetical future inputs.

**How it's implemented:**
1. **Normal equations** — rather than a generic matrix library, OLS is solved via the closed-form normal equation `XᵀXβ = Xᵀy`. `X` is the design matrix (a column of 1s for the intercept, plus reach/messaging/spend columns); `XᵀX` (a small 4×4 matrix here) and `Xᵀy` are built with explicit triple-nested loops.
2. **Gaussian elimination with partial pivoting** (`gaussianElimination`) solves the resulting 4×4 linear system for the coefficient vector β. Partial pivoting (swapping in the row with the largest absolute value in the current column before eliminating) keeps the elimination numerically stable even when coefficients differ by orders of magnitude — e.g., ad spend in the thousands vs. small reach ratios.
3. **Goodness of fit** — R² (`1 - SSres/SStot`), adjusted R² (penalizing for the 3 predictors relative to sample size), and residual standard error are computed directly from the fitted residuals.
4. **Automatic retraining** — `maybeRetrainRegression()` re-fits the model against *all* ads with known purchase counts every time enough new data exists (minimum 10 records), storing the new coefficients as a fresh `RegressionModel` row rather than mutating the old one, so historical simulations/allocations remain reproducible against the model that was live when they ran.

---

### 1.5 Monte Carlo Simulation (Box-Muller Transform)
**File:** `lib/stats/simulation.ts` (`runSimulation`, `randNormal`)
**Feature:** What-If Simulator (`components/analytics/WhatIfSimulator.tsx`)

**What it does:** Given a hypothetical Reach/Messaging/Spend combination, produces not just a single predicted purchase count but a realistic **range** (a 90% prediction interval) that accounts for the natural noise in the historical data the model was trained on.

**How it's implemented:**
1. The regression model (Section 1.4) produces a single point prediction (`basePredict`).
2. **Box-Muller transform** (`randNormal()`) generates standard-normal (mean 0, variance 1) random samples from two independent uniform random numbers `u1, u2`:
   `z = √(-2·ln(u1)) · cos(2π·u2)`
   This is the classic method for turning JavaScript's uniform `Math.random()` into Gaussian-distributed noise without needing a stats library.
3. **1,000 simulated draws** are generated as `basePredict + z · residual_std_error`, using the model's own residual standard error as the noise magnitude — so the spread of simulated outcomes reflects how noisy the real historical data actually was.
4. Samples are sorted, and the **median** (index 500) is reported as the projected value, with the **5th and 95th percentiles** as the lower/upper bounds of a 90% interval — a nonparametric way to build a confidence interval directly from the simulated distribution rather than assuming a closed-form formula.
5. **Out-of-range guardrails** — before returning, the function checks whether the requested Reach/Messaging/Spend fall outside the range the model was actually trained on, and separately flags low R² or small training sample size, surfacing these as human-readable warnings rather than presenting a confident-looking number that's actually extrapolated.

---

### 1.6 Budget Allocation Optimizer (Efficiency Ranking + Laplace Smoothing)
**File:** `lib/stats/budget-allocator.ts` (`computeBudgetAllocation`)
**Feature:** Budget Allocator (`components/analytics/BudgetAllocator.tsx`)

**What it does:** Given a total budget, splits it across ad sets in proportion to how efficiently each one historically converted spend into purchases — while correcting for the statistical trap where an ad set with only 1–2 purchases can look artificially "perfect."

**How it's implemented:**
1. Ad records are grouped by `ad_set_name`, summing spend, purchases, reach, and messaging contacts per group.
2. **Laplace smoothing** — raw efficiency (`purchases / spend`) is unstable for ad sets with very few purchases (an ad set with 1 purchase on ₱50 spend looks better than one with 40 purchases on ₱3,000, even though the second is far more statistically trustworthy). The code adds a pseudo-purchase at the group's own CPA rate to both numerator and denominator before computing efficiency, pulling small-sample groups' scores toward a more conservative estimate without needing external prior data.
3. Groups are filtered to those with real spend and at least one purchase, sorted by smoothed efficiency, and capped to the **top 8** to keep the UI readable.
4. The budget is split proportionally: each ad set's share of the total budget equals its share of total efficiency among the top 8 (`pct = efficiency / Σefficiency`).
5. Projected reach/messaging for each allocation are extrapolated from that ad set's own historical reach-per-peso / messaging-per-peso ratio (falling back to the cross-ad-set average when a group has no history for a metric), then fed into the shared regression model (Section 1.4) to predict purchases for that slice of budget.
6. **Prediction interval** — rather than the resampling approach used in the simulator, this uses a closed-form approximation for the standard error of a *new* prediction (`SE_pred = RSE · √(1 + 1/n)`), and a fixed **z-score of 1.2816** (the 90th-percentile point of the standard normal distribution) to build an 80% interval band around each allocation's projected purchases.

---

### 1.7 Holt-Winters Triple Exponential Smoothing (Time-Series Forecasting)
**File:** `lib/stats/forecast.ts` (`computeHoltWintersForecast`, `holtLinear`)
**Feature:** Page Metrics forecasting (trend charts under `app/dashboard/*/page-metrics/`)

**What it does:** Projects future values (Follows, Interactions, Link Clicks, Views, Visits) forward from historical daily data, capturing both a trend (are numbers generally rising or falling?) and a repeating weekly pattern (e.g., consistently higher engagement on weekends).

**How it's implemented:**
1. **Three smoothed components** are tracked and updated one day at a time: **level** (L, the de-seasonalized baseline), **trend** (b, the average day-over-day change), and **seasonal factors** (S, one per day-of-week, additive).
2. **Initialization:** level starts as the mean of the first full 7-day period; trend starts as the slope between the means of the first and second 7-day periods; seasonal factors start as each day's deviation from the initial level.
3. **Update equations**, applied per day *t* (with α=0.3, β=0.1, γ=0.3 as fixed smoothing weights):
   ```
   L(t) = α·(y(t) − S(t−period)) + (1−α)·(L(t−1) + b(t−1))
   b(t) = β·(L(t) − L(t−1)) + (1−β)·b(t−1)
   S(t) = γ·(y(t) − L(t)) + (1−γ)·S(t−period)
   ```
   Each new observation nudges level/trend/season slightly, weighted by how much the algorithm trusts new data (α, β, γ) versus its prior estimate.
4. **Forecast:** future points are `L + h·b + S[appropriate seasonal index]` for horizon steps `h = 1..7`, clamped at 0 (metrics can't go negative).
5. **Automatic fallback:** Holt-Winters needs at least 2 full periods (14 days) of data to initialize meaningfully. With fewer points, `holtLinear()` runs instead — the same level/trend logic without the seasonal term (classic **double exponential smoothing** / Holt linear method) — so a metric with only a few days of history still gets a reasonable trend projection instead of an error.

---

### 1.8 Campaign Health Scoring (Percentile Normalization + Weighted Composite)
**File:** `lib/stats/health-score.ts` (`computeHealthScores`)
**Feature:** Campaign Health Table (`components/analytics/CampaignHealthTable.tsx`)

**What it does:** Converts three raw, differently-scaled ad metrics (Cost Per Acquisition, Purchase Rate, Reach) into a single 0–100 score and a letter-style grade (Excellent/Good/Fair/Poor/Critical), so ads can be ranked and compared at a glance.

**How it's implemented:**
1. Three raw metrics are computed per ad: **CPA** (spend ÷ purchases — lower is better), **purchase rate** (purchases ÷ reach — higher is better), and raw **reach**.
2. **95th-percentile capping instead of min/max normalization:** using the absolute maximum as the normalization ceiling means a single outlier ad (e.g., one viral post with 50x normal reach) would compress every other ad's score toward the bottom of the scale. Capping at the 95th percentile of the whole dataset means normal-range ads still spread meaningfully across the 0–100 scale, and the rare outlier is simply clipped rather than dominating.
3. **Normalization** maps each ad's raw value into 0–100 within `[min, 95th-percentile]`, inverted for CPA since a *lower* cost is better (`invert=true` flips the direction of the scale).
4. **Weighted composite score:** `score = 0.50·cpa_score + 0.35·rate_score + 0.15·reach_score` — cost efficiency is weighted heaviest (it directly reflects ROI), purchase rate second, and raw reach least (reach alone doesn't mean the ad performed, just that it was seen).
5. The composite score is bucketed into a grade: ≥80 Excellent, ≥60 Good, ≥40 Fair, ≥20 Poor, otherwise Critical.

---

## 2. Text & Data Classification Algorithms

### 2.1 Keyword-Based Auto-Categorization
**File:** `lib/keywords/detect.ts` (`detectCategoryFromText`), invoked by `actions/categorize.ts` (`autoCategorizeAll`)
**Feature:** Auto-Categorize (`app/dashboard/marketing/categorize/`)

**What it does:** Automatically assigns a business category (e.g., "Gaming Peripherals", "Laptops") to uploaded ads and posts based on their name/title text, without requiring the Marketing Manager to tag every item by hand.

**How it's implemented:** A straightforward **case-insensitive substring match**: for each uncategorized item, the text is lowercased and checked against every stored keyword (also lowercased) in first-match order; the first keyword whose word appears anywhere in the text wins, and its associated category is applied. This is deliberately simple (linear scan, no fuzzy matching or stemming) — the keyword list is user-curated per category, so precision comes from the admin choosing good, distinctive keywords rather than from NLP sophistication. Runs in bulk across all uncategorized posts and ads in parallel (`Promise.all`) when "Auto-Categorize" is triggered.

### 2.2 AI-Assisted Keyword Suggestion (LLM-based, not a classical algorithm)
**File:** `actions/keywords.ts` (`suggestKeywords`)
**Feature:** Manage Keywords panel

Not a hand-written algorithm — this delegates to Groq's hosted **Llama 3.1 8B Instant** model. Up to 20 sample titles per category are sent with a prompt asking for 5–8 candidate keywords, which are then filtered in-code against keywords that already exist for that category before being shown as dismissible suggestion chips. Included here for completeness since it's part of the same categorization pipeline as 2.1.

---

## 3. CSV Parsing & File-Type Detection Algorithms

### 3.1 Header-Signature File Type Detection
**File:** `lib/csv/detect.ts` (`detectCsvType`)
**Feature:** CSV Upload (`actions/upload.ts`), all six supported file types

**What it does:** Determines which of six supported Facebook export formats (Ads, Posts, Follower History, Page Viewers, Demographics, Page Metrics) an uploaded file is, purely from its column headers — the user never has to specify the type manually.

**How it's implemented:** A prioritized set-membership check: each file type has a defined list of **required headers** that must *all* be present (`hasAll()` checks every required header exists in the parsed header row, order-independent). Checks run in a deliberate priority order to resolve ambiguity — e.g., Follower History is checked before Page Viewers because both contain a `Date` column, and Demographics' Gender variant is checked before its Territory variant because both share a `Distribution` column; the Gender check additionally requires the header row to have exactly 2 columns to disambiguate further. If no signature matches, an error is thrown naming every accepted format so the user knows what went wrong.

### 3.2 UTF-16 LE Byte-Order-Mark Detection
**File:** `lib/csv/detect.ts` (`detectIfPageMetricBuffer`)
**Feature:** CSV Upload — Page Metric files specifically

**What it does:** Facebook's Page Metric exports (Follows, Interactions, etc.) are saved as UTF-16 LE encoded files with an unusual `sep=,` marker line, unlike the UTF-8 CSVs used everywhere else — a plain header-text check would misread them as garbled data. This function inspects the **raw byte buffer** before any text parsing happens: it checks for the UTF-16 LE byte-order-mark (`0xFF 0xFE`) at the start of the file, then decodes just the first ~200 bytes with a UTF-16 LE `TextDecoder`, strips a possible BOM character, and checks whether the first line reads exactly `sep=,` — Facebook's signal to Excel about the delimiter. If both conditions hold, the file is routed through UTF-16-aware parsing instead of the standard UTF-8 CSV path.

---

## 4. Security & Authentication Algorithms

### 4.1 Bcrypt Password Hashing
**File:** `lib/auth.ts`, `actions/admin.ts`, `actions/profile.ts`, `prisma/seed.ts` (via `bcryptjs`)
**Feature:** Login, password change, admin user creation/reset

**How it's used:** Passwords are never stored or compared in plaintext. `bcryptjs.hash(password, costFactor)` (cost factor 10–12 across the codebase) salts and hashes on write; `bcryptjs.compare(inputPassword, storedHash)` re-derives and compares on login (`lib/auth.ts`'s `authorize()` callback) and password change (`actions/profile.ts`). Bcrypt's deliberately slow, salted design (an adaptive hash function built on the Blowfish cipher) makes brute-forcing a stolen hash computationally expensive, unlike a fast general-purpose hash such as SHA-256.

### 4.2 JWT Session Tokens
**File:** `lib/auth.ts` (NextAuth/Auth.js configuration), `middleware.ts`
**Feature:** Session management and role-based route protection across the entire app

**How it's used:** On successful login, Auth.js issues a **signed JSON Web Token** (HMAC-SHA256, keyed by `AUTH_SECRET`) containing the user's `id` and `role`, stored in an HttpOnly cookie with an 8-hour expiry (`maxAge: 60 * 60 * 8`) — intentionally shorter than the library's 30-day default, given the sensitivity of the ad-spend and sales data behind it. `middleware.ts` calls `getToken()` on every request to `/dashboard/*`, verifying the token's signature and reading its `role` claim to redirect users away from dashboards outside their own role — entirely on the Edge, before any page or Server Action code runs.

### 4.3 Fixed-Window Rate Limiting
**File:** `lib/rate-limit.ts`, applied in `actions/auth.ts`, `actions/chat.ts`, `actions/ai-insights.ts`, `actions/keywords.ts`
**Feature:** Brute-force login protection, AI API quota protection

**How it's used:** A classic **fixed-window counter** algorithm: each rate-limited key (e.g., `login:<ip>:<email>`) maps to a bucket tracking a request count and a window-reset timestamp. A request within an active window increments the count and is allowed until the count hits the configured limit; once the window's `resetAt` passes, the bucket resets to a fresh count of 1. Login uses two independent buckets — one keyed by IP+email (10 attempts/10 min) and one keyed by email alone (30 attempts/10 min) — so that spoofing the IP address can't fully bypass throttling against a single account (see `SECURITY.md` §3.3 for the reasoning). Buckets are stored in-process memory with opportunistic cleanup once the map exceeds 10,000 entries, which is appropriate for this app's current single-instance deployment scale.

---

## 5. Summary Table

| Algorithm | Category | File | Feature |
|---|---|---|---|
| Spearman rank correlation | Statistics | `lib/stats/spearman.ts` | Correlation Analysis |
| Pearson correlation | Statistics | `lib/stats/spearman.ts` | Correlation Analysis, Lagged Correlation |
| Fisher z-transform + Abramowitz-Stegun normal CDF | Statistics | `lib/stats/laggedCorrelation.ts` | Lagged Correlation significance testing |
| OLS multiple linear regression (normal equations + Gaussian elimination) | Statistics / ML | `lib/stats/regression.ts` | Regression Model, Budget Allocator, What-If Simulator |
| Monte Carlo simulation (Box-Muller transform) | Statistics / Simulation | `lib/stats/simulation.ts` | What-If Simulator |
| Laplace-smoothed efficiency ranking | Statistics / Optimization | `lib/stats/budget-allocator.ts` | Budget Allocator |
| Holt-Winters triple exponential smoothing (+ Holt linear fallback) | Time-series forecasting | `lib/stats/forecast.ts` | Page Metrics forecasting |
| Percentile normalization + weighted composite scoring | Statistics | `lib/stats/health-score.ts` | Campaign Health Table |
| Keyword substring matching | Text classification | `lib/keywords/detect.ts` | Auto-Categorize |
| LLM keyword suggestion (Llama 3.1 8B via Groq) | AI / NLP | `actions/keywords.ts` | Manage Keywords |
| Header-signature file type detection | Pattern matching | `lib/csv/detect.ts` | CSV Upload |
| UTF-16 LE BOM + signature detection | Pattern matching | `lib/csv/detect.ts` | CSV Upload (Page Metrics) |
| Bcrypt (adaptive salted hashing) | Cryptography | `lib/auth.ts` et al. | Password storage & verification |
| HMAC-signed JWT | Cryptography | `lib/auth.ts`, `middleware.ts` | Session management, RBAC |
| Fixed-window rate limiting | Algorithms / Security | `lib/rate-limit.ts` | Brute-force & abuse protection |
