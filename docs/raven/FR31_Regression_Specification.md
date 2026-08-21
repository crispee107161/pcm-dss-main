# FR-31 — Regression Analysis: full specification

**Date:** 17 August 2026
**Status:** new feature. Defence moved to the 2nd week of October, so this is back in scope after being cut on 12 Aug.
**Objective it serves:** new Objective 4.3
**Screen:** S7 Analysis (new section)

Every number in this document was computed from the client's actual ads exports. Your implementation should reproduce them exactly — that's your acceptance test.

---

## 1. What this is, and what it is NOT

**IS:** an explanatory model. It answers *"which advertisement characteristics are associated with cost per inquiry?"* — a different question from FR-21, which tests one relationship at a time.

**IS NOT:** a predictor, a forecast, or a simulation. The data is observational, so the coefficients describe associations among ads that ran — **not** what would happen if a setting were changed.

> ⚠ **Do not build a slider that lets the user change CTR and see a predicted CPI.** That is the what-if simulation we cut on 12 August, wearing a different hat, and it implies a causal lever the data cannot support.

The error metrics in §5 exist to show the model is *adequate*, not to claim the system predicts anything.

---

## 2. Population and variables

```
Population: ads WHERE Result type = 'Messaging conversations started'
            AND SUM(spend) > 0
            AND SUM(Results) > 0
            AND SUM(spend) >= 1000        <- same threshold as FR-25
Aggregate to ad level (group by Ad ID, sum across months) BEFORE computing ratios.
Result: n = 108
```

**Outcome (dependent variable):**
```
cpi = SUM(Amount spent (PHP)) / SUM(Results)
y   = ln(cpi)                              <- natural log
```

Log-transform because CPI is heavily right-skewed (skew ≈ 3.9). Untransformed, a handful of expensive ads dominate the fit.

**Predictors (independent variables):**

| Name | Formula |
|---|---|
| `engagement_rate` | `SUM(Post engagements) / SUM(Reach)` |
| `frequency` | `SUM(Impressions) / SUM(Reach)` |
| `ctr` | `SUM(Link clicks) / SUM(Impressions)` |
| `cpm` | `1000 × SUM(spend) / SUM(Impressions)` |

All four are **ratios**, all computed after summing across months (per ALG-09 — sum-then-divide, never average the per-row values).

Drop any ad where a ratio is null, infinite, or its denominator is zero.

### Why reach and spend are excluded

They're near-perfectly collinear: **r = 0.984** on the log scale (bigger budgets buy more reach). Including both makes coefficients unstable. Excluding them in favour of the ratios is a documented modelling decision — put a note in the UI or the docs saying so.

---

## 3. Model and diagnostics

**Estimator:** ordinary least squares (OLS).

Run **all three** diagnostics and store the results — they get displayed, not just checked.

### 3.1 Variance Inflation Factor (multicollinearity)

```
For each predictor j:
    VIF_j = 1 / (1 - R²_j)
    where R²_j is from regressing predictor j on ALL OTHER predictors *plus an intercept*
```

> ⚠ **The intercept must be in the design matrix when computing VIF.** Omitting it inflates every value wildly — I made exactly this mistake and got VIFs of 12–21 for a model whose real VIFs are 1.10–1.35. If your VIFs come out above 10 for these four predictors, that's the bug.

**Expected values (your acceptance test):**

| Predictor | VIF |
|---|---|
| engagement_rate | 1.35 |
| frequency | 1.16 |
| ctr | 1.29 |
| cpm | 1.10 |

All well under the conventional threshold of 10.

### 3.2 Breusch-Pagan (heteroscedasticity)

Expected: **p = 0.054** → homoscedastic (borderline, but passing).

### 3.3 Shapiro-Wilk on residuals (normality)

Expected: **p < 0.001** → residuals are **not** normal.

**This is a real assumption violation and it drives a decision:** because residuals are non-normal, report **HC3 robust standard errors** alongside the ordinary ones. Don't silently swap them — show both, so the reader can see which coefficients survive.

---

## 4. Expected results — reproduce these exactly

### Primary model (spend ≥ ₱1,000, n = 108)

```
R² = 0.548    adjusted R² = 0.530
```

| Predictor | Coefficient | p (OLS) | p (HC3 robust) |
|---|---|---|---|
| (intercept) | 2.7346 | <0.001 | <0.001 |
| engagement_rate | −0.6511 | 0.0037 | **0.0570** |
| frequency | −0.2084 | 0.0087 | **0.0670** |
| ctr | −9.6285 | 0.0473 | 0.0339 |
| cpm | +0.0086 | <0.001 | <0.001 |

### Secondary model (all messaging ads, n = 187) — also compute and display

```
R² = 0.398    adjusted R² = 0.384
```

| Predictor | Coefficient | p (OLS) | p (HC3) |
|---|---|---|---|
| engagement_rate | **+0.6060** | 0.0249 | 0.1318 |
| frequency | −0.3562 | 0.0007 | 0.0084 |
| ctr | −28.6733 | <0.001 | <0.001 |
| cpm | +0.0080 | <0.001 | <0.001 |

### ⚠ The instability you must surface, not hide

**`engagement_rate` flips sign between the two samples** — `+0.606` on all 187 ads, `−0.651` on the 108 above ₱1,000. Neither survives robust standard errors at α = 0.05.

The UI must **display both specifications side by side** and flag engagement_rate as **not robust across specifications**. This is a finding about model stability, and declaring it ourselves is what makes the rest of the model credible. A panelist who re-runs on a different subset will find the opposite sign — better that we said so first.

**Stable across every specification tested:** `cpm` (positive) and `ctr` (negative). Those are the defensible results.

---

## 5. Accuracy evaluation — cross-validated, with a baseline

> ⚠ **In-sample error metrics are not accuracy.** Every model looks good on data it was fitted to. To claim accuracy you must hold data out.

### 5.1 Implement 10-fold cross-validation

```
kfold(k=10, shuffle=True, random_seed=42)     <- fix the seed; it must be reproducible
for each fold:
    fit OLS on the 9 training folds  (on ln(cpi))
    predict the held-out fold
    back-transform: predicted_cpi = exp(predicted_ln_cpi)
collect all out-of-fold predictions, then compute the metrics below on the original CPI scale
```

### 5.2 Metrics

```
MAE   = mean( |actual − predicted| )
RMSE  = sqrt( mean( (actual − predicted)² ) )
MAPE  = 100 × mean( |actual − predicted| / actual )
CV R² = 1 − SS_residual / SS_total     (computed on out-of-fold predictions)
```

Report **RMSE, not MSE** — RMSE is in pesos and is interpretable; MSE is in squared pesos and isn't.

### 5.3 Baseline comparison — this is mandatory

Compute the same three metrics for a naive model that predicts **the median CPI** for every ad. Without this row, "MAPE 19%" is a number with no meaning.

### 5.4 Expected output (acceptance test)

| | In-sample | 10-fold CV | Baseline (predict median) |
|---|---|---|---|
| R² | 0.548 | 0.397 | — |
| MAE | ₱3.93 | ₱4.15 | ₱5.83 |
| RMSE | ₱6.20 | ₱6.55 | ₱8.77 |
| MAPE | 18.2% | 19.1% | 26.9% |

Two things this shows, and the UI should make both visible:

- **Shrinkage is modest** (0.548 → 0.397). A large gap would signal overfitting; this doesn't.
- **The model beats the naive baseline by ~29%** on held-out data (MAE ₱4.15 vs ₱5.83; MAPE 19.1% vs 26.9%). That comparison is the actual evidence the model is worth anything.

---

## 6. Residual diagnostic — the operational payoff

This is what makes the regression useful to the owner rather than just to the paper.

```
For each ad:
    predicted_cpi = exp( fitted ln(cpi) )
    ratio = actual_cpi / predicted_cpi
Flag ads where ratio > 1.5
```

These are ads costing **more than their own characteristics would suggest** — a different and sharper list than FR-25's worst quartile, because it accounts for what each ad had to work with (a small ad with poor reach isn't condemned just for being small).

**Apply the same ≥₱1,000 spend filter here.** Without it the largest residuals are ads with 1–2 recorded inquiries, which is the same small-sample noise that forced the filter on FR-25.

**Display:** ad name, spend, actual CPI, predicted CPI, ratio — sorted by ratio descending.

**Mandatory caption:**
> "Compares each advertisement's recorded cost per inquiry against the level associated with its characteristics. Not a prediction of future performance."

---

## 7. What to display on S7

Order matters — assumptions first, then coefficients, then accuracy. That ordering is what makes the section defensible.

1. **Model specification** — outcome, predictors, n, the ≥₱1,000 filter, and a note that reach/spend were excluded for collinearity (r = 0.984)
2. **Diagnostics panel** — VIF per predictor, Breusch-Pagan p, Shapiro-Wilk p, and a plain-language line: *"Residuals are non-normal, so robust (HC3) standard errors are reported."*
3. **Coefficient table** — both specifications side by side, both p-values, engagement_rate flagged as not robust
4. **Accuracy panel** — the §5.4 table, all three columns including the baseline
5. **Residual diagnostic table** — §6

### Language rules for this screen

| Don't write | Write instead |
|---|---|
| "predicts", "will cost", "forecast" | "is associated with", "at the level associated with its characteristics" |
| "X causes lower CPI" | "X is associated with lower CPI" |
| "accuracy: 81%" | "MAPE 19.1% on held-out data, vs 26.9% for a median baseline" |
| "the model shows engagement doesn't matter" | "the engagement rate coefficient is not stable across specifications" |

---

## 8. Implementation notes

- **Library is fine.** `statsmodels` (Python) or an equivalent JS/TS OLS implementation. You don't need to hand-roll normal equations — but the diagnostics (VIF, BP, Shapiro) and the CV loop must actually run, not be hard-coded.
- **Store every fit's outputs**, not just the coefficients: R², adj R², F-statistic and its p, all diagnostics, both sets of standard errors, and the CV metrics. We need all of it for Chapter 4.
- **Fix the CV seed at 42** and make it a named constant. The manuscript will state it.
- **Refit on demand**, not once at build time. If new data is uploaded the model should re-estimate — that's the honest behaviour and it's also what makes the feature durable.
- **Guard against n being too small.** If fewer than 30 ads pass the filter, suppress the whole section with a message ("insufficient data: n = X, minimum 30") rather than rendering a confident-looking table built on nothing.
- **Make the ₱1,000 threshold the same named constant** FR-25 uses. If we change it, both must move together, and Chapter 1 states the value.

---

## 9. Checklist

- [ ] Population: messaging ads, spend ≥ ₱1,000, aggregated to Ad ID → **n = 108**
- [ ] Outcome is `ln(cpi)`; predictors are the four ratios, sum-then-divide
- [ ] Reach and spend excluded (r = 0.984) with a note in the UI
- [ ] **VIF computed with the intercept in the design matrix** → expect 1.10–1.35
- [ ] Breusch-Pagan (expect p ≈ 0.054) and Shapiro-Wilk on residuals (expect p < 0.001) both run and displayed
- [ ] HC3 robust standard errors reported **alongside** ordinary ones
- [ ] Both specifications (n = 108 and n = 187) displayed side by side
- [ ] `engagement_rate` flagged as not robust across specifications
- [ ] 10-fold CV, seed 42, back-transform with `exp()` before computing metrics
- [ ] MAE / RMSE / MAPE / CV R² computed on out-of-fold predictions only
- [ ] **Median baseline row present** in the accuracy table
- [ ] Residual diagnostic with the ≥₱1,000 filter and the "not a prediction" caption
- [ ] No slider, no what-if input, no forecast language anywhere on the screen
- [ ] Section suppressed with a message if n < 30
- [ ] All fit outputs stored for the manuscript

---

## 10. What we need back for Chapter 4

Raw numbers, CSV or text dump — not screenshots:

- Both coefficient tables with OLS and HC3 p-values, standard errors, t-statistics
- R², adjusted R², F-statistic and its p, for both specifications
- All three diagnostic test statistics and p-values
- The full accuracy table including the baseline row
- The residual diagnostic list: how many ads exceed ratio 1.5, and their total spend
