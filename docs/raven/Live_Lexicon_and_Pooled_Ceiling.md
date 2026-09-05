# The live lexicon should be 50 terms, and here is the pooled ceiling

**Date:** 5 September 2026
**Re:** `FR08_707_Figures_Reconciled_2026-09-05.md`
**Supersedes:** `Live_Lexicon_Contradiction.md`. Work from this one, it adds §6.
**Status:** three answers accepted, one contradiction to resolve, one figure to import

---

## 1. ⚠ §2 says the live keyword table has 93 terms. It should have 50.

Your §2 states that 0.1388 scores "today's 93-keyword table."

**The lexicon was reverted from 93 to 50 terms in August.** Option A, chosen deliberately, and confirmed at the time: "Reverted the live Keyword table 93 to 50 terms to match the seed baseline exactly. Confirmed via dry-run that the removed 43 terms matched the already-documented drift."

That revert resolved the entire lexicon-drift investigation. The 93-term table carried 43 additions that could not be dated relative to the 13 August ground-truth import, several of them miscategorised. The 50-term seed is defensible precisely because it predates the coding, sits in version control, and was written from the category definitions rather than developed against results.

**Three possible explanations, with different consequences.**

The revert did not happen, or was undone by a later migration or seed run.

Keywords were added again afterwards, which would mean **FR-07a's read-only requirement is not enforced**, since that clause exists to make exactly this impossible.

Or the description is stale and the table is in fact 50, in which case 0.1388 and 0.1360 are two computations of the same thing and the difference needs accounting for.

- [ ] **How many rows are in the `Keyword` table right now?**
- [ ] **Were any added after the revert, and if so when and by what path?**
- [ ] **Is FR-07a's read-only enforcement live?** Manage Keywords removed from navigation, view-only display retained, AI keyword suggestions disabled, enforced server-side.

This is the same question the August investigation was about, and it is the one item that could put a wrong figure in the manuscript.

---

## 2. Which keyword figure Chapter 4 reports

Follows from §1.

**If the table is 50 terms**, 0.1388 and 0.1360 should agree and the difference needs explaining before either is used.

**If the table is 93 terms**, Chapter 4 reports the **seed figure**. The reported result must come from a lexicon whose composition on the coding date is provable, and only the seed is.

- [ ] Tell us which state the table is in

---

## 3. The abstention mapping: accepted as a choice, stated in the manuscript

Confirmed at code level that `UNCLASSIFIED` and `UNCLEAR` are scored as distinct labels, deliberately, and documented in `lib/category-label.ts`.

**Defensible and we are not asking for a change.** A method returning no keyword match is a different event from a human judging a caption undecidable, and scoring them as agreement would credit a coincidence.

But it has a material effect, moving the seed figure from 0.136 to 0.212, which crosses a band on the conventional scale. Chapter 4 will state the convention explicitly and report the mapped variant beside it as a sensitivity note, so a reader who would have counted it the other way sees both.

- [ ] **Confirm the mapped variant is computable on request** for whichever lexicon §1 settles on

No code change needed if the one-off script can produce it.

---

## 4. §1, the model provenance: accepted, no re-run

704 of 707 under `llama-3.1-8b-instant`, three posts touched by the later `gpt-oss-20b` re-run, all three predicting `UNCLASSIFIED` under both so neither the confusion matrix nor the kappa moves.

Agreed. No re-run, and no need to re-pin the three, since forcing them back would be tidying rather than correcting.

Verifying against `LlmClassificationRun` internal identifiers rather than trusting the earlier audit is the right kind of independent check, and reporting that the first attempt joined on the wrong key is the reason to trust the second.

**Chapter 3 will state** that categorisation suggestions were generated under `llama-3.1-8b-instant` on 13 August 2026, that the model was subsequently decommissioned by the provider, and that the system is now pinned to `openai/gpt-oss-20b` for future classification.

---

## 5. §4, the 719 against 707 gap: confirmed

Ten `MANUAL_OVERRIDE` and two `ACCEPTED_SUGGESTION`, all predating the legacy nulling, none coded against the codebook. Chapter 4 will state it.

---

## 6. The pooled ceiling, computed

Both coders' original sheets, all 707 posts, same method used for the two session figures.

| Set | n | Percentage agreement | Cohen's kappa |
|---|---|---|---|
| Reference sample | 200 | 78.50% | 0.6505 |
| Backlog set | 507 | 86.79% | 0.7966 |
| **Pooled** | **707** | **84.44%** | **0.7572** |

The reference figure reproduces exactly, which confirms the computation is aligned with the original.

**To import:**

```
npx tsx scripts/import-inter-coder-reliability.ts 707 0.8444 0.7572 "pooled, reference + backlog"
```

- [ ] **Confirm the argument format**, in particular whether agreement should be a proportion (0.8444) or a percentage (84.44). We have used the proportion.

Once imported the combined section's banner should light up, per your §3, with no further change.

### 6.1 What the ceiling means, for the record

The LLM at 707 scores κ = 0.4981 against a human ceiling of 0.7572, so it reaches roughly two thirds of what two trained coders achieved on the same task from the same information. That comparison is the whole reason FR-08 requires the ceiling to be displayed beside the method figures.

Chapter 4 will describe the pooled figure as a pooling of two sessions six weeks apart rather than a third independent measurement, and will report all three.

### 6.2 One thing about the source files

Not a system issue, recorded because the files are appendix evidence.

**Coder B's 200-post sheet has 17 post identifiers destroyed by Excel**, converted to scientific notation. Coder A's is intact.

The pooled figure is unaffected. Both sheets carry an identical `row_no` column and all 200 captions match row for row, so alignment was verified rather than assumed, and the reference figure reproducing exactly at 0.6505 confirms it.

Mentioning it in case Coder B's 200-post labels are ever needed joined to post identifiers. Take the identifiers from Coder A's copy. The file itself will not be repaired, since editing appendix evidence after the fact is worse than the damage.

---

## 7. Priority

1. **§1**, the `Keyword` table count and the read-only enforcement. Everything about which keyword figure we print depends on it.
2. **§6**, import the pooled row once the argument format is confirmed.
3. **§3**, confirm the mapped variant is computable.

We are continuing the second pass on the remaining screens. **Method Evaluation is held** until §1 is settled, since its figures are the subject of this memo.
