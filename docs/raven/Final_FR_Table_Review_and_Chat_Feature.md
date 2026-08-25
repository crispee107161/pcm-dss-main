# Final FR table for your review, and one feature I cannot map

**Date:** 25 August 2026
**Re:** the consolidated functional requirements table going into Chapter 3
**What I need:** a verification pass on the twenty requirements below, plus an answer on §3

This is the last thing standing between us and a finalised Table 3. Separate from the four open items in `Four_Remaining_Gaps_Please_Confirm.md`, which are about implementation status rather than wording.

---

## 1. What changed structurally

The review produced five new requirements: study period validation, keyword lexicon integrity, audience composition reporting, advertisement-level performance ranking, and category efficiency reporting.

Rather than adding them as FR-21 through FR-25 or as lettered suffixes, **I have folded each into its natural parent.** The table stays at twenty requirements, which keeps every existing reference in the objectives, the Scope section, and your `mvp.md` mapping valid, and avoids a numbering scheme with letters in it.

Where each one landed:

| Was going to be | Folded into |
|---|---|
| Study period validation | FR-04, as a final clause |
| Keyword lexicon integrity | FR-07, as a final sentence |
| Audience composition reporting | FR-13, now "Performance dashboard and page reporting" |
| Advertisement-level performance ranking | FR-15, as a final clause |
| Category efficiency reporting | FR-17, as an additional clause |

---

## 2. ⚠ What I need you to check

**Read each requirement below against what the system actually does, and flag any clause that now overstates it.**

That is the specific risk in a merge like this. A clause that was accurate as a standalone requirement can read as a stronger claim once it sits inside a longer sentence attached to a different subject. FR-13 and FR-17 are the two I am least sure about, because both now carry three distinct subjects each.

I am not asking you to re-verify everything. You have already confirmed FR-15a and FR-17a against the live screens, said FR-07a reads accurately, requested the FR-14 and FR-17 edits, and proposed and built FR-04a. What I need is the merged wording checked, not the underlying facts re-established.

**FR-13's audience clause is the one exception**, since you have not seen its final wording at all.

---

## 3. ⚠ One feature I cannot map to any requirement

`actions/chat.ts` appeared in your FR-04a call-site list, described as "AI chat's dataset-summary aggregate."

There is a chat feature in the system. It reads real data. **No requirement in either numbering scheme covers it**, and it has never appeared in any sidebar screenshot or in any inventory you have sent, so I do not know what it is.

This is the same situation Top Ads and Category Performance were in, and both of those resolved into requirements once I understood them. But I cannot write a requirement for something I have not seen.

- [ ] **What is it?** A page, a floating widget, a panel on an existing screen?
- [ ] **Who can reach it?** All three roles, or some?
- [ ] **What data can it see?** The dataset-summary aggregate you mentioned, or can it query records directly?
- [ ] **What does it send outside the system?** If it calls Groq or another provider, what leaves the database, and is any client data included in the prompt?

That last question is the one that matters most. If client advertising figures or post content are being sent to a third-party model on every chat turn, that is a data-handling fact Chapter 3 has to state, and it is exactly the kind of thing a panelist asks about.

Once I know, the outcome is one of three: write a requirement for it, disable it for the defence build, or remove it. All three are fine. Leaving an unmapped feature that talks to an external service is not.

---

## 4. The table

Twenty requirements, six groups. Merged clauses are marked in the notes after each group.

### Access and account management

**FR-01 Authentication and role-based access**
The system shall authenticate users through a username and password before granting access to any module, shall assign each account one of three roles, namely owner, marketing manager, and marketing team member, and shall restrict module access and editing rights according to the assigned role.

**FR-02 Account management**
The system shall allow the owner to create, modify, deactivate, reactivate, and reset the credentials of user accounts, shall refuse authentication to a deactivated account, and shall retain the records and audit history attributed to a deactivated account.

> *Check: does "refuse authentication to a deactivated account" overstate things given the eight-hour session window? My reading is no, since it describes authentication rather than session lifetime, but tell me if you disagree.*

### Data ingestion and consolidation

**FR-03 Export file upload and identification**
The system shall allow authorised users to upload page-level, organic post, and advertising exports in the formats produced by Meta Business Suite and Meta Ads Manager, shall determine the export type of each uploaded file from its column composition, distinguishing within the page-level type between daily series and audience snapshots, shall read the character encodings and header structures produced by both source interfaces, and shall reject files matching none of the three expected types.

**FR-04 Record validation and cleaning**
The system shall validate uploaded records against the expected data type and permitted value range of each required field, shall handle missing values, remove duplicate records, and normalise text fields including the conversion of stylised Unicode characters to their standard equivalents, shall report each row failing validation together with the reason for its rejection without discarding the remainder of the file, and shall report the number of records falling outside the declared study period, excluding those records from all analytical outputs while retaining them in the repository.

> *Check: the per-row clause is currently true for ads and organic posts and not for the other five validators. This is item 2 in the gaps memo. If you are not extending it, tell me and I will narrow this clause to name the record types it covers.*

**FR-05 Centralised repository and ingestion reporting**
The system shall store all ingested records in a single database, preserving the campaign, ad set, and advertisement hierarchy of the advertising records, and shall display following each upload the number of records read, stored, updated, rejected, and identified as duplicates.

**FR-06 Derived measure computation**
The system shall compute engagement rate for organic posts and cost per inquiry for advertisements optimised for messaging conversations, and shall not compute cost per inquiry for advertisements run for other objectives.

### Content categorisation

**FR-07 Content categorisation and review**
The system shall generate, once for each organic post at the time of ingestion, a suggested content category from the post's caption text, assigning one of product showcase, promotional offer, testimonial, and entertainment, and shall record each suggestion together with an identifier of the method version that produced it. The system shall prioritise for individual review those posts on which the categorisation methods disagree, on which a method returned no result, for which entertainment was suggested, or whose caption falls below a defined length, displaying the reason for review and every candidate category, and shall allow the remainder to be confirmed in batches. The system shall allow the marketing manager to accept, change, or set the category of any post, to consult the original post where the caption is not sufficient, and to record a post as unassigned where its content cannot be determined, retaining the manual assignment as the final value and recording the user, timestamp, and means of assignment for every category set. The system shall present the keyword lexicon for inspection and shall not permit its modification through any user interface.

> *Check two things. First, "generate once at the time of ingestion" is the target behaviour, and last I heard suggestions were still produced on demand by the two Generate buttons. Is that still the case? Second, does "an identifier of the method version that produced it" match what is actually recorded?*

### Analytical methods

**FR-08 Categorisation method evaluation**
The system shall record, for every organic post, the suggestion produced by each categorisation method alongside the category ultimately assigned. The system shall evaluate each method against a fixed reference sample of posts coded manually from caption text alone and without reference to any method suggestion, reporting for each method the number of posts evaluated, percentage agreement, Cohen's kappa, a confusion matrix, and per-category recall, and shall display alongside these the agreement attained between two independent human coders on the same sample as the reference level against which method performance is interpreted. The system shall present these results with a plain-language statement of what the agreement level implies for the review of suggestions. The system shall report separately the proportion of suggestions altered by the reviewer in each ingestion period, presented as a monitoring figure rather than as a measure of accuracy. The reference sample shall not be editable through any interface, and access to this module shall be restricted to the marketing manager.

**FR-09 Promotion criterion analysis**
The system shall rank organic posts by view count and by engagement rate, shall report the Spearman rank correlation between the two rankings with its significance, shall report the proportion of posts appearing in the highest decile and the highest quintile under both measures, shall report the Spearman rank correlation between view count and reach, and shall report the distribution of each measure across the four content categories and across post types.

> *Check: the views-to-reach correlation was not built as of your last inventory. Has it landed? If not this clause is aspirational and I need to know.*

**FR-10 Correlation analysis with method selection**
The system shall test the normality of advertising engagement rate and cost per inquiry using a stated test, shall select between Pearson product-moment and Spearman rank correlation according to a rule fixed in advance of the test, and shall report the coefficient, its significance, the number of records, and the method selected.

> *Note: I have dropped the clause requiring the shared expenditure threshold here, since you established FR-21 runs on the unfiltered n = 187 population. If you would still rather align it to n = 108, say so and I will put it back. Either is defensible as long as Chapter 3 states which.*

**FR-11 Advertising efficiency regression**
The system shall estimate a multiple linear regression of log-transformed cost per inquiry on a set of advertisement characteristics fixed in advance, applying the same minimum expenditure threshold used elsewhere in the analysis, shall report the number of observations, the coefficient of determination and its adjusted value, variance inflation factors, and stated tests of heteroscedasticity and residual normality, shall report coefficients with both ordinary and heteroscedasticity-consistent standard errors, and shall report cross-validated error against a stated baseline model.

**FR-12 Residual diagnostic**
The system shall identify advertisements whose recorded cost per inquiry differs from the level associated with their characteristics under the estimated model by more than a stated proportion in either direction, applying the same minimum expenditure threshold used elsewhere in the analysis, and shall report the magnitude and direction of the difference for each advertisement identified.

> *Check: "in either direction" was one-directional at 1.5 last I heard, with 0.667 proposed for the low side. Has the low side landed?*

### Performance reporting

**FR-13 Performance dashboard and page reporting**
The system shall present a dashboard showing advertising expenditure, inquiries generated, cost per inquiry, and organic engagement rate for a user-selected period, shall report page visits, follows, and follows per one hundred visits as a monthly series with period-over-period change, and shall report the demographic composition of the page audience by gender, age bracket, country, and city, stating for each figure the date of the snapshot from which it is drawn.

> *Check this one closely. It is the biggest merge and you have not seen the audience clause before. Three subjects in one requirement: the KPI dashboard, the page-level monthly series, and the demographic snapshots. Does the snapshot-date clause match what the four cards now display?*

**FR-14 Aggregated performance reporting**
The system shall report advertising performance aggregated by advertisement, ad set, campaign, and month, shall report organic performance aggregated by content category, post type, and month, and shall display recorded expenditure and its resulting efficiency measures across consecutive months so that changes between periods are visible.

**FR-15 Efficiency ranking and quartile comparison**
The system shall rank advertisements, ad sets, and campaigns by cost per inquiry, displaying the number of advertisements in each group, shall group advertisements into quartiles and report the inquiries associated with each quartile's expenditure at the rate recorded by the most efficient quartile, and shall additionally rank individual advertisements by expenditure, inquiries generated, and reach, and by cost per inquiry, click-through rate, and cost per click, over a user-selected date range, stating for each ranking the number of advertisements eligible for it.

> *Check: this now covers Rankings, Budget Reallocation, and Top Ads in one requirement. Confirm the merged sentence does not lose anything any of the three does.*

**FR-16 Advertisement lifecycle reporting**
The system shall report cost per inquiry by period of advertisement life for advertisements meeting a minimum survival threshold, and shall report the correlation between frequency and cost per inquiry, stating the unit of observation on which that correlation is computed.

**FR-17 Content comparison reporting**
The system shall report view count and engagement rate by content category, shall report median reach, engagement rate, and view count by post type, shall compute and report watch-through rate for video and reel posts, shall report total reach and aggregate reach-weighted engagement rate by content category, stating the number of posts in each category and the number excluded as uncategorised, and shall display the number of records underlying each comparison.

> *Check: this now spans the Analysis category distribution, Post Type Performance, and Category Performance. Two different engagement rate conventions live inside one requirement, median for the first two and reach-weighted for the third. The sentence distinguishes them by wording. Does that read accurately to you, or should the requirement name the two conventions explicitly?*

### Output, interpretation, and audit

**FR-18 Result interpretation**
The system shall present each analytical result with the number of records from which it was computed and a plain-language statement of what the result indicates.

**FR-19 Report export**
The system shall allow displayed reports and analytical results to be exported as PDF or CSV files.

**FR-20 Audit trail**
The system shall record the user, timestamp, and affected records for every upload and every manual category assignment.

---

## 5. What I need back

1. **Any clause that overstates what the system does.** Quote it and say what the system actually does instead.
2. **The seven inline checks** flagged above, on FR-02, FR-04, FR-07 twice, FR-09, FR-12, FR-13, FR-15, and FR-17.
3. **§3, the chat feature.** Four questions, and the data-handling one matters most.

Once these come back the table is final and Chapter 3 is written.

---

## 6. For the record

Twenty requirements, five of which absorbed new clauses that came out of this review, twelve of which were revised substantively.

Three of those five exist because your verification passes found screens doing real work with no requirement behind them. Top Ads, Category Performance, and the demographic charts were all real features with no line in the table, and none of them would have surfaced without a pass that named things individually rather than summarising by screen. The table is more accurate for it, and the sprawl concern the panel raised now has a clean answer rather than a defensive one.
