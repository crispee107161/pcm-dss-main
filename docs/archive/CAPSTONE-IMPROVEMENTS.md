# PCM DSS — Capstone Improvement Roadmap

> **Superseded 2026-08-14** by `docs/mvp.md` (rewritten 2026-08-12 for the MVP v2 respec) and `docs/PROGRESS.md`. This document reflects pre-respec scope/roles (e.g. Sales Director, cut analytics features) and is kept for historical reference only — do not treat it as current.

**Date**: 2026-08-02
**Source**: Four-voice capstone defense council (Architect, Skeptic, Pragmatist, Critic)
**Status**: proposed

## Context

The council reviewed PCM DSS — a role-gated Next.js dashboard analyzing Facebook ad/page data for a PC merchandise business — against one question: *is it actually important to a small business, and rigorous enough to trust for real decisions?*

Consensus finding: every statistical and forecasting claim in the system rests on a synthetic dataset that was built to satisfy Prophet's 2-year seasonality minimum, then carried forward unquestioned after Prophet was dropped for Holt-Winters. The system has never been validated against real PC Merchandise data or real outcomes. Combined with zero automated tests and an open credential-exposure item in SECURITY.md, the panel's judgment was: **defensible as an engineering artifact, not yet defensible as a decision-support claim.**

The items below close that gap, ordered by what the panel treated as load-bearing.

## Gaps to Close

### 1. Validate against real data (highest priority — Skeptic + Pragmatist + Critic all flagged this) — ✅ done
- Synthetic data wiped from the database (2026-08-02): `Ad`, `FacebookPost`, `PageMetricDaily`, `FollowerHistory`, `PageViewers`, `FollowerGender`, `FollowerTerritory`, `RegressionModel`, `SimulationResult`, `UploadLog` all cleared. User accounts and the Category/Keyword taxonomy were left intact.
- Real PC Merchandise Facebook exports uploaded. Current real-data footprint: `Ad` 229 rows (2025-09-01 → 2026-01-01), `FacebookPost` 81 rows (Sep 2025), `PageMetricDaily` 28 rows (2025-09-20 → 2025-10-17), `FollowerHistory`/`PageViewers` 60 rows each (Aug–Oct 2025). Regression model retrained on real data (n=42, r²=0.50).
- **Caveat**: `PageMetricDaily` (the table the forecast runs on) has only 28 real days so far — thin for a 7-day-holdout backtest. Re-run the backtest below as more days accumulate to confirm the result holds.

### 2. Backtest the forecast, don't just implement it (Critic) — ✅ done (first pass)
- `scripts/backtest-forecast.ts` holds out the last 7 days of real `PageMetricDaily.views` (2025-10-11 → 2025-10-17), trains Holt-Winters on the preceding 21 days, and compares against two naive baselines (flat-repeat, seasonal-naive).
- **Result**: Holt-Winters MAE=1920.71, RMSE=2255.04, MAPE=8.9% — beats both the flat-naive baseline (MAPE 12.1%) and the seasonal-naive baseline (MAPE 18.7%) on this holdout.
- This is a real, stated claim for the defense: "Holt-Winters forecasts page views with ~9% MAPE on a 7-day holdout, outperforming naive baselines" — not just "we implemented Holt-Winters."
- **Caveat to state alongside it**: one 7-day holdout from 21 days of training data is a single data point, not a robust validation — re-run `scripts/backtest-forecast.ts` periodically as more real days land, and ideally run a rolling-origin backtest (multiple holdout windows) once there's enough history (2+ months) to do so meaningfully.

### 3. Add a test suite for `lib/stats/` (Critic + Pragmatist) — ✅ started
- Vitest added as the test runner (`npm test` / `npm run test:watch`), config at `vitest.config.mts`.
- 23 known-answer tests landed across the pure/exported functions:
  - `spearman.test.ts` — `rankArray` (ties, nulls), `pearsonCorrelation` (perfect ±1, zero-variance, empty input).
  - `regression.test.ts` — `fitMLR` recovers exact hand-derived coefficients from a noise-free dataset (r²=1); `predictFromModel` including the legacy-coefficient fallback path.
  - `forecast.test.ts` — Holt-Linear vs. Holt-Winters branch selection at the `2*period` threshold, a flat series held exactly constant (hand-verifiable zero-trend/zero-seasonality case), forecast date increment, non-negative clamping, null filtering.
  - `health-score.test.ts` — the 0.50/0.35/0.15 CPI/rate/reach weighting verified by hand-computed score, null-safe handling of zero-inquiry ads, and the 95th-percentile outlier cap.
- **Update (2026-08-02) — done**: `laggedCorrelation.ts`, `simulation.ts`, and `budget-allocator.ts` now have 21 additional tests (44 total across `lib/stats/`), using a mocked Prisma client (`vi.mock('@/lib/prisma')`) so the real logic runs against fixture data instead of a live database.
  - `laggedCorrelation.test.ts` — `pearsonPValue` verified against known cases (r=0 → p≈1, |r|=1 → p=0, n≤3 → p=1, strong correlation → p<0.01); `expandAndAggregate` verified for even day-splitting and null-safety; `computeLaggedCorrelations` verified end-to-end by constructing an irregular reach sequence where inquiries are an exact function of reach 3 days earlier — confirms the function correctly identifies `best_lag=3` rather than a spurious lag.
  - `simulation.test.ts` — `randNormal` checked for ~zero mean/unit variance over 20,000 samples; `runSimulation` made deterministic by stubbing `Math.random`, giving an exact hand-verifiable Monte Carlo output; all five warning conditions (out-of-range input, low R², low sample size, missing model) tested individually.
  - `budget-allocator.test.ts` — Laplace-smoothed efficiency and proportional allocation verified with hand-computed exact values (a 0.1/0.01 efficiency split across two ad sets); the top-8 cap verified to keep the 8 highest-efficiency ad sets and drop the two lowest; all three error paths (no model, no ads, no ad set with inquiries) tested.
  - Two previously-private helpers (`pearsonPValue`, `expandAndAggregate` in `laggedCorrelation.ts`; `randNormal` in `simulation.ts`) were given `export` so they could be tested directly — a minimal visibility change, not a refactor.

### 4. Close the SECURITY.md credential-exposure item (Critic)
- The three-role RBAC design (Marketing Manager / Sales Director / Business Owner) is a core selling point of the system; an open credential-exposure gap undermines the "role-locked" guarantee the whole architecture leans on.
- Resolve before any claim of role-based access control is presented as a completed feature.

### 5. Reframe scope honestly (Skeptic) — ✅ done
- Added `SCOPE.md` — a single source of truth for what PCM DSS is/isn't and the exact framing language to use in the defense ("a Facebook marketing-analytics decision-support tool... not a comprehensive business decision-support system").
- Audited every place the app describes its own scope to a user: `app/layout.tsx` metadata and `PRODUCT.md` were already honestly scoped ("Facebook Ads Analytics") and needed no change.
- Found and fixed one real, live overclaim: `actions/chat.ts`'s AI system prompt described the assistant as living "inside the PC Merchandise Decision Support System" with no scope limit — meaning the AI could have plausibly answered inventory/pricing questions with fabricated confidence instead of admitting it has no data there. Changed the prompt to explicitly state it only sees Facebook marketing data and to say so plainly rather than guess when asked about anything else. This was a code fix, not just a documentation change.
- Left the product name ("PC Merchandise DSS") as-is — renaming the whole app was judged higher-risk/lower-value than fixing the one place scope was actually being oversold to a live user (the AI chat).
- `SCOPE.md` also notes an optional (not required) path to actually earn the "DSS" name later: connect one real non-marketing data source (e.g., actual units sold) to create a second, non-marketing decision surface.

### 6. Get real user feedback (Skeptic — "the sharper miss")
- No evidence the three dashboards were shown to an actual Marketing Manager, Sales Director, or Business Owner (real or role-played) for usability/trust feedback.
- A DSS's rigor is ultimately measured by whether the target user acts on it, not by which smoothing algorithm was chosen. Even one structured feedback session materially strengthens the defense.

## Consequences

### Positive
- Turns "we implemented X" claims into "we validated X" claims — the difference a capstone panel scores on.
- Produces concrete artifacts (backtest numbers, test coverage report, closed security item) that can go directly into the defense deck.

### Negative
- Items 1–3 require either real business data (may not be available) or a credible stand-in (e.g., a public Kaggle ad-performance dataset) plus real engineering time before the defense date.
- Reframing scope (item 5) may mean rewriting parts of the thesis narrative, not just the code.

### Risks
- If real PC Merchandise data cannot be obtained in time, be transparent about this limitation in the defense rather than presenting synthetic-data results as proof of accuracy — the panel already flagged this as the weakest point; hiding it further would compound the issue.
