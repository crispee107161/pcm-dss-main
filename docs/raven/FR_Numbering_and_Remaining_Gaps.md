# Numbering settled, plus what to fix before the FR table closes

**Date:** 25 August 2026
**Re:** `FR_Table_Clarifications_Response_2026-08-25.md`
**Status:** §0 answered, four real gaps, three requirement-versus-build disagreements, one new question

---

## 0. §2.5 is the find of the document

You could have answered "yes, Analysis is on all three sidebars" and stopped. Instead you read the component, established that Manager and Team render an identical `AnalysisView` with no role branching at all, and stated plainly that this contradicts the reasoning in my own memo.

That is a gap I asked about in the abstract and you turned into a specific fact with a specific fix. Same for the residual diagnostic being one-directional, which I would not have caught from the outside.

---

## 1. §0: the manuscript numbering is authoritative, and here is how to close it cheaply

**Decision: the manuscript's FR-01 to FR-20 scheme is the published one.** It is what the panel reads, what Chapter 3 prints, and what defence questions will cite. `mvp.md` is an internal development document and does not appear in the deliverable.

**But do not renumber the code.** The `// FR-21`, `// FR-31` comments are how you navigate your own codebase, and rewriting them is churn with a real chance of introducing errors for no benefit to the manuscript.

What I want instead:

- [ ] **A mapping column in the matrix.** Manuscript number, code number, screen. Three columns, and both schemes stay usable.
- [ ] **A header line at the top of `mvp.md`** stating that its numbering is internal and pointing to Chapter 3's table as the published scheme. One sentence, prevents this recurring.

Most of it already maps, from what your response establishes:

| Manuscript | Code | Subject |
|---|---|---|
| FR-08 | FR-15 | Categorisation method evaluation |
| FR-09 | FR-19 | Promotion criterion analysis |
| FR-10 | FR-21 | Correlation with method selection |
| FR-11 and FR-12 | FR-31 | Regression and residual diagnostic |
| FR-15 | FR-25 and FR-26 | Efficiency ranking and quartile comparison |
| FR-16 | FR-27 | Advertisement lifecycle |
| FR-17 | FR-20 | Content comparison, category half |

Confirm or correct those seven and the matrix is unblocked.

### 1.1 One thing to send with it

The manuscript has 20 requirements. Your code numbers reach at least 31.

- [ ] **The full list of `mvp.md` FR numbers with their one-line names.** Just the list, not the matrix.

Any code requirement with no manuscript counterpart is either something the manuscript should require, or a feature to remove. That is the feature-sprawl question the panel already raised once, and the list answers it in five minutes rather than a full matrix pass.

---

## 2. Four gaps to fix

### 2.1 Gate the regression away from Marketing Team

Per your §2.5. Recommendation, slightly softer than my earlier anchor table:

| Section | Owner | Manager | Team |
|---|---|---|---|
| FR-19 ranking comparison (my FR-09) | Yes | Yes | **Yes** |
| FR-20 category distribution (my FR-17) | Yes | Yes | **Yes** |
| FR-21 correlation (my FR-10) | Yes | Yes | **No** |
| FR-31 regression (my FR-11/12) | Yes | Yes | **No** |
| FR-27 lifecycle (my FR-16) | Yes | No | No |

Team keeps the two organic-content sections. Condition five in Chapter 1 argues *for* the content team seeing content findings, so removing those would be the wrong fix.

Team loses the two advertising-efficiency sections. Nothing authorises their access and FR-01 requires module access restricted by role.

I have kept Manager access to FR-21 and FR-31 rather than making them Owner-only. The manager decides which posts get promoted into paid campaigns, so what makes an advertisement efficient is legitimately her business. Owner-only is also defensible, but this is the smaller change and the easier one to justify in Chapter 3.

- [ ] Gate FR-21's correlation section and `RegressionSection` behind role inside `AnalysisView`, per the shape you described

### 2.2 Build the low side of the residual diagnostic

Confirmed one-directional at `ratio > 1.5`. The low side needs the symmetric cutoff.

- [ ] **Use 1/1.5, so 0.667.** Symmetric, needs no separate justification, and the two thresholds read as one rule rather than two arbitrary numbers.
- [ ] Surface both sets, labelled by direction

Advertisements performing better than their characteristics predict are the ones the business should learn from, and Chapter 1's second condition is explicitly about distinguishing efficient from inefficient advertisements. Reporting only the expensive half answers half the question.

### 2.3 Build the views-versus-reach correlation

ρ = 0.954 on the twelve-month organic set. Not in `lib/stats/` anywhere, per your grep.

This is the mechanism behind the whole of objective 4. The Spearman result says view count and engagement rate rank posts differently. The reach correlation says *why*: view count is very nearly a restatement of how many people the post reached, so it is an audience-size measure wearing a performance label. Without it the finding is a negative correlation with no explanation.

- [ ] Add it to the ranking comparison section on Analysis, alongside the existing Spearman and overlap figures
- [ ] Keep it clearly distinct from FR-31's reach-versus-spend collinearity check (r = 0.984), which is a different pair used for a different purpose

### 2.4 Write a requirement for Top Ads, or fold it

It currently maps to nothing. It carries CTR and cost-per-click panels that appear in no requirement in either scheme.

I would **write one** rather than fold it. The volume panels are genuinely useful and merging into Rankings would mean dropping them, which your own code comment already flags. Draft:

> **FR-15a Advertisement-level performance ranking.** The system shall rank individual advertisements by expenditure, inquiries generated, and reach, and by cost per inquiry, click-through rate, and cost per click, over a user-selected date range.

- [ ] Confirm that describes what the six panels actually do, and correct it if not

That also answers the open question in your owner-layout comment about merging Rankings and Top Ads: **do not merge.** Two requirements, two screens, different grouping levels.

---

## 3. Three places where my requirement text and your build disagree

Settling these matters because Chapter 3 currently describes a system that does something slightly different.

### 3.1 FR-10 population: align to ₱1,000

My wording says FR-10 applies the same minimum expenditure threshold used elsewhere. Your build runs it unfiltered at **n = 187**, while FR-31 runs at **n = 108**.

Two analyses of cost per inquiry on two different populations is hard to defend, and the reason FR-31 filters applies equally here. A CPI computed from an advertisement with ₱200 of spend and two inquiries is noise, and noise in a correlation is not less harmful than noise in a regression.

- [ ] **Apply `MIN_SPEND_THRESHOLD_PHP` to FR-21 as well**, so all cost-per-inquiry analyses run on the same n = 108
- [ ] Optionally report the n = 187 result underneath as a robustness note. If the coefficient holds at both, that is a stronger finding than either alone. Only if it is cheap.

### 3.2 FR-12 metric: change the requirement, not the code

My wording says "more than a stated number of standard deviations." Your build uses the ratio of actual to predicted CPI.

**The build is better.** "This advertisement cost 50 per cent more than its characteristics predict" is something the owner can act on. "This advertisement has a standardised residual of 2.1" is not. I am revising the requirement to match:

> **FR-12 Residual diagnostic.** The system shall identify advertisements whose recorded cost per inquiry differs from the level associated with their characteristics under the estimated model by more than a stated proportion in either direction, applying the same minimum expenditure threshold used elsewhere in the analysis, and shall report the magnitude and direction of the difference for each advertisement identified.

Chapter 3 will state the thresholds as 1.5 and 0.667 explicitly.

### 3.3 FR-09 overlap cuts: align the requirement to the build

My wording says decile and quartile. You compute top 10 per cent and top 20 per cent, both rendered.

- [ ] No code change. I am changing the requirement to say the highest ten per cent and the highest twenty per cent.

---

## 4. One new question

Code FR-20 is a category distribution section on Analysis, showing median views and engagement rate per category, visible to all three roles.

Category Performance is a separate owner-only screen.

- [ ] **What does Category Performance show that the Analysis category section does not?**

This changes the §2.1 answer. If Category Performance is a richer version of the same content, then condition five is already partly satisfied by the Analysis section every role can see, and the right fix may be merging the two rather than duplicating access to both. If it is genuinely different, the access change stands as I proposed: add it to Manager and Team navigation, reusing the existing route with a role check rather than building a second screen.

I would rather answer this before deciding, so hold the Category Performance nav change until you have replied.

---

## 5. Things I am closing, so they stop consuming your time

Confirmed and no further action:

- **Budget Reallocation** reports figures only, with an on-screen caption stating it is not a forecast. Maps to the quartile clause of my FR-15. No requirement gap, no recommendation engine, nothing to justify.
- **Rankings and Top Ads** are genuinely different, grouped versus individual. Not redundant. See §2.4 for the requirement.
- **Content write paths** are Manager-only server-side across all three Server Actions, including the bulk and batch paths. Exactly what I hoped for and better than a UI-only guard.
- **The ₱1,000 threshold** is one shared constant, imported rather than duplicated. Confirmed not drifted.
- **The Pearson/Spearman branch short-circuits**, so both are never computed and compared. That is precisely the cherry-picking protection the requirement was written to guarantee. Chapter 3 will state the rule as Shapiro-Wilk on both variables at α = 0.05, Pearson if both pass, Spearman otherwise.
- **Sidebar corrections accepted:** Keyword Lexicon is not on the Owner nav, Generate Report is visible to Marketing Team.
- **`Note 2.txt` resolution confirmed:** put "no caption text" back, that note is the current instruction.

---

## 6. Parameter values, recorded for Chapter 3

Thank you for pulling these. Recording them here so we are working from one list.

| Parameter | Value |
|---|---|
| Minimum expenditure threshold | ₱1,000, shared constant, n = 108 |
| FR-09 overlap cuts | Top 10 per cent and top 20 per cent |
| FR-09 null-Views handling | 1 post excluded explicitly, not treated as zero |
| FR-10 normality test | Shapiro-Wilk, both variables, α = 0.05 |
| FR-10 population | Currently n = 187, to become n = 108 per §3.1 |
| FR-11 predictors | `engagement_rate`, `frequency`, `ctr`, `cpm` |
| FR-11 exclusions | Reach and spend, r = 0.984 collinearity, computed live |
| FR-11 heteroscedasticity test | Breusch-Pagan |
| FR-11 residual normality test | Jarque-Bera |
| FR-11 cross-validation | 10-fold, seed 42, median-CPI baseline |
| FR-12 threshold | Ratio 1.5, to become 1.5 and 0.667 per §2.2 |
| FR-07 caption length | 8 words, NFKC-normalised, fires on 65 of 730 in-period posts |

The four-predictor list with reach and spend excluded on a live-computed collinearity check is a good answer to the question a panelist would ask, and I will present it that way.

---

## 7. Order

1. **Confirm the seven mappings in §1** and send the `mvp.md` FR list. Unblocks the matrix.
2. **Answer §4** (Category Performance versus the Analysis category section).
3. **Gate the regression** (§2.1). Small, and it is a live access-control gap.
4. **Then the full matrix**, once the numbering is settled so it is not done twice.
5. §2.2, §2.3, §2.4, §3.1 as capacity allows.
6. §7's page-views audit whenever. Lowest priority of anything outstanding.

Items 1 and 2 are both answers rather than builds, and between them they unblock everything else.
