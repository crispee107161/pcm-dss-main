# Executive Dashboard: plain language, notation, and four remaining items

**Date:** 3 September 2026
**Re:** Owner account, Executive Dashboard, second pass
**Status:** one substantial piece of work, four smaller items, one standing rule

---

## 0. What landed

The greeting, the resolved period dates, the Reports rename, the no-minimum-spend note on the CPI card, the straight segments with markers on the reach and views panels, all four categories rendering with the low-count bar dimmed, the corrected Least Efficient subtitle, the study-period caption on Follows per 100, and all five FR-05 columns.

Raven also confirmed the arrow freeze is gone. B1 is closed.

---

## 1. ⚠ The dashboard has no plain-language interpretation anywhere, and FR-18 requires one

This is the largest item in this memo and it applies to every chart on the screen.

FR-18 requires each analytical result to be presented with the number of records it was computed from **and a plain-language statement of what the result indicates.** Every caption on this dashboard currently satisfies the first half and describes **method** rather than **meaning**.

"Histogram and box plot of the same population as the KPI above" tells a reader how the chart was made. It does not tell them what it shows.

### 1.1 The pattern

One sentence of method, then one sentence of finding. The second is what is missing.

**Cost per inquiry distribution**

> Every advertisement that ran in June, grouped by what it cost per inquiry. Half cost between ₱19 and ₱38, and the most expensive cost about seven times the cheapest.

**Follows per 100 page visits**

> Page visits and new follows across the study period, with the ratio below. The ratio has risen from about 2 follows per 100 visits to about 4, so a larger share of visitors now follow the page. Visits and follows are counted separately with no link between individual visitors and follows, so this is not a conversion rate.

**Performance by content category**

> Median engagement rate for June posts in each category. Testimonial posts earned the highest rate but only 5 were published, while Product Showcase is the most reliable comparison at 14 posts. Entertainment rests on 2 posts and is shown dimmed for that reason.

**Organic reach and views trend**

> Total reach and total views on posts published in each of the last three months. Both rose sharply from May to June and then levelled off.

**Spend, inquiries and reach trend**

See §2, which needs a finding sentence more than any other chart on the page.

### 1.2 ⚠ These must be generated, not written

Raven raised this and it is the deciding constraint. A hardcoded sentence saying "half cost between ₱19 and ₱38" is wrong the moment the period selector moves to May.

**Every interpretation sentence must be produced from the same figures the chart plots, recomputed whenever the chart is.**

Build them as templates with computed slots:

```
"Every advertisement that ran in {period} grouped by what it cost
 per inquiry. Half cost between {q1} and {q3}, and the most
 expensive cost about {round(max/min)} times the cheapest."
```

Three requirements on the implementation:

**Deterministic and template-based, not model-generated.** No Groq call. A sentence stating a figure has to be reproducible, it must not vary between renders of the same data, and Chapter 3 has to describe what the system does rather than what a model said. This is also cheaper and faster.

**Degrade gracefully.** If a period contains no advertisements, or too few to support the claim, the sentence must say so rather than rendering with empty slots or a comparison built on two records. Something like "Only 2 advertisements ran in this period, too few to describe a distribution."

**Recompute with the period.** The sentence and the chart must never disagree, which means they come from the same computation rather than two.

- [ ] Confirm this is workable, and roughly how long for all eight charts

### 1.3 Standing rule: no em dashes in interface copy

Please avoid them throughout. Use commas, full stops, or parentheses. This applies to all screens, not only this one, and to any new copy from here on.

---

## 2. The compare trend is the most valuable chart here and it is being wasted

The indexed view answers whether spend and results move together, which is exactly the question Chapter 1's second condition is about. Computed from the client's exports, indexed to May 2026:

| Month | Spend | Conversations | Reach |
|---|---|---|---|
| May 2026 | 100% | 100% | 100% |
| Jun 2026 | 102.1% | 95.7% | 209.0% |
| Jul 2026 | 101.1% | **76.8%** | 268.9% |

**Spend held flat while conversations fell 23 per cent.** Blended cost per inquiry went from ₱16.39 to ₱21.59 over three months, a 32 per cent deterioration. That is the single most useful finding available on this screen.

It currently renders as two nearly flat lines that look like nothing happened. Three reasons:

- [ ] **The y-axis runs from 0 per cent while the data sits between 77 and 102 per cent.** Both lines compress into the top fifth of the plot. Set the axis to the data range so the decline is visible.
- [ ] **Gridlines read 0, 30, 60, 120.** An irregular sequence with 90 missing.
- [ ] **Reach is excluded and nothing says so.** The header names three series, the caption says "both series." Excluding reach is defensible since 269 per cent would compress the others, but the caption should name which two are plotted and why.

And per §1, the caption explains the mechanism but not the point:

> Spend, conversations and reach over the last three months, each shown as a percentage of its May figure so the shapes can be compared. Spend has stayed level while conversations have fallen about 23 per cent, so each conversation is costing more than it did in May.

Reach is left out because it more than doubled over the same period, which would flatten the other two lines.

---

## 3. Replace statistical notation with words

FR-18's plain-language requirement applies to labels as well as captions.

- [ ] **"n=14" becomes "14 posts"** on the category chart
- [ ] **"n=68 posts"** on the Median Organic Engagement card becomes "68 posts"
- [ ] **"IQR ₱19.07 to ₱37.63 (n=44)"** on the CPI card becomes "Half of the 44 advertisements cost between ₱19.07 and ₱37.63"
- [ ] **"Q1 ₱19" and "Q3 ₱38"** on the box plot become "25% below ₱19" and "25% above ₱38", or keep the marks and let the caption carry the meaning

Same information in every case, no notation the reader has to decode.

---

## 4. "unlike the study-wide analysis" points at something the owner cannot see

My wording, and it was written for a panelist rather than for the account holder. He has no idea what the study-wide analysis refers to, because from his side there is no study, there is a system.

The difference still needs stating, since two screens show different medians. State it in terms of screens:

> Every advertisement that ran in June is included here, however little it spent. The Analysis screen covers the full twelve months and only counts advertisements above ₱1,000, so its figures are lower.

That points at something he can open.

---

## 5. ⚠ Eight of the ten Least Efficient advertisements spent under ₱1,000

Looking at that table closely, this is a real problem rather than a presentation one.

Conversations of 9, 11, 17, 12, 10, 15, 18 and 7. Spend of ₱516, ₱597, ₱734, ₱482, ₱385, ₱487, ₱550 and ₱211. Their combined spend is roughly ₱6,650 out of ₱81,599.

They appear on this list because a cost per inquiry computed from nine conversations is unstable, which is precisely why the study applies a minimum expenditure threshold and why FR-12 applies one to the residual diagnostic.

**The owner reading this table would conclude those advertisements are wasteful and cut them.** The honest answer is that there is not enough data to say. The dashboard is currently pushing him toward a decision on noise, which is the hazard NFR-19 and NFR-20 exist to prevent.

- [ ] **Dim rows below ₱1,000** with a note, using the same treatment the category chart now uses for low counts
- [ ] Add a line to the caption, something like "Advertisements spending under ₱1,000 are shown dimmed. Their cost per inquiry rests on very few conversations and moves sharply with one more or one fewer."

The Most Efficient list is unaffected, with 989, 537 and 1,387 conversations on its top three.

I considered asking for red and green colouring on these tables and decided against it. The headings already say Most and Least Efficient, so colour would restate them. The dimming above fixes a real problem instead.

---

## 6. Two smaller things

### 6.1 Read shows 0 against Duplicate 365

Recent Uploads now displays all five columns, but the five page metric rows show **Read 0** and **Duplicate 365**. Those cannot both be true.

The cause is that `records_read` was added with a default of zero, so rows uploaded on 23 August predate the column. Expected, but it displays as a contradiction.

- [x] Render an em dash (with tooltip) where the value was never recorded — do not backfill

The second is more honest. The first is less confusing. Either is fine.

**Resolved 2026-09-04** (see `docs/raven/Em_Dash_Scope_and_Backfill_Answers.md`): backfilling from the sum of the other four columns would invent a figure that was never recorded — same class of problem as the demographic-date backfill. Dash-with-tooltip is the permanent answer; already built, no further work.

### 6.2 The Follows chart's first tick reads Jul 2025

The caption now correctly says "Full study period (Aug 2025 to Jul 2026)" and the scoping fix has landed, but the leftmost x-axis label reads **Jul 2025** on both panels and on the ratio chart beneath.

- [ ] Confirm this is tick placement rather than data, and adjust the axis so the labels match the filter

---

## 7. A structural note, for our side rather than yours

No action required. Recording it so we have the answer if a panelist asks.

An executive dashboard conventionally shows few numbers, current state, comparison against a prior period, and exceptions that surface themselves. The KPI row, the period comparison, and the two warning chips do all four, and they address Chapter 1's fourth condition directly.

The screen then continues for roughly three more screens of charts, including a histogram and a box plot, which are analyst tools rather than executive ones.

That is not wrong and we are not asking for a restructure this close to the defence. We will describe it in Chapter 3 as an executive summary at the top with supporting analytical detail below, which is what it is.

---

## 8. Priority

1. **§1**, the plain-language interpretations. Largest item, and it is an FR-18 requirement rather than a preference.
2. **§5**, the sub-₱1,000 rows. Currently pushing a decision on noise.
3. **§2**, the compare trend axis. It is showing the best finding on the screen and hiding it.
4. **§3** and **§4**, notation and wording. Quick.
5. **§6**, both small.

§1 is the only one that will take real time. Everything else is copy and axis work.
