# FR-15 Ground Truth — what to do now

**Date:** 13 August 2026
**Attached:** `ground_truth_categories.csv` (200 rows)
**Status:** manual coding complete. Two decisions settled below. Two build items for you.

---

## 1. What just happened

Two of us independently labelled 200 randomly-sampled posts, blind — no system suggestions existed and neither of us saw the other's sheet. We then computed inter-coder agreement **before** discussing anything, and resolved the disagreements afterwards.

| Measure | Value |
|---|---|
| Posts coded | 200 |
| Raw agreement | 78.5% (157 of 200) |
| **Cohen's kappa (human ceiling)** | **0.6505** |
| Disagreements resolved | 43 |

**Final ground-truth distribution:**

| Category | n | Share |
|---|---|---|
| product_showcase | 109 | 54.5% |
| testimonial | 56 | 28.0% |
| promotional_offer | 13 | 6.5% |
| entertainment | 12 | 6.0% |
| unclear | 10 | 5.0% |

---

## 2. Import instructions

`ground_truth_categories.csv` has exactly two columns: `post_id`, `category`.

- Import as **`category_final`** with **`source = manual_ground_truth`**
- **Exclude these 200 from any auto-categorisation job.** They must never be overwritten by a suggestion.
- Lock them, or flag them clearly in the Categorisation Review UI so nobody re-assigns them by accident.
- `post_id` values are clean 16-digit integers. Store as **string/bigint**, never float — Excel mangles these into scientific notation if anyone round-trips the file.

---

## 3. DECISION: score FR-15 on all 200, with `unclear` as a full fifth label

**Do not drop the 10 `unclear` posts.** Score on the complete 200.

Three reasons:

1. **The human ceiling was computed on all 200.** Our kappa of 0.6505 includes the `unclear` posts. If you score the machine on 190, you're comparing it against a ceiling measured on a different set — the two numbers stop being comparable, which is the whole point of reporting them side by side.

2. **Dropping them selects the evaluation set by outcome.** Removing the hardest posts after seeing which ones they are inflates the score. A panelist can ask why 10 posts vanished.

3. **It reflects real operating conditions.** 18 of the 730 posts have a placeholder caption ("PC Merchandise's Video"), and 60 are under 40 characters. The system will meet these in production. A method that correctly says *"I can't tell"* on a captionless post is **right**, not wrong — and that only shows up if `unclear` is scorable.

### What this requires

**ALG-04 (keyword):** map its `UNCLASSIFIED` output to `unclear` for scoring purposes. It already abstains rather than guessing; that abstention is now scoreable in both directions — it earns credit on genuinely unclear posts and is penalised on the ~19% of posts where it simply found no lexicon match.

**ALG-05 (LLM):** add `unclear` to the allowed labels in the prompt, with this instruction:

> Use "unclear" only when the caption genuinely does not permit a decision — a placeholder title, a bare emoji, a bare link, or text so ambiguous that two readings are equally defensible. Do not use it to avoid a judgement the caption supports.

**Also report a sensitivity figure.** Alongside the primary result on n=200, report kappa on the 190 non-`unclear` posts as a secondary line. It costs one query and pre-empts the question "what if you'd excluded them?" — answer it before it's asked.

---

## 4. What to build for FR-15

```
Population : the 200 posts where category_final.source = 'manual_ground_truth'
For each method (keyword, llm), against category_final:
    n
    percentage agreement (p_o)
    expected agreement (p_e)
    Cohen's kappa = (p_o - p_e) / (1 - p_e)
    5x5 confusion matrix
    per-category recall
Then: the same, restricted to the 190 non-unclear posts (sensitivity check)
```

**Display requirements on S8 Method Evaluation:**

- Both methods side by side
- **Our human ceiling (κ = 0.6505, 78.5%, n=200) shown on the same chart.** This is the reference line. A machine scoring 0.60 against a human ceiling of 0.65 is doing well; without the ceiling that number means nothing.
- Show `p_o`, `p_e`, and `n` — not just the final kappa. We may be asked to walk through the arithmetic.
- Show the confusion matrix. It's more informative than kappa alone.
- **Show per-category recall.** With `entertainment` at only 6% of posts, a method that never predicts it would still post a respectable kappa while being useless for the one category the owner specifically asked about. Only recall exposes that.

**Kappa formula** — match this exactly so our numbers and the system's agree:

```
p_o = proportion of posts where method label == category_final
p_e = Σ over the 5 labels of ( share_method(c) × share_final(c) )
kappa = (p_o - p_e) / (1 - p_e)
```

`sklearn.metrics.cohen_kappa_score` gives the identical result and is fine to use — but the UI must still display `p_o`, `p_e` and `n`.

---

## 5. ⚠ Do NOT tune the keyword lexicon against the ground truth

Once you see the keyword method score, the natural instinct is to improve the lexicon until it beats the LLM. **Don't.**

Tuning the rules on the same 200 posts they're evaluated against makes the comparison circular and the result meaningless. The lexicon must be written from the category definitions, not fitted to the answers.

Same rule applies to the LLM prompt: write it from the codebook definitions, run it once at `temperature = 0`, report what you get. If you revise the prompt, note that you did and why — but don't iterate against the score.

---

## 6. Review triage — worth building, keep it simple

This is a modification to **FR-13 / FR-14**, not a new requirement. It's cheap and it's the difference between the marketing manager reviewing 730 posts and reviewing roughly 200.

### The flags

Deterministic, computed from data you already store. **No confidence thresholds** — LLM self-reported confidence is poorly calibrated and would make the queue less trustworthy, not more.

| Flag | Condition | Why |
|---|---|---|
| **Methods disagree** | `category_keyword != category_llm` | Strongest signal. Two independent methods diverging = genuine boundary case. Free — both values already stored. |
| **Keyword abstained** | `category_keyword = UNCLASSIFIED` | ~19% of posts. One method couldn't resolve it. |
| **Entertainment suggested** | either method says `entertainment` | Rare (6%), easy to over-assign, and the category the owner cares about most. |
| **Thin caption** | caption < 40 chars, or matches `^PC Merchandise's` | 60 of 730 posts. Little for either method to work with. |

Expected volume: roughly **25–35% of posts flagged**, so ~180–250 of 730. Manageable for one person; a large saving over reviewing everything.

### The screen

Three sections on **S4 Categorisation Review**:

1. **Needs review** — anything flagged. Shown first. Display **both** suggestions, **the flag reason in words** ("methods disagree: testimonial vs product_showcase"), and a **"View post" link** (see below) so the reviewer is *choosing*, not rubber-stamping.
2. **Quick confirm** — both methods agree, no flags. Batch-accept, with any item openable individually.
3. **Locked** — the 200 ground-truth posts. Visible, clearly marked, not editable, **no permalink shown**.

### Permalink — show it on flagged items only

The organic export has a `Permalink` column populated on all 730 rows. Render it as a **"View post"** link, but only in the **Needs review** section.

**Why it belongs there:** the client defines `entertainment` as memes and skits *with the store or its signage visible* — which the caption often doesn't convey. 18 of the 730 posts have a placeholder caption ("PC Merchandise's Video") and 60 are under 40 characters. For those, opening the post resolves in seconds what the caption cannot resolve at all.

**Why it must NOT appear on the locked ground-truth view:** those 200 were coded caption-only, deliberately, because the automated methods also see only the caption. Surfacing the link there invites someone to "check" a ground-truth label against the image, which would break the parity the whole FR-15 comparison rests on.

Not needed in the Quick confirm section — those are batch-confirmed and nobody will be opening them individually.

### Documentation note (our side, but you should know why)

Because flagged posts get individual review while unflagged ones are batch-confirmed, the production labels have deliberately uneven scrutiny. That's a reasonable accuracy-vs-effort trade-off, and we'll state it in Chapter 3. It does **not** touch FR-15 — the ground-truth 200 were coded before any suggestion existed.

---

## 7. THE SEQUENCE — and why the other 530 posts depend on you

**Short version: yes, you build this before we can categorise the rest.**

730 posts total. 200 are now manually labelled. **530 still have no category** — and FR-20, FR-29 and Objective 4.1 all report performance *by category*, so they have almost nothing to report until those 530 are done.

We can't start on them until we know which method won FR-15, because that's the method whose suggestions we'll be reviewing. Hence the order below.

### Build order

| # | Step | Who | Blocks what |
|---|---|---|---|
| 1 | Import the 200 → `category_final`, `source = manual_ground_truth`, locked | you | step 3 |
| 2 | Generate **both** methods' suggestions for **all 730** posts → `category_keyword`, `category_llm` | you | steps 3 and 4 |
| 3 | Compute + display FR-15 on the 200 (§4) | you | tells us which method won |
| 4 | Triage flags + review queue on S4 (§6) | you | our review of the 530 |
| 5 | Review and confirm the 530 | **us** | FR-20, FR-29, Objective 4.1 |

Step 2 is the one to get right: run suggestions across **all 730**, not just the 200. The 200 need them for FR-15 scoring; the 530 need them for the review queue. Same job, one pass.

> ⚠ **Suggestions must never write into `category_final`.** For the 200 that would destroy the ground truth. For the 530 it would mean nobody actually reviewed them. Suggestions land in `category_keyword` / `category_llm` and stay there until a human acts.

### What the S4 review queue needs for the 530

- **Default to the winning method's suggestion** (from step 3), but show both, and label which is which
- Flag reason in words, per §6
- **Batch-confirm** for unflagged posts — one action for many rows, or this takes days instead of hours
- Individual accept / override for flagged posts
- **"View post" permalink link on flagged items** (see §6) — this is what lets us resolve thin-caption and entertainment cases instead of defaulting everything to `unclear`
- Every write stamps `source = accepted_suggestion` or `manual_override`, plus user and timestamp

Expected volume for us: of the 530, roughly 180–250 flagged for individual review, the rest batch-confirmed. About three hours of work on our side — provided the batch action exists. Without it, it's 530 individual clicks and it won't get done before defence.

### Who does the reviewing — and why it isn't the client

**We do**, not Sir Dan. Reviewing 530 posts two weeks before defence isn't a reasonable ask, and if we asked, the realistic outcome is that it doesn't happen and we lose the category analysis.

This is legitimate: categorising the study dataset is *data preparation*, which is a researcher activity. FR-13's marketing-manager role is a *system* feature, demonstrated during the demo and the TAM evaluation on posts he actually handles. Different things, both honest.

For our side of the paper, we'll disclose that 200 posts were coded manually by two independent coders and 530 were categorised using the higher-performing automated method with researcher review, and we'll report the category findings both on all 730 and on the 200 manually-coded posts as a sensitivity check. Nothing for you to do there — just so you know why the `source` field matters and must be accurate on every row.

---

## 8. Checklist

- [ ] Import `ground_truth_categories.csv` → `category_final`, `source = manual_ground_truth`
- [ ] Lock those 200 against overwrite; exclude from auto-categorisation
- [ ] Add `unclear` to ALG-05's allowed labels + the prompt instruction in §3
- [ ] Map ALG-04 `UNCLASSIFIED` → `unclear` for scoring
- [ ] FR-15 computed on all 200, plus a sensitivity figure on the 190 non-unclear
- [ ] S8 displays: both methods, human ceiling κ=0.6505, p_o, p_e, n, confusion matrix, per-category recall
- [ ] Triage flags on S4 (§6) — deterministic only, no confidence thresholds
- [ ] Keyword lexicon and LLM prompt written from definitions, **not** tuned against the ground truth
- [ ] Suggestions generated for **all 730** posts, not just the 200
- [ ] Suggestions never write to `category_final` — for either the 200 or the 530
- [ ] S4 review queue defaults to the winning method, shows both, gives the flag reason
- [ ] **Batch-confirm action exists** for unflagged posts (without it the 530 can't be done in time)
- [ ] `source` stamped correctly on every write: `manual_ground_truth` / `accepted_suggestion` / `manual_override`
- [ ] Permalink rendered as "View post" on **flagged review items only** — never on the locked ground-truth 200
