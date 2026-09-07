# Memo: Budget Reallocation tab, owner account

**Date:** 6 September 2026
**Screen:** Analytics → Budget Reallocation, owner role
**Verified against:** the twelve monthly advertising exports, recomputed independently from the raw files
**Note:** this tab was reviewed in an earlier round and had items outstanding. We do not hold that list, so some of the below may already be known or fixed. Say so and we will drop them.

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

Every figure on this screen reproduces exactly from the raw exports:

| Group | Advertisements | Spend | Inquiries | Cost each |
|---|---|---|---|---|
| Best 27 | 27 | ₱375,809.90 | 31,875 | ₱11.79 |
| Second 27 | 27 | ₱170,739.45 | 10,360 | ₱16.48 |
| Third 27 | 27 | ₱104,309.29 | 5,116 | ₱20.39 |
| Worst 27 | 27 | ₱59,745.30 | 1,988 | ₱30.05 |

The ratio between best and worst is 2.549. Applying the best group's rate to the worst group's spend gives 5,067.41 inquiries against 1,988 recorded, an increase of 3,079.41. All four spend figures, all four inquiry counts, the 2.5 multiple, the 5,067 and the +3,079 match to the peso and to the unit. The worst-ten table matches on every row, including ad set names and all three columns.

**The disclosure footnote on this screen is the model the Analysis tab needed.** It states plainly that spend is summed only from months where the result type is messaging conversations, and that a non-messaging month's spend does not count toward that advertisement's cost per conversation. That is exactly the rule finding A on the Analysis tab spent three rounds establishing, and this screen had it stated correctly the whole time. It also means the `computeMonthOfLife` fix does not touch this tab.

The footnote's explanation of why the minimum-spend filter exists, that an unfiltered split would put low-volume advertisements with noisy costs in the worst group rather than genuinely inefficient ones, is the single best methodological sentence in the system. It anticipates the objection before a panelist raises it.

---

## 2. Findings

### 2.1 Breaks a requirement, or the screen's own description

---

**A. At the ₱500 threshold the screen cannot do what its subtitle says, and the consequence depends on code nobody has read.**

The subtitle promises advertisements "split into four equal-size groups". Advertisement counts at the three available thresholds:

| Threshold | Advertisements | Per group | Remainder |
|---|---|---|---|
| ₱300 or more | 148 | 37 | 0 |
| **₱500 or more** | **131** | **32** | **3** |
| ₱1,000 or more | 108 | 27 | 0 |

131 is not divisible by four. The screen is currently displayed at the ₱1,000 setting where it happens to work, and the ₱500 setting is one click away in the dropdown. ₱300 and ₱1,000 both divide evenly today by coincidence, not by design, and any future upload can change that for all three.

**The finding is that 131 does not divide by four. Whether that is a bug depends on the split, and the three plausible behaviors are not equally serious.**

*If the remainder is distributed* into 33, 33, 33 and 32, the groups are as equal as integers allow. The subtitle is a rounding imprecision, the arithmetic underneath is sound, and "four groups of roughly equal size" is an honest one-line fix.

*If the remainder lands entirely on one group*, giving 32, 32, 32 and 35, that is not a bug and not equal. The fix is stating the actual sizes rather than describing them as equal.

*If the split uses a fixed group size*, three advertisements are silently discarded. That is a real defect and an invisible one. Since the sort runs cheapest first, the three dropped are the three most expensive in the account, so the worst group's blended cost is understated and the reallocation figure with it. A quartile comparison that quietly discards its own tail is wrong regardless of what the subtitle says.

The three advertisements that would disappear cost ₱54.27, ₱53.52 and ₱50.13 per inquiry. The first of those is "(New) Slap content G", the same advertisement the Analysis tab flags as costing 3.32 times what its own characteristics predict. So at the ₱500 setting the worst-performing table would not contain the worst-performing advertisement.

**You can tell which branch the code takes from the screen itself, without reading it.** Switch to ₱500 and read the four advertisement counts:

| Behavior | Group counts | Worst group spend | Worst group cost | Additional inquiries |
|---|---|---|---|---|
| Fixed size, remainder discarded | 32, 32, 32, 32 | ₱51,926 | ₱31.49 | +2,725 |
| Remainder distributed | 33, 33, 33, 32 | ₱54,069 | ₱33.01 | +2,914 |
| Remainder on the last group | 32, 32, 32, 35 | ₱56,376 | ₱32.51 | +3,014 |

Counts summing to 128 rather than 131 is the discarding case.

**Whichever it is, displaying the group sizes settles it permanently.** The cards already show "27 advertisements" at the ₱1,000 setting, which is the right pattern. If that line is computed per group rather than derived from the total divided by four, then at ₱500 it reads 33, 33, 33, 32 on its own and the subtitle stops needing to make a claim about equality at all. That converts this from a wording problem into something the screen answers by itself at any threshold, including ones nobody has tested.

- [ ] Read the split and tell us which of the three it does. If it discards the remainder, that is a fix rather than a rewording
- [ ] Confirm the "27 advertisements" line on each card is computed from that group's own membership, not from the total divided by four
- [ ] Change the subtitle to stop promising equal sizes, since the cards will carry the real counts

---

**B. The quartile labels are the exact notation standing rule 0.2 prohibits.**

Rule 0.2 names `Q1` explicitly. The four cards are labeled Q1 (BEST), Q2, Q3, Q4 (WORST), the slider panel says "100% of Q4 spend", the slider caption says "Drag to compare a different share of Q4's spend", and the subtitle says "ranked into CPI quartiles".

The cards already spell out "cost per messaging conversation" underneath, which shows the right instinct is present. The labels above them undercut it.

Suggested wording, keeping the same four positions:

| Current | Suggested |
|---|---|
| Q1 (BEST) | Most efficient |
| Q2 | Second |
| Q3 | Third |
| Q4 (WORST) | Least efficient |
| "100% of Q4 spend" | "All of the least efficient group's spend" |
| "a different share of Q4's spend" | "a different share of that spend" |
| "ranked into CPI quartiles" | "ranked by cost per inquiry and split into four groups" |

Note the labels should not carry a count, since finding A may make the four counts unequal. The count belongs on the card's own line.

- [ ] Replace the quartile labels throughout, including the slider panel
- [ ] `CPI` also appears as the worst-ten table's column header. The cards spell it out, the table does not. "Cost per inquiry" is the better replacement, since the column immediately to its left is already headed INQUIRIES. If the Executive Dashboard uses a shorter form for the same measure, reconcile the two screens toward the plainer wording rather than carrying the abbreviation across

---

### 2.2 Would look bad in the demonstration

---

**C. A client checking the reallocation arithmetic by hand will not get the number on screen.**

The best group's card shows ₱12. The reallocation uses the unrounded ₱11.7901.

- ₱59,745 ÷ 11.7901 = 5,067 inquiries, which is what the screen shows
- ₱59,745 ÷ 12 = 4,979 inquiries, which is what the client gets

An 88-inquiry difference, from figures that are both on the same screen. The owner is the person most likely to do this arithmetic, because the whole panel is an argument about his money.

The large figures should stay rounded. ₱11.79 beside ₱16.48, ₱20.39 and ₱30.05 makes a scannable row harder to read for a precision the owner does not need at a glance. But each card already displays the spend and inquiry count the rate comes from, so all four cards are internally inconsistent with their own small print, not just the best group's. Putting the exact rate in that small-print block fixes all four without touching the headline figures.

- [ ] Add the exact rate as a fourth line in each card's existing small-print block, beside the advertisement count, spend and inquiries it is computed from
- [ ] Add a line directly under the reallocation figure naming the rate used, for example "Calculated at ₱11.79 per inquiry, shown rounded above". The disclosure is collapsed by default, so this belongs at the visible level where the arithmetic happens
- [ ] Leave the four large figures rounded to whole pesos

Note also that the Analysis tab shows cost per inquiry to two decimals (₱54.27, ₱16.33) while this tab rounds to whole pesos. Worth a decision on which convention applies where, though the small-print line makes the difference harmless.

---

**D. The reallocation result has no unit at the top level.**

The three figures read ₱59,745, "5,067 inquiries", and "+3,079". The middle one carries its unit and the third does not, even though the third is the one the client will quote.

- [ ] "+3,079 inquiries"

---

**E. The slider defaults to moving the entire worst group's budget.**

100% is the maximum position and the most aggressive claim the panel can make, so opening there anchors the client on the largest possible number before he has considered whether moving any of it is realistic.

A default nearer 25 or 50 per cent would present a decision he might actually take, and the slider still reaches 100 for anyone who wants it.

- [ ] Consider a lower default. This is a framing judgment rather than a defect, so your call

---

### 2.3 Would be better

---

**F. The efficiency gap is real but roughly half of it does not persist, and the caveat could say so.**

The footnote correctly identifies regression to the mean as the reason for the minimum-spend filter. The filter reduces it. It does not remove it, and the size of what remains is measurable.

We ranked each advertisement on the cost it achieved in the first half of its own run, then measured the same advertisements in the second half. 77 advertisements with at least ₱500 of messaging spend in each half:

| Group | Advertisements | Early cost | Later cost | Change |
|---|---|---|---|---|
| Best | 19 | ₱12.11 | ₱12.07 | −0.3% |
| Second | 19 | ₱16.56 | ₱13.28 | −19.8% |
| Third | 19 | ₱20.11 | ₱17.66 | −12.2% |
| Worst | 20 | ₱30.06 | ₱20.56 | −31.6% |

The best-to-worst gap is 2.48 times when measured on the period used to rank them, and 1.70 times on the same advertisements afterwards. About 47 per cent of the gap persists.

Two mechanisms could produce this. Advertisements get cheaper as they age, which the Analysis tab already reports, and advertisements ranked worst regress toward the middle.

**The ordering separates them.** Aging applies to every advertisement, so if it were the whole story the four groups would fall by broadly similar amounts. Instead the decline runs from −0.3 per cent to −31.6 per cent, monotonically ordered by how badly each group started. Nothing about advertisements getting cheaper with time predicts that the worst-ranked group falls a hundred times further than the best-ranked one. That ordering is the signature of regression to the mean.

For scale, the pooled decline across all 77 advertisements is 6.9 per cent. That figure is spend-weighted and the best group carries most of the spend, so it is not a clean per-advertisement aging rate and it should not be leaned on as one. It is useful only as a rough sense of the size of the aging effect against the worst group's 31.6 per cent, and the argument does not rest on it.

**The +3,079 figure does not need to change.** It is correctly labeled as a retrospective comparison of recorded results, and it is arithmetically right. But the client will read it as guidance for next quarter, and the honest expectation for a forward-looking move is closer to half of it.

- [ ] Consider one plain sentence in the caveat, for example "Advertisements that performed worst tend to improve on their own, so acting on this ranking would likely recover less than the full difference"
- [ ] Nothing else for you on this finding. The analysis stays off the screen, since it is a second method to defend for little gain on the interface

This goes into Chapter 4 on our side, with the decomposition above, and carries into Chapter 5 as the caveat on the reallocation recommendation. "Would this work if we did it" is the first question the panel will ask about the +3,079, and the current answer is that we do not know. With this it becomes about half, with an estimate of why.

---

**G. The best group is the high-spend group, and that is worth surfacing.**

Median spend per advertisement runs ₱9,636 in the best group against ₱1,620 in the worst, roughly six times. Across all 108, spend and cost per inquiry correlate at −0.63 on ranks, which is strong.

So "move the worst group's budget to the best group's rate" is in practice "spend more on the advertisements that already spend most". That is not an objection. It is consistent with the observed relationship and it is probably how the platform behaves. But it is the single most relevant fact for judging whether the extrapolation is plausible, and it is currently invisible.

The causation could run either way. Larger budgets may buy better delivery, or advertisements that perform well may simply attract larger budgets. The screen does not need to resolve that, only to show the reader the spend gap exists.

**Read the other way round, this is a defence rather than a caveat.** The obvious objection to the reallocation is that efficiency degrades at scale, so the best group's rate would not survive being handed more money. But the best group's 27 advertisements already spent ₱375,810 and the worst group's spent ₱59,745. Moving all of it means increasing the best group's spend by 16 per cent, which sits well inside the range where an observed rate plausibly holds. That is worth having on the record for the defence, and it is a stronger answer than the caveat currently on screen.

- [ ] Add median or average spend per advertisement to each of the four cards, which surfaces it without any new claim
- [ ] Consider naming the 16 per cent in the reallocation caveat, since it answers the scale objection directly

---

**H. Tie handling at the group boundaries is not stated.**

No tie occurs in the current data. The boundary pairs are ₱15.338 against ₱15.344, ₱18.071 against ₱18.119, and ₱22.432 against ₱22.453, all distinct. A future upload could produce a tie, and which side it falls on changes both a group's size and its rate.

- [ ] State the rule in the disclosure, or confirm it in code and leave the screen alone

---

**I. The disclosure footnote is dense and colored as a warning.**

It runs as one paragraph of roughly ninety words in a small orange-red type that reads as an error state rather than an explanation. The content is the best on the screen and the presentation works against it.

- [ ] Break it into three or four short paragraphs, one per idea: how spend is summed, why the minimum-spend filter exists, what the reallocation figure is and is not
- [ ] Use the same neutral tone the Analysis tab's disclosures use, reserving the warning color for actual warnings

---

**J. Two small things in the headline.**

The date range uses an en dash in "(Aug 2025 – Jul 2026)". Not an em dash, so not a rule 0.1 breach, but since dashes are being cleaned out it is worth deciding once whether date ranges keep theirs.

- [ ] Confirm the period regenerates from the data rather than being hardcoded, so it stays right after the next upload
- [ ] Decide the dash convention for ranges

---

## 3. Questions

1. Which of the three behaviors does the four-way split use at a non-divisible count? The table in finding A lets you check from the screen at ₱500 without reading the code, though reading it is faster. This is the only item that could be a functional defect rather than a wording one.
2. Is the "27 advertisements" line on each card computed from that group's membership, or from the total divided by four? The answer changes how much of finding A remains after the split question is settled.
3. Does the reallocation figure recompute as the slider moves, or is it interpolated from the endpoints?

**Not a question, since you already answered it.** The ₱1,000 default is on the record as deliberate: one commit on 21 August, never modified since, imported from a shared constant rather than duplicated across files, and predating the regression results it might otherwise be suspected of having been tuned to. That last point is the one that matters, because "why ₱1,000 and not ₱800" is a reasonable thing for a panelist to ask and the commit history answers it cleanly.

The half of that question still open is a screen question rather than a code one. Nothing on either tab tells the reader why the threshold is ₱1,000, and the disclosure explains only that a minimum exists, not how this one was chosen. One clause would close it.

- [ ] Consider naming the reason in the disclosure, in the same plain terms the regression-to-the-mean sentence already uses

---

## 4. Priority

1. **Finding A**, the ₱500 threshold. First because it is the only item that might discard data rather than merely describe it imprecisely, and because it is reachable in one click during a demonstration. If the split discards its remainder, the worst-performing table at ₱500 omits the account's worst-performing advertisement.
2. **Finding C**, the rounding reconciliation. The owner is the person most likely to check the arithmetic, and the two numbers he would compare are both on the same screen.
3. **Finding B**, the quartile labels and the table header. A direct breach of a standing rule, and mechanical to fix.
4. **Finding D**, the missing unit.
5. Then G, H, I, J as capacity allows, and finding E whenever you want to make the call.

Finding F needs nothing from you beyond the optional caveat sentence. The analysis behind it is ours to write up.

Nothing here blocks the tab. Findings A and C are the two we would not want a panelist to find first.
