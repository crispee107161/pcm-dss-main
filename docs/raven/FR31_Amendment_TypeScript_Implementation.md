# FR-31 Amendment — implementation path in TypeScript

**Date:** 17 August 2026
**Supersedes:** §3 and §8 of `FR31_Regression_Specification.md`. Everything else in that document stands.
**Decision:** build TS-native. No Python service.

---

## 0. You were right

The original spec assumed a `statsmodels` equivalent existed and never said so. That's a real gap and "assume a stats library" is a methodology document, not an implementation plan. Thanks for catching it before you burned time on it.

What follows removes the two hardest routines from the list rather than asking you to build them.

---

## 1. Shapiro-Wilk is OUT — use Jarque-Bera instead

You flagged Shapiro-Wilk as the genuinely fiddly one. Agreed — Royston's algorithm needs approximation-coefficient tables and is easy to get subtly wrong with no way to notice.

**Jarque-Bera does the same job here and has a closed-form p-value**, because the JB statistic is χ² with **2** degrees of freedom — and for df=2 the survival function is just `exp(-x/2)`.

```ts
// residuals e[], n = e.length
const mean = e.reduce((a,b)=>a+b,0) / n;
const m2 = e.reduce((a,b)=>a+(b-mean)**2,0) / n;
const m3 = e.reduce((a,b)=>a+(b-mean)**3,0) / n;
const m4 = e.reduce((a,b)=>a+(b-mean)**4,0) / n;

const skew      = m3 / Math.pow(m2, 1.5);
const exKurt    = m4 / (m2*m2) - 3;          // excess kurtosis
const JB        = (n/6) * (skew**2 + (exKurt**2)/4);
const pJarqueBera = Math.exp(-JB / 2);        // χ² df=2 survival — exact, closed form
```

**Verified against the real data — use as acceptance tests:**

| Sample | skew | excess kurtosis | JB | p |
|---|---|---|---|---|
| n = 108 (spend ≥ ₱1,000) | 0.941 | 4.474 | **106.005** | ≈ 9.6e-24 |
| n = 187 (all messaging) | — | — | **193.144** | ≈ 1.15e-42 |

Reference Shapiro-Wilk on the same residuals gives W = 0.9375, p = 7.3e-05 → **same conclusion: residuals are not normal.**

Jarque-Bera is a standard normality test — arguably more common than Shapiro-Wilk in regression/econometrics contexts, and it's asymptotic, which suits n = 108. Chapter 3 will cite Jarque-Bera. Nothing is lost.

---

## 2. Breusch-Pagan p-value also has a closed form

The BP Lagrange-multiplier statistic is χ² with **k = 4** degrees of freedom (one per predictor). Four is **even**, so the survival function is a finite sum — no incomplete gamma needed:

```
P(X > x) = exp(-x/2) × Σ(j = 0 .. df/2 - 1) (x/2)^j / j!
```

For df = 4 that's just two terms:

```ts
function chi2SurvivalEvenDf(x: number, df: number): number {
  // df MUST be even
  let sum = 0;
  for (let j = 0; j < df/2; j++) sum += Math.pow(x/2, j) / factorial(j);
  return Math.exp(-x/2) * sum;
}
```

**The BP statistic itself** is the standard auxiliary regression:
```
1. fit the main model, get residuals e
2. regress e² on the same predictors (with intercept) → auxiliary R²
3. LM = n × R²_aux
4. p = chi2SurvivalEvenDf(LM, 4)
```

**Verified exact against statsmodels:** LM = **9.2866** → p = **0.0543**, identical to four decimals both ways.

---

## 3. What actually remains to build

| Routine | Effort | Notes |
|---|---|---|
| OLS generalised to k predictors | **Easy** | Extend the existing Gaussian elimination in `lib/stats/regression.ts` from 2 predictors to k. Same algorithm. |
| VIF | **Easy** | Once OLS is general: 4 auxiliary fits, each regressing one predictor on the other three **plus an intercept**. `VIF_j = 1/(1 - R²_j)`. |
| Breusch-Pagan | **Easy** | §2 above. |
| Jarque-Bera | **Trivial** | §1 above. |
| 10-fold CV harness | **Trivial** | Fixed seed 42, deterministic shuffle. |
| HC3 sandwich estimator | **Moderate**, ~30 lines | Needs `(XᵀX)⁻¹` (you'll have it from OLS) and the hat-matrix diagonal. See §4. |
| Regularised incomplete beta | **Moderate**, standard routine | Gives you both t and F p-values. See §5. |

Nothing here needs a coefficient table or a special-function library.

---

## 4. HC3 — keep it, it's load-bearing

```
h_ii = x_i (XᵀX)⁻¹ x_iᵀ                       // hat diagonal, per observation
Ω    = diag( e_i² / (1 - h_ii)² )
V    = (XᵀX)⁻¹ Xᵀ Ω X (XᵀX)⁻¹
SE_j = sqrt(V_jj)
```

**Verified standard errors (n = 108):**

| | OLS | HC3 |
|---|---|---|
| intercept | 0.1690 | 0.1700 |
| engagement_rate | 0.2193 | 0.3421 |
| frequency | 0.0779 | 0.1138 |
| ctr | 4.7952 | 4.5382 |
| cpm | 0.0008 | 0.0010 |

**Why it can't be dropped, even though it's the most awkward piece left:**

Under ordinary standard errors, `engagement_rate` (p = 0.0037) and `frequency` (p = 0.0087) are both significant. Under HC3 they are **not** — 0.0570 and 0.0670.

That divergence *is* the instability finding the spec asks you to surface. Without HC3 we'd report both as significant and the "not robust across specifications" claim disappears. It's the single most defensible thing in the whole feature.

---

## 5. Please implement incomplete beta properly — don't approximate with the normal

Tempting shortcut: at df = 103 the t distribution is nearly normal, and you already have an Abramowitz-Stegun normal CDF in the repo.

I tested it. Max divergence lands on the coefficient that matters most:

| Predictor | t | p (t-dist, correct) | p (normal approx) |
|---|---|---|---|
| engagement_rate | −2.970 | 0.00371 | 0.00298 |
| frequency | −2.676 | 0.00868 | 0.00746 |
| **ctr** | **−2.008** | **0.04726** | **0.04465** |
| cpm | 10.197 | <0.00001 | <0.00001 |

`ctr` is the coefficient sitting closest to the 0.05 line. The approximation reports 0.045 where the truth is 0.047 — same conclusion, but a number wrong in the third decimal, on the one value a panelist is most likely to scrutinise.

**One regularised incomplete beta implementation** (Lentz continued fraction — standard, well-documented, ~40 lines) gives you:
- **t-distribution p-values** for every coefficient
- **F-distribution p-value** for the overall model

Both are needed. Reference F values: **F = 31.188, p = 5.22e-17** (n=108, df 4/103) and **F = 30.036, p = 3.44e-19** (n=187, df 4/182).

---

## 6. Why TS-native rather than a Python service

You asked for a decision before committing engineering time. It's TS-native, for four reasons:

1. **The two hard routines are gone.** Shapiro-Wilk and the incomplete-gamma χ² are both replaced by closed forms. What's left is ordinary numerical work.
2. **Your verification concern is already answered.** Every expected number in the spec was computed from the real client exports — the spec *is* the reference implementation. If your VIFs aren't 1.10–1.35, or BP isn't 0.0543, or JB isn't 106.005, something's wrong. That's a stronger test than diffing against a library you'd also have to trust.
3. **No new architecture.** A Python side-process on Vercel for one feature is real deployment and maintenance surface for a system that currently has none.
4. **Consistent with what's already there.** The algorithms doc already presents hand-rolled Gaussian elimination and an Abramowitz-Stegun normal CDF. This extends that, rather than sitting oddly beside it.

If you hit something genuinely intractable, say so and we'll revisit — but I don't think you will.

---

## 7. Full acceptance-test table

Run these against the real exports. All were computed from the client data.

### Primary model — spend ≥ ₱1,000, n = 108

```
R² = 0.548        adj R² = 0.530
F  = 31.188       p = 5.22e-17      df = 4, 103

VIF:  engagement_rate 1.35 | frequency 1.16 | ctr 1.29 | cpm 1.10
Breusch-Pagan:  LM = 9.2866   p = 0.0543
Jarque-Bera:    JB = 106.005  p ≈ 9.6e-24   (skew 0.941, excess kurt 4.474)
```

| Predictor | coef | SE (OLS) | SE (HC3) | p (OLS) | p (HC3) |
|---|---|---|---|---|---|
| intercept | 2.7346 | 0.1690 | 0.1700 | <0.001 | <0.001 |
| engagement_rate | −0.6511 | 0.2193 | 0.3421 | 0.0037 | 0.0570 |
| frequency | −0.2084 | 0.0779 | 0.1138 | 0.0087 | 0.0670 |
| ctr | −9.6285 | 4.7952 | 4.5382 | 0.0473 | 0.0339 |
| cpm | +0.0086 | 0.0008 | 0.0010 | <0.001 | <0.001 |

### Secondary model — all messaging ads, n = 187

```
R² = 0.398        adj R² = 0.384
F  = 30.036       p = 3.44e-19      df = 4, 182
Jarque-Bera:      JB = 193.144      p ≈ 1.15e-42
```

| Predictor | coef | SE (OLS) | SE (HC3) | p (OLS) | p (HC3) |
|---|---|---|---|---|---|
| engagement_rate | **+0.6060** | 0.2680 | 0.4022 | 0.0249 | 0.1318 |
| frequency | −0.3562 | 0.1037 | 0.1351 | 0.0007 | 0.0084 |
| ctr | −28.6733 | 5.0020 | 6.5690 | <0.001 | <0.001 |
| cpm | +0.0080 | 0.0009 | 0.0010 | <0.001 | <0.001 |

### Cross-validation — 10-fold, seed 42, n = 108

| | In-sample | 10-fold CV | Baseline (predict median) |
|---|---|---|---|
| R² | 0.548 | 0.397 | — |
| MAE | ₱3.93 | ₱4.15 | ₱5.83 |
| RMSE | ₱6.20 | ₱6.55 | ₱8.77 |
| MAPE | 18.2% | 19.1% | 26.9% |

> CV numbers depend on the shuffle. If your fold assignment differs from a Python `KFold(shuffle=True, random_state=42)`, expect CV R² around 0.39–0.41 and MAPE around 19–20% rather than an exact match. The **direction and magnitude** must hold: modest shrinkage from in-sample, and a clear margin over the median baseline.

---

## 8. Changes to the original spec

- **§3.3** — Shapiro-Wilk replaced by Jarque-Bera. Everything else in §3 unchanged, including the intercept-in-the-design-matrix warning for VIF.
- **§8** — "library is fine" is withdrawn. Build TS-native per this document.
- Everything else in `FR31_Regression_Specification.md` stands: population, variables, the no-slider rule, the residual diagnostic, the display order, the language table, and the n < 30 guard.
