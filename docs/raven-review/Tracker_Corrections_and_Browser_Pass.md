# Tracker corrections, two answers that keep not landing, and one thing to schedule

**Date:** 26 August 2026
**Re:** `PROGRESS.md` and `Content_Review_Response_Followup_2026-08-26.md`
**Status:** six items, four of which are corrections to the tracker rather than code

---

## 0. The code work is good

The captionless repair is the part I want to name. Fixing the abstention path only changed behaviour for future runs, and the five posts that motivated the fix still carried their stale guesses with a selection query that would never have picked them up again. Catching that in review, dry-running the ids first, then repairing them is the difference between a fix and a fixed system.

The audit-log misattribution is the same category. Logging Groq's response against the whole batch when it only saw the captioned subset would have been invisible until someone audited a mixed batch, which is to say probably never, and it would have been wrong in exactly the way this project cannot afford.

And unifying the three names for the same state through `selectableLabelText` is the sort of thing that only shows up when someone actually reads their own diff.

---

## 1. ⚠ PROGRESS.md's first row carries a conclusion we replaced

`Content_Counts_and_Backlog.md` row 1 reads:

> "Resolved — 730 was a stale figure on Raven's side; live corpus is 916, all reconciles exactly."

That was the 25 August answer, and the study-period audit that same day replaced it. The corrected position:

- **730 was correct** for the twelve organic exports the client provided, all published within August 2025 to July 2026
- **916 is the ingested total**, from sixteen monthly uploads spanning April 2025 to July 2026
- **185 posts sit outside the declared study period**, contributed by the four extra months
- **The in-period corpus is 731**, one more than 730 because a post publishing at 03:57 Manila on 1 August 2025 arrived in the July 2025 file, which exists only on your side
- FR-04a now excludes the out-of-period records from every analytical path

This matters more than a tracker row usually would, because `PROGRESS.md` is the document a future reader opens first. As written, it says our manuscript figure was wrong when it was not.

- [ ] Correct that row, pointing at `Study_Period_Scope_Response_2026-08-25.md` and `FR04a_Implementation_and_731st_Post_Response_2026-08-25.md`

---

## 2. Two tracker rows conflate items we separated

**"Suggestions generated once at ingestion, method version recorded" is listed as not started.** That row is half stale.

The ingestion trigger was **dropped from FR-07 deliberately**, on your recommendation, because no other requirement commits to a trigger. It is not outstanding, it is gone.

The version identifier was **built**, in `Ad_Scope_And_Chat_Conditions_Landed_2026-08-25.md`: `category_llm_model` and `category_keyword_lexicon_count`. That half is done.

- [ ] Split the row: version stamps done, ingestion trigger removed from scope

**FR-07's revised wording and FR-07a are marked as manuscript text not applied.** Correct as far as it goes, but for your tracking: FR-07a no longer exists as a separate requirement. The lexicon read-only clause was folded into FR-07 when the table consolidated at twenty-one items. Nothing for you to do, the behaviour is implemented and confirmed.

---

## 3. Note to Dev 1: it is advertising data, not a screen

This is the second time this has not landed, so plainly and in full.

**297, 24, 309, and 26 are advertising figures.** They come from the twelve `PCM-ADS-*.csv` exports, not from anything in the Content screens, the categorisation counts, or any dashboard.

| Figure | What it is |
|---|---|
| 309 | Distinct **ad IDs** |
| 297 | Distinct **ad names** |
| 26 | Distinct **ad set IDs** |
| 24 | Distinct **ad set names** |
| 26 | Distinct campaigns, in a strict one-to-one mapping with ad sets |

The gaps exist because **ten ad names are reused across multiple ad IDs**, and two ad set names likewise.

The original note said Chapter 1 counts advertisements and ad sets by name while counting campaigns by ID, which is inconsistent, and that the manuscript should count everything by ID since the system keys on IDs and FR-05 preserves the ID hierarchy.

**Nothing for you to do.** This is a Chapter 1 prose correction on our side. Please close the row as answered so it stops appearing in the open list.

---

## 4. The "no caption text" decision, resolved differently

Your 26 August note keeps it removed, on the grounds that if the only problem is a missing caption the answer is to open the post.

That was my reasoning, and I retracted it twice after we confirmed the backlog would be coded **caption-only**, matching the 200-post ground-truth procedure. Under caption-only coding a reviewer never opens the post, so absent caption text is legitimate grounds for recording no category.

**But there is a better resolution than reversing your decision, because no reason-capture UI exists and building one now is not worth it.**

The reason goes in the **researchers' coding sheet** instead, as a column beside the category. That makes it part of the research record rather than a system feature, it gives Chapter 4 the breakdown of why posts were left uncategorised, and it costs nothing to build.

- [ ] Close the reason-capture item as **not building**, with the reason recorded in the coding sheet instead
- [ ] Confirm `scripts/import-codebook-assignment.ts` ignores extra CSV columns, so a reason column in the sheet does not break the import

That last one is the only code question here.

---

## 5. Do not resend `Content_Screen_Review.md`

It is superseded rather than lost, and re-actioning it would waste your time.

Its two substantive asks were the batch-confirm reconciliation of 30 out of 130, and what agreement certifies when one method scores κ = 0.139. The counts are stale, and the underlying risk is gone, because the 519-post backlog is being coded by researchers against the codebook rather than confirmed in batches.

One thing worth confirming instead of resending the memo:

- [ ] **Does batch confirm stamp a distinct `category_final_source`?** You mentioned `ACCEPTED_SUGGESTION` with two rows, which suggests yes

If it does, any batch-confirmed label stays distinguishable from a codebook assignment in Chapter 4's provenance counts, and the question closes for good.

- [ ] Close the `Content_Screen_Review.md` row as superseded

---

## 6. Two things to accept and document

**Codebook imports stamp `assigned_by_id: null`.** I am content with this. It matches the ground-truth import, and per-researcher attribution in the database would duplicate what the coding sheet already records. Chapter 3 will state that assignments made through the codebook import are attributed to the research procedure rather than to an individual account, which is honest and avoids implying the audit trail carries information it does not.

No change requested. Recording the decision so it does not resurface.

**Nothing has been verified in a browser.** Every recent change passes tsc, the test suite, and the build, with a standing caveat that no live click-through happened. That is the right standard for correctness and it is not sufficient for a demonstration.

- [ ] **Schedule a full click-through**, all three accounts, every screen, well before October

The specific risk is not a broken build. It is a render-time error on a screen nobody has opened since a change, surfacing while a panel watches. Worth an afternoon, and worth doing before the backlog import rather than after, so the queue still has content to demonstrate with.

---

## 7. Summary

| Item | Action |
|---|---|
| 1 | Correct PROGRESS.md's 730/916 row to the study-period conclusion |
| 2 | Split the ingestion-trigger row, version stamps are done |
| 3 | Close Note to Dev 1, it is advertising data, ours to fix in Chapter 1 |
| 4 | Close reason-capture as not building, confirm the import ignores extra columns |
| 5 | Close `Content_Screen_Review.md` as superseded, confirm batch confirm stamps its own source |
| 6 | Schedule the browser pass |

Two code questions in the whole list, both one-liners. Everything else is tracker hygiene, which matters only because that file is what someone reads first when they come to this cold.
