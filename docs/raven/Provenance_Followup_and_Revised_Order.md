# Provenance follow-up, FR-08 scope, and revised order of work

**Date:** 23 August 2026
**Re:** your response to `Categorisation_Workflow_Consolidation.md`, and `Lexicon_Drift_Rerun_Spec.md`
**Status:** three new questions, one requirement conflict to settle, one revised priority list

---

## 0. First, the lexicon catch

Surfacing the 43 undated keyword additions without being asked was the right call, and diffing the live `Keyword` table against `prisma/seed.ts` was the right way to establish it. It would have been easy to answer "the 50 seed keywords are unmodified" and stop, which is technically true and would have left the finding buried. You did not do that, and you also connected the miscategorised terms to the κ = 0.139 result rather than treating them as unrelated facts. That is the behaviour that makes the methodology defensible, so thank you.

Everything below builds on that rather than disputing it.

---

## 1. On the ordering

Your proposed order was: confirm §0 is already answered, then §2 (remove Propose), §4 (row interaction), §3 (merge). Smallest to largest, each independently shippable. The reasoning is sound and I agree with it as an ordering of the UX work.

The issue is that every item on that list **is** UX. The FR-08 re-run does not appear on it, because the lexicon finding got filed as "question answered, one open item pending go-ahead." It is not that. It is a finding that the reported keyword-method figure describes an artefact whose composition on the evaluation date cannot be established.

That distinction matters for a specific reason: **the re-run is the only item on either list that blocks a chapter.** Chapter 3 cannot state what the keyword method was, and Chapter 4 cannot report κ against it, until the seed lexicon result exists. The merge, the Propose removal, and the row fix are all improvements to a system that already works. None of them block writing.

So the revised order in §6 of `Lexicon_Drift_Rerun_Spec.md` stands: re-run first, read-only second, then your order unchanged.

---

## 2. Three questions neither document has asked

These came out of reviewing your response. None of them are criticisms of work done. They are gaps in what we have established, and all three affect what Chapter 3 can claim.

### 2.1 The LLM prompt has the same provenance question

We now have a clear answer on the keyword lexicon: seed baseline in version control, 43 undated additions on top, evaluation to be run against the seed. Good.

**Nobody has asked the equivalent question about the LLM prompt.**

κ = 0.444 rests on the prompt exactly as κ = 0.139 rests on the lexicon. If the prompt was edited at any point after the 13 August ground-truth import, the LLM figure is in the same position the keyword figure is in now.

It is worth being blunt about the asymmetry here. Contamination in the keyword lexicon pushed the score **down**, which is why §2.1 of the re-run spec concluded it was ordinary lexicon-building rather than tuning. The LLM figure is the one that currently looks good. If there is a provenance problem on that side, it runs in the direction that inflates rather than depresses, and a panelist who has just heard us explain the lexicon control will ask about the prompt in the next breath.

**What I need:**

- [ ] Where does the categorisation prompt live? File path, and is it in version control?
- [ ] Commit history showing its state on or before 13 August 2026
- [ ] Confirmation of whether it has been edited since, and if so, what changed and when
- [ ] Confirmation that the model and temperature are pinned and unchanged (`Llama 3.1 8B via Groq`, temperature 0, per the original spec)
- [ ] Snapshot the prompt to a committed file for the manuscript appendix, same as the two lexicons

If the prompt has moved, say so plainly and we handle it the same way we are handling the lexicon: re-run against the version that predates the coding, and document the control in Chapter 3. A second documented control is not a weakness in the paper. An undocumented change discovered at the defence is.

### 2.2 The evaluated system and the delivered system are about to diverge

If FR-08 reports against the 50-term seed but the live table stays at 93 terms, then Chapter 4 reports the accuracy of a lexicon **the deployed system does not use.** A panelist can ask, reasonably, which lexicon the running system uses, and the honest answer would be "a different one, which we did not evaluate."

There are only two coherent resolutions:

**Option A (recommended). Revert the live table to the 50-term seed and freeze it there.** Evaluated equals delivered. One number, one lexicon, one sentence in Chapter 3. The 43 additions get snapshotted to a committed file and reported as a documented finding rather than shipped.

**Option B. Ship 93, evaluate both, and state in Chapter 3 that the delivered lexicon differs from the evaluated one.** Defensible only if both figures are reported, and it means knowingly deploying terms we have documented as wrong.

I would take A. What I want to avoid is the third option that is not on the list: shipping 93 with the corrections applied. That is barred for the reason already given in the re-run spec, which is that it is tuning after seeing results. If the corrections are worth making, and they probably are, they belong in **Chapter 5 as a recommendation**, written after the evaluation is reported. Not before it.

**What I need:**

- [ ] Your call on A or B, with a reason if it is B
- [ ] Either way, both lexicons snapshotted to committed files

### 2.3 Who has been clearing the queue?

Your memo noted the queue went from 141 to 130 during the window, and that someone was categorising as we spoke. §0 asked for that to pause. What has not been established is **who** it was.

This matters more than the eleven posts. FR-07 says final assignment is retained by the marketing manager, and Chapter 3 will say the same. If a group member has been working through the backlog, then `category_final` for those posts was set by a researcher rather than by the client's domain authority, and the provenance of the labels does not match the requirement the manuscript states.

Eleven posts is recoverable. If it turns out this has been happening at scale across the 730, that is a different conversation and I need to know now rather than in October.

**What I need:**

- [ ] Query the audit trail: for every post with `category_final` set, which user account set it and when
- [ ] Send the breakdown by user

If it is all Sir Dan, this closes in one message and I will write it into Chapter 3 as evidence that assignment provenance is auditable, which is a point in our favour. If group members have been assigning, we choose between handing the queue back to Sir Dan and documenting explicitly in Chapter 3 who assigned what, with the audit trail as the evidence. Either is survivable. Discovering it late is not.

---

## 3. FR-08: scope, access, and a measurement trap

You have not asked about this, but it affects what you build, so settling it now saves rework.

### 3.1 The trap in the current wording

FR-08 as written says each method is reported "against the manual labels." That phrasing is ambiguous, and one of the two readings is fatal.

If it means **the manager's confirmed assignments in the live system**, the number is contaminated by construction. He sees the suggestion, accepts it, and then we measure agreement between the suggestion and a label produced by looking at the suggestion. κ drifts toward 1 as more batches are confirmed, and what it measures is his acceptance behaviour, not the method's accuracy.

The clean measurement is the one we already have and it is not that: the 200 posts, seed 20260812, coded independently by Janine and me against the client-validated codebook, human ceiling κ = 0.6505 at 78.5 per cent agreement. Those labels were produced without sight of any machine suggestion. That is the only set an accuracy claim can rest on.

### 3.2 The split

**FR-08 accuracy reporting runs against the fixed 200-post benchmark only.** `category_ground_truth`, never `category_final`. The human inter-coder κ displays on the same screen as the ceiling against which the method figures are read. Same numbers as Chapter 4, computed by the system rather than pasted into it, which is what makes objective 2.2 a system objective rather than a spreadsheet result.

**Live monitoring, if we want it, is a separate and differently named figure.** Suggestion acceptance rate. "The manager changed 23 per cent of LLM suggestions this month." No κ attached, never called accuracy. It is a drift signal, useful for noticing when the LLM starts failing on newer content, and it should be honest about being one.

The recording half of FR-08 still applies to **all** posts regardless, because FR-07's review prioritisation depends on detecting disagreement between the two methods, so both must run on everything that comes in.

### 3.3 Access

**Marketing manager only.**

She is the one who owns categorisation under FR-07, and the only operational decision this analysis informs is hers: how much to trust a suggestion before confirming a batch. Keyword at 0.139 against LLM at 0.444 is the difference between "review everything" and "review the flagged ones, spot-check the rest."

The owner does not need it. A confusion matrix on his dashboard is noise against the efficiency reporting he actually opens the system for. He sees the categorised results and the reliability figure that qualifies them, not the diagnostics behind them. Marketing team members should not see it at all, since under §2 of your memo they neither assign nor review categories.

### 3.4 Revised FR-08 wording for Chapter 3

> **FR-08 Categorisation method evaluation.** The system shall record the suggestion produced by each categorisation method for every organic post alongside the category ultimately assigned, and shall report, for each method against a fixed manually coded reference sample, percentage agreement, Cohen's kappa, a confusion matrix, and per-category recall, displaying alongside these the inter-coder agreement attained by human coders on the same sample as the reference level against which method performance is interpreted. The system shall additionally report, separately from the preceding, the proportion of suggestions altered by the reviewer in each ingestion period. Access to this module shall be restricted to the marketing manager.

**Build implications:**

- [ ] The 200 coded posts load as a fixed, immutable benchmark set, excluded from the queue and not editable through any UI
- [ ] Accuracy metrics compute against `category_ground_truth` only
- [ ] Human inter-coder κ renders on the same screen as the method figures
- [ ] Acceptance rate is a separate figure with separate labelling, no κ
- [ ] Module restricted to the marketing manager role, enforced server-side

---

## 4. FR-07: two versions exist, use the newer one

You asked me to check what you built from. You were right to ask, because there are two versions in circulation.

**The version in the Chapter 3 PDF** says the system shall prioritise for review "those posts whose category could not be determined with confidence."

**The newer working version** names four explicit flag conditions: the methods disagree, a method returned no result, entertainment was suggested, or the caption falls below a defined length.

**Use the newer one.** Vague wording is not testable at the defence. "Posts the system was unsure about" invites a panelist to ask how unsure, and there is no good answer to that. Four named, checkable conditions answer the question before it is asked, and they are also implementable without judgment calls.

Neither version mentions team proposals or `category_pending`, so your read in §5 of the consolidation memo was correct: the requirement is already right and the build is ahead of it. Removing Propose brings the build back into line rather than requiring a requirement change.

One small gap on my side. Cohen's kappa appears in the objectives and in FR-08 and nowhere in the Definition of Terms. I am adding it. It carries the whole weight of objective 2.2 and cannot go undefined.

---

## 5. Revised order of work

| # | Item | Blocks | Size |
|---|---|---|---|
| **1** | **Re-run FR-08 on the 50-keyword seed** (§3 of the re-run spec) | Chapters 3 and 4 | Small |
| **2** | **Answer §2.1, §2.2, §2.3 of this memo** (prompt provenance, lexicon decision, queue audit) | Chapter 3 methodology | Minutes each |
| **3** | Make the lexicon read-only (§5 of the re-run spec) | Nothing, but stops recurrence | Small |
| 4 | Remove Propose and `category_pending` | Nothing | Small |
| 5 | Row interaction fix | Nothing | Small, biggest UX gain per hour |
| 6 | Merge Content Library and Categorisation Review | Nothing | Large, needs a dedicated session |
| 7 | FR-08 benchmark and access changes (§3 of this memo) | Nothing, but it is an objective | Medium |

Items 1 and 2 are the only things that block writing. Everything from 3 down is your original order with the FR-08 build work appended, and I am happy for you to sequence 3 through 7 however suits the code.

---

## 6. Consolidated checklist

**Re-run and provenance**

- [ ] FR-08 re-run on the 50-keyword seed, scored against `category_ground_truth`, per §3.1 of the re-run spec
- [ ] Confirm the `UNCLASSIFIED` to `unclear` mapping is implemented before the re-run, so both lexicons score on the same rules
- [ ] LLM prompt: file path, version control status, commit history to 13 August, edit history since
- [ ] Confirm model and temperature pinned and unchanged
- [ ] Decision on Option A or Option B for the delivered lexicon
- [ ] Audit trail query: who set `category_final`, on which posts, when
- [ ] Snapshot to committed files: 50-term seed lexicon, 93-term live table, LLM prompt

**Requirements**

- [ ] Build against the four-condition FR-07, not the "confidence" wording
- [ ] FR-08 accuracy computed against the 200-post benchmark only
- [ ] Acceptance rate implemented as a separate, differently labelled figure
- [ ] FR-08 module restricted to marketing manager, enforced server-side
- [ ] Benchmark 200 locked, excluded from queue, not editable

**Then the UX work**, in your original order.

---

## 7. If you only do two things

**§2.1 and §2.3.** The prompt provenance and the queue audit. Both are queries rather than changes, both cost minutes, and both are questions a panelist can ask in October that we currently cannot answer.

The re-run at position 1 is the thing I cannot write around. Everything else can move.
