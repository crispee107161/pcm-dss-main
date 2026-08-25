# Four questions on the completed work, and one memo that may not have arrived

**Date:** 24 August 2026
**Re:** your completion report against `Provenance_Followup_and_Revised_Order.md` and `Content_Filters_Review.md`
**Length:** short on purpose. Four questions, one gap.

---

## 0. Three things worth saying first

**The deprecated model is the best catch in this document.** Nobody asked whether `llama-3.1-8b-instant` still existed on Groq. Finding that it is fully decommissioned rather than merely unpinned is the kind of thing that otherwise surfaces during a live demo in front of a panel. Making it fail loudly instead of silently corrupting `category_llm` is the right fix and I would not have specified it.

**The NULL-semantics bug that had emptied the Needs Review queue** is equally good, and catching it before commit rather than after is the difference between a bad afternoon and a bad week.

**The line about the audit trail recording the account rather than the physical person**, with the explicit statement that the determination is a team question and not a database question, is exactly right. Answering only what the data can answer, and saying so, is what makes the rest of the report trustworthy.

Everything below is follow-up, not disagreement.

---

## 1. ⚠ Where did the 574 LEGACY_IMPORT rows come from?

This is filed under §2 as a completed fix. I do not think it is one. Adding an enum value and backfilling 574 rows records that the provenance is unknown. It does not establish what the provenance was, and that is the question the memo was asking.

The concern is specific. **574 posts out of 730 carry a final category of unestablished origin.** If a migration promoted method suggestions into `category_final`, and if those suggestions came from the keyword method, then the majority of the corpus is labelled by a method we have measured at κ = 0.139, sitting in the exact field Chapter 4 aggregates by content category. That would not be an annotation gap. It would mean the category analysis reports the keyword method's output back to itself, and no amount of enum labelling fixes it.

**What I need:**

- [ ] Identify the code path or migration that wrote those 574 rows. A commit, a script, a seed step, whatever it was.
- [ ] Confirm whether the written value was `category_keyword`, `category_llm`, some other field, or a genuine user action whose stamp was lost
- [ ] The arithmetic. 574 backfilled plus 130 in queue plus 200 benchmark is 904 against a corpus of 730, so these sets overlap and I cannot reconcile them. Send the counts with the overlaps made explicit.
- [ ] Specifically: are any of the 200 benchmark posts among the 574? If so, the benchmark's provenance is affected and the FR-08 numbers need re-examining.

If the answer turns out to be "a migration promoted suggestions," that is recoverable. We null the affected rows, they return to the queue, and the manuscript describes it as a data-handling control. It is only unrecoverable if we find out in October.

---

## 2. The model change is a methodological event, not a pinning task

`κ = 0.4443` was produced by a model that no longer exists. That figure is now unreproducible in principle, and "we can run it again" is not an answer available to us at the defence.

The re-run gives `κ = 0.4645` on `openai/gpt-oss-20b`, reported as "no degradation." I would not frame it that way. It is not a validation of the old figure. It is a different number, from a different model family, that happens to land higher.

Whether that is good news or a problem depends on two answers:

- [ ] **Was `gpt-oss-20b` the only model tried?** If several were tested and the best-scoring one kept, that is selection against the score, and it has to be disclosed whatever the intent behind it was. I am not assuming it happened. I am asking because I have to be able to state one way or the other in Chapter 3.
- [ ] **Was the re-run done with the identical prompt, temperature 0, scored against `category_ground_truth` on the same 200 posts?** Confirm each of the four.

If the answers are "only one model" and "yes to all four," this is genuinely good news and I will report **0.4645 as the primary figure**, since it is what the delivered system produces and it is reproducible. The llama result then becomes a supporting footnote showing the finding held across two model families, which is a stronger claim than a single-model result would have been. That framing only survives if the model choice was not a search.

- [ ] Also confirm `gpt-oss-20b` is a pinned identifier on Groq and not itself an alias that can move under us

---

## 3. The prompt changed on 14 August. The ground truth imported on 13 August.

Your report says the prompt is in version control and unchanged since 2026-08-14. A prompt stable since the 14th is a prompt that changed on the 14th, and that is precisely the window the provenance question was about.

- [ ] Send the diff for that commit
- [ ] Confirm which LLM suggestions in `LlmClassificationRun` predate it and which follow it

If it was a typo, a formatting change, or a variable rename, we note it in one sentence and it is closed. If it altered the category definitions or the classification instructions, then suggestions recorded before that commit came from a different prompt than suggestions recorded after, and the historical κ needs the same treatment the keyword figure got.

You have the run history, so this should be a quick look rather than an investigation.

---

## 4. Did `Content_Screen_Review.md` reach you?

Nothing from it appears in the completion report, so I suspect it did not arrive rather than that it was skipped. It was sent alongside the other two and covers the Needs Review screen specifically:

- On-demand **Generate suggestions** and **Generate AI suggestions** buttons, which let suggestions be produced at an arbitrary time against whatever lexicon and prompt are current. That was the blocking item in that memo, and it connects directly to §1 above, since a regeneration button is one plausible route to 574 rows of unknown origin.
- Batch confirm reading 30 of 130, with seven counts requested to reconcile it, and a question about what "both methods agree" certifies when one of the methods scores κ = 0.139
- Rows flagged as sitting between two categories while displaying only one suggestion chip
- An empty-caption row flagged as a method disagreement rather than as caption-below-length
- The disabled Save button, which is correct behaviour but reads as a bug without helper text

Tell me if you need it resent.

---

## 5. Still outstanding from the re-run spec, which was priority 1

The lexicon revert (93 to 50) is done and confirmed. The re-run against it is not in the report. Those are two separate jobs and only the first appears.

- [ ] **FR-08 keyword κ against the 50-term seed lexicon**, on the 200 benchmark posts, scored against `category_ground_truth`. Full output: n, percentage agreement, p_o, p_e, Cohen's kappa, 5×5 confusion matrix, per-category recall.
- [ ] **The `UNCLASSIFIED` to `unclear` mapping.** Unconfirmed since 22 August. A method correctly abstaining on a captionless post is right, not wrong, and should score as agreement. Confirm whether it is implemented, and if not, implement it before the re-run so the figure is computed on the intended rules.
- [ ] **Lexicon read-only**, view-only display retained, enforced server-side, with AI keyword suggestions disabled. You had the go-ahead on this. The revert to 50 terms does not prevent the table drifting again.
- [ ] **Snapshots committed** for the manuscript appendix: 50-term seed lexicon, the 93-term table as it stood, and the LLM prompt.

This is still the only work blocking Chapter 3 and Chapter 4.

---

## 6. Order

| # | Item | Why |
|---|---|---|
| 1 | Origin of the 574 (§1) | Determines whether Chapter 4's category analysis is usable |
| 2 | Keyword re-run on the 50-term seed (§5) | Blocks two chapters |
| 3 | Model selection answer and 14 Aug prompt diff (§2, §3) | Both are lookups, minutes each |
| 4 | Lexicon read-only and snapshots (§5) | Small, stops recurrence |
| 5 | Everything in `Content_Screen_Review.md` (§4) | Once we confirm you have it |

The deferred items you flagged in §8 of the filters memo, meaning sortable columns, full-caption search, and the category and post-type and provenance filters, are fine to leave. None of them block writing and I would rather have the provenance settled.

---

## 7. If you only do one thing

**§1.** Everything else on this list is a lookup or a re-run. The 574 is the only open item that could change what Chapter 4 is allowed to claim.
