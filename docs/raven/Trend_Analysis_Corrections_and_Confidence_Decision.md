# Trend Analysis corrections accepted, and the confidence tier decided

**Date:** 4 September 2026
**Re:** `Trend_Analysis_Review_Corrections_2026-09-04.md`
**Status:** four corrections accepted, one decision, one small ask on the toggle

---

## 1. The banner: a hardcoded array, and the lesson is worth keeping

A three-element literal in the view component. Not a query, not a second table, not an unordered `distinct`, and not a dropped join.

**Your note on this is the useful part.** My §1.2 checklist would have sent you into the data layer for something that was three lines in a React component. Worth carrying forward as a rule: when a screen shows an arbitrary-looking subset, check for a hardcoded literal before assuming the query is wrong. An arbitrary subset is more often a list someone typed than a query that went wrong.

Finding and closing the gap in your own fix is the part I would not have caught. Deriving the period list from `reporting_starts` alone still let an advertisement spanning a month boundary make a real month look absent, and including `reporting_ends` closes it.

§1.3 held with no changes, and the rough guide now compares June to July 2026 automatically.

---

## 2. Three corrections accepted

**§3 was already fixed the day the memo was written.** The screenshot came from a build just behind the commit. Nothing to do.

**My gridline reading was a transcription slip.** A 0 to 140 domain with five ticks lands on 0, 35, 70, 105, 140, which is regular. I misread the screenshot and reported irregular intervals that were not there. The real defect was the zero-anchored domain and that is what you fixed.

**There was never a second axis implementation to copy from.** I held up the Organic Post Engagement panel as a reference. Both panels render the same component with the same config, and the only difference was that panel's data happening to span a wider range. Worth correcting so nobody goes looking for an implementation that does not exist.

Noted on Recharts' default `tickCount` not guaranteeing regular intervals for an arbitrary range. Not asking for a change, and worth knowing if a future data range produces something odd.

**§5, the dashboard's three-month window is intentional.** Understood, and it will not be "fixed" by analogy. That window is a deliberate scope decision on the Executive Dashboard, and the captions there already state it explicitly.

---

## 3. ⚠ Decision on §4: widen the confidence type

You are right that the label was never wired to the period list and that my guess about it resolving with §1 was wrong.

**Widen `Confidence` to include `'high'`**, rather than removing the badge.

The reasoning. A badge with two possible values, both of them warnings, is not conveying information. It is a permanent caveat wearing the costume of an assessment. Removing it would fix that, but it would also remove the one place on this card where the system can tell the owner how much weight to put on a figure, and that is a genuinely useful thing for a decision support system to say.

More importantly, the badge is a small implementation of the principle that runs through NFR-19 and NFR-20: the system marks results that rest on less than they appear to. Keeping it and making it accurate is better than removing it because it is currently inaccurate.

### 3.1 What should gate each tier

Proposed, and correct me if any of these is awkward to compute:

**Reliable.** The two periods compared are consecutive calendar months, both are fully present in the data, and both carry advertising and organic records.

**Rough guide.** The comparison is sound but something limits it. The periods are not consecutive, or one of them is partial, or one data source is missing from a period.

**Weak signal.** Whatever currently triggers `'low'`. No change.

- [ ] **Confirm the Reliable condition is computable** from what the card already has
- [ ] If "fully present" is awkward to define, consecutive months alone is enough to gate it

### 3.2 One thing to check while you are in there

The same `InsightHeader` badge appears on other cards. If any of them has the same problem, being typed to a subset of tiers that excludes the top one, they should be reviewed at the same time.

- [ ] Which other cards use `InsightHeader`, and can any of them reach `'high'` today?

If none of them can, the badge is decorative across the whole system rather than on this card alone, which would be worth knowing.

---

## 4. §2, the toggle: one question rather than a request

The outline treatment solves the same-weight problem and it is a legitimate design choice rather than a compromise. I am not asking you to change it to a fill on principle.

But your note that in dark mode the tinted border is close to the only cue distinguishing the two states is the part that concerns me, because dark mode is what every screenshot so far has been taken in and presumably what the demonstration will use.

- [ ] **Does the active segment read as pressed in dark mode at normal viewing distance?**

If it does, leave it. If it is borderline, adding a subtle fill behind the border would settle it without abandoning the outline treatment. Your call, since you can see it and I am reading a description.

---

## 5. Status

| Item | State |
|---|---|
| §1, the banner and its follow-up gap | Done |
| §2, the toggle | Done, one question in §4 above |
| §3, the axis | Done, before the review was written |
| §4, the confidence tier | Decided above, not yet built |
| §0.1, em dashes on this screen | Banner sentence done, rest pending the sweep |

Nothing here is urgent. §3 above is the only new work and it is small.
