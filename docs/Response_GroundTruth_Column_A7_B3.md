# Re: ground-truth column + open decisions A7 and B3

**Date:** 13 August 2026
**Short version:** you're right about the column. Adopt `category_ground_truth`, with one addition. A7 and B3 are decided below.

---

## 1. Ground-truth column — your proposal is correct, adopt it

Both objections hold, and the second one I hadn't thought through properly.

**Overwrite risk.** Importing research labels into the operational column, destructively, with no audit entry, is wrong regardless of whether anything is currently there. Agreed.

**`unclear` leaking into business screens.** This is the sharper point. `unclear` is a coding-process label meaning *"the caption doesn't permit a decision."* It is not a content category. The owner looking at a category-distribution chart and seeing "Unclear 5%" learns nothing — it's an artefact of our method leaking into his dashboard.

### Adopt

```
category_ground_truth   -- 200 rows, immutable, research only, may contain 'unclear'
category_keyword        -- suggestion, all 730
category_llm            -- suggestion, all 730
category_final          -- operational, human-finalised, business-facing
```

FR-15 scores `category_keyword` and `category_llm` against **`category_ground_truth`**, never against `category_final`. That's a strict improvement: it means FR-15 cannot be contaminated later by anyone editing the operational label.

### The one addition — seed `category_final` from the ground truth

If we stop at your proposal as written, those 200 posts have **no operational category**, which means we'd have to review them again in S4 — and if the reviewer sees a suggestion and accepts it, our business analytics would use a machine label for 200 posts we already hand-coded twice over. That's the best label data in the project sitting unused.

So, as a **separate, explicit, logged step** (not part of the research import):

```
For each of the 200 posts:
    IF category_final IS NULL
    AND category_ground_truth != 'unclear'
        SET category_final = category_ground_truth
        SET source = 'manual_ground_truth'
        write an audit-log entry
```

Three properties that answer your objections:

- **`IF category_final IS NULL`** — never overwrites anyone's work. If a human already finalised a post, it's left alone.
- **`!= 'unclear'`** — the ~10 unclear posts get no operational label. They stay uncategorised, which is the honest state, and never appear as a category on a business screen.
- **Logged, with a source value** — fully auditable.

Run it as a separate script or a flagged import step, whichever is cleaner for you.

### On `unclear` in business screens generally

Worth solving properly, because this isn't only about the 200. When we review the other 530, some of those will be `unclear` too — 18 of the 730 posts have a placeholder caption ("PC Merchandise's Video") and 60 are under 40 characters. Roughly 5% of the corpus is genuinely uncategorisable from text.

**Display rule:** on any business-facing category screen (FR-20, FR-29, the dashboard), `unclear` and null are **excluded from the breakdown**, and the chart shows *"n categorised of N total"* underneath. That's honest — it tells the owner the coverage without inventing a category. `unclear` appears only on the Method Evaluation screen (S8), where it's a legitimate fifth label.

The reasoning, in case it comes up: a category is a property of the **content**; `unclear` is a property of the **evidence** — it records that the caption didn't permit a judgement. Those are different kinds of fact, so they belong on different screens. Showing "Unclear 5%" next to "Testimonial 28%" would imply the client publishes a fifth kind of content, which he doesn't.

### NEW — we need to distinguish "not yet reviewed" from "reviewed, uncategorisable"

This is a gap in what we sent you earlier. If an `unclear` post simply has `category_final = NULL`, it is indistinguishable from a post nobody has looked at yet — and then "40 posts were reviewed and found uncategorisable" becomes an unprovable claim rather than a queryable fact.

Please add a **`review_status`** field alongside `category_final`:

| Value | Meaning |
|---|---|
| `pending` | nobody has reviewed this post yet |
| `categorised` | a human set a real category |
| `unresolvable` | a human reviewed it and concluded the caption doesn't permit a decision |

Behaviour:

- A reviewer marking a post unclear in S4 sets `category_final = NULL` **and** `review_status = 'unresolvable'`, logged like any other write (user + timestamp).
- The seeding step in §1 sets `review_status = 'categorised'` for the 190 non-unclear ground-truth posts, and `'unresolvable'` for the 10 unclear ones.
- Business category screens exclude **both** `pending` and `unresolvable` from the breakdown, but report their counts separately in the "n categorised of N total" line.

We need the `unresolvable` count for the manuscript, so it has to be a stored state rather than an absence.

---

## 2. DECISION — A7: triage flags

Build these four. Deterministic, computed from stored data, **OR'd together** — any one is enough to flag a post.

| # | Flag | Condition |
|---|---|---|
| 1 | Methods disagree | `category_keyword != category_llm`, both non-null |
| 2 | Keyword abstained | `category_keyword = 'UNCLASSIFIED'` |
| 3 | Entertainment suggested | either method = `'entertainment'` |
| 4 | Thin caption | normalised caption length **< 40 characters**, OR caption matches `^PC Merchandise's` |

**Cutoff is 40 characters**, measured on the NFKC-normalised caption after whitespace collapse (i.e. the same string fed to the classifiers, not the raw field). That catches 60 of 730 posts. Make it a named constant so it can be adjusted without hunting through code.

**No confidence threshold.** I floated LLM self-reported confidence as a fifth flag earlier — drop it. It's poorly calibrated, and a queue built partly on an unreliable signal is worse than one built on four solid ones.

**Store the flag reason(s), not just a boolean.** The UI shows them in words ("methods disagree: testimonial vs product_showcase"), and we need the counts by reason for the manuscript.

---

## 3. DECISION — B3: default suggestion in the review queue

Don't pre-select a default on flagged items. Here's the cleaner rule, which also removes the chicken-and-egg problem of needing FR-15's winner before FR-15 has run:

**Unflagged posts** (both methods agree, no other flag fires): there's no conflict — both methods said the same thing. That agreed label is the batch-confirm value. No "winner" needed.

**Flagged posts:** show **both** suggestions side by side, clearly labelled which is which, with **neither pre-selected**. The reviewer must actively choose one, or type a third option, or mark `unclear`.

Rationale: on flagged posts the two methods disagree or one abstained — that's precisely where a pre-selected default becomes a rubber stamp. Forcing an explicit choice is the whole point of the queue. It also means the queue works before FR-15 has run.

**Ordering within the queue** (which post appears first): sort by flag reason, most-informative first — methods disagree, then entertainment suggested, then keyword abstained, then thin caption. Reviewer fatigue is real; put the cases that most need fresh attention at the top.

If you'd still like a default for speed, we can revisit once FR-15 tells us which method won — but I'd rather not. The extra click is cheap and the labels are better for it.

---

## 4. Doesn't change

- FR-15 population is still all 200, `unclear` scored as a full fifth label (the human ceiling κ = 0.6505 was computed on all 200 — scoring the machine on 190 would compare against a ceiling from a different set)
- Sensitivity figure on the 190 non-`unclear` posts still wanted
- Permalink still on flagged review items only, never on the ground-truth view
- Suggestions still generated for all 730, never writing to `category_final`

---

## 5. Permalink on `unclear` posts — one distinction

You may be tempted to surface the permalink on ground-truth `unclear` posts so they can be resolved. **Don't** — and it's worth knowing why, since the rule differs by post set.

| Post set | Permalink? | Why |
|---|---|---|
| The 530 production review | **Yes**, on flagged items | No reliability measure depends on these. The client defines `entertainment` partly visually ("memes and skits with the store signage visible"), which captions often don't convey. |
| The 200 ground-truth posts | **No** | Coded caption-only and frozen before kappa was computed. Reopening them would change the ground truth after the fact — and would look, at defence, like we softened an inconvenient result. 10 posts isn't worth that. |

So: the ground-truth view stays permalink-free, including its `unclear` rows. The review queue for the 530 gets "View post" on flagged items as already specced.

---

## 6. What we'd like back

Once you've pushed:

- Confirmation of the final column names, so Chapter 3 describes the real schema
- The 40-character constant's name/location, in case we need to state it
- The `review_status` value counts across all 730, once the 530 are reviewed
- The flag-reason counts across the 530, when they're computed

Good catch on this one — the separation is cleaner than what we specified, and the `unclear`-in-analytics problem would have shown up as a confusing chart in front of the panel.
