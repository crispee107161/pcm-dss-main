# Closing the FR table: two answers outstanding, plus what the CPI answer changes in the manuscript

**Date:** 25 August 2026
**Re:** `574_Live_Run_Confirmation_2026-08-25.md`, `Category_CPI_Gap_Response_2026-08-25.md`, and `Priority_List_Complete_Response_2026-08-25.md`
**Supersedes:** `Three_Answers_to_Close_the_FR_Table.md`. Work from this one, it carries the two still-open questions forward plus everything new.

---

## 0. What is now closed

**The 574 live run.** 427 cleared, 147 out-of-period untouched, 519 in the queue. Matches the dry run exactly. Backlog is 519 from here.

**The role gate on FR-21 and FR-31.** Done, including trimming the methodology note so it no longer references sections that are not rendered. That detail matters, because a methodology paragraph describing an absent regression is exactly what someone would notice during a Marketing Team demo.

**Category Performance on the Manager nav.** Extraction plus two thin route wrappers rather than a duplicated screen. Your explanation of why the URL could not literally be reused, given the middleware guard on `/dashboard/owner/*`, is right, and following the Analysis pattern was the correct call.

**The two engagement rates.** Labelled distinctly with cross-references between the screens, which is better than the two independent labels I asked for. FR-29 confirmed on the median convention, so there is no third inconsistency.

**FR-15a and FR-17a.** Confirmed against the live screens including the date-range clause. Both go into Chapter 3 as written.

**Cost per inquiry by content category.** Answered, and see §1.

---

## 1. The CPI answer is strong, and it reaches further into the manuscript than you flagged

Four independent places documenting the constraint, plus a fuzzy match attempted and rejected at 0.45 similarity. That is not a gap in the build, it is a documented design decision, and it is better Chapter 3 material than silence would have been. "Caption-to-ad-name matching was attempted, topped out at 0.45 similarity, and was rejected" is a methodological control, and I will present it that way alongside the lexicon revert and the study-period scoping.

**Both requested edits confirmed:**

- **FR-17** — drop cost per inquiry from the content-category comparison, keep it for post type
- **FR-14** — drop content category from the advertising aggregation levels, keep it on the organic side

**But those are not the only places the manuscript promises this**, and this is the part your memo could not have caught because it is outside the code.

**Objective 3** currently reads:

> "Compute cost per inquiry for advertisements optimized for messaging conversations and engagement rate for organic posts, reported by advertisement, ad set, campaign, **content category**, and month."

An objective promising something the system cannot do is worse than a requirement doing so, because objectives are the first thing a panel reads. I am splitting it so the aggregation levels attach to the right measure: advertisement, ad set, campaign and month for cost per inquiry, content category and month for engagement rate.

**The Scope paragraph** in Chapter 1 carries the identical sentence and gets the identical fix.

No action needed from you on either. Recording them so you know the manuscript and the build will agree when the matrix is written.

- [ ] One thing I would like: is there anywhere in the **UI** that still implies advertising performance can be viewed by content category? A filter option, a dropdown entry, a heading, an empty state. The code is clean, but a leftover label would be the one place a panelist could find the contradiction during a demo.

---

## 2. Your caveat on the completeness argument is correct, and I was wrong

Your §2 is right and I should have caught it myself. My own §4 noted that the July and August 2025 files appear to have used different bucketing conventions, which undercuts my §3 claim that UTC-anchoring is a property of the export tool. If the convention varies per pull, then "backward-only because UTC" is inference rather than proof.

**Revised framing for Chapter 3.** The empirical statement leads, because it is what is actually proven:

> Every post in the twelve client exports sits in the file matching its own publish month, 811 of 811 rows verified against the raw CSVs. The latest in-period post publishes at 21:00 Manila on 31 July 2026, three hours before the closing boundary.

The three-hour margin is worth stating because it bounds the residual risk precisely. For an in-period post to have been pushed into an August 2026 file nobody pulled, the bucketing anchor would have to run more than three hours **ahead** of Manila, meaning UTC+11 or later. That is not a timezone any tool would use for a Philippine page.

So the mechanism becomes supporting reasoning and the empirical check plus the margin becomes the claim. Thank you for pushing on it, the resulting paragraph is more defensible than the one I drafted.

---

## 3. ⚠ Still outstanding: is FR-16's frequency correlation built?

Unanswered from the previous memo. Manuscript **FR-16** requires two things:

> "The system shall report cost per inquiry by period of advertisement life for advertisements meeting a minimum survival threshold, **and shall report the correlation between frequency and cost per inquiry.**"

Every inventory so far describes code FR-27 as the lifecycle cohort curves. The frequency-to-CPI correlation has never appeared in any of them.

- [ ] Is it computed anywhere, and if so on which screen?
- [ ] If it is, does it use the same Shapiro-Wilk-gated Pearson/Spearman selection as FR-21, or a fixed method?
- [ ] Which population, the ₱1,000-filtered n = 108 or something else?

If it is not built, say so and I will decide between building it and revising FR-16. Frequency is already one of the four regression predictors, so the underlying data is present either way, which makes building it the cheaper option of the two.

---

## 4. ⚠ Still outstanding: which screens satisfy FR-18?

Also unanswered. Manuscript **FR-18** is the one cross-cutting requirement in the table:

> "The system shall present each analytical result with the number of records from which it was computed and a plain-language statement of what the result indicates."

That is a claim about roughly ten screens at once, and marking it "Yes" in the traceability matrix without checking is the kind of thing that unravels during a live demo when someone opens the one screen that omits its n.

A short pass, not a full audit. Two ticks per screen:

| Screen | Shows n | Plain-language statement |
|---|---|---|
| Analysis, ranking comparison (FR-19) | ? | ? |
| Analysis, category distribution (FR-20) | ? | ? |
| Analysis, correlation (FR-21) | ? | ? |
| Analysis, regression (FR-31) | ? | ? |
| Analysis, lifecycle (FR-27, Owner) | ? | ? |
| Method Evaluation | ? | ? |
| Category Performance | ? | ? |
| Post Type Performance | ? | ? |
| Top Ads | ? | ? |
| Rankings | ? | ? |
| Budget Reallocation | ? | ? |
| Trend Analysis | ? | ? |
| Page Metrics | ? | ? |
| Dashboard | ? | ? |

From what you have already described, several clearly pass. Category Performance surfaces `post_count` and the uncategorised banner. Rankings displays the number of advertisements per group and flags groups under three. The Analysis methodology notes you just edited are exactly the plain-language half.

I expect this back mostly green. I need to know where it is not, because those are the gaps to fix before October rather than after.

---

## 5. The remaining sidebar pass

You offered to walk Dashboard, Content, Upload Data, Method Evaluation, Trend Analysis, Page Metrics, Generate Report, Audit Log, and User Management the same way §2 of the earlier memo did.

**Yes, but after §3 and §4.** Those nine map to requirements I am fairly confident about (FR-05, FR-07, FR-08, FR-13, FR-14, FR-19, FR-20, and the account-management pair), so the pass is confirmation rather than discovery. The two questions above are where I do not know the answer.

If the §4 table gives you most of what that pass would surface anyway, fold the two together.

---

## 6. What closes when §3 and §4 land

The traceability matrix, and with it the Chapter 3 sections that depend on it: the requirements table, the numbering mapping note, and the parameter values.

Everything else on the manuscript side is mine and needs nothing from you:

- Definition of Terms additions for median post engagement rate and aggregate reach-weighted engagement rate
- 730 to 731 in Table 2, with the timezone and boundary notes
- The corpus completeness paragraph, per §2 above
- Objective 3 and the Scope paragraph, per §1
- FR-14 and FR-17 clause edits
- The numbering write-up

Two lookups and this thread is done.
