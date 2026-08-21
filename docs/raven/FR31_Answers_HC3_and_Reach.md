# FR-31 — answers to your two questions

**Date:** 18 August 2026
**Short version:** (1) normal, you're right, and it'll be stated in Ch. 3. (2) SUM produced the reference table, and after testing MAX I'm keeping SUM — but your codebase note is correct and the reason it doesn't apply here is specific. Details below.

---

## 1. HC3 p-values use the standard normal, not t

Confirmed. Your back-computation is exactly right — `statsmodels` fits HC3 with `use_t=False` by default, so the ratio `coef/SE_HC3` is referred to the standard normal, not t(103). That's why you got 0.0570 / 0.0671 / 0.0339 from the normal and a mismatch from t.

This is standard practice: HC3 is an asymptotic (sandwich) estimator, so its inference is asymptotic too. Referring a robust ratio to a t distribution mixes a finite-sample reference with an asymptotic variance estimate.

**So the rule for the implementation:**

| Statistic | Reference distribution |
|---|---|
| OLS coefficient p-values | **t**, df = n − k − 1 (df = 103 for n=108) |
| HC3 coefficient p-values | **standard normal** |
| Overall model F-test | **F**, df = (4, 103) |

You still need the regularised incomplete beta for the OLS t p-values and the F p-value — that requirement doesn't change. The normal CDF you already have in the repo covers the HC3 column.

You're right that this was implicit and undocumented. Chapter 3 will state it:

> Coefficient significance under ordinary least squares is referred to the t distribution with n − k − 1 degrees of freedom. Heteroscedasticity-consistent (HC3) standard errors are asymptotic, so significance under HC3 is referred to the standard normal distribution.

Good catch — a panelist recomputing `ctr` by hand from a t-table would otherwise get 0.0362 and think we'd made an error.

---

## 2. Reach: the reference table used SUM. Keep SUM. Here's why the codebase note doesn't apply here.

### First, confirming: yes, SUM

Every number in the FR-31 spec was produced with `SUM(Reach)` across months. So the spec and the reference table are consistent — no discrepancy to reconcile there.

### Your codebase note is correct as a general statement

Reach is deduplicated **within** a reporting period. Summing monthly reach across an ad's life double-counts anyone reached in more than one month. That's a real property of the metric and whoever wrote that note was right.

**It matters here:** 139 of the 187 messaging ads span more than one month.

### But MAX isn't the fix, and I tested it

MAX has the opposite bias. It takes the largest single month and discards everyone reached *only* in the other months. For an ad running four months at similar scale each month, MAX understates true unique reach roughly as badly as SUM overstates it.

**Neither recovers true lifetime unique reach.** That figure simply isn't in a monthly export — Meta doesn't publish cross-period deduplicated reach, and it can't be derived from monthly rows.

Here's what MAX does to the model:

| | SUM (spec) | MAX |
|---|---|---|
| R² | **0.548** | 0.476 |
| adj R² | **0.530** | 0.455 |
| engagement_rate | −0.6511, p=0.0037 | −0.1408, **p=0.1884** |
| frequency | −0.2084, p=0.0087 | −0.0175, **p=0.5269** |
| ctr | −9.6285, p=0.0473 | −13.5530, p=0.0098 |
| cpm | +0.0086, p<0.001 | +0.0086, p<0.001 |
| median frequency | **1.72** | 3.24 |
| median engagement rate | **0.427** | 0.754 |
| Breusch-Pagan p | **0.0543** (passes) | 0.0444 (**fails**) |

### The decisive evidence is the frequency plausibility check

`frequency = impressions / reach` has a known real-world range. I checked what Meta itself reports at the monthly level, where reach is unambiguously deduplicated:

- The export's own `Frequency` column matches `Impressions / Reach` **exactly** at monthly level (max abs diff = 0.000000). So the monthly figures are internally consistent.
- **Median monthly frequency as Meta reports it: 1.55**
- The 48 single-month ads — where SUM and MAX are identical, so the choice can't distort them — have a frequency of **1.96**

Now compare the two aggregations on the full sample:

- **SUM → median frequency 1.72.** Consistent with Meta's own monthly figure and with the single-month ads.
- **MAX → median frequency 3.24.** Roughly double what Meta reports, and double what the unaffected single-month ads show.

MAX also pushes median engagement rate to 0.754 — meaning 75% of reached people engaged, which isn't a credible figure for a hardware retailer's ads.

**MAX doesn't correct a bias; it introduces a larger one in the other direction.** SUM's overstatement of reach is real but modest here, and it lands the derived ratios in the range Meta's own reporting produces.

### One more consideration: SUM keeps the ratios internally consistent

`impressions`, `post engagements`, `link clicks` and `spend` are all genuinely additive across months. Pairing an additive numerator with a MAX'd denominator produces a ratio that isn't a rate of anything — impressions accumulated over 4 months divided by the reach of the single largest month. SUM/SUM at least has a coherent interpretation: total impressions per reach-event, where a person reached in two months counts twice on both sides.

### Decision

**Implement SUM per the spec.** Every reference number stands.

Chapter 3 will document the choice and its bias honestly:

> Reach is deduplicated within a reporting period but not across periods, so summing monthly reach for advertisements spanning multiple months overstates the number of distinct people reached. The alternative of taking the maximum monthly value understates it by discarding persons reached only in other periods, and neither recovers true lifetime unique reach, which the monthly export does not report. Summation was adopted because it preserves consistency with the additive numerators and yields a median frequency of 1.72, consistent with the 1.55 median reported by the platform at monthly level and the 1.96 observed among advertisements that ran in a single period only. Ratios involving reach are therefore period-aggregated rather than person-deduplicated, and are interpreted as such.

That paragraph turns a potential objection into a documented methodological decision. If a panelist raises it, the answer is that both options were computed and the choice was made on a plausibility check against the platform's own reported values.

---

## 3. Nothing else changes

- All acceptance numbers in `FR31_Regression_Specification.md` §7 and the amendment §7 remain valid.
- The `≥₱1,000` filter, the four predictors, the log-transformed outcome, the no-slider rule, the residual diagnostic, and the display order are all unchanged.
- Add the HC3-uses-normal rule from §1 above to your p-value routine.

Both questions were worth asking before writing code — the second one especially, since it would have silently changed every derived ratio. Go ahead.
