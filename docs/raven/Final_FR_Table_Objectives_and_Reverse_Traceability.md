# Final requirements table, objectives mapping, and one last verification request

**Date:** 25 August 2026
**Purpose:** close the requirements thread by confirming the mapping runs cleanly in both directions
**What I need:** §5 only. Everything else is here so we are working from the same document.

---

## 1. What I am asking for, and what I am not

**I need one thing: the reverse direction.** Every feature in the system, matched to a requirement below. You have already done most of this across the last several memos, so this is a consolidation rather than new work, and the point is to confirm there is nothing left that maps to nothing. Details in §5.

**I am not asking you to map the objectives.** §4 does that, and it is mine to do rather than yours, because it is a manuscript judgement about whether a requirement satisfies a research objective rather than a factual question about what the code does. I have included it so you can see what each requirement is ultimately for, and so you can flag anything where my mapping assumes an output the system does not actually produce. That last part is the only place I need your eyes on §4.

---

## 2. Table 3. Functional Requirements

Twenty-one requirements, six groups.

### Access and account management

**FR-01 Authentication and role-based access.** The system shall authenticate users through a username and password before granting access to any module, shall assign each account one of three roles, namely owner, marketing manager, and marketing team member, and shall restrict module access and editing rights according to the assigned role.

**FR-02 Account management.** The system shall allow the owner to create, modify, deactivate, reactivate, and reset the credentials of user accounts, shall refuse authentication to a deactivated account, and shall retain the records and audit history attributed to a deactivated account.

### Data ingestion and consolidation

**FR-03 Export file upload and identification.** The system shall allow authorised users to upload page-level, organic post, and advertising exports in the formats produced by Meta Business Suite and Meta Ads Manager, shall determine the export type of each uploaded file from its column composition, distinguishing within the page-level type between daily series and audience snapshots, shall read the character encodings and header structures produced by both source interfaces, and shall reject files matching none of the three expected types.

**FR-04 Record validation and cleaning.** The system shall validate uploaded records against the expected data type and permitted value range of each required field, shall handle missing values, remove duplicate records, and normalise text fields including the conversion of stylised Unicode characters to their standard equivalents, shall report each row failing validation together with the reason for its rejection without discarding the remainder of the file, and shall report the number of records falling outside the declared study period, excluding those records from all analytical outputs while retaining them in the repository.

**FR-05 Centralised repository and ingestion reporting.** The system shall store all ingested records in a single database, preserving the campaign, ad set, and advertisement hierarchy of the advertising records, and shall display following each upload the number of records read, stored, updated, rejected, and identified as duplicates.

**FR-06 Derived measure computation.** The system shall compute engagement rate for organic posts and cost per inquiry for advertisements optimised for messaging conversations, and shall not compute cost per inquiry for advertisements run for other objectives.

### Content categorisation

**FR-07 Content categorisation and review.** The system shall generate for each organic post a suggested content category from the post's caption text, assigning one of product showcase, promotional offer, testimonial, and entertainment, and shall record each suggestion together with an identifier of the method version that produced it. The system shall prioritise for individual review those posts on which the categorisation methods disagree, on which a method returned no result, for which entertainment was suggested, or whose caption falls below a defined length, displaying the reason for review and every candidate category, and shall allow the remainder to be confirmed in batches. The system shall allow the marketing manager to accept, change, or set the category of any post, to consult the original post where the caption is not sufficient, and to record a post as unassigned where its content cannot be determined, retaining the manual assignment as the final value and recording the user, timestamp, and means of assignment for every category set. The system shall present the keyword lexicon for inspection and shall not permit its modification through any user interface.

### Analytical methods

**FR-08 Categorisation method evaluation.** The system shall record, for every organic post, the suggestion produced by each categorisation method alongside the category ultimately assigned. The system shall evaluate each method against a fixed reference sample of posts coded manually from caption text alone and without reference to any method suggestion, reporting for each method the number of posts evaluated, percentage agreement, Cohen's kappa, a confusion matrix, and per-category recall, and shall display alongside these the agreement attained between two independent human coders on the same sample as the reference level against which method performance is interpreted. The system shall present these results with a plain-language statement of what the agreement level implies for the review of suggestions. The system shall report separately the proportion of suggestions altered by the reviewer in each ingestion period, presented as a monitoring figure rather than as a measure of accuracy. The reference sample shall not be editable through any interface, and access to this module shall be restricted to the marketing manager.

**FR-09 Promotion criterion analysis.** The system shall rank organic posts by view count and by engagement rate, shall report the Spearman rank correlation between the two rankings with its significance, shall report the proportion of posts appearing in the highest decile and the highest quintile under both measures, shall report the Spearman rank correlation between view count and reach, and shall report the distribution of each measure across the four content categories and across post types.

**FR-10 Correlation analysis with method selection.** The system shall test the normality of advertising engagement rate and cost per inquiry using a stated test, shall select between Pearson product-moment and Spearman rank correlation according to a rule fixed in advance of the test, and shall report the coefficient, its significance, the number of records, and the method selected.

**FR-11 Advertising efficiency regression.** The system shall estimate a multiple linear regression of log-transformed cost per inquiry on a set of advertisement characteristics fixed in advance, applying the same minimum expenditure threshold used elsewhere in the analysis, shall report the number of observations, the coefficient of determination and its adjusted value, variance inflation factors, and stated tests of heteroscedasticity and residual normality, shall report coefficients with both ordinary and heteroscedasticity-consistent standard errors, and shall report cross-validated error against a stated baseline model.

**FR-12 Residual diagnostic.** The system shall identify advertisements whose recorded cost per inquiry exceeds the level associated with their characteristics under the estimated model by more than a stated proportion, applying the same minimum expenditure threshold used elsewhere in the analysis, and shall report the magnitude of the difference for each advertisement identified.

### Performance reporting

**FR-13 Performance dashboard and page reporting.** The system shall present a dashboard showing advertising expenditure, inquiries generated, cost per inquiry, and organic engagement rate for a user-selected period, shall report page visits, follows, and follows per one hundred visits as a monthly series with period-over-period change, and shall report the demographic composition of the page audience by gender, age bracket, country, and city, stating for each figure the date of the snapshot from which it is drawn.

**FR-14 Aggregated performance reporting.** The system shall report advertising performance aggregated by advertisement, ad set, campaign, and month, shall report organic performance aggregated by content category, post type, and month, and shall display recorded expenditure and its resulting efficiency measures across consecutive months so that changes between periods are visible.

**FR-15 Efficiency ranking and quartile comparison.** The system shall rank advertisements, ad sets, and campaigns by cost per inquiry, displaying the number of advertisements in each group, shall group advertisements into quartiles and report the inquiries associated with each quartile's expenditure at the rate recorded by the most efficient quartile, and shall additionally rank individual advertisements by expenditure, inquiries generated, and reach, and by cost per inquiry, click-through rate, and cost per click, over a user-selected date range, stating for each ranking the number of advertisements eligible for it.

**FR-16 Advertisement lifecycle reporting.** The system shall report cost per inquiry by period of advertisement life for advertisements meeting a minimum survival threshold, and shall report the correlation between frequency and cost per inquiry, stating the unit of observation on which that correlation is computed.

**FR-17 Content comparison reporting.** The system shall report the distribution, comprising the median and the first and third quartiles, of view count and engagement rate by content category, shall report median reach, engagement rate, and view count by post type, shall compute and report watch-through rate for video and reel posts, shall report total reach and aggregate reach-weighted engagement rate by content category, stating the number of posts in each category and the number excluded as uncategorised, and shall display the number of records underlying each comparison.

### Output, interpretation, and audit

**FR-18 Result interpretation.** The system shall present each analytical result with the number of records from which it was computed and a plain-language statement of what the result indicates.

**FR-19 Report export.** The system shall allow displayed reports and analytical results to be exported as PDF or CSV files.

**FR-20 Audit trail.** The system shall record the user, timestamp, and affected records for every upload and every manual category assignment.

**FR-21 Assistant and dataset query.** The system shall provide an assistant that answers questions about the consolidated dataset from aggregate advertising, organic, and page-level figures scoped to the declared study period, shall restrict its access to aggregate measures and advertisement names, shall not transmit post content or customer-identifying information outside the system, and shall state that figures it reports are to be confirmed against the corresponding reports.

---

## 3. The objectives

**General objective.** To develop a web-based decision support system for Facebook content performance and advertising efficiency at PC Merchandise, consolidating the page-level, organic, and advertising records the business already holds, classifying its content by category, and reporting performance as efficiency rather than volume, so that promotion and budget decisions can be made from recorded evidence rather than from recollection and unvalidated measures.

**Specific objectives.**

1. Develop a centralised repository and ingestion module that consolidates, validates, and cleans the page-level, organic post, and advertising exports and computes engagement rate, verified by the complete ingestion of all twelve months of records reconciled against the source files.

2. Develop a content categorisation module that assigns organic posts to the four categories used by the business.
   - 2.1 To generate category suggestions automatically for all organic posts in the study period, with final assignment retained by the marketing manager.
   - 2.2 To compare rule-based keyword matching against large language model assisted suggestion, measured by percentage agreement and Cohen's kappa against a manually coded sample.

3. Compute cost per inquiry for advertisements optimised for messaging conversations and engagement rate for organic posts, reported by advertisement, ad set, campaign, and month, and by content category for organic performance.

4. Determine whether view count, the measure currently used to select content for promotion, ranks organic posts consistently with reach-adjusted engagement.

5. Determine which advertisement characteristics are associated with cost per inquiry using multiple linear regression on log-transformed cost per inquiry, reporting assumption tests, explanatory power, and cross-validated error against a baseline.

6. Evaluate the system's overall quality and user acceptance.
   - 6.1 ISO/IEC 25010 quality standards: functional suitability, performance efficiency, compatibility, usability, reliability, security, maintainability, and portability.
   - 6.2 Technology Acceptance Model: perceived usefulness, perceived ease of use, and behavioural intention to use.

---

## 4. Objective to requirement mapping

My mapping. **Check only one thing: whether any row assumes an output the system does not produce.** The judgement about whether a requirement satisfies an objective is mine.

| Objective | Requirements | Where in the system |
|---|---|---|
| 1 | FR-03, FR-04, FR-05, FR-06 | Upload Data |
| 2.1 | FR-07 | Content, Needs Review |
| 2.2 | FR-08 | Method Evaluation |
| 3 | FR-06, FR-14, FR-15, FR-17 | Rankings, Top Ads, Trend Analysis, Category Performance, Post Type Performance |
| 4 | FR-09 | Analysis, ranking comparison section |
| 5 | FR-11, FR-12 | Analysis, regression section |
| 6.1 and 6.2 | **None** | Not a system feature. See §6. |

### 4.1 Requirements that serve conditions rather than a numbered objective

Not every requirement traces to a numbered objective, and that is correct rather than a gap. Several serve the general objective or one of the six conditions documented in Chapter 1.

| Requirement | What it serves |
|---|---|
| FR-01, FR-02 | Condition five: outcome information never returns to the content team. Role separation is what makes controlled access to it possible. |
| FR-10 | Supports objective 5 as an exploratory step preceding the regression. |
| FR-13 | Condition four: budget decided from recollection. Reporting recorded expenditure at the point where spending is authorised. |
| FR-16 | Condition two: the characteristics distinguishing efficient advertisements from inefficient ones are unexamined. |
| FR-18 | The general objective. Analysis that cannot be interpreted does not support a decision. |
| FR-19 | Practical necessity for the client, not tied to an objective. |
| FR-20 | Condition five: attribution collected verbally and never written down. |
| FR-21 | The general objective, as an access layer lowering the effort of consulting the record. |

- [ ] **Flag any row in either table where I have assumed an output the system does not produce.** That is the only correction I need here.

---

## 5. ⚠ What I need: the reverse direction

Every feature in the system, matched to a requirement above.

You have covered most of this already across the previous memos, so this should be assembly rather than discovery. What I need is the consolidated list, in this shape:

```markdown
| Screen or feature | Route | Roles | Requirement | Notes |
|---|---|---|---|---|
| Upload Data | /dashboard/.../upload | Owner, Manager | FR-03, FR-04, FR-05 | |
| Trend Analysis | ... | ... | FR-14 | |
```

**Include everything**, not just the analytics screens. Dashboard, Content, Upload Data, Keyword Lexicon, Method Evaluation, Analysis and each of its sections, Top Ads, Rankings, Budget Reallocation, Trend Analysis, Page Metrics, Category Performance, Post Type Performance, Generate Report, Audit Log, User Management, the chat widget, and anything else reachable from a route.

**The one thing I am looking for is a row where the requirement column is empty.** Every time we have run this check it has found something. Top Ads, Category Performance, the demographic charts, and the chat widget were all real features with no requirement, and all four now have one. If this pass comes back with every row filled, the table is closed in both directions and I will not ask again.

- [ ] Any feature that maps to nothing
- [ ] Any requirement in §2 with no feature behind it, which would be the opposite problem and equally worth knowing

---

## 6. What satisfies the objectives outside the system

Recording this so it is clear these are not gaps. Three things the objectives require that no requirement covers, correctly, because they are research procedures rather than software features.

**Objective 2.2's manually coded sample.** FR-08 evaluates the methods against the reference sample. It does not produce the sample. The 200 posts were drawn on a fixed seed, coded independently by two researchers against a codebook validated with the client, and yielded inter-coder agreement of 0.6505 at 78.5 per cent. That procedure is documented in the codebook and the coding records and is described in Chapter 3, not implemented as a feature. The system consumes its output and displays the human ceiling alongside the method figures, which is FR-08's role.

**Objective 1's verification clause.** "Verified by the complete ingestion of all twelve months of records reconciled against the source files" is an audit we performed, not a function the system runs. FR-05's ingestion reporting supports it by displaying the counts, but the reconciliation itself was done against the raw exports and is written up in Chapter 3 and Chapter 4.

**Objective 6 in its entirety.** No requirement covers ISO/IEC 25010 or the Technology Acceptance Model, and none should. A system does not evaluate itself. These are satisfied by evaluation instruments, respondents drawn from the client's staff, an administration procedure, and results reported in Chapter 4. Entirely on our side, nothing needed from you.

Nothing in this section requires action. It is here so the answer exists if a panelist asks which requirement satisfies objective 6.

---

## 7. After this

Once §5 comes back with no empty rows, the requirements table is final and closed in both directions, and the remaining work is manuscript rather than system.

For your awareness, since it affects nothing you build: the manuscript changes on our side are the corpus figure moving from 730 to 731, definitions for the two engagement rate conventions, the objective 3 and Scope wording now that cost per inquiry by content category is out, the study-period and boundary notes, and the numbering mapping. Plus the 519-post coding backlog, which is ours.
