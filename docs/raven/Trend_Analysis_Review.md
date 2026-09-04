# Trend Analysis: one bug producing four symptoms

**Date:** 3 September 2026
**Re:** Owner account, Trend Analysis
**Status:** one blocking bug, one toggle problem, two smaller items

---

## 0. ⚠ Standing rules

### 0.1 No em dashes in interface copy

Use commas, full stops, or parentheses.

### 0.2 Plain language over statistical notation

No shorthand an account holder has to decode.

### 0.3 Never reference the study or the research in interface copy

The client has a system, not a research project. Where a design decision is methodological, the screen states the operational consequence or says nothing.

---

## 1. ⚠ The screen has loaded three months out of twelve

The banner reads:

> "Data is available for Sep 2025, Dec 2025, Jan 2026 only. Oct 2025, Nov 2025 are not in the uploaded dataset."

**That is not true.** Verified against the client's raw advertising exports, every month is present with complete rows:

| Month | Rows | Month | Rows |
|---|---|---|---|
| Aug 2025 | 65 | Feb 2026 | 99 |
| Sep 2025 | 45 | Mar 2026 | 47 |
| **Oct 2025** | **40** | Apr 2026 | 57 |
| **Nov 2025** | **81** | May 2026 | 50 |
| Dec 2025 | 54 | Jun 2026 | 51 |
| Jan 2026 | 75 | Jul 2026 | 82 |

Every row starts on the first of a month and ends on the last, so there is nothing irregular in the source data to trip over. The rest of the system agrees: total spend of ₱901,197 across all twelve months, and the dashboard reports May, June and July 2026 individually.

### 1.1 It is one bug, not four

The banner, the charts, the rough guide, and the period comparison all read from the same period list. So there is a single cause upstream of all of them, and fixing it corrects all four without any being touched individually.

The banner is not lying about what the screen holds. The screen holds the wrong data, and the banner is honestly reporting the gap in it.

### 1.2 The three months are the clue

**September 2025, December 2025, January 2026.** Not the first three, not the last three, not consecutive.

A limit or a truncation would return the first or last N. An arbitrary-looking subset points elsewhere.

- [ ] **Where does the period list come from?** If it is derived from a table other than the advertising records, that table may genuinely hold only those three months, in which case the banner is accurately describing the wrong source.
- [ ] Check for an unordered `distinct` on the period column, a `take` or `limit`, or a join that is dropping rows
- [ ] Confirm the list is built from the same query that feeds the charts

### 1.3 The comparison fixes itself

The rough guide currently compares December 2025 to January 2026. That is not skipping months, it is correctly taking the last two entries of a three-entry list. Once the list returns all twelve, the same logic compares June to July 2026 and needs no change.

### 1.4 Why this is first on the list

A bright warning telling the owner his data is missing, on a system whose stated purpose is consolidating his data, and the warning is false.

It is also the first thing on the page, above every chart. Anyone opening this screen reads it before seeing anything else.

---

## 2. ⚠ The Side by side and Compare trend toggle looks disabled in both states

Both options render at nearly identical weight, so neither reads as selected. Working out which mode is active requires comparing the chart beneath, which defeats the purpose of a control.

The same toggle appears on the Executive Dashboard with the same problem.

- [ ] **Give the active option a filled background and stronger text**, and the inactive one a plain background

It is a segmented control and should look like one option is pressed. At present both look greyed out, which reads as a feature that is unavailable rather than a choice that has been made.

---

## 3. The compare trend axis, same as the dashboard

The Ad Spend versus Messaging Conversations indexed view plots two lines sitting between roughly 70 and 110 per cent on an axis running from 0 to 140, with gridlines at 0, 35, 70 and 140. Both lines compress into the upper third and appear flat.

- [ ] **Set the axis to the data range** rather than starting at zero
- [ ] Use regular gridline intervals

The Organic Post Engagement panel does not have this problem, because its data genuinely falls to 50 per cent and the axis suits it. Worth using as the reference.

---

## 4. The rough guide is good, and its label undermines it

> "Spend is up 8 per cent, messaging conversations are up 63 per cent from Dec 2025 to Jan 2026. Each messaging conversation cost ₱15 in Jan 2026, down from ₱23 in Dec 2025."

**This is the best plain-language finding in the system.** It states two figures and then converts them into the thing the owner actually cares about, which is what each conversation cost him. Every other screen should follow this pattern, and several memos have asked for exactly it.

But it is labelled **ROUGH GUIDE**, which tells the reader not to trust numbers that are exact.

- [ ] **Where does that label come from?** If it exists because the period selection is unreliable, it is a symptom of §1 and should disappear when that is fixed.
- [ ] If it is there for another reason, tell me what it is, because the finding does not appear to warrant a caveat

---

## 5. Working well

**"Total reach summed across ads, people who saw more than one ad are counted more than once."** A precise statement of a real limitation in plain words, and it stops the owner reading 2.6 million as 2.6 million people. This is the standard the other captions should meet.

**The units caveat on the side-by-side charts**, explaining that spend and conversations are different units shown as two charts sharing the same period axis, rather than forced onto one scale.

**Three data points drawn with visible markers and straight segments** on the Ad Reach chart, following the fix already made on the dashboard.

**The rough guide's structure**, per §4.

---

## 6. Priority

1. **§1**, the period query. Everything on this screen is computed from three months out of twelve, and the false warning sits above all of it.
2. **§2**, the toggle. It appears here and on the dashboard, so one fix covers both.
3. **§4**, the rough guide label, which may resolve with §1.
4. **§3**, the axis, alongside the same fix on the dashboard.
5. **§0.1**, the em dash sweep.

§1 is the only substantial item and it is likely a single query.
