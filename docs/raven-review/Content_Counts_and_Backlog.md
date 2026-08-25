# The 716 count, the 130 backlog, and what each Content tab implements

**Date:** 24 August 2026
**Re:** the three Content tabs after the latest changes
**Status:** one arithmetic problem that needs checking today, one decision on the backlog, one requirement-mapping note

---

## 0. First, what got fixed

Comparing against `Content_Filters_Review.md`, this is most of that list:

- Categorised dropped, three tabs remain
- Empty states are per-filter and accurate. Unassigned now reads "No posts have been marked unassigned" instead of claiming nothing was uploaded.
- Row count present on All
- The always-armed dropdown and Save are gone, replaced by an explicit **Change** action
- **Legacy import** is visible as a provenance value, so the gap is now inspectable rather than silent
- British spelling applied
- The subtitle states the ground-truth benchmark is excluded, which is the right thing to say

That is a good pass. The remainder below is one number that does not add up and one decision that is ours rather than yours.

---

## 1. ⚠ The All tab shows 716, and it should show 530

The subtitle says the locked ground-truth benchmark is excluded. Working from the corpus figures:

| Quantity | Count |
|---|---|
| Organic posts in the twelve-month export | 730 |
| Ground-truth benchmark, locked | 200 |
| **All tab should therefore show** | **530** |
| All tab actually shows | 716 |

730 minus 716 is **14**. Fourteen posts are being excluded, not two hundred. And 716 plus 200 is 916 against a corpus of 730, so the two sets overlap by 186.

The rest of the picture is internally consistent, which is what makes the exclusion the likely culprit. 716 minus the 130 in the queue leaves 586 categorised, which sits close to the 574 legacy-import rows plus the manual selections visible on screen. So the categorised side reconciles and the exclusion does not.

Given you fixed a NULL-semantics bug in the ground-truth exclusion that had previously emptied the entire queue, my guess is that the fix moved from excluding everything to excluding almost nothing. Worth checking that predicate specifically.

**Why this is not cosmetic.** If the 200 benchmark posts are inside the normal corpus, they are countable and, via the Change action, editable. The FR-08 accuracy figures are computed against that benchmark. A benchmark that can be modified after the fact is not a fixed reference sample, and the kappa numbers stop being reproducible, which is the whole point of freezing it.

**What I need:**

- [ ] The exclusion predicate as it currently reads
- [ ] `COUNT(*)` for each: total posts, `category_final_source = 'MANUAL_GROUND_TRUTH'`, and the result set behind each of the three tabs
- [ ] Confirmation that benchmark posts cannot be reached by the Change action on any tab
- [ ] What the 14 currently-excluded posts are, since that number does not correspond to anything I recognise

---

## 2. The Unassigned tab is correct, and I want to confirm the definition

The subtitle reads "Posts explicitly marked as unable to be categorised." That is the right definition and it matches FR-07, which gives the manager the ability to record a post as unassigned where its content cannot be determined. Unassigned is a **human decision**, not a machine outcome.

Flagging this because it is easy to assume the opposite. Posts where a method returned no result do **not** belong in Unassigned. They belong in Needs Review, since "a method returned no result" is one of the four flag conditions. A human looks, and only if the human also cannot determine the category does it become Unassigned.

So the bucket being empty is expected while the queue is unworked. It should gain some entries once the 130 are reviewed, since at least 5 posts in the corpus have no caption text at all.

- [ ] Confirm Unassigned is written only by explicit human action and never by a method returning no result

---

## 3. The 130 backlog: we are handling it, here is what you need to build for

Answering the question rather than passing it back. The 130 will be categorised, and the decision on our side is that **the researchers will do it against the client-validated codebook**, the same procedure and codebook used for the 200-post ground-truth sample.

The reasoning, so the build supports it correctly:

**They cannot stay uncategorised.** FR-17 reports view count, engagement rate, and cost per inquiry by content category. With 130 of 730 unlabelled, that analysis covers 82 per cent of the corpus and the missing 18 per cent is not a random sample. It is exactly the posts the two methods disagreed on, plus the short captions, plus everything suggested as entertainment. The missingness is correlated with the variable being analysed, so the category comparison would be biased in a direction we could not quantify.

**Researcher coding is the more rigorous option, not the less.** The alternative is clicking through 130 rows at speed with a suggestion chip nudging toward a κ = 0.139 guess. The codebook procedure has documented inter-coder agreement. Chapter 3 will state plainly that final assignment for the twelve-month archive was performed by the researchers against the client-validated codebook, with the manager's approval of the codebook recorded. FR-07's clause about the manager retaining final assignment then describes a system capability, which it is, and Chapter 3 separately describes what happened during retrospective coding. Both statements are true and they do not conflict.

### 3.1 Sequencing

**Resolve the 574 legacy-import rows before we start.** Adding 130 labels of a third provenance on top of 574 of unknown origin makes the dataset harder to describe, not easier. If the legacy rows turn out to be promoted method suggestions, they need nulling and returning to the queue, and that changes the size of the job.

### 3.2 What the build needs to support

- [ ] A distinct `category_final_source` value for codebook-based researcher assignment, separate from `MANUAL_SELECTION`, `LEGACY_IMPORT`, and batch confirmation. Chapter 4 has to be able to report label counts by provenance.
- [ ] Audit trail capturing which account made each assignment, as it does now
- [ ] No change to the review workflow itself. We will use the system as built, which is also the honest thing to do, since it means the workflow is exercised on real volume before the defence.

### 3.3 ⚠ Do not let us clear the queue completely

This is a request, not a note. **Leave 10 to 15 posts uncategorised.**

An empty Needs Review tab makes FR-07 undemonstrable. The panel needs to see flagging, candidate categories, and manual assignment happening live, not a screen reading "nothing awaiting review" alongside our assurance that it worked. A small live queue is also more honest than a staged one.

- [ ] Flag it to us if the queue drops below 10 so we stop

---

## 4. What each tab implements, for Chapter 3

You did not ask, but "which requirement does this screen satisfy" is a standard panel question and the answer for All is less obvious than for the other two. Recording it here so the build and the manuscript agree.

| Tab | Requirement | Clause |
|---|---|---|
| Needs Review | FR-07 | Suggestion generation, review prioritisation, batch confirmation, manual assignment |
| All | FR-07 | "accept, change, or set the category of **any post**" — once a post leaves the queue this is the only surface where that clause can be exercised |
| All | FR-20 | Audit trail. The Provenance column makes the recorded user and timestamp visible rather than merely stored. |
| Unassigned | FR-07 | "record a post as unassigned where its content cannot be determined" |

**All is not a reporting screen.** FR-14 and FR-17 require aggregated reporting by category, ad set, campaign, and month, not a per-post inventory. The Views and Engagement columns on All are useful context for the person assigning a category, and that is the justification for them, not compliance with a reporting requirement.

---

## 5. One FR-08 gap implied by these screens

FR-08 requires recording the suggestion produced by each method **alongside the assigned category**. The 574 legacy-import rows have an assigned category. Whether they carry recorded suggestions from both methods is unknown.

If they do not, FR-08's recording clause is unmet for roughly 79 per cent of the corpus, and the suggestion-acceptance-rate metric has no denominator for those posts.

- [ ] For the 574 legacy rows, how many have a recorded `category_keyword` and how many a recorded `category_llm`?

This folds into the legacy-import question already outstanding, so no separate work if that one gets answered properly.

---

## 6. Checklist

**Today**

- [ ] The ground-truth exclusion predicate, and why All shows 716 rather than 530
- [ ] Counts for all three tabs plus the benchmark
- [ ] Confirm benchmark posts are unreachable by the Change action
- [ ] Identify the 14 posts currently being excluded

**Before we start coding the backlog**

- [ ] Origin of the 574 legacy-import rows, still outstanding from the previous memo
- [ ] Suggestion coverage on those 574
- [ ] New `category_final_source` value for codebook-based researcher assignment

**Ongoing**

- [ ] Confirm Unassigned is written only by explicit human action
- [ ] Tell us if the queue drops below 10 posts

---

## 7. If you only do one thing

**§1.** A benchmark that is inside the normal corpus is a benchmark that can be edited, and every FR-08 figure depends on it being fixed.
