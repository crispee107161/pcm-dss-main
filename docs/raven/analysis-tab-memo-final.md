# Memo: Analysis tab, owner account

**Date:** 5 September 2026
**Screen:** Analytics → Analysis, owner role
**Verified against:** the twelve monthly advertising exports (746 ad-month rows, 93 columns) and the twelve monthly organic post exports, recomputed independently from the raw files
**Status:** four requirement gaps, six fixes, one number that does not reproduce, five questions

---

## 0. Standing rules

### 0.1 No em dashes in sentences or captions
Use commas, full stops, or parentheses. This does not apply to the dash used as a null-value placeholder in table cells, which is a typographic convention rather than prose.

### 0.2 Plain language over statistical notation
Nothing an account holder reads should contain shorthand they have to decode. No `n=`, `IQR`, `Q1`, `p`, `r`, `R²`, `VIF`, `MAE`, or Greek letters at the top level of any screen. "14 posts" rather than "n=14". Statistical detail belongs behind the "See the numbers behind this" disclosure.

### 0.3 Never reference the study or the research in interface copy
The client has a system, not a research project. No requirement identifiers (FR-06, ALG-09), no "ground truth", no "the study-wide analysis", no "reference sample". Where a design decision is methodological, the screen states the operational consequence or says nothing.

---

## 1. What landed

This screen holds up better under independent recomputation than anything reviewed so far. Working only from the raw client exports, with no reference to the code:

**Regression, both specifications.** All five coefficients at the ₱1,000 threshold match to four decimal places (2.7346, −0.6511, −0.2084, −9.6285, +0.0086). Both p-value columns match, ordinary and robust. All four variance inflation figures match (1.354, 1.157, 1.291, 1.101). The unfiltered specification matches on every coefficient and both p-value columns. Shapiro-Wilk reproduces at 0.9375 against 0.9376. The stated log-scale correlation between reach and spend of 0.958 is exact.

**Accuracy panel.** In-sample average error ₱3.93, root mean square error ₱6.20, and percentage error 18.2 all match exactly. The baseline column reproduces only when the middle value is recomputed inside each fold rather than once across the whole sample. That is the correct way to build a baseline and a lot of implementations get it wrong, so it is worth saying that this one does not.

**Residual diagnostic.** Both advertisements reproduce exactly, including the expected costs of ₱16.33 and ₱14.86, the ratios of 3.32 and 2.05, and the combined ₱3,087.42. The next-highest ratio in the whole set is 1.46, so the 1.5 threshold genuinely separates two advertisements from a cluster rather than cutting an arbitrary line through one. Worth knowing if a panelist asks why 1.5.

**Frequency diagnostic.** 482 records, 187 advertisements, middle frequency 1.5451, coefficient −0.2411. All match.

**Month-of-life.** Every cohort size and all seven cost figures reproduce exactly, including the 123, 59, and 42 counts.

**Organic panels.** The ranking coefficient (−0.3274, shown as −0.328), both overlap counts (5 of 73 and 19 of 146), and the views-against-reach coefficient (0.9544, shown as 0.954) all reproduce.

Separately: the interface already carries several things that are easy to get wrong and are right here. The residual panel says it is not a prediction of future performance. The regression panel says it is explanatory rather than predictive. The month-of-life panel explains that cost is spend over results rather than an average of per-row costs. The organic panel discloses the excluded post. That is four places where the screen resists a misreading it could easily have invited.

---

## 2. Correct as displayed, do not change

Recording these so they are not corrected into being wrong.

**The organic panels showing 730 posts are correct.** The corpus holds 731 in-period posts. One, ID 1148717527278138 published 8 August 2025, has no recorded view count and is excluded from view-based comparisons. The panel footnote already says so.

Anyone checking against the client's twelve exports will compute 729, because those exports hold 730 posts. The 731st arrived in a July 2025 export that only the system holds. This was traced in late August and is settled. An earlier draft of this memo recommended relabeling 730 as 729. That recommendation was wrong and has been withdrawn.

**The category table summing to 731 is correct for the same reason** and is not inconsistent with the 730 above it.

- [ ] Optional: one line on the category panel noting that view-based panels exclude one post with no recorded view count, so the two figures differ by one by design

---

## 3. Findings

### 3.1 Breaks a requirement

---

**A. Two different definitions of cost per inquiry are live at the same time.**

The 187-advertisement middle cost of ₱21.50 reproduces only when months that spent money and returned no inquiries are included in each advertisement's totals. The regression coefficients reproduce only when those same months are excluded. Both cannot be right, and the screen does not say which rule any panel uses.

The months in question are 28 rows across 24 advertisements, all marked as not delivering, carrying ₱1,174 in total spend and zero results.

Recomputed both ways:

| Figure | Excluding those months | Including them |
|---|---|---|
| Middle cost, 187 advertisements | ₱21.39 | **₱21.50** (matches the system) |
| Regression, engagement rate coefficient | **−0.6511** (matches the system) | −0.6480 |
| Month-of-life cohort, three months or more | 111 advertisements | **123** (matches the system) |
| Advertisements running a single month | 48 | **42** (matches the system) |
| Middle cost, 108 advertisements | ₱18.09 | ₱18.09 (identical either way) |

So the rankings figure and the month-of-life panel include these months, and the regression, accuracy, and residual panels do not.

The consequence is small in size and awkward in principle. Four advertisements inside the 108 have their cost understated by between ₱0.25 and ₱0.73, the largest being "Jul 24, 2025 - R7 NEW PINK" at ₱20.46 where including the month gives ₱21.19. Rerunning the regression with those months included leaves the count at 108, moves the fit from 0.5478 to 0.5484, and moves the engagement rate coefficient from −0.6511 to −0.6480. Nothing material changes.

Including them is the better rule. An advertisement that spent and returned nothing is a real month, and dropping it quietly biases every cost figure downward through survivorship. The problem is only that two panels do it and three do not.

- [ ] Decide one rule and apply it to every panel on this screen
- [ ] State the rule in one plain sentence wherever cost per inquiry appears, for example "Months where an advertisement spent but produced no inquiries are counted"
- [ ] Confirm the same rule is applied on Rankings and Top Ads, which were closed before this came up

---

**B. FR-11: the heteroscedasticity test is not stated.**

FR-11 requires the system to report stated tests of heteroscedasticity and residual normality.

The panel reports "Breusch-Pagan (heteroscedasticity)" with 9.2888 at 0.0543 and a green "(homoscedastic)" tag. That figure is the **studentized (Koenker) variant**, which recomputes as 9.2866 at 0.0543. The **classic Breusch-Pagan on the same model gives 30.06 at below 0.001**, which rejects homoscedasticity outright.

Both are legitimate and the studentized one is the better choice here, precisely because the residuals are not normal. But naming only the family is what "stated" prohibits, and anyone running the default in SPSS or in Python's `het_breuschpagan` gets 30.06 and reaches the opposite conclusion with nothing on screen to reconcile it against.

There is a second issue in the same box. 0.0543 sits just above the threshold, and the green tag reads as a clean pass. It is a narrow one. It also sits oddly beside the next line, which says robust errors are reported anyway.

- [ ] Label the test as the studentized (Koenker) form
- [ ] Replace the "(homoscedastic)" tag with something that does not overstate a result at 0.0543, for example "no significant unevenness at the 0.05 level"
- [ ] Consider stating the robust-error justification as covering both non-normality and borderline unevenness, since that is what it actually covers

---

**C. FR-10: the frequency panel's correlation does not name its method.**

FR-10 as revised requires the coefficient, its significance, the number of records, and the method applied. Three of the four are present.

The reported −0.241 is a rank coefficient. The ordinary correlation on the same 482 records is −0.121, half the size. This is the one correlation on a screen subtitled "correlation with assumption-driven method selection" that does not say which method it used.

- [ ] Name the method, in the same form as the panel above it

---

**D. FR-18: seven of the nine panels state a finding without saying how many records it rests on.**

FR-18 requires each analytical result to carry the number of records it was computed from. Only the residual diagnostic does so at the top level, in "of 108 total". Everywhere else the count sits behind the disclosure, so a reader who never opens it sees an assertion with no sense of its weight. A plain-language count is not statistical notation, so it belongs above the fold rather than below it.

Suggested additions to each headline, in the screen's existing voice:

| Panel | Add |
|---|---|
| Ranking comparison | "across 730 posts" |
| Views and reach | "across 730 posts" |
| Distribution by category | "across 691 categorized posts" |
| Engagement and cost | "across 187 advertisements" |
| Month-of-life | already names its cohorts, add "of 187 advertisements" |
| Frequency | "across 187 advertisements" |
| Regression | "across 108 advertisements" |
| Accuracy | "across 108 advertisements" |

- [ ] Add a record count to each headline
- [ ] Generate each count from the same computation that produced the panel, not from a constant

---

**E. The frequency panel drops four records without saying so.**

There are 486 messaging records. The panel reports 482. The four missing ones have no reach, which makes frequency undefined, so dropping them is correct. But the organic panel discloses its single exclusion in a footnote and this one does not, which means the screen is inconsistent about when it tells the reader something was left out.

- [ ] Add a footnote in the same form as the organic one, for example "Four records with no reach were excluded, since frequency cannot be calculated for them"

---

### 3.2 Would look bad in the demonstration

---

**F. The regression headline says something the table below it disproves.**

Current: *"CTR and CPM are consistently associated with cost per inquiry across both ways of selecting advertisements. Engagement Rate and Frequency change direction depending on which advertisements are included, so none of them can be relied on."*

Engagement rate does change direction, from −0.6510 to +0.6060. Frequency does not. It stays negative in both, moving from −0.2083 to −0.3561, and it becomes more significant under robust errors rather than less (0.0672 to 0.0084).

The footnote states the badge rule correctly as "sign or significance changes". The headline only states the sign half, which makes it wrong about frequency. "None of them" also reads as covering all four predictors rather than two.

Suggested replacement:

> Click-through rate and cost per thousand views are associated with cost per inquiry in the same direction whichever advertisements are included. Engagement rate reverses direction and frequency changes in strength, so neither can be relied on.

- [ ] Replace the headline
- [ ] Check whether this sentence is hardcoded. If it is, it should regenerate, because which predictors are stable depends on the data

---

**G. No panel says how any of its measures are calculated.**

Establishing the definitions required fitting candidates until the coefficients matched. What the code appears to use:

| Measure | Definition |
|---|---|
| Engagement rate, advertisements | Post engagements ÷ Reach |
| Click-through rate | Link clicks ÷ Impressions |
| Cost per thousand views | Spend ÷ Impressions × 1000 |
| Frequency | Impressions ÷ Reach |
| Engagement rate, organic posts | (Reactions + Comments + Shares) ÷ Reach |
| Cost per inquiry | Total spend ÷ Total inquiries, per advertisement |

Two of these will cause trouble if left unstated.

The click-through rate uses link clicks over impressions. The export carries its own `CTR (all)` column, which uses all clicks and gives a different number. Anyone checking the screen against Ads Manager will find the mismatch. The choice is defensible for a messaging objective and should be stated rather than defended later.

"Engagement rate" means two different things on this one screen. For advertisements it is post engagements over reach. For organic posts it is reactions, comments, and shares over reach. Both are reasonable, they are a few hundred pixels apart, and neither is shown.

- [ ] Add a shared "How these are calculated" disclosure at the top of the screen, or a definition line inside each panel's disclosure
- [ ] Confirm each definition above is correct, since they were recovered by fitting rather than read from the code
- [ ] Name the two engagement rates differently if the shared disclosure does not make the distinction obvious

---

**H. The cross-validated fit of 0.380 cannot be reproduced.**

Every other figure in the accuracy panel matches exactly. This one does not, and it depends on a choice the panel does not state. Three defensible definitions give three answers, and two of them move with the shuffle:

| Definition | Typical value | Range across 60 shuffles |
|---|---|---|
| Pooled held-out, log scale | 0.485 | 0.427 to 0.511 |
| Averaged across the ten folds, log scale | 0.395 | **0.075 to 0.523** |
| Pooled, peso scale | 0.396 | 0.342 to 0.432 |

Taking seed 42 as given, the closest reproduction found is the averaged-across-folds definition on a NumPy `RandomState(42)` shuffle, which gives 0.378. Close to 0.380 but not equal, so the definition question is still open even with the seed answered.

The averaged-across-folds definition is the one to move away from. With 108 rows split ten ways, a single fold of eleven advertisements can swing the figure by a factor of seven. If a panelist asks to see the analysis run again and the number moves, they will not distinguish "this measure is noisy by construction" from "this system is unstable". Pooling the held-out predictions instead is the more standard choice and is far steadier.

Note that the baseline column has the same exposure, since the fold-wise middle value also depends on the split. That accounts for the ₱5.86 on screen against ₱5.87 recomputed.

- [ ] Confirm which of the three definitions the code uses (see question 1)
- [ ] Switch to pooled held-out predictions if it is currently the averaged one
- [ ] Keep the seed fixed and record it in the methodology

---

**I. The month-of-life caveat describes a situation that does not occur.**

The footnote warns that a dip in the record count inside a curve means a paused advertisement rather than one leaving the cohort. No advertisement in this data has a gap. All 187 run in consecutive months, and the record count is constant down every row of both tables.

The caveat is therefore defending against something the reader cannot see, using a sentence longer than the table it explains. It also means the output cannot distinguish "calendar month minus the advertisement's own first month", which the footnote asserts, from "the nth month present in the data", which would produce identical output here. See question 3.

- [ ] Shorten or remove the caveat, keeping it only if the code genuinely does the calendar subtraction and you want the future-proofing
- [ ] The rest of that footnote is worth keeping, particularly the sentence about cost being spend over results

---

### 3.3 Would be better

---

**J. The accuracy table mixes two scales in one column.**

The fit is calculated on the log of cost per inquiry. The three error rows are in pesos, after converting predictions back. Stacked in one table they read as describing the same thing.

Related: predictions converted back from a log-scale fit are typical values rather than averages, so the residual panel's ratio compares each advertisement against the typical cost for its characteristics rather than the average. The existing caveat is close and one clause would make it exact.

- [ ] Label the scale on each row, or separate the fit row from the error rows
- [ ] Add the clause to the residual caveat

---

**K. The same number is rounded two ways.**

The headline says 28.5 per cent. The footnote says 29 per cent. Also, "closer to the actual cost" is loose for what is an average-error reduction.

Suggested headline: "The system's estimates are about 28 per cent more accurate than assuming every advertisement costs the middle amount."

- [ ] Pick one rounding
- [ ] Consider the rewrite

---

**L. The category comparison states a difference with nothing behind it.**

Entertainment at 0.85 per cent against testimonial at 0.51 per cent, with 88 posts against 212, is presented as a finding. The obvious question is whether that gap is distinguishable from noise, and this is the one panel on an assumption-driven screen where no assumption is tested.

- [ ] Either add a rank test across the four categories with pairwise follow-up behind the disclosure, or reword the headline as description rather than finding

We can run the test on our side from the categorized export if that is easier than building it.

---

**M. Five column headers appear twice in the 93-column advertising export.**

`Ad ID`, `Ad set ID`, `Campaign ID`, `Campaign name`, and `Result value type` each occur twice. A parser that builds a dictionary from the header row keeps whichever copy comes last and silently discards the other. The two copies agree in this export, so nothing is wrong today. It is a trap for the next one.

- [ ] Confirm the ingestion module handles the duplicates deliberately rather than by accident

---

**N. Two captions use semicolons.**

The category headline and the method-selection footnote both split clauses with a semicolon. Given that the interface is being cleaned of em dashes, the same treatment is worth applying. Full stops or commas read more plainly to a non-technical account holder in any case.

- [ ] Split both into separate sentences

---

**O. The baseline fit cell shows a dash.**

Correct, since a middle-value baseline has no meaningful fit. But it reads as a missing value rather than a deliberate one.

- [ ] Add a tooltip, or leave it and note it here as intentional

---

**P. Visual hierarchy and charts: proposed as Chapter 5, not as work now.**

The screen is nine cards of identical weight, each opening with a capitalized label, each with the same border and padding. Nothing signals which of the nine findings the owner should act on, even though they are not equally actionable. That views do not identify his best posts challenges how he currently decides what to promote. That advertisements do not get more expensive as they run tells him he can stop worrying about fatigue. The regression diagnostics matter for the defense and not for his Tuesday morning.

Three panels would be clearer as charts. The ranking comparison as a slope or scatter, since five out of seventy-three is a fact a picture makes instant. Month-of-life as a line with two series. Category distribution as bars with the group sizes visible, which would also surface the small promotional-offer group rather than burying it in a column. The regression tables should stay tables.

**None of this is being asked for now.** Five weeks out, on a screen already reviewed twice, it is a Chapter 5 recommendation. Two items are cheap enough to consider if there is slack, and both are deletions or additions rather than restructuring:

- [ ] Remove the capitalized labels above each card, keeping only "Month-of-life", where the term is doing work
- [ ] Add a coverage line at the top of the screen giving the period, the number of advertisements, and the number of posts. Worth doing for a second reason even if the first does not appeal, since it also does most of the work of finding D at once

The disclosure pattern is not on this list because it should not change. Giving the owner a clean page of plain sentences with the evidence one click away is the right resolution of the tension this screen has to manage, and it is worth saying so out loud during the demonstration.

---

## 4. Questions

Marked as questions rather than instructions, since the answers may change the recommendations above.

1. Which of the three cross-validated fit definitions in finding H does the code use? Seed 42 is noted. The averaged-across-folds definition on a `RandomState(42)` shuffle gets to 0.378, which is the closest reached, so something else still differs.

2. Which estimator produces the normality figure of 105.938? Recomputation gives 106.005, which is the difference between a bias-corrected and an uncorrected calculation of skewness and kurtosis. Worth knowing so the methodology can name it.

3. Does the month-of-life code compute the calendar difference from each advertisement's first month, or the position of each row in that advertisement's sequence? The current data cannot distinguish them, since no advertisement has a gap.

4. Is the inclusion of zero-result months in the rankings and month-of-life figures, and their exclusion from the regression, a deliberate difference or an accident of how each query was written? Finding A assumes the latter, but if there is a reason, it should be stated rather than reversed.

5. The fit statistic of 31.17 recomputes as 31.19. Trivial in itself. Is it a rounding path through adjusted quantities, or a sign that something upstream differs?

---

## 5. Priority

1. **Finding A**, the two definitions of cost per inquiry. First because it is the only item that can force reopening Rankings and Top Ads, which were closed before this surfaced. Five weeks out, scope risk outranks string fixes, and everything below this line is a sentence or a label.
2. **Finding B**, the Breusch-Pagan label. A requirement gap, and anyone running the default test reaches the opposite conclusion.
3. **Finding F**, the regression headline, since the table underneath currently disproves the sentence above it.
4. **Finding D**, record counts on every headline, which closes the FR-18 gap across the whole screen.
5. **Finding C**, the correlation method, a one-word fix on a requirement gap.
6. **Finding H**, the cross-validated fit, once question 1 is answered.
7. Findings E, G, I, then the rest as capacity allows.
8. **Finding P** last, and only the two cheap items, unless there is slack.

Findings B and F are both single strings, and both currently say something a careful reader would challenge.
