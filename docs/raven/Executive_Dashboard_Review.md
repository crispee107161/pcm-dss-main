# Executive Dashboard review, plus two questions

**Date:** 3 September 2026
**Re:** Owner account, Executive Dashboard
**Status:** eleven findings grouped by severity, two questions at the end

---

## 0. The arithmetic is correct

Before anything else: I verified every KPI on this screen against the client's raw advertising exports.

| Displayed | Computed from raw exports |
|---|---|
| Total ad spend ₱81,599 | 81,599.45 |
| Inquiries generated 4,665 | 4,665 |
| Median cost per inquiry ₱26.44 | 26.44 |
| IQR ₱19.07 to ₱37.63, n = 44 | identical |
| Box plot range ₱12 to ₱81 | 12.24 to 81.31 |
| Change vs prior period, 2.1% | 2.1% |
| Posts published 68 | 68 |

Every figure reproduces. Nothing below questions the computation.

---

## A. Breaks a requirement

### A1. ⚠ The headline cost per inquiry uses a different population than the manuscript

This is the most serious item on the screen, and it is a labelling problem rather than a computation one.

Three different medians now exist, all correct for what they compute:

| Figure | Population | Median |
|---|---|---|
| Chapter 1 and Chapter 4 | 108 advertisements, full study period, at the ₱1,000 threshold | **₱18.09** |
| This dashboard | 44 advertisements, June alone, **no minimum spend filter** | **₱26.44** |
| June at the threshold | 11 advertisements | ₱15.57 |

The dashboard figure is 46 per cent higher than the one printed in the manuscript. A panelist reading Chapter 1 and then looking at this screen will ask which is correct, and the honest answer requires explaining two differences: the threshold is not applied here, and the unit is advertisement-month rather than advertisement, so a campaign running four months contributes only its June spend and June results.

**Do not apply the threshold to this card.** June would drop to n = 11 and the KPI would be useless.

- [ ] Add "no minimum spend filter" to the Median Cost / Inquiry card's subtitle
- [ ] Extend the CPI distribution caption to state that the figure is computed per advertisement per month with no minimum expenditure filter, unlike the study-wide analysis

Labelled, the two figures become two answers to two questions. Unlabelled, they look like a contradiction.

### A2. Follows per 100 page visits renders out-of-period data

The x-axis runs from **April 2025** to July 2026. Page-level records within the study period run from 1 August 2025.

FR-04a requires out-of-period records to be excluded from all analytical outputs. Either this chart is not filtered, or the page-level ingestion carries data earlier than August 2025 which is escaping the filter.

- [ ] Confirm whether page-level records exist before 1 August 2025, and whether `STUDY_PERIOD_*_WHERE` is applied to this chart's query

### A3. Recent Uploads shows three figures where FR-05 requires five

The table displays Added, Changed, and Unchanged. FR-05 requires records read, stored, updated, rejected, and identified as duplicates.

`records_read` and `records_rejected` were added to `UploadLog` in the per-row validation work but do not appear here.

- [ ] Add both columns, or confirm they appear elsewhere on the Upload Data screen and that this is a summary view

---

## B. Would look bad in the demonstration

### B1. The period arrows are redundant and appear to have a bug

Raven found this. Pressing the left or right arrow beside the period dropdown causes the custom range selector to appear, even though a custom range option already exists inside the dropdown. Pressing them repeatedly caused the interface to lag and stop responding, recoverable only by selecting a different option from the dropdown.

Two problems. The arrows duplicate a control that already exists, and repeated presses degrade the page.

- [ ] **What are the arrows intended to do?** If the intent is stepping one period backward or forward, they should shift the selected period without opening the custom range control at all
- [ ] Investigate the lag on repeated presses, which sounds like a state or re-render issue rather than a design decision

If stepping is the intent, keep them and fix the behaviour, since stepping month by month is genuinely useful. If not, remove them.

### B2. The period labels should state the dates they resolve to

"Last 7 days" and "Last complete month" are relative to the system's data rather than to today, and the data ends in July 2026. A reader seeing "Last 7 days" reasonably assumes the past week, when it actually means the last seven days of uploaded data.

- [ ] Show the resolved range beside or beneath the selector, for example "Last complete month (Jun 1 to Jun 30, 2026)"

The KPI cards already print the resolved range, which is good. Putting it on the control itself removes the ambiguity at the point where the choice is made.

### B3. "Export" navigates rather than exporting

Raven raised this and it is a fair point. A button labelled Export promises a file. Landing on a different screen is a broken promise, and it is the kind of thing a usability evaluator marks against operability.

- [ ] Rename to **"Reports"**

Making it actually export the dashboard view would also work but is more effort than it is worth at this stage.

### B4. "Least Efficient Ads" subtitle contradicts its own table

The subtitle reads "Highest cost per inquiry, Jun 1, 2026 to Jun 30, 2026 — spend without a matching result."

Every advertisement in the table has results, ranging from 7 to 46. The phrase "spend without a matching result" describes advertisements with zero conversions, which is a different set entirely and is what the warning chip at the top of the page counts.

- [ ] Remove the trailing clause, or replace it with something accurate such as "these advertisements cost the most per conversation started"

### B5. Three-point series are drawn as smooth curves

The Ad Reach panel and both Organic Reach and Views panels plot three monthly observations as interpolated curves. The resulting shapes rise and flatten in a way that suggests saturation, and that shape is drawn by the interpolation rather than present in the data.

- [ ] Use visible markers with straight segments, or bars, to match the Spend and Conversations panels beside them

Three points cannot support a curve, and a reader looking at the reach panel currently sees a trend that does not exist.

### B6. Category bars built on two posts render at full weight

Performance by Content Category shows n = 14, n = 5, and n = 2, with Promotional Offer absent entirely.

Labelling n per bar is correct and satisfies FR-18. But a bar built on two observations should not look as authoritative as one built on fourteen.

- [ ] Apply the low-confidence treatment used elsewhere, greying the bar or marking it, below the same threshold the other screens use
- [ ] State when a category has no posts in the period, rather than omitting it silently

This will improve on its own once the 519-post coding backlog lands, since those counts are low because most posts are still uncategorised.

### B7. The greeting uses the role, not the person

"Good afternoon, owner." Use the account holder's name.

---

## C. Would be better

### C1. The period selector governs some charts and not others

Four charts carry captions stating they always show the last three months regardless of the selector. The captions are honest and I would rather have them than not.

But a global control that half the page ignores is confusing on first encounter.

- [ ] Consider a divider with a heading such as "Recent trends, all uploaded data" beneath which the always-three-month charts sit

Structural separation would say once what four captions currently repeat. Low priority.

### C2. The warning chips could link

"518 posts awaiting categorisation" and "5 ads with spend but no messaging conversations" both describe states with a screen behind them.

- [ ] Link the first to Content filtered to Needs Review

The second is worth a word of explanation rather than a link, since advertisements run for reach or video views are *expected* to have no messaging conversations. As phrased it reads as an error when it is correct behaviour under FR-06.

---

## D. Two questions

### D1. Do not delete the out-of-period records

Raven asked whether the database should hold only the twelve study-period months, for consistency.

**No, and the reason is stronger than it was.** FR-04a is a requirement that exists *because* out-of-period records exist. Delete them and the requirement becomes undemonstrable, since a panelist asking to see the study-period exclusion would be shown a control operating on an empty set. The records are also the client's data, and one in-period post arrived in a pre-period file, so deletion by source file would remove data the study uses.

The issue Raven noticed is real but it is A2 above, which is a chart rendering unfiltered data, not the data existing.

- [ ] No action. Recorded so the question does not resurface.

### D2. Authentication and email

The accounts are formatted as email addresses at a `pcmerchandise.com` domain, but the system authenticates through a credentials provider with bcrypt hashes and connects to no identity provider.

That is exactly what FR-01 describes and no requirement mentions email or external authentication, so there is nothing to fix. Two things worth confirming for the manuscript:

- [ ] **Does the system send email at any point?** Password reset, lockout notification, anything. My understanding is that it does not, and that administratively issued temporary passwords are the recovery path, but I want to state it rather than assume it.
- [ ] **Are the three account addresses deliverable, or are they usernames in email format?** Either is fine. Chapter 3 should describe them accurately.

If no email is sent anywhere, that is worth stating in Chapter 3 as a design decision rather than an omission, since it means the system depends on no external service for authentication and no account recovery path leaves the system.

---

## E. Priority

1. **A1**, the CPI labelling. Two string changes and it removes the sharpest question this screen invites.
2. **A2**, the out-of-period axis. Could be a filter gap affecting more than one chart.
3. **B1**, the arrows. A control that lags under repeated clicking is the worst kind of thing to happen during a demonstration.
4. **B4** and **B7**, both one-line copy fixes.
5. **A3**, **B2**, **B3**, **B5**, **B6** as capacity allows.
6. **C1** and **C2** only if there is time.

Nothing here is large. A1, B4, B7, and B3 together are perhaps twenty minutes.
