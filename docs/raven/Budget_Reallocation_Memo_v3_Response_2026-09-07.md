# Response: Budget Reallocation tab, owner account (memo v3)

**Date:** 7 September 2026
**Replying to:** `docs/raven/budget-reallocation-memo-v3 (1).md`

---

## §2.1 Breaks a requirement, or the screen's own description

### Finding A — the ₱500 remainder

**The remainder is distributed, not discarded or dumped on one group.** `computeBudgetReallocation` (`lib/stats/budget-reallocation.ts`) ranks eligible ads by CPI and assigns rank `i` to group `floor(i*4/n)`, which spreads any remainder across the leading groups rather than a fixed group size of `floor(n/4)`. At the ₱500 threshold (n=131) this gives 33/33/33/32, not the discarding case's 128-summing 32/32/32/32.

This is now asserted by a test, not just read off the screen: `budget-reallocation.test.ts`, "distributes the remainder across the leading groups when the count is not divisible by four, instead of discarding it," constructs 131 distinct-CPI ads and checks the group sizes equal `[33, 33, 33, 32]` and sum to 131. If a future change ever regresses to the discarding branch, that test fails before it reaches you.

- Per-group counts (Q2 in your list) are computed from `group.length`, each group's own membership — confirmed, answered together with §3 Q2 below.
- Subtitle already reads "split into four groups of as equal a size as the count allows (differing by at most one advertisement when the total doesn't divide evenly by four...)" rather than promising strict equality, so no further wording change was needed there.

### Finding B — Q1–Q4 notation

Fixed throughout. Quartile card labels, the slider panel, and the subtitle now use the plain-language table you proposed ("Most efficient" / "Second" / "Third" / "Least efficient", "the least efficient group's spend", "ranked by cost per inquiry and split into four groups"). The worst-ten table's `CPI` column header is now "Cost per inquiry."

One instance survived the first pass that your memo's table didn't name: the page's empty-state fallback (shown when the selected threshold clears no ads) still read "Not enough data at this threshold to compare Q1 and Q4." code-review-analyst caught it on the code-review pass for this batch — fixed to "Not enough data at this threshold to compare the most and least efficient groups."

---

## §2.2 Would look bad in the demonstration

### Finding C — rounding reconciliation

Fixed, following your suggested shape. Each card's small-print block now has a fourth line ("₱11.79 unrounded rate" style, 2dp) beside the advertisement count, spend, and inquiries it's computed from, and the reallocation panel states the rate it used ("Calculated at ₱11.79 per inquiry, the most efficient group's unrounded rate, shown rounded on the cards above"). The four large headline figures stay rounded to whole pesos.

One correction from the code-review pass: the small-print line and the reallocation sentence originally called this figure the group's "exact rate." It isn't — it's still rounded to 2 decimal places, not the full-precision float the reallocation math runs on internally. Calling a rounded figure "exact" is the same overclaim shape as finding C itself, just in miniature, so both are now worded "unrounded rate" instead.

### Finding D — missing unit

Fixed. The additional-inquiries figure now reads "+3,079 inquiries."

### Finding E — slider default

**Already at 50%, not 100%.** `DEFAULT_REALLOCATION_PCT = 50` in `BudgetReallocation.tsx`, with a comment citing this review's §2.2 rationale directly ("landing on the maximum possible claim on first paint overstates before the user has done anything"). This looks like it was reviewed against a build from before that change landed — worth flagging in case the same stale-build gap affects how any other finding in this memo was checked.

---

## §2.3 Would be better

### Finding F — regression-to-the-mean caveat

Addressed with the plain sentence you suggested, appended to the reallocation disclosure: "Advertisements that perform worst also tend to improve on their own over time, so acting on this comparison would likely recover less than the full difference shown." Nothing else added — per your own note, the decomposition stays off the interface and goes into Chapter 4 on your side.

### Finding G — median spend per group

Fixed. Each quartile card now shows median spend per advertisement in that group ("₱X median spend per ad"), computed from the group's own membership (`medianSpend` on `QuartileSummary`, an even/odd-safe median guarded for an empty group). Test added (`budget-reallocation.test.ts`, "reports the median spend per ad within each group").

### Finding H — tie handling

Stated in code and in the disclosure, per your "confirm it in code and leave the screen alone" option — with one correction from the code-review pass. The first draft's tie rule was "broken by upload order," reasoning that the sort is stable and Map insertion order is first-seen row order. That's true, but the callers' Prisma queries (this page, `lib/reports/report-data.ts`, `DashboardOverview.tsx`) carry no `orderBy`, so Postgres row order isn't guaranteed to be upload order or even stable across a query plan change — "upload order" was a claim the system doesn't actually keep.

Fixed at the root: `computeBudgetReallocation`'s sort now breaks ties on Ad ID explicitly (`a.cpi - b.cpi || a.ad_id.localeCompare(b.ad_id)`), so the split is deterministic regardless of what order any caller's query happens to return rows in. The disclosure now says "ties in cost per inquiry at a group boundary are broken by advertisement ID," which is true unconditionally rather than true only if a caller happens to add an `orderBy` later. No tie currently occurs in the data, same as your finding noted.

### Finding I — disclosure presentation

Fixed. The footnote is now three separate paragraphs (how spend is summed; why the minimum-spend filter exists and how the split works; what the reallocation figure is and is not), in `MethodologyNote`'s existing neutral gray tone rather than a warning color — that component was never actually red/orange, so no color change was needed, only the paragraph breaks.

### Finding J — headline dashes and period source

- The date range's en dash is left as-is (not a rule 0.1 breach, that rule covers em dashes in prose). Same answer as Finding F in the companion Analysis tab response memo — happy to change it in one place (`lib/data/study-period.ts`) if you'd rather standardize.
- The period is generated from `STUDY_PERIOD_LABEL`, not hardcoded on this screen — confirmed, no change needed.

---

## §3 Questions

**1. Which of the three behaviors does the four-way split use at a non-divisible count?**
The remainder-distributed behavior: 33/33/33/32 at n=131. See Finding A above — now test-locked.

**2. Is the "27 advertisements" line on each card computed from that group's own membership, or the total divided by four?**
The group's own membership. `quartiles[i].n` is `group.length` for that specific group's array, not `n / 4`. This is what lets the split show 33/33/33/32 instead of a wrong uniform count.

**3. Does the reallocation figure recompute as the slider moves, or is it interpolated from the endpoints?**
It interpolates (`additionalInquiries * pct / 100`), and this is worth stating plainly because "interpolated" can sound like a shortcut that loses accuracy — here it doesn't. The counterfactual is linear in spend: reallocating `pct`% of Q4's spend at Q1's rate and leaving the rest at Q4's rate works out algebraically to exactly `q4Inquiries + additionalInquiries * pct/100`, the same figure a full recompute at each `pct` would produce. We checked this by hand rather than asserting it: expanding `(100-pct)/100 * q4Inquiries + (pct/100) * counterfactualInquiries` reduces to the code's formula term-for-term. No test was added specifically for this identity since it's arithmetic, not branching logic, but flagging it here in case you want it recorded for Chapter 4's methodology section.

---

## Verification

566/566 tests pass (including the two new tests named above), clean `tsc --noEmit`, clean production build.
