# Analysis screen: restructure, plus five things that are wrong

**Date:** 3 September 2026
**Re:** Owner account, Analysis
**Status:** one structural change, five errors, one number to correct in the specification

---

## 0. ⚠ Standing rules, restated

These govern every screen and every review memo.

### 0.1 No em dashes in interface copy

Use commas, full stops, or parentheses. This screen carries them in almost every caption, in the section headers, and throughout the expandable methodology block.

### 0.2 Plain language over statistical notation

Nothing an account holder reads should contain shorthand they have to decode. This screen currently uses r, p, n, W, LM, JB, R-squared, VIF, MAE, RMSE, MAPE, HC3, and OLS at the top level. See §2, which is the main item in this memo.

---

## 1. Nothing here should be removed

Raven's first reaction was that some of this belongs in the manuscript rather than on screen. Recording why that is not the fix, so the question is settled.

**FR-11 requires the system to report** the number of observations, R-squared and its adjusted value, variance inflation factors, stated tests of heteroscedasticity and residual normality, coefficients with both ordinary and heteroscedasticity-consistent standard errors, and cross-validated error against a baseline.

So the diagnostics cannot move to the manuscript. They are a system requirement and they must be visible on the screen.

Every block on this page also serves a stated objective or requirement: the ranking comparison and views-versus-reach are objective 4, distribution by category is objective 3, the correlation panel is FR-10, month-of-life and the frequency diagnostic are FR-16, the regression and diagnostics are objective 5 and FR-11, and the residual diagnostic is FR-12.

**The problem is prominence, not presence.**

---

## 2. ⚠ Invert the screen: findings first, statistics behind the disclosure

FR-18 requires a plain-language statement of what each result indicates. This screen currently leads with notation and buries the meaning, which is the wrong way round for a screen the business owner opens.

The "See the numbers behind this" disclosure already exists and is the right pattern. It needs to hold far more, and the top level needs to hold far less.

### 2.1 What the top level should read like

**Ranking comparison**

> The posts that get the most views are mostly not the posts that earn the most engagement. Of the 73 posts in the top tenth by views, only 5 also appear in the top tenth by engagement rate.

**Views versus reach**

> View count rises almost exactly in step with how many people a post reached. It measures audience size more than it measures how well a post performed.

**Distribution by category**

> Of the 215 posts categorised so far, Entertainment posts have the highest median engagement rate at 0.98 per cent and Testimonial posts the lowest at 0.52 per cent. 516 posts are not yet categorised, so these comparisons may change.

**Correlation with method selection**

> Advertisements with higher engagement rates tend to cost slightly less per inquiry, though the relationship is weak. Both figures were tested for normal distribution first, and neither is normally distributed, so a rank-based method was used.

**Month-of-life**

> Advertisements do not get more expensive as they run. Among advertisements that ran three months or more, cost per inquiry fell from ₱15.66 in the first month to ₱13.64 in the third.

**Frequency diagnostic**

> Showing the same person an advertisement more often is not associated with a higher cost per inquiry at this account's frequency levels. See §4 for the sentence that must be removed here.

**Regression**

> Cost per mille and click-through rate are consistently associated with cost per inquiry across both ways of selecting advertisements. Engagement rate and frequency change direction depending on which advertisements are included, so neither can be relied on.

**Accuracy**

> The model's estimates are about 29 per cent closer to the actual cost per inquiry than simply guessing the middle value for every advertisement.

**Residual diagnostic**

> Two advertisements cost more than 1.5 times what their own characteristics would suggest, spending ₱3,087 between them.

### 2.2 What goes behind the disclosure

Everything currently at the top level that contains notation. The coefficient table with both p-value columns, the variance inflation factors, Breusch-Pagan, Jarque-Bera, Shapiro-Wilk, the full accuracy table, the correlation coefficients with their p-values, and the sample counts.

Nothing is lost. The panel, the three IT professionals evaluating the system, and anyone checking the work can open it. Mr Olermo does not have to.

- [ ] Confirm this is workable, and roughly how long

---

## 3. ⚠ "Unclassified" and "Unclear" are not categories

The Distribution by Category table lists six rows: Unclassified 516, Product Showcase 112, Testimonial 57, Entertainment 23, Promotional Offer 13, Unclear 10.

**Unclassified is the absence of a category**, and at 516 posts it is by far the largest row in a table about categories. Unclear is the reviewed-and-undeterminable bucket, which is a third thing again.

The headline sentence correctly excludes both from its claim, which is right, but the table presents all six as though they were comparable.

- [ ] Move Unclassified and Unclear below a divider, or into a separate line beneath the table
- [ ] Label them for what they are: "not yet categorised" and "reviewed, no category applies"

### 3.1 The category findings are provisional and the screen states them as settled

516 of 731 posts are uncategorised. The 215 that are labelled are dominated by the 200-post reference sample, which was drawn on a fixed random seed rather than being representative of anything.

So "Entertainment has the highest median engagement rate" rests on 23 posts and will very likely change once the remaining 516 are coded.

- [ ] Add a line stating that most posts are not yet categorised and these comparisons are provisional

This resolves itself once the coding backlog lands. Until then the screen should say so.

---

## 4. ⚠ The frequency diagnostic gives advice, and must not

Current text:

> "Weak negative relationship (r = -0.241, n = 482), statistically significant (p < 0.001). No ad fatigue is detectable at this account's frequency levels, retiring ads early is more likely costing inquiries than saving them."

The second sentence is a **causal recommendation drawn from an observational correlation**, and the data behind it is confounded: advertisements that ran longer were kept running because they were working, so of course they show lower cost per inquiry.

It also breaks the language rules set out for this feature, which prohibit "predicts", "will cost", and any phrasing implying a lever the data cannot support.

- [ ] **Delete the second sentence entirely**
- [ ] Replace with something descriptive: "Cost per inquiry does not rise as frequency rises at this account's levels."

The first half of the finding is real and worth reporting. The advice is not.

The caveat about each advertisement contributing multiple rows, so the significance is indicative rather than a formal test, is correct and should stay exactly as written.

---

## 5. ⚠ Month 3 of the two-month cohort breaks the fixed-cohort guarantee

The table shows:

| Month of life | Advertisements | CPI |
|---|---|---|
| Month 0 | 123 | ₱15.66 |
| Month 1 | 123 | ₱15.37 |
| Month 2 | 123 | ₱13.64 |
| **Month 3** | **59** | **₱13.10** |

The whole point of a cohort curve is that every point is computed from the same advertisements, so that a change in cost per inquiry is a real change rather than a change in who is being measured.

At month 3 the population drops from 123 to 59. Those 59 are the advertisements that survived longest, which is to say the ones that were working. So the fall from ₱13.64 to ₱13.10 is exactly the survivorship artefact the cohort design exists to remove.

- [ ] **End each cohort's curve at the last month where every member of the cohort has an observation**

For the two-month cohort that is month 2. For the three-month cohort it is whatever the equivalent point is. If you would rather keep the later points, mark them clearly as computed on a reduced population, but truncating is cleaner and it is what makes the curve mean what it claims.

### 5.1 The cohort labels are ambiguous

"Ads surviving ≥2 months" shows three months of data, months 0 through 2. So the threshold is a month index rather than a count of calendar months.

- [ ] Reword to state calendar months, for example "Advertisements that ran for three months or more"

We need this settled because Definition of Terms will carry the cohort survival threshold as a defined term, and it should say the same thing the screen says.

---

## 6. ⚠ The residual diagnostic runs far too long and its header contradicts its content

The section is titled **"Ads costing more than their characteristics suggest."** The table then lists every advertisement in the model sorted by ratio, running down past 1.00× to 0.51×, which is advertisements costing half what their characteristics suggest. The caption states that only two exceed the 1.5 threshold.

So the header describes two rows and the table shows a hundred and eight. It also occupies roughly two full screens of scrolling for an output whose entire operational value is a two-row list.

**The fix:**

- [ ] **Show only the advertisements that exceed the threshold**, which is currently two
- [ ] Keep the caption stating how many exceeded it and their combined spend, which is already there and is exactly right
- [ ] Put the full sorted list behind a "Show all advertisements" toggle, collapsed by default

That preserves the full distribution for anyone who wants it while making the section report what its title claims.

If FR-12's low-side threshold at 0.667 is ever built, the same section can show both ends, still short, with everything between them collapsed.

- [ ] Also confirm the header wording once the content matches it, for example "Advertisements costing more than their characteristics suggest (2 of 108)"

---

## 7. ⚠ The methodology block cites the wrong requirement numbers

The expandable text references **FR-19, FR-20, FR-21, FR-27, FR-31, ALG-08, and ALG-09.**

Those are the internal code numbering scheme. The manuscript uses a different one, where the same requirements are FR-09, FR-17, FR-10, FR-16, and FR-11.

If a panelist reads that block and then opens Table 3, none of the numbers correspond.

- [ ] **Remove the requirement identifiers from user-facing text entirely**

The block should describe what each method does without naming an identifier from either scheme. The identifiers belong in the traceability matrix, not in something the client reads.

### 7.1 The block also needs breaking up

It is currently a single unbroken paragraph of roughly 400 words covering seven different analyses. Once §2 lands and the statistics move behind the disclosure, this text should sit beside the analysis it describes rather than in one block at the bottom.

---

## 8. One number to correct, and it is in the specification rather than the screen

The screen states that reach and spend are excluded because they correlate at **r = 0.958** on the log scale. `FR31_Regression_Specification.md` §2 states **r = 0.984**.

Computed from the client's exports, both are correct for different populations:

| Population | Log-scale r(reach, spend) |
|---|---|
| n = 108, the primary specification | **0.9580** |
| n = 187, the secondary specification | 0.9836 |

**The screen is right.** The specification document is citing the n = 187 figure as the rationale for an exclusion made in the n = 108 model.

- [ ] Correct `FR31_Regression_Specification.md` §2 to 0.958, noting the n = 187 figure separately if useful

This matters because that number goes into Chapter 3 as the stated reason for the exclusion, and it should be the one belonging to the model it justifies.

---

## 9. Numbers that differ from the specification, and which we will use

Not errors. Recording which figures Chapter 4 will report.

| Figure | Specification (Python reference) | Screen (live system) |
|---|---|---|
| Cross-validated R-squared | 0.397 | **0.380** |
| Cross-validated MAPE | 19.1% | **19.3%** |
| Cross-validated MAE | ₱4.15 | **₱4.19** |
| Breusch-Pagan LM | 9.2866 | **9.2888** |
| Jarque-Bera | 106.005 | **105.938** |

**Chapter 4 will report the screen figures**, since the system is what the study delivered and the Python figures were the acceptance test. The cross-validation differences follow from fold assignment, as you noted. The two diagnostic differences are small enough to be arithmetic ordering.

No action needed. Confirming so neither of us reconciles these again.

---

## 10. Working correctly

Recording these so they are not re-raised.

The Shapiro-Wilk panel showing both variables tested before the method was selected is exactly what FR-10 requires, and showing it rather than only the result is what makes the selection defensible.

The **NOT ROBUST** badges on engagement rate and frequency, with the note explaining that sign or significance changes between specifications, is the single most defensible element on this screen.

The frequency diagnostic's caveat that each advertisement contributes multiple rows, so significance is indicative rather than formal, is correct and precisely worded.

"This is an explanatory model, not a predictor or forecast" in the specification block is right and should stay.

"1 post with a blank Views value was excluded, not counted as 0 views" is the kind of precision that answers a question before it is asked.

---

## 11. Priority

1. **§4**, delete the advice sentence. One line, and it is the only place on the system making a causal claim.
2. **§6**, the residual table length and header. Large visible improvement for small effort.
3. **§5**, truncate the cohort curves. Methodological, and it affects a Chapter 4 figure.
4. **§3**, the non-categories and the provisional note.
5. **§7**, remove the requirement identifiers.
6. **§2**, the restructure. Largest item, and the one that most changes how this screen reads.
7. **§0.1**, the em dash sweep, alongside the same pass on the other screens.

§4 first. Everything else can follow.
