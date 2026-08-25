# All 31 code requirements map to the manuscript's 20. Nothing is sprawl.

**Date:** 25 August 2026
**Re:** `FR_Numbering_Confirmation_and_Category_Performance_Response_2026-08-25.md`
**Status:** numbering closed, one new requirement gap found, two definitions to separate, one access decision

---

## 1. The `mvp.md` list is a stale draft of the manuscript table, not a parallel scheme

Your §1.1 says FR-01 through FR-24 are inherited verbatim from the manuscript source. They are not verbatim, and the difference explains everything.

| Code | Manuscript |
|---|---|
| FR-01 User authentication, FR-02 Role-based access control | **FR-01** Authentication and role-based access |
| FR-03 Account management | **FR-02** Account management |
| FR-04 Export file upload, FR-05 Export type detection, FR-06 Encoding and format handling | **FR-03** Export file upload and identification |
| FR-07 Record validation, FR-08 Data cleaning | **FR-04** Record validation and cleaning |
| FR-09 Ingestion summary, FR-10 Centralised repository | **FR-05** Centralised repository and ingestion reporting |
| FR-11 Derived measure computation | **FR-06** Derived measure computation |
| FR-12 Automatic category suggestion, FR-13 Manual category assignment, FR-14 Bulk categorisation | **FR-07** Content categorisation and review |

The code numbering is an **earlier, more granular version of our own table**, from before we consolidated each cluster of clauses into a single requirement. It is not a competing scheme. It is a snapshot of our draft at an earlier stage.

That is good news, because it means the mapping is mechanical rather than interpretive, and `mvp.md` is stale rather than alternative.

---

## 2. Every one of the 31 maps. There are no orphan requirements.

You flagged FR-25 through FR-31 as having no manuscript counterpart. All seven have one, and in most cases the manuscript names the specific output explicitly.

| Code | Manuscript | Where the manuscript says so |
|---|---|---|
| FR-15 | FR-08 | Confirmed in your §1 |
| FR-16 | FR-13 | Performance dashboard |
| FR-17 | FR-14 | Aggregated performance reporting |
| FR-18 | FR-14 | "displaying recorded expenditure and its resulting efficiency measures across consecutive months" |
| FR-19 | FR-09 | Confirmed in your §1 |
| FR-20 | FR-17 | Confirmed in your §1 |
| FR-21 | FR-10 | Confirmed in your §1 |
| FR-22 | FR-18 | Result interpretation |
| FR-23 | FR-19 | Report export |
| FR-24 | FR-20 | Audit trail |
| **FR-25** | **FR-15** | "shall group advertisements into quartiles and report the inquiries associated with each quartile's expenditure at the rate recorded by the most efficient quartile" |
| **FR-26** | **FR-15** | "shall rank advertisements, ad sets, and campaigns by cost per inquiry, displaying the number of advertisements in each group" |
| **FR-27** | **FR-16** | Advertisement lifecycle reporting, including the frequency-to-CPI correlation |
| **FR-28** | **FR-17** | "shall compute and report watch-through rate for video and reel posts" |
| **FR-29** | **FR-17** | "shall report median reach, engagement rate, and view count by post type" |
| **FR-30** | **FR-13** | "shall report page visits, follows, and follows per one hundred visits as a monthly series" |
| **FR-31** | **FR-11 and FR-12** | Confirmed in your §1 |

So the handoff §16 additions were not additions. They were implementations of clauses the manuscript table already contained, split out at the finer granularity `mvp.md` uses throughout.

**Thirty-one code requirements collapse to twenty manuscript requirements with zero orphans.** That is a considerably better answer to the panel's feature-sprawl question than a defensibility note, and it is the version I will put in Chapter 3. The defensibility framing in `mvp.md` §4.8 is still worth keeping, but it is now answering a question nobody needs to ask.

- [ ] Confirm the seven new mappings above, particularly FR-18 to FR-14 and FR-30 to FR-13, which are the two I am least certain of

**The only genuinely unmapped items are two screens, not two requirements:** Top Ads and Category Performance. Both are addressed below.

---

## 3. ⚠ New gap: cost per inquiry by content category

This falls out of the mapping rather than from anything you wrote, and it needs an answer before the matrix is finalised.

Two manuscript requirements ask for advertising cost aggregated by content category:

- **FR-17** — "The system shall report view count, engagement rate, **and cost per inquiry** by content category"
- **FR-14** — advertising and organic performance aggregated "by advertisement, ad set, campaign, **content category**, and month"

But **FR-07 categorises organic posts only.** Advertising records carry no content category, and Chapter 1's first condition states that an organic post cannot be traced to the advertisement it later became by any means the platform exports provide. Limitations repeats it.

So one of two things is true:

**Nothing computes CPI by category**, in which case two requirements are partially unmet and I need to know before the traceability matrix says "Yes" against FR-14 and FR-17.

**Something does compute it**, in which case advertisements are being assigned content categories by some method, that method appears in no requirement, and Chapter 3 has to describe it. If it is caption or name matching between ads and posts, that is a substantive analytical step with its own error rate, and it needs the same treatment the categorisation methods got.

- [ ] Does any screen report cost per inquiry broken down by content category?
- [ ] If yes, how is a content category attached to an advertisement?
- [ ] If no, confirm so I can revise FR-14 and FR-17 to drop the clause

I would rather revise the requirements than discover an undocumented matching step. If the answer is no, the fix is small: FR-17 drops cost per inquiry from the category comparison and keeps it for post type, and FR-14 drops content category from the advertising aggregation levels while keeping it for organic.

---

## 4. Two different engagement rates are being reported under one name

Your §2 comparison table surfaces this, though you did not flag it as a problem.

| Screen | Computation |
|---|---|
| Analysis, FR-20 section | **Median** of per-post `organic_engagement_rate` |
| Category Performance | **Σ(reactions + comments + shares) ÷ Σreach**, reach-weighted |

These are different quantities and they will display different numbers for the same category on two different screens. A median is unaffected by a single high-reach post. A reach-weighted aggregate is dominated by one.

Both are legitimate and both are worth having. The problem is that our Definition of Terms defines engagement rate only as the per-post version, and neither screen says which it is showing.

- [ ] **Label them distinctly in the UI.** "Median post engagement rate" on Analysis, "Aggregate engagement rate (reach-weighted)" on Category Performance
- [ ] I will add the second definition to Chapter 1's Definition of Terms

Without this, a panelist reads Testimonial engagement on one screen, reads a different figure on another, and asks which is correct. With it, the answer is that they measure different things and both are labelled.

Worth confirming which convention FR-29's post-type comparison uses, since you mention the sum-then-divide convention is used elsewhere. If post type and content category use different conventions, that is a third inconsistency.

---

## 5. Category Performance: your reasoning supports Manager access

You write that a manager deciding what to greenlight next wants the reach-efficiency question, and then recommend leaving that screen owner-only. Those do not sit together.

Also, your proposed alternative, adding FR-20's Analysis section to Manager and Team nav, is already the case. Analysis is on all three sidebars today. So the recommendation as written changes nothing.

**Decision: add Category Performance to the Marketing Manager's navigation.** Reuse the existing route with a role check, per your §2.1 implementation note. Not to Marketing Team for now, since the Analysis FR-20 section already gives them category comparison and the team's justified access under condition five is to see how their content performed, which that section provides.

Your §2 analysis is otherwise exactly what I asked for, and the conclusion that these are two different questions rather than one duplicated is right. I am only disagreeing with who gets to ask the second one.

---

## 6. Two requirements to add

Both cover screens that exist and work.

> **FR-15a Advertisement-level performance ranking.** The system shall rank individual advertisements by expenditure, inquiries generated, and reach, and by cost per inquiry, click-through rate, and cost per click, over a user-selected date range.

> **FR-17a Category efficiency reporting.** The system shall report total reach and aggregate reach-weighted engagement rate by content category, stating the number of posts in each category and the number excluded as uncategorised.

FR-17a is scoped as a sibling to FR-17 rather than a new area, since it is the same subject at a different aggregation. Its final clause reflects that Category Performance excludes uncategorised posts from the table and surfaces them in a banner, which is a reasonable design as long as the count is stated.

- [ ] Confirm both describe what the screens actually do

---

## 7. Order

1. **§3.** The cost-per-inquiry-by-category question. It is the only item that could change a requirement's text, and it decides two rows of the matrix.
2. **§2.1 from the previous memo.** Gate FR-21 and FR-31 away from Marketing Team. Live access-control gap, small fix.
3. **§4.** Label the two engagement rates, and tell me which convention FR-29 uses.
4. **§5.** Category Performance onto the Manager nav.
5. **The full matrix**, now unblocked, using the mapping in §2.
6. **Confirm FR-15a and FR-17a** describe the screens accurately.

Still outstanding from the other thread: the upload table basis and the cross-month publish count, plus the 574 dry run, which has a standing go-ahead if the numbers match.

---

## 8. On the numbering, for the record

Manuscript numbering is what Chapter 3 prints. `mvp.md` keeps its own numbers with the mapping table from §1 and §2 alongside, plus a header line noting the numbering is internal and pointing to Chapter 3 as published. No renumbering of code comments.
