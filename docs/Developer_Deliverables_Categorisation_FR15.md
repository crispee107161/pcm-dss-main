# What we need from you — categorisation & FR-15 only

**Date:** 13 August 2026
**Scope:** Objective 2 / FR-12, FR-13, FR-14, FR-15 / ALG-04, ALG-05, ALG-06 and the review triage.
**Not** the whole system — that's a separate list.

---

## A. Send now (we can write the methods section immediately)

These exist as soon as the code does. None of it waits for results.

### A1. The keyword lexicon — full term list
Every term, per category, exactly as implemented. Plus:
- Are terms weighted? If so, the weights.
- Matching rule: substring or word-boundary? Case-insensitive?
- Is NFKC normalisation applied before matching? (It must be — 173 of 730 captions use stylised Unicode.)
- Tie-break when two categories score equally.

**Goes in an appendix verbatim.**

### A2. The LLM prompt — exact text
The full system and user prompt, copy-pasted, not paraphrased. Plus:
- Provider and **exact model name/version**
- Temperature (should be 0)
- Batch size
- What happens on a malformed response — retry? mark unclear?

**Also goes in an appendix verbatim.** If you revise the prompt, send the new version and tell us — we cite what actually ran.

### A3. Caption construction
Confirm what you feed both methods:
- Which field(s) — `Title`, `Description`, or the longer of the two?
- NFKC applied? URLs stripped?

We need one sentence in Chapter 3 stating exactly what text was classified.

### A4. `unclear` handling
- How ALG-04's `UNCLASSIFIED` maps to `unclear` for scoring
- The instruction you gave the LLM for when to use `unclear`

### A5. Kappa implementation
Formula written out, or the library call. Either is fine — we just need to state it and be able to reproduce it by hand at defence.

### A6. The three category columns
Table/column names and types for `category_keyword`, `category_llm`, `category_final`, and the `source` field. Chapter 3 describes this separation and why it exists.

### A7. Triage flag rules as built
The actual conditions you implemented, and the thresholds (e.g. the caption-length cutoff). If you changed any of the four flags from the spec, say which and why.

---

## B. Send when FR-15 runs

**Raw numbers, not screenshots.** CSV or a text dump. If we retype figures off an image we'll introduce an error, and a number that differs between the system and the manuscript is a five-second finding at defence.

### B1. FR-15 results table
For **each** method (keyword, llm):

| Field |
|---|
| n |
| percentage agreement (p_o) |
| expected agreement (p_e) |
| Cohen's kappa |
| 5×5 confusion matrix |
| per-category recall |

### B2. Sensitivity check
The same, restricted to the 190 non-`unclear` posts.

### B3. Which method won
Stated plainly, and which one you set as the default in the review queue.

### B4. Per-post output for the 200
A CSV: `post_id, category_final, category_keyword, category_llm`. Lets us verify the kappa independently and reproduce the confusion matrix.

> For reference, our human ceiling — this goes in the same table:
> **κ = 0.6505 · 78.5% agreement · n = 200**

---

## C. Send after we finish reviewing the 530

### C1. Final category distribution
Counts and percentages across all 730, plus the same for the 200 ground-truth subset (our sensitivity check).

### C2. Provenance counts
How many of the 730 carry each `source` value:
- `manual_ground_truth` (should be exactly 200)
- `accepted_suggestion`
- `manual_override`

This is the evidence for the disclosure sentence in Chapter 3 about how the labels were produced.

### C3. Triage volume
Of the 530: how many were flagged, broken down by flag reason, and how many were batch-confirmed.

### C4. Screenshots
- **S4 Categorisation Review** — showing a flagged item with both suggestions and the flag reason visible
- **S8 Method Evaluation** — showing both methods and the human ceiling

Real client data, not placeholder text.

---

## D. One date we need from you

**When will suggestions be generated for all 730 posts?**

We can't start reviewing the 530 until that's done, and those reviews block FR-20, FR-29 and Objective 4.1. A rough date is fine — we just need to plan around it.

---

## Two reminders

**Don't tune the lexicon or prompt against the ground truth.** If you iterate either one to improve the FR-15 score, the comparison becomes circular. Write both from the category definitions, run once, report what you get.

**If any of the above changes after you send it, tell us.** We'd rather update a sentence than have the manuscript describe a version of the code that no longer exists.
