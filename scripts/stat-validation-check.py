"""
Independent cross-check of the six hand-written statistical procedures
(Spearman, Pearson, OLS, Shapiro-Wilk, Breusch-Pagan, Jarque-Bera) against
scipy/statsmodels, on the exact same numbers the TypeScript app computed on.

Reads scripts/output/stat-validation/*.csv + ts-outputs.json (produced by
scripts/stat-validation-dump.ts) and prints a comparison table.

Run: python scripts/stat-validation-check.py
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.api as sm
from scipy import stats

OUT = Path(__file__).parent / "output" / "stat-validation"

with open(OUT / "ts-outputs.json") as f:
    ts = json.load(f)

results = []


def check(name: str, ts_val: float, py_val: float, tol: float = 1e-4) -> None:
    diff = abs(ts_val - py_val)
    ok = diff <= tol or (ts_val != 0 and diff / abs(ts_val) <= tol)
    results.append((name, ts_val, py_val, diff, "OK" if ok else "MISMATCH"))


# ── 1. Spearman: views vs. engagement_rate, n=730 ──────────────────────────
rank_df = pd.read_csv(OUT / "ranking-comparison.csv")
rho, p = stats.spearmanr(rank_df["views"], rank_df["engagement_rate"])
check("ranking.rho (Spearman)", ts["ranking"]["rho"], rho)
check("ranking.p", ts["ranking"]["p"], p, tol=1e-3)

# ── 2. FR-21 correlation-with-method-selection: Shapiro-Wilk x2, then
#      Pearson or Spearman depending on both passing normality, n=187 ──────
corr_df = pd.read_csv(OUT / "correlation-selection.csv")
sw_x = stats.shapiro(corr_df["engagement_rate"])
sw_y = stats.shapiro(corr_df["cost_per_inquiry"])
check("correlation.shapiroX.W", ts["correlation"]["shapiroX"]["W"], sw_x.statistic)
check("correlation.shapiroX.p", ts["correlation"]["shapiroX"]["p"], sw_x.pvalue, tol=1e-3)
check("correlation.shapiroY.W", ts["correlation"]["shapiroY"]["W"], sw_y.statistic)
check("correlation.shapiroY.p", ts["correlation"]["shapiroY"]["p"], sw_y.pvalue, tol=1e-3)

method = ts["correlation"]["method"]
if method == "SPEARMAN":
    coef, p_corr = stats.spearmanr(corr_df["engagement_rate"], corr_df["cost_per_inquiry"])
else:
    coef, p_corr = stats.pearsonr(corr_df["engagement_rate"], corr_df["cost_per_inquiry"])
check(f"correlation.coefficient ({method})", ts["correlation"]["coefficient"], coef)
check("correlation.p", ts["correlation"]["p"], p_corr, tol=1e-3)

# ── 3. FR-31 OLS regression + diagnostics, n=108 ───────────────────────────
fr31_df = pd.read_csv(OUT / "fr31-regression.csv")
X = sm.add_constant(fr31_df[["engagement_rate", "frequency", "ctr", "cpm"]])
y = fr31_df["ln_cpi"]

ols_model = sm.OLS(y, X).fit()
ols_hc3 = sm.OLS(y, X).fit(cov_type="HC3")

check("fr31.rSquared", ts["fr31"]["rSquared"], ols_model.rsquared)
check("fr31.adjRSquared", ts["fr31"]["adjRSquared"], ols_model.rsquared_adj)
check("fr31.fStatistic", ts["fr31"]["fStatistic"], ols_model.fvalue)
check("fr31.fPValue", ts["fr31"]["fPValue"], ols_model.f_pvalue, tol=1e-3)

term_order = ["intercept", "engagement_rate", "frequency", "ctr", "cpm"]
for i, term in enumerate(term_order):
    ts_row = next(c for c in ts["fr31"]["coefficients"] if c["term"] == term)
    check(f"fr31.coef[{term}]", ts_row["coefficient"], ols_model.params.iloc[i])
    check(f"fr31.seOls[{term}]", ts_row["seOls"], ols_model.bse.iloc[i])
    check(f"fr31.seHc3[{term}]", ts_row["seHc3"], ols_hc3.bse.iloc[i])
    check(f"fr31.pOls[{term}]", ts_row["pOls"], ols_model.pvalues.iloc[i], tol=1e-3)

# Breusch-Pagan (Koenker's studentized variant, matches het_breuschpagan's default)
bp_lm, bp_p, bp_f, bp_fp = sm.stats.diagnostic.het_breuschpagan(ols_model.resid, X)
check("fr31.breuschPagan.lm", ts["fr31"]["breuschPagan"]["lm"], bp_lm)
check("fr31.breuschPagan.pValue", ts["fr31"]["breuschPagan"]["pValue"], bp_p, tol=1e-3)

# Jarque-Bera (population/biased moments, scipy's default)
jb, jb_p, skew, kurt = sm.stats.stattools.jarque_bera(ols_model.resid)
check("fr31.jarqueBera.jb", ts["fr31"]["jarqueBera"]["jb"], jb)
check("fr31.jarqueBera.pValue", ts["fr31"]["jarqueBera"]["pValue"], jb_p, tol=1e-3)
check("fr31.jarqueBera.skewness", ts["fr31"]["jarqueBera"]["skewness"], skew)
# statsmodels.stats.stattools.jarque_bera returns raw kurtosis (normal == 3),
# the TS side reports EXCESS kurtosis (normal == 0) — same JB statistic
# either way (checked above), so subtract 3 before comparing labels.
check("fr31.jarqueBera.excessKurtosis", ts["fr31"]["jarqueBera"]["excessKurtosis"], kurt - 3)

# Shapiro-Wilk on OLS residuals (corroborating normality check)
sw_resid = stats.shapiro(ols_model.resid)
check("fr31.shapiroWilk.W", ts["fr31"]["shapiroWilk"]["w"], sw_resid.statistic)
check("fr31.shapiroWilk.p", ts["fr31"]["shapiroWilk"]["p"], sw_resid.pvalue, tol=1e-3)

# ── Report ───────────────────────────────────────────────────────────────
print(f"{'metric':<32} {'ts':>16} {'scipy/statsmodels':>20} {'abs diff':>12}  status")
print("-" * 92)
n_mismatch = 0
for name, ts_val, py_val, diff, status in results:
    if status == "MISMATCH":
        n_mismatch += 1
    print(f"{name:<32} {ts_val:>16.6g} {py_val:>20.6g} {diff:>12.2e}  {status}")

print()
print(f"{len(results) - n_mismatch}/{len(results)} checks matched within tolerance.")
if n_mismatch:
    print(f"{n_mismatch} MISMATCH(es) — see above.")
