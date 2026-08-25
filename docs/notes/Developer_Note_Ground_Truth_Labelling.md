# Ground-Truth Labelling for FR-15 — what we're doing and what the system needs to support

**Date:** 12 August 2026
**Re:** manual content categorisation, Objective 2.2 / FR-15
**Bottom line for you:** three storage requirements and one ordering constraint. Everything else is our side.

---

## 1. Why this exists

FR-15 measures **which categorisation method is more accurate** — rule-based keyword matching (ALG-04) vs. LLM-assisted suggestion (ALG-05). To measure accuracy you need something to measure *against*. That's the ground truth: a set of posts labelled by humans, independently of the system.

Without it, FR-15 has nothing to compute and Objective 2.2 has no result.

---

## 2. What we're doing (our side, not yours)

1. **Codebook.** Written definitions of the four categories + tie-break rules + an `unclear` option. The client's marketing manager reviews it so the definitions match what the business actually means.
2. **Seeded random sample.** 200 posts drawn from the 725 codeable ones (5 have empty captions) using `random_state=20260812`. Fixed seed = anyone can reproduce the exact sample.
3. **Pilot round.** 30 posts, drawn from *outside* the 200, coded first to catch codebook ambiguity cheaply.
4. **Two coders, independently.** Two group members label all 200 separately. No discussion, no looking at the system.
5. **Inter-coder Cohen's kappa.** Computed *before* the coders talk to each other. This is our **human ceiling** — the agreement two trained humans reach on the same task.
6. **Resolve disagreements** → final ground truth (200 labelled posts).
7. **Import into the system** as `category_final` for those 200 posts.
8. **Run FR-15**: system generates keyword + LLM suggestions for the same 200, computes kappa for each against the ground truth.

---

## 3. THE ORDERING CONSTRAINT — this one is on you

> **The 200 ground-truth posts must be labelled by hand BEFORE the system's suggestions are ever shown to anyone.**

Earlier drafts of our notes said the ground truth and production categorisation "must not be the same records." That was imprecise — of course they overlap, the 200 are part of the 730. **The real rule is order and blindness, not separate records.**

**Why it matters:** if a human sees the system's suggestion and clicks "accept," their label is no longer independent. Kappa computed against an accepted suggestion measures nothing — it just measures how often someone clicked accept.

**Practical implication for the build:** don't wire up an auto-categorise-everything job that runs on ingest and populates `category_final`. Suggestions must land in `category_keyword` / `category_llm` and stay there until a human acts. See §4.

**Contamination check we'll run before reporting FR-15:** for each of the 200 posts, `category_final.source` must read `manual_ground_truth`, not `accepted_suggestion`. If any of the 200 came from an accepted suggestion, that post is excluded from the kappa.

---

## 4. What the system must store

Three separate columns per post, all persistent. **Not** one column that gets overwritten.

| Column | Written by | Notes |
|---|---|---|
| `category_keyword` | ALG-04 | rule-based suggestion. Store even when `UNCLASSIFIED`. |
| `category_llm` | ALG-05 | LLM suggestion. Store `model_name`, `run_date`, `confidence` too. |
| `category_final` | human | the authoritative label |

Plus, on `category_final`:

| Field | Values |
|---|---|
| `source` | `manual_ground_truth` \| `accepted_suggestion` \| `manual_override` |
| `assigned_by` | user id |
| `assigned_at` | timestamp |

`source` is what makes the contamination check in §3 possible. Without it we cannot prove the ground truth was blind, and that's exactly what a panelist will ask about.

**Valid label set (use these exact strings):**

```
product_showcase
promotional_offer
testimonial
entertainment
unclear
```

`unclear` is a real fifth label, not a null. It must survive into the kappa computation — dropping those rows would let the keyword method score well by abstaining.

---

## 5. What you need to build for FR-15

1. **An import path for the ground-truth CSV.** We'll hand you a file with `post_id, category`. It sets `category_final` and stamps `source = manual_ground_truth`. A one-off admin import is fine; it doesn't need a polished UI.
2. **Suggestion generation that does NOT write to `category_final`.** Both methods run over the 200 (and eventually all 730) and populate only their own columns.
3. **The kappa computation** (ALG-06): for each method, percentage agreement + Cohen's kappa against `category_final`, restricted to posts where `source = manual_ground_truth`, plus a confusion matrix.
4. **Display** on S8 Method Evaluation: for each method — n, percentage agreement, kappa, confusion matrix, and **our human inter-coder kappa alongside as the ceiling.**

---

## 6. Reference implementation

We're computing inter-coder kappa with `compute_kappa.py` (attached). It works out kappa longhand rather than calling a library:

```
kappa = (p_o - p_e) / (1 - p_e)

p_o = proportion of posts where both coders used the same label
p_e = Σ over categories of ( marginal_A(c) × marginal_B(c) )
```

**Match this exactly** in ALG-06 so our numbers and the system's numbers agree. If you'd rather use `sklearn.metrics.cohen_kappa_score`, that's fine — it gives the identical result — but the UI must still display `p_o`, `p_e`, and `n`, not just the final kappa. A panelist may ask us to walk through the arithmetic.

---

## 7. Expect a modest kappa — don't treat it as a bug

Two things will hold the numbers down, both expected:

**Prevalence skew.** `product_showcase` looks likely to be a large majority of posts. Cohen's kappa is depressed under skewed marginals (the "kappa paradox"). Simulated at constant 90% coder accuracy and constant 81% raw agreement:

| Category distribution | % agreement | kappa |
|---|---|---|
| balanced 25/25/25/25 | 0.81 | 0.75 |
| PCM-like 70/15/12/3 | 0.81 | 0.65 |
| severe 85/8/6/1 | 0.81 | 0.51 |

Same coder quality, kappa from 0.75 → 0.51, purely from prevalence. So **always display percentage agreement and the confusion matrix next to kappa** — kappa alone will read worse than the coding actually is.

**Genuine ambiguity.** A rough keyword probe over all 730 captions left ~19% matching no lexicon and ~24% matching more than one. Roughly 43% of posts are ambiguous to a keyword rule. **This is why we're comparing two methods rather than assuming one.**

> **Do not tune the keyword lexicon until it beats the LLM.** Over-fitting the rules to the ground truth invalidates the comparison. ALG-04 should return `UNCLASSIFIED` on no match rather than forcing a guess.

---

## 8. Timeline and what's blocked

| Step | Who | Blocking you? |
|---|---|---|
| Codebook → marketing manager | us | no |
| Pilot (30 posts) + kappa check | us | no |
| Main coding (200 posts) | us | no |
| Inter-coder kappa + resolution | us | no |
| Ground-truth CSV handed to you | us | **you need §5.1 ready by then** |
| Suggestions generated for the 200 | you | needs ALG-04 + ALG-05 |
| FR-15 computed and displayed | you | needs ALG-06 + S8 |

Steps 1–4 are ours and run in parallel with your build. **The thing to have ready first is the storage schema in §4** — if `category_keyword` / `category_llm` / `category_final` + `source` aren't separate columns, FR-15 can't be computed later without recoding, and we'd have to re-do the manual labelling.

---

## 9. One-line summary

Two of us label 200 posts by hand, blind, before the system suggests anything. Those labels become ground truth. The system then scores its two methods against them. **All you need to guarantee is that the three category columns are stored separately and that suggestions never silently write into `category_final`.**
