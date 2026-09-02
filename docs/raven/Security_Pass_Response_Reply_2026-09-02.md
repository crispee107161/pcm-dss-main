# Reply: exports done, one dead-code answer, one real defence-day gap found

**Date:** 2 September 2026
**Re:** `Security_Pass_Response_and_Validation_Exports.md`
**Order followed:** §5.1/§5.2 → §2 → §3 → §4

---

## 1. §5.1 — the two exports

Both written via `scripts/raven-validation-exports.ts` (`npx tsx scripts/raven-validation-exports.ts`), reading straight from the same functions the app fits on — `buildRegressionDataset()` for the regression, the same `STUDY_PERIOD_POST_WHERE` + non-null-Views filter `computeRankingComparison()` applies for the ranking. Output at `scripts/output/regression_inputs.csv` and `scripts/output/ranking_inputs.csv`.

- **`regression_inputs.csv`: 108 rows.** Matches your expectation exactly.
- **`ranking_inputs.csv`: 730 rows, not 729.** The in-period post count is 731 (not 730) — `scripts/raven-731-*.ts` already exist in this repo from an earlier reconciliation, so this number has been checked before. Less the 1 post with a null Views value, that's 730 eligible, not 729. I'm not going to guess which of us has the stale number — flagging it rather than silently matching your expectation. If you want the full audit trail behind the 731 figure, those scripts are the place to start.

## 2. §5.2 — three definitions

**Advertising engagement rate (the regression predictor).** `sum(post_engagements) / sum(reach)`, both summed across an ad's monthly rows before dividing (sum-then-divide per ALG-09), stored as a **proportion**, not a percentage — `lib/stats/fr31-regression.ts:224`, no `× 100`.

⚠ **This is a different formula from the organic post `engagement_rate` field** in `ranking_inputs.csv`. That one is `(reactions + comments + shares) / reach × 100` — a **percentage** (`lib/csv/validate-posts.ts:90-91`; the schema comment on `FacebookPost.engagement_rate` confirms "already scaled, do not multiply by 100 again"). Same column name, two different entities, two different formulas, two different scales. Worth stating explicitly in whatever you write down, since conflating them would silently corrupt a comparison by a factor of 100.

**Natural log.** `Math.log()` in JavaScript is ln, not log₁₀ — `lnCpi: Math.log(cpi)` at `fr31-regression.ts:241`. Confirmed natural log.

**HC3, and the baseline predicts the whole-dataset median, not a per-fold median.** `hc3StandardErrors()` is the explicit function name (`fr31-regression.ts:564`) — HC3, not HC0/1/2. For the baseline: `medianCpi = median(actualCpi)` is computed once over **all 108 observations**, and that single fixed value is what the "median baseline" row is compared against (`fr31-regression.ts:654-658`). Two things worth being precise about here: (1) it's the whole dataset's median, never recomputed per fold, and (2) unlike the model's own cross-validated row, the baseline comparison itself is **in-sample** — it's not evaluated out-of-fold the way the model's CV row is. The model row (₱4.19 MAE) is genuinely out-of-fold; the baseline row (₱5.83 MAE) it's compared against is not cross-validated at all, just a constant predictor scored against the same data it was computed from.

## 3. §5.3 — current figures, before you compute yours

Pulled via `scripts/fr31-dump.ts` (regression) and a one-off script over `selectCorrelation()`/`computeRankingComparison()` (correlation, ranking) — not a screenshot, but the same numbers the Analysis screen renders, straight from source.

**PRIMARY regression (n=108):** R² = 0.548, adj. R² = 0.530, F = 31.172 (p = 5.29e-17). Coefficients (OLS / HC3 SE / HC3 p): intercept 2.7346, engagement_rate −0.6510 (p_HC3 = 0.057), frequency −0.2083 (p_HC3 = 0.067), ctr −9.6283 (p_HC3 = 0.034), cpm 0.0086 (p_HC3 < 0.001). In-sample MAE ₱3.93 / 10-fold CV MAE ₱4.19 (seed 42) / median baseline MAE ₱5.83 — 28.2% MAE improvement over baseline. Breusch-Pagan p = 0.054 (borderline homoscedastic), Jarque-Bera p ≈ 0 (non-normal residuals, hence HC3).

**SECONDARY regression (n=187):** R² = 0.398, adj. R² = 0.384. engagement_rate flips sign (primary −0.65, secondary +0.61) and isn't robust-significant in either spec; ctr and cpm are stable across both.

**FR-21 correlation (ad engagement rate vs. CPI, n=187):** Spearman selected (both Shapiro-Wilk tests reject normality), ρ = −0.2163, p = 0.0029.

**FR-19 ranking comparison (n=730):** Spearman ρ = −0.3275, p ≈ 1.03e-19 between Views-rank and organic-engagement-rate-rank. Top-10% overlap 5/73 (6.8%), top-20% overlap 19/146 (13.0%). Views-vs-Reach ρ = 0.9544.

Full coefficient/residual CSVs are also sitting in `scripts/output/` from the same run, if you want more than the headline numbers.

---

## 4. §2 — what `ai-insights.ts` is

**It's dead code. No screen calls it, so no role can reach it.**

`generateAIInsights()` is only referenced from `components/analytics/AIInsightCard.tsx` — and that component isn't imported anywhere. Checked every `.tsx` under `app/` and `components/` for `AIInsightCard` or `ai-insights`: zero hits outside that one file. `git log` traces it back to the initial commit and a couple of later hardening passes (rate limiting, error handling), but it was never wired into a page. Its `InsightData` shape (`bestLag`, `isMLR`, `rse`, `forecastBaseline`) matches the cut predictive-regression/forecast feature described in CLAUDE.md as "left on disk, unwired from the current build" — my read is this card was built for that feature's UI and never got reconnected (or removed) when that model was cut.

So: not a fourth undocumented external call in the live system. It exists in the repo, sends aggregate figures only (spend/inquiries/reach/CPI/regression stats, no ad names, no post content — narrower than the chat assistant's payload even), but nothing currently invokes it. Chapter 3's "one external call" accounting for the live app is correct as it stands. I'd suggest either deleting both files as unreachable, or leaving a note that they're intentionally dormant — your call, not a security question either way.

---

## 5. §3 — the three defence-day checks

**Owner lockout recovery: this one is a real gap, not just a risk.** There is exactly one `BUSINESS_OWNER` account seeded (`owner@pcmerchandise.com`). Every admin action, including `unlockUser`, is gated to `BUSINESS_OWNER` via `requireOwner()`. If that specific account locks itself out, there is no other account in the system with permission to unlock it, and no self-service path — a genuine deadlock, not just "recovery is inconvenient." I've written `scripts/emergency-unlock.ts` as a documented, CLI-only fallback (`npx tsx scripts/emergency-unlock.ts owner@pcmerchandise.com`) — it needs direct `DATABASE_URL` access, the same trust boundary every other script in `scripts/` already assumes, and isn't reachable from the running app. Recommend having whoever holds DB credentials on standby during the demonstration, or rehearsing the Owner sign-in beforehand so this never gets exercised live.

**Demonstration accounts checked directly against the database, just now:** all three (`owner@`, `marketing@`, `team@pcmerchandise.com`) show `is_locked: false`, `must_change_password: false`, `failed_login_attempts: 0`. None carries a stale forced-password-change flag. Clean as of this check — worth re-checking once more right before the defence if anyone touches those accounts through User Management between now and then, since a reset or a few mistyped logins would flip that state.

**Re-authentication on every account action: confirmed, as designed.** If User Management is demonstrated, expect a password prompt before each role change, reset, deactivate, reactivate, or unlock. Correct behaviour per SR-A9, worth narrating during the demo rather than looking like a bug.

---

## 6. §4 — ERD regeneration

Not done yet — flagging rather than doing it silently, since I know you want to see the diff. Say the word and I'll regenerate `docs/erd_schema.sql` to include `SecurityEventLog` and the six new `User` columns; low urgency either way per your note.

---

Still open, unchanged from before: the always-visible caption, the two combined-Generate decoupling fixes, the three exercise runs, and the `PROGRESS.md` corrections.
