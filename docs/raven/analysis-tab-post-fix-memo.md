# Memo: Analysis tab after the fixes, plus two architectural questions

**Date:** 7 September 2026
**Screen:** Analytics → Analysis, owner role, after the finding A through L fixes
**Verified against:** the twelve monthly advertising exports and the twelve monthly organic post exports

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

The screen is substantially better than the version reviewed on 5 September.

**Record counts are on every headline** and read naturally rather than as notation. "Across 730 posts", "Across 691 categorised posts", "Across 108 advertisements at or above the spend threshold, and 187 without it". The frequency panel took the both-numbers suggestion and reads "Across 482 monthly records from 187 advertisements", which is the pattern the rest of the screen should follow. See finding B, where one panel does not.

**The regression headline now distinguishes three outcomes** rather than lumping reversal and strength change together, and the live data exercises two of them correctly.

**The capitalized labels are gone** except above month-of-life, which is exactly the line drawn in the earlier memo.

**The coverage strip is built** and reads Aug 2025 to Jul 2026, 309 advertisements, 731 posts, last upload Aug 17 2026.

**The category headline is rewritten from the test result.** It now names Testimonial as significantly lower than Product Showcase and Entertainment. On the 488 posts we could reach, the Entertainment comparison sat at 0.054 and we flagged that the full corpus might cross it. It did. The headline reflects the re-run rather than the old ranking, which is the correct outcome.

---

## 2. The captions are dynamic, and these screenshots prove it

Worth recording, because it was a real question on our side and the evidence is now conclusive rather than assumed.

The month-of-life figures moved from ₱15.66 and ₱13.64 to ₱15.53 and ₱13.58 after the `computeMonthOfLife` fix. A hardcoded sentence would not have moved. The category headline changed to a claim that only the 691-post re-run produces. The counts are threaded from the computations that produced them.

**But "dynamic" covers three different things and only two of them are safe.**

- *The claim is selected from the result.* The regression headline does this now, choosing between reversal, strength change, and never significant. The category headline does it. These cannot go stale.
- *The numbers update inside a fixed claim.* The figures change and the sentence around them does not. This is safe only while the finding points the same way.
- *Fully generated.* Not needed anywhere here.

The second kind is the exposure. Six headlines on this screen assert a direction in prose and then print figures beside it. If a future upload reverses the finding, the figures move and the sentence does not, and the screen contradicts itself in front of the client.

One question per headline settles it. What does this say if the finding reverses?

| Headline | If it reverses |
|---|---|
| "Advertisements do not get more expensive as they run" | cost rises across the cohort |
| "The posts that get the most views are mostly not the posts that earn the most engagement" | the correlation turns positive |
| "View count rises almost exactly in step with how many people a post reached" | reach and views decouple and "almost exactly" stops being true |
| "Cost per inquiry does not rise as frequency rises" | it starts rising |
| "The model's estimates are about 28.5 per cent closer" | the model performs worse than the baseline, and "closer" has no negative form |
| "2 advertisements cost more than 1.5 times what their own characteristics would suggest" | none qualify, and the panel needs an empty state rather than "0 advertisements cost more than" |

- [ ] For each of the six, confirm the sentence branches on the result rather than only interpolating the numbers
- [ ] The accuracy and residual rows are the two most likely to break, since one has no negative wording and the other has no empty state

---

## 3. The study window, which matters more than anything else on this screen

The twelve-month period is a study constraint, not a system constraint. The database already holds 916 posts across sixteen monthly uploads and excludes 185 of them under FR-04a. The coverage strip states the period as Aug 2025 to Jul 2026 while the last upload was 17 August 2026, so records outside the window are already arriving and already being set aside.

**The question is what happens when the client uploads September 2026 after handover.** If the window boundaries are derived from the data, the analysis rolls forward and the system keeps working. If they are constants, every future upload is silently excluded, the figures freeze, and the screen keeps displaying Aug 2025 to Jul 2026 while appearing to function normally.

That second failure is the bad one, because it is invisible. Nothing on the screen would look wrong. The client would keep uploading and keep seeing last year's numbers.

- [ ] Are the window boundaries constants or derived from the uploaded data?
- [ ] If constants, what is the intended path after handover? A configurable setting is fine and a hardcoded pair of dates is not
- [ ] Whatever the answer, the coverage strip is the right place to make it visible. If records were excluded as out of period, saying so there ("731 posts in period, 185 outside it") turns a silent exclusion into a visible one

Related, and smaller. Several analyses have minimum data requirements that are currently met by accident. Month-of-life needs advertisements with three or more months. The category test needs enough posts per category to be worth running. If a future upload leaves a group too small, does the panel say so or does it report a result computed on four posts?

- [ ] Confirm there is a minimum-record guard on the category test and the month-of-life cohorts, or add one

---

## 4. Findings on the screen itself

---

**A. The month-of-life figures no longer reproduce.**

Before the fix they matched exactly. Now they do not. The screen shows ₱15.53 falling to ₱13.58. Recomputing from the raw exports under every rule we can construct:

| Rule | Cohort | First month | Third month |
|---|---|---|---|
| All rows of a messaging advertisement, no gate (the old behavior) | 123 | ₱15.66 | ₱13.64 |
| All rows for the month index, ratio gated to messaging (what we modeled the fix as) | 123 | ₱15.63 | ₱13.62 |
| **Messaging months only, for both the index and the ratio** | **111** | **₱15.52** | **₱13.55** |
| Messaging months for the ratio, anchored to the advertisement's first month of any kind | 111 | ₱15.49 | ₱13.56 |
| Messaging months only, restricted to advertisements above ₱500 total | 98 | ₱15.42 | ₱13.52 |

The nearest is the third row, off by ₱0.01 in the first month and ₱0.03 in the third. Close enough that the rule is probably almost that and not quite.

This is not an accusation that the figures are wrong. Every other number on the screen still reproduces, and the previous three rounds established that a mismatch here has always been two correct calculations over different populations. But it was exact before the fix and it is not now.

- [ ] What population and month index does `computeMonthOfLife` use after the change? Specifically, does an advertisement need three messaging months to enter the cohort, or three months of any kind?
- [ ] Once we know, we will re-verify and close it

---

**B. The month-of-life record count names the wrong number.**

The headline reads "Of 187 advertisements that recorded a messaging conversation." 187 is the corpus. The finding rests on the cohort that ran three months or more, which is 111 or 123 depending on the answer to finding A.

FR-18 asks for the number of records the result was computed from. This one names a larger number that the result was not computed from, which is a subtler failure than having no count at all, because it reads as satisfying the requirement while overstating the evidence.

The frequency panel on the same screen gets this exactly right with "Across 482 monthly records from 187 advertisements", naming both the unit the result rests on and the population it came from.

- [ ] Match the frequency panel's pattern, for example "Across the 111 advertisements that ran three months or more, of 187 in total"

---

**C. The new definitions card overclaims in its headline.**

"Every figure below is a ratio of raw Facebook-reported columns."

That is true of cost per inquiry, engagement rate, frequency, click-through rate and cost per thousand. It is not true of the fit statistic, the average error, the percentage error, the correlation coefficients, the variance inflation figures, or any p-value on the screen. Those are computed from the ratios, not from raw columns, and several are not ratios at all.

This is the same shape as the overclaim caught in the card's own first draft, where it said every figure is calculated the same way. The card is right to make a general statement and the statement needs to be narrower.

Suggested: "The measures below are ratios of figures Facebook reports directly. The statistics computed from them are described in each panel."

- [ ] Narrow the headline to the measures rather than every figure

---

**D. The category headline is silent on one of its six comparisons.**

It states that Testimonial is lower than Product Showcase and Entertainment, and that Promotional Offer is not distinguishable from the others. It says nothing about Product Showcase against Entertainment.

A reader who sees Entertainment at 0.85 per cent and Product Showcase at 0.72 per cent in the table below, with no sentence separating them, may reasonably infer the difference is real. On the 488 posts we could test, those two are not distinguishable at all, with an adjusted result of 1.000, which was the original reason the old headline had to go.

- [ ] Add the clause, for example "Product Showcase and Entertainment are not distinguishable from each other"
- [ ] Confirm that holds on the 691, since our figure is from the 488 subset

---

**E. The coverage strip's advertisement count is not a number any panel uses.**

The strip says 309 advertisements. Every advertising panel on the screen works from 187 or 108. 309 is correct as a statement of what the system holds, and none of the analysis rests on it.

Now that each panel carries its own count, this is mild. But it invites the question of why the header says 309 and the panels say 187, and the answer is not on the screen.

- [ ] Consider labeling the strip as what is stored rather than what is analyzed, for example "309 advertisements uploaded"
- [ ] The same applies to 731 posts against the 730 and 691 in the panels below

---

**F. Two carried over from the previous memo.**

- [ ] The coverage strip's date range uses an en dash. Still worth one decision on whether ranges keep theirs
- [ ] The accuracy headline still reads "28.5 per cent closer". The rounding is now consistent, which was the finding, but "closer" remains loose for an average-error reduction and is the wording that breaks first if the model ever underperforms the baseline. See §2

---

## 5. Priority

1. **§3, the study window.** First because it is the only item that determines whether the system still works in November, and because the failure mode is silent. Everything else on this list is visible the moment it goes wrong.
2. **§4 finding A**, the month-of-life rule, so the figures can be re-verified.
3. **§2**, the six headlines that assert a direction, particularly the accuracy and residual rows.
4. **§4 finding B**, the wrong record count, which is a live FR-18 gap.
5. Then C, D, E and F as capacity allows.

Findings C, D and E are wording. Finding A is a question. §3 is the one worth answering before anything else.
