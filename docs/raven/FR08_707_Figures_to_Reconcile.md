# FR-08 at 707: three figures to reconcile before this goes into Chapter 4

**Date:** 5 September 2026
**Re:** `FR08_707_Expansion_Response_2026-09-05.md`
**Status:** two questions that must be answered before we write from these numbers, one worth building, one confirmation

---

## 1. ⚠ Which model produced the suggestions being scored?

This is the blocking question.

The LLM figure at n = 200 is **κ = 0.4443**. That is the **llama-3.1-8b-instant** result, from the model Groq decommissioned mid-project. The re-run under `openai/gpt-oss-20b` gave **κ = 0.4645**.

So the stored `category_llm` values for the 200 appear to still be llama output, and the re-run was computed without being written back.

**The consequence for the combined figure.** The 507 backlog posts had their suggestions generated at some point. If that happened after the model was pinned to `gpt-oss-20b`, then the 707-post figure of 0.4981 is scoring **two different models' output as a single method**.

- [ ] **Which model produced `category_llm` for the 200 reference posts?**
- [ ] **Which model produced `category_llm` for the 507 backlog posts?**
- [ ] **If they differ, can the whole corpus be re-classified under `gpt-oss-20b` so the figure describes one method?**

If a re-run is needed, it should be a straightforward pass, and the resulting figure is the one Chapter 4 reports. If they are already the same model, tell us which one and this closes.

Chapter 3 will state the model used for categorisation. That sentence has to be true of the figure Chapter 4 prints.

---

## 2. ⚠ The keyword kappa has moved and we need the current figure

Three values are now in circulation for the same method on the same 200 posts:

| Source | Value |
|---|---|
| Seed lexicon re-run, raw | 0.1360 |
| Seed lexicon re-run, with the UNCLASSIFIED to unclear mapping applied | 0.2115 |
| This memo | **0.1388** |

- [ ] **Which is current?**
- [ ] **Is the UNCLASSIFIED to unclear mapping applied in the figures in this memo?**

The mapping question matters more than the difference. If a method correctly abstains on a post the coders also marked `unclear`, that is agreement, not a miss. Whether the reported kappa credits it changes the number materially, from 0.136 to 0.212 on the 200.

Chapter 4 states one figure with one definition behind it, so we need to know which.

Related: the recall table shows `unclear` recall at 0.0 per cent for both methods at both scopes, and your note says neither pipeline ever predicts `UNCLEAR`. If the mapping is applied, that would presumably not be true, which suggests it is not applied here.

---

## 3. A pooled ceiling is computable, and the 707 figure needs one

Your §4 reasoning is right. Scoping the ceiling banner to the reference section, and refusing to show a 200-post ceiling above a 707-post figure, is correct.

But it leaves the strongest result on the screen with no comparator beside it, and a kappa without a human ceiling is the thing FR-08 exists to prevent.

**A pooled ceiling exists and can be computed.** Both coders labelled all 707 posts independently. Agreement across the combined set is calculable from the same two pairs of sheets, and comes to roughly 84 per cent with a kappa between the two session figures.

We will compute it from our own sheets and send it.

- [ ] **Can `import-inter-coder-reliability.ts` take a third row for the pooled set**, so the combined section has a ceiling above it?
- [ ] If so, we will send the pooled figure with its n and its percentage agreement

Chapter 4 then reports three inter-coder figures: the reference session, the backlog session, and the pooled figure that serves as the ceiling for the combined result. All three from the same two coders, none merged silently.

---

## 4. One thing to confirm, and it needs a sentence in Chapter 4

The dashboard reports **719 categorised** and this memo scores **707**.

The difference is the **12 posts carrying `MANUAL_OVERRIDE` or `ACCEPTED_SUGGESTION`** from before the legacy nulling, correctly excluded here because they were not coded against the codebook.

- [ ] **Confirm that is the whole of the difference**

That is the right exclusion and we will state it in Chapter 4 rather than leave two numbers unexplained. Confirming so the sentence is accurate.

---

## 5. §3 is the finding, and it is stronger than "more data, same conclusion"

Your reading is right and it should be written up as its own observation rather than as a footnote to the 200-post result.

**The keyword method predicts product showcase for 576 of 707 posts**, which is 81 per cent of the corpus. Testimonial recall 2.4 per cent, entertainment recall 1.3 per cent, down from 8.3 per cent at 200.

It is a showcase detector. The 200-post sample understated how lopsided it is, and the fuller corpus makes that visible in a way a kappa alone does not.

Meanwhile the LLM improves on both axes and its recall evens out considerably, with promotional offer roughly doubling from 38.5 to 61.9 per cent.

That is a qualitative change in what can be said about the keyword method, not merely a tighter estimate of the same thing. It goes in Chapter 4 as a finding about method behaviour.

---

## 6. Implementation accepted

Two sections side by side, the reference figures kept exactly where they were, a single query split by source so a row cannot land in both buckets or neither, and a test asserting the buckets do not leak. That is the right shape.

Per-category recall below each confusion matrix is a genuine addition. It is what makes §5 visible at all, since the kappa alone moves so little between the two scopes that the change in behaviour would be invisible without it.

---

## 7. Priority

1. **§1**, the model provenance. Blocking, because it determines whether the 707 figure describes one method or two.
2. **§2**, which keyword figure is current and whether the mapping is applied.
3. **§4**, the 719 against 707 confirmation. One line.
4. **§3**, the pooled ceiling. Worth building, not blocking.

We are holding the second pass on the remaining screens until §1 and §2 are settled, since the Method Evaluation screen is one of the ones we would be reviewing.
