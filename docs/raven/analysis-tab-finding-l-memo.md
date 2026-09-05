# Memo: Analysis tab, Finding L verified, plus M and P

**Date:** 6 September 2026
**Re:** `Finding_L_Run_The_Test.md`, `Analysis_Tab_Close_2026-09-06.md`
**Status:** L confirmed independently and accepted, headline must change, M reopened briefly then closed, P partly reinstated with an apology for our own wording

---

## 0. Standing rules

### 0.1 No em dashes in sentences or captions
Use commas, full stops, or parentheses. This does not apply to the dash used as a null-value placeholder in table cells, which is a typographic convention rather than prose.

### 0.2 Plain language over statistical notation
Nothing an account holder reads should contain shorthand they have to decode. No `n=`, `IQR`, `Q1`, `p`, `r`, `R²`, `VIF`, `MAE`, or Greek letters at the top level of any screen. "14 posts" rather than "n=14". Statistical detail belongs behind the "See the numbers behind this" disclosure.

### 0.3 Never reference the study or the research in interface copy
The client has a system, not a research project. No requirement identifiers (FR-06, ALG-09), no "ground truth", no "the study-wide analysis", no "reference sample". Where a design decision is methodological, the screen states the operational consequence or says nothing.

---

## 1. Finding L: confirmed, and the headline has to change

We reproduced the test independently, joining `backlog_final_labels.csv` to the twelve raw organic exports rather than going through the app or through your figures. Engagement rate computed as reactions, comments and shares over reach, matching the panel's own definition.

| | Your figures | Ours |
|---|---|---|
| Kruskal-Wallis | H = 16.81, p = 0.0008 | H = 16.8145, p = 0.000772 |
| Product Showcase vs Testimonial | 0.0005 | 0.0005 |
| Entertainment vs Testimonial | 0.054 | 0.0537 |
| Testimonial vs Promotional Offer | 0.392 | 0.3925 |
| Entertainment vs Product Showcase | 1.000 | 1.0000 |
| Entertainment vs Promotional Offer | 1.000 | 1.0000 |

**Your conclusion holds.** Entertainment is not distinguishable from Product Showcase, the panel names it as the highest, and the headline therefore asserts something that fails its own test. This is the most consequential finding in the whole review, and it would have reached Chapter 4 unexamined if you had answered the question rather than testing it first. That was the right instinct and the outcome vindicates it.

One cosmetic note. Your Product Showcase against Promotional Offer figure of 0.922 is the raw p. Holm's monotonicity step raises it to 1.000, since the comparison above it already reaches 1.000. Neither is significant so nothing turns on it, but the table should state whether it reports raw or adjusted values in that column.

### 1.1 Your 238 is correct, and the missing post is one we already know

Exactly one labeled post is absent from the client's twelve exports: `1142974524519105`, categorized product_showcase. No labeled post has zero reach, so that is the only join loss and it fully explains 238 against the 239 in the backlog set.

That is the system-only 731st post. It has now surfaced three times in this review: as the 730 against 731 question on the corpus, as the reason a recomputation from the client exports alone returns 729, and now here. We know its category.

- [ ] Worth confirming your re-run on the full corpus picks it up, since it is present in the database and would push Product Showcase to 239 in the backlog portion

### 1.2 The re-run population, and why 707 is the wrong target

Your memo proposes re-running on all 707. The panel displays 691 posts across the four categories. 707 is the inter-coder reliability set, which is a different thing.

Run the test on exactly the population the panel shows. If the statistic and the table beside it rest on different sets, the panel reproduces the same failure that finding A was about, inside the fix for finding L.

- [ ] Run on the 691 posts in the four categories, not on 707 and not on the 488 either of us could reach

Our figure is capped at 488 because we hold the backlog labels and not the reconciled 200.

### 1.3 The headline must be generated, not written now

At 65 posts the Entertainment against Testimonial comparison sits at 0.054. At full corpus Entertainment gains 23 posts and Testimonial gains 56, so it may cross. Product Showcase against Entertainment at a raw 0.426 will not.

So the correct headline depends on a result nobody has yet, and it may change again on the next upload.

- [ ] Generate the sentence from the test result rather than hardcoding it, in the same way the regression headline now distinguishes its three cases
- [ ] Decide the wording for both outcomes now, so the re-run does not turn into a scramble

Your proposed shape is right and the last clause in particular should survive editing:

> Median engagement rate by content category. Testimonial posts earn a significantly lower rate than Product Showcase posts. The other categories are not distinguishable from one another at this sample size.

"Not distinguishable" declines to claim the categories are equal, which is the correct reading of a non-significant result and the same discipline the regression panel's badges already apply.

### 1.4 A reach check, for your back pocket rather than for the screen

The screen already establishes that engagement rate falls as reach rises. In this subset that correlation is −0.334, close to the −0.328 the ranking panel reports against views. Median reach by category:

| Category | Posts | Median engagement rate | Median reach |
|---|---|---|---|
| Entertainment | 65 | 0.82% | 1,732 |
| Product Showcase | 238 | 0.71% | 1,312 |
| Promotional Offer | 29 | 0.71% | 1,601 |
| Testimonial | 156 | 0.51% | 1,400 |

Entertainment has the highest reach and the highest engagement rate, so reach is working against it in the raw comparison rather than for it. Adjusting for reach strengthens the finding:

| Comparison | Unadjusted | Reach-adjusted |
|---|---|---|
| Testimonial vs Product Showcase | 0.0005 | 0.0001 |
| Testimonial vs Entertainment | 0.054 | **0.0082** |
| Testimonial vs Promotional Offer | 0.392 | **0.0243** |
| Entertainment vs Product Showcase | 1.000 | 0.785 |

Testimonial sits below all three other categories once reach is accounted for, and Entertainment against Product Showcase stays firmly non-significant either way. So the claim you demolished stays demolished, and the claim you propose gets stronger.

**Do not put this on the panel.** Rank-residualization followed by Mann-Whitney is a reasonable robustness check and not a standard named procedure, so making it the headline analysis means defending a second method in Chapter 3 five weeks out. Ship the plain unadjusted test, which is conventional and defensible.

Keep this result to hand instead. "Is that just a reach effect" is the most likely question a panelist asks about this panel, given the screen itself shows engagement rate falling as reach rises, and the answer is that the effect is larger once reach is accounted for, not smaller.

### 1.5 On method, for Chapter 3

Kruskal-Wallis and Mann-Whitney compare rank distributions rather than medians. The panel displays medians, so the chapter should describe the tests as comparing distributions of ranks rather than as tests of the displayed medians. Reading a significant result as "this category's median is lower" additionally assumes the group distributions have similar shape.

Your pairing is the right one and your reasoning for it is correct. Dunn with Holm would be equally defensible. Stating which was used matters more than the choice, as you said.

- [ ] Add the test, report the statistic and the significance level behind the disclosure, and name the procedure

---

## 2. Finding M: one more duplicated header than either check found

Your verification found four. There are five. `Campaign name` sits at positions 0 and 38, alongside the four you listed at 4 and 37, 5 and 36, 6 and 35, and 27 and 53.

Recomputed across all twelve files, 746 rows: **zero disagreements on any of the five**. So your conclusion is unaffected and nothing is currently wrong regardless of which copy Papa Parse reads.

`Campaign name` is worth adding to the comment for a specific reason. It is the only one of the five where a future export could realistically disagree between the two copies, because campaign names get edited in Ads Manager while identifiers do not. The caveat you wrote down is exactly right and this is the column it most applies to.

- [ ] Add `Campaign name` to the comment on `validateAdsRows`, then closed

---

## 3. Finding P: our wording, not your reading

There was no handoff mismatch and you did not misread anything.

The memo we sent said, verbatim, "None of this is being asked for now", and the priority list read "Finding P last, and only the two cheap items, unless there is slack". Deferring all three was a correct reading of what we wrote. Apologies for the wasted round trip.

We are changing our minds, and here is the honest justification for each.

### 3.1 The coverage strip: yes, but the reason has shrunk

Period covered, number of advertisements, number of posts, and date of the last upload, at the top of the screen.

The original argument was that it does most of the work of the FR-18 population problem. **That argument is now weaker, because you already fixed finding D.** All eight panel headlines carry record counts threaded from their own computations, so the population problem is largely answered where it arises.

What the strip still adds is the period, the last upload date, and stating the corpus once before any panel makes a claim, which is a real improvement and a modest one. Build it if the estimate is small. It is no longer load-bearing.

- [ ] Build the coverage strip, at your discretion on timing

### 3.2 The capitalized labels: yes

ACCURACY, REGRESSION, RESIDUAL DIAGNOSTIC and the rest. The bold sentence beneath each already says what the panel is, so they add nothing, and deleting text is not a redesign.

- [ ] Remove them, keeping only where the term is one the reader needs. MONTH-OF-LIFE earns it. ACCURACY does not.

### 3.3 Visual hierarchy: still Chapter 5

Restructuring nine equally weighted cards so the decision-relevant findings get more space than the diagnostics is worth doing and is not worth doing now. Unchanged.

---

## 4. Where the tab stands

**Closed:** B, C, D, E, F, G, H, I, J, K, M, N, O.

**Open:**

1. **§1**, the category test on the 691, and the generated headline. The only item that changes what the manuscript can claim.
2. **§2.2 of the previous memo**, the AD-MONTHS column now counting months that contribute nothing to the cost beside them, plus confirming the month-of-life headline regenerates.
3. **§3.1 and §3.2**, the coverage strip and the label removal.

**Deferred:** §3.3, to Chapter 5.

**On our side:** updating ₱21.50 to ₱21.39 in the manuscript and anywhere else it was recorded.

Once §1 and item 2 land we consider the Analysis tab closed and will move to Page Metrics, Category Performance and Post Type Performance.
