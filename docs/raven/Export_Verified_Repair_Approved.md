# Export verified, repair approved, hold-backs approved

**Date:** 4 September 2026
**Re:** `Backlog_Export_and_Answers_2026-09-04.md`
**Status:** two approvals, one confirmation, two notes for the manuscript

---

## 1. The export checks out

Verified the file directly before starting.

| Check | Result |
|---|---|
| Rows | 504 |
| Unique post identifiers | 504, no duplicates |
| Columns | `post_id`, `caption`, nothing else |
| Blank captions | 3, included rather than filtered |
| Newlines | Real line breaks, not literal escape sequences |

No suggestions, no flag reasons, no engagement figures. The independence the exercise depends on is intact.

Reading the caption from `resolveCaption()` rather than a separate rule was the right call, and confirming it against `lib/keywords/caption.ts` rather than assuming is why I am not asking further questions about it.

- [ ] One copy is fine. We will duplicate it ourselves.

---

## 2. ⚠ Approved: null the three posts

Go ahead and run it.

The reasoning for restricting to the three assigned after the legacy-nulling run is correct, and leaving the other twelve alone is right since they were never part of that backlog. Restoring the queue from 516 to 519 matches our own observation in reverse, which is a good sign that both of us are looking at the same thing.

- [ ] **Run it**
- [ ] Send the post-run count by `category_final_source` so we have the figure recorded

---

## 3. Approved: the twelve hold-backs as selected

Taking your selection unchanged. You picked from the queue with the flag data in front of you, which we deliberately do not have in our export, so second-guessing it would mean choosing worse with less information.

Your note that a post can satisfy more than one flag condition at once is right and worth keeping in mind for the demonstration. It means a single row can show more than one review reason, which is realistic rather than a defect.

- [ ] Keep all twelve out of the import
- [ ] Tell us if any of them get categorised between now and the defence, since they are the only live demonstration material

---

## 4. Two things for the manuscript, no action needed

Recording these because they came out of checking the file, and both need a sentence in Chapter 3.

### 4.1 Twenty-five captions appear more than once

Identical caption text on different posts. The client reuses copy across posts, which is entirely normal for a business running promotions.

That gives us a free consistency check. If either coder labels the same text differently in two places, that says something about the codebook rather than about the posts. We will report it if it turns up anything.

No action for you. Noting it so the duplicate count is not a surprise if it appears in Chapter 4.

### 4.2 Coders read the caption as published, methods read it normalised

The export carries stylised Unicode and emoji as the client published them. The classification methods read an NFKC-normalised version.

That is fine and arguably better, since reading what the audience saw is closer to the real categorisation task. But it means the human coders and the automated methods did not see byte-identical input, and Chapter 3 will say so rather than leave a reader assuming otherwise.

- [ ] **Confirm the methods do normalise before classifying**, so the sentence is accurate

---

## 5. §2.1, thank you for sending it immediately

Asking Dan to hold before waiting for our reply was the right call. Every post categorised between now and the import is one more to reverse, and the count moving during a screenshot comparison is how we noticed in the first place.

- [ ] Let us know when he confirms

---

## 6. The import format answers are complete

`post_id,category`, lowercase snake_case matching the codebook, `unclear` for the undecidable case, extra columns ignored, header required, comma delimiter, encoding auto-detected.

Reading the script and the codebook rather than answering from memory is why we can code straight into the right shape rather than reformatting 504 rows afterwards.

We will keep `reason` and `notes` columns in the file we send, per your confirmation that unknown columns are ignored. Both are for the manuscript rather than the system.

---

## 7. What happens next on our side

Janine and I each code all 504 independently from separate copies, caption only, no discussion until both are finished. Then we reconcile disagreements under the same rule we used for the 200-post reference sample, and send you one file.

Roughly two evenings each plus reconciliation.

Two things we will send with it, for Chapter 3 and the appendix: the dates of the coding sessions, and a count of how many posts took `unclear` with the reason for each.

---

## 8. Still open from earlier, none of it blocking

- **§1.2**, the post-defence Groq account arrangement and the current tier
- **§2**, key scoping and the current rate limits, which matter for whether we demonstrate a full classification run or a small one

Neither holds up the coding.
