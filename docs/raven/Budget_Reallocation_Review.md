# Budget Reallocation: one judgement call, one definition consequence

**Date:** 3 September 2026
**Re:** Owner account, Budget Reallocation
**Status:** arithmetic verified, two items needing a decision, four routine

---

## 0. ⚠ Standing rules

### 0.1 No em dashes in interface copy

Use commas, full stops, or parentheses. This screen carries them in the page subtitle, both section headers, and throughout the methodology block.

### 0.2 Plain language over statistical notation

"Q4 ads (N=27)" becomes "The 27 most expensive advertisements". "n = 108 ads" becomes "108 advertisements". Nothing an account holder reads should require decoding.

---

## 1. The arithmetic is correct

Verified against the client's raw exports.

| Displayed | Check |
|---|---|
| Q4 spend ₱59,745, 1,988 inquiries | Matches the figure already printed in Chapter 1's Significance section |
| Q1 ₱12, Q2 ₱16, Q3 ₱20, Q4 ₱30 | Consistent with each quartile's spend and inquiry totals |
| Would have generated 5,067 inquiries | ₱59,745 at Q1's blended rate of ₱11.79 |
| Additional 3,079 | 5,067 less 1,988 |

The reallocation figure correctly uses Q1's unrounded rate rather than the ₱12 shown on the card. Rounding to the displayed value would have given 4,979 and been wrong by 88 inquiries.

**One figure worth having ready.** Moving all of Q4's spend into Q1 would increase Q1's budget by 16 per cent, since Q1 already spends ₱375,810. The obvious objection to this screen is that efficiency degrades as spend scales, and a 16 per cent increase sits well inside the range where an observed rate might plausibly hold. That is a good answer to have, and the screen could carry it as context.

---

## 2. ⚠ The slider: keep the figure, reconsider the control

This is the item I want a considered answer on rather than a quick change.

**The static comparison is required.** FR-15 states that the system shall group advertisements into quartiles and report the inquiries associated with each quartile's expenditure at the rate recorded by the most efficient quartile. That is exactly what the ₱59,745 and 5,067 figures do. Not in question.

**The slider is an addition beyond the requirement**, and it changes what the feature is.

The FR-31 specification prohibited a slider that lets the user change an input and see a resulting figure, on the grounds that it implies a causal lever the data cannot support. This is a different mechanism, since it is arithmetic on recorded rates rather than a model prediction, and the caveat beneath it is correct and prominent.

But the **shape** is the one that was ruled out. A number in a table reads as a comparison. A draggable control producing a live outcome figure reads as a planning tool, and a user dragging it to 60 per cent is not comparing, they are deciding.

I am not asking for its removal. Two changes make it defensible:

- [ ] **Default the slider below 100 per cent**, at 50 per cent or thereabouts. Landing on the maximum possible claim overstates before the user has done anything.
- [ ] **Change "+3,079" from green to a neutral colour.** Green reads as a promise. The figure is a retrospective comparison and its colour should not argue otherwise.

- [ ] If you would rather remove the slider and keep only the static figure, that is also fine and it is what the requirement asks for. Your call, given you built it.

---

## 3. ⚠ The threshold selector is good, and it has a consequence for the manuscript

Letting the user switch between ₱300, ₱500 and ₱1,000 makes the sensitivity of the finding visible rather than hiding it, which is better practice than a fixed value. Keep it.

But Definition of Terms currently reads that the minimum expenditure threshold is "set at PHP 1,000 in this study," and a user-adjustable control contradicts "set at." We will reword to something like: ₱1,000 is the value used in the reported analysis, and the system permits alternatives for exploration.

Before that goes in, one thing needs confirming:

- [ ] **Do FR-11's regression and FR-12's residual diagnostic use the fixed `MIN_SPEND_THRESHOLD_PHP` constant regardless of what this screen's selector is set to?**

If the selector could change the population the regression runs on, then Chapter 4's n = 108 and every coefficient in it depend on a dropdown, which is not a position we can defend. I expect they are independent, but this is the one place where a user control touches a study parameter and it needs to be certain rather than assumed.

---

## 4. No plain-language finding at the top

Per FR-18, and consistent with the Analysis and Dashboard memos. The screen presents four quartile cards and a comparison, and never states in words what they show.

Add above the cards:

> The 27 most efficient advertisements generated inquiries at ₱12 each. The 27 least efficient paid ₱30 for the same result, two and a half times as much. Both groups spent real money over the same twelve months.

Generated from the same figures the cards display, and recomputed if the threshold selector changes, per the templating approach in the Dashboard memo.

---

## 5. The Q4 table runs long

Twenty-seven rows occupying roughly two screens, listing every advertisement in the worst quartile.

Same treatment as the residual diagnostic on the Analysis screen:

- [ ] Show the worst ten by default
- [ ] Put the remaining seventeen behind a "Show all 27" toggle

The operational value is in the worst few. The full list should be available rather than foregrounded.

---

## 6. Working well, recorded so it is not re-raised

**The methodology note is the best in the system.** Explaining that the minimum-spend filter exists because an unfiltered split would be confounded by regression to the mean, and that the worst quartile would otherwise be mostly low-volume advertisements with noisy cost per inquiry rather than genuinely inefficient ones, is a sophisticated caveat stated plainly. It also answers, in advance, the exact objection a statistically literate panelist would raise.

**"Retrospective comparison, not a forecast" appears twice**, once beneath the figure and once in the methodology block. Appropriate for the screen most likely to be read as a prediction.

**Colour is used semantically rather than decoratively.** Q1 green, Q4 amber, and nothing else coloured. This is the right use, and it is why I did not ask for colour on the dashboard's efficiency tables where the headings already carry the meaning.

**The ad set column** is genuinely useful here, since it shows that inefficient advertisements cluster in particular ad sets rather than scattering randomly.

---

## 7. Priority

1. **§3**, confirm the regression and residual diagnostic use the fixed constant. One check, and it decides whether a Chapter 4 figure depends on a dropdown.
2. **§2**, the slider default and the colour. Two small changes, or removal if you prefer.
3. **§5**, collapse the table.
4. **§4**, the plain-language finding.
5. **§0.1** and **§0.2**, alongside the same pass on the other screens.

Nothing here is large. §3 is a question rather than work.
