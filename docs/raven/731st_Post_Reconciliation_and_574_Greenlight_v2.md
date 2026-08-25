# The 731st post: one arithmetic tension to close, plus the 574 dry run is green

**Date:** 25 August 2026
**Re:** `FR04a_Implementation_and_731st_Post_Response_2026-08-25.md`
**Status:** FR-04a accepted, one reconciliation needed before the manuscript changes, 574 dry run authorised

---

## 0. FR-04a is accepted as built

Half a day against a day-and-a-half estimate, and dropping the settings table was the right call. Three things I want to acknowledge specifically.

**The call-site list is exactly what I asked for.** Thirteen filtered queries with two reasoned exceptions is the confirmation I needed that nothing still computes on 916, and it is the kind of answer I can cite in Chapter 3 rather than assert.

**Both exceptions are correct.** The re-upload overlap check is a collision guard, so it has to see everything or it stops guarding. The coverage widget is meant to display the true extent of the data including gaps, which is a different question from what the study analyses. Leaving the diagnostic scripts unscoped is right for the same reason.

**Filtering `autoCategorizeAll` and `runLlmClassification` is the detail that matters most.** Those are the bulk paths that produced the 574 problem, and scoping them means the same failure cannot recur. That was not in my ask and it should have been.

Boundaries in a version-controlled constants module with env override, retain rather than delete, warning surfaced on upload. All as specified.

---

## 1. ⚠ Your §1 and your earlier upload table disagree by one post

Before I change anything in the manuscript, these two statements need reconciling.

**From `Study_Period_Scope_Response_2026-08-25.md` §3:**

| Month | Posts inserted |
|---|---|
| Jul 2025 | 43 |
| **Aug 2025** | **52** |

**From today's §1:** the extra post, `1142974524519105`, arrived in `Jul-01-2025_Jul-31-2025_3278883872271730.csv`, and that file inserted 43 rows "matching your raw Jul 2025 export count exactly."

Both cannot hold as written. Our August export contains 51 posts. If the August file inserted 52, the surplus post is in the August file and export bucketing does not explain it. If the surplus really arrived via the July file, then the August file inserted 51 and that table row is measuring something else.

**My guess is that the table mixes two bases:** "Aug 2025: 52" counting by Manila publish month, and "Jul 2025: 43" counting by source file. That would make both numbers individually correct and the table internally inconsistent.

- [ ] **Which basis does that table use, per row?** Source file, or Manila publish month?
- [ ] If it is publish month, please resend it counted by source file, since that is the version that diffs against the client's exports

**This is not pedantry, but it is now narrower than when I wrote it.** We hold twelve organic exports covering August 2025 to July 2026 and nothing earlier, so the July 2025 file exists only on your side and your account of where the post came from is consistent. What remains is confirming the table's basis, because that table is what I reconcile our exports against, and a mixed-basis table produces false discrepancies every time I use it.

---

## 2. The bucketing explanation does not fit the evidence

You attribute the misfiling to naive UTC bucketing on Meta's side. Two posts contradict that.

| Post | UTC | Manila | Arrived in |
|---|---|---|---|
| 1143183467831544 | 18:25, 31 Jul | 02:25, 1 Aug | **August file** |
| 1142974524519105 | 19:57, 31 Jul | 03:57, 1 Aug | **July file** |

Both publish on 1 August Manila. Both publish on 31 July UTC. Under a clean UTC boundary both belong in July. Under a clean Manila boundary both belong in August. **Neither happened.**

So Meta's export filter is not using the publish timestamp it reports in the file. It is more likely filtering on creation time, scheduled time, or a first-impression timestamp, any of which can diverge from publish time by hours.

**Why this matters beyond one post.** If bucketing is inconsistent at one month boundary, it may be inconsistent at all of them. That would not change the 731 total, since every post lands somewhere and `publish_time` is Manila-anchored at ingestion. But it would mean the source file a post arrived in is not a reliable indicator of its month, and any month-by-month analysis keyed on file rather than publish date is wrong.

- [ ] **One count, across all sixteen uploads: how many posts have a Manila publish month different from the month of the file they arrived in?**

If the answer is one or two, this closes and becomes a footnote. If it is fifteen or twenty, the monthly series needs rebuilding on publish date, and I need to know now rather than when Chapter 4's monthly figures are being written.

I am fairly confident the code already does the right thing here, since ingestion anchors to Manila and FR-04a filters on `publish_time`. This is a request for the number, not a suspicion that the pipeline is wrong.

---

## 3. Confirmed on our side: there is no July 2025 export

You referred to "your raw Jul 2025 export count." We do not have one. The organic exports the client provided run `Aug-01-2025` through `Jul-01-2026`, twelve files, nothing earlier. The July 2025 file is one of the four extra months that exist only in your ingestion history.

That makes your §1 account consistent. Post `1142974524519105` is real client data, it publishes at 03:57 Manila on 1 August 2025, and it is genuinely in period. Our August export is not missing anything, because the post was never in the August file to begin with. Our 730 was complete for the twelve exports we were given.

It also confirms the mixed-basis reading in §1 above: your August row of 52 must be counting by Manila publish month, since by source file it is 51.

---

## 4. Holding the manuscript change until §1 and §2 close

**Very likely 731, and I expect to make the change once §2 comes back.**

If it stands, Table 2 in Chapter 3 will read that the study-period corpus comprises **731 organic posts published between 1 August 2025 and 31 July 2026**, with a note that Meta's export tool assigns posts near month boundaries to files that do not always correspond to their Manila publish date, and that the system therefore scopes on publish time rather than source file.

Framed that way the off-by-one becomes a documented data-handling condition rather than an inconsistency, and it pairs naturally with the §0 timezone finding from your scope response.

The reason I am waiting on §2 rather than editing now: if fifteen or twenty posts sit in files that do not match their Manila publish month, then the four extra months in your ingestion may contain more than one post that belongs in period, and 731 could move again. If the count comes back at one or two, I will make the change immediately.

**One consequence worth flagging.** Every cross-check figure I produced from the raw exports was computed on 730: the Spearman correlation, the overlap proportions, the median engagement rates by post type, the 65 posts under the eight-word caption threshold. None of them move materially for one post, and Chapter 4's figures have to come from the system regardless. But expect small differences when you compare my numbers against the app's, and treat the app's as authoritative once FR-04a is confirmed live on the analytical paths.

---

## 5. Do not delete the out-of-period uploads

Raised on our side as a tidying idea, and I want it settled explicitly so nobody acts on it later.

**The 731st post is the argument against it.** Had the April to July 2025 uploads been deleted, we would have lost a post that is genuinely inside the study period, because boundary posts arrive in files that do not match their publish month. Deleting by source file deletes in-period data. That is precisely what the §2 count is meant to quantify, and until it comes back we do not know how many other posts are in the same position.

Three further reasons:

- **FR-04a already solves the problem.** Out-of-period rows are excluded from every analytical query and from the queue. They cost nothing except a row count on a screen nobody analyses from.
- **Deletion is irreversible and the data is the client's.** A system that discards uploaded records because they did not fit an assumption is worse than one that reports and excludes them.
- **It reads better at the defence.** "The system holds 916 records, analyses the 731 within the declared study period, and reports out-of-period records at ingestion" is a control. "We deleted the records that did not fit" invites a question about what else was deleted, and there is no good answer to that in the moment.

So: **retain and exclude, as FR-04a already does.** No change requested, this section exists so the decision is on record.

---

## 6. The 574 dry run: go ahead

Unblocked, and independent of everything above. Please run it and send me the output before anything touches live data.

What I want to see in the dry run:

- [ ] Count of rows that would be nulled, which I expect to be **427** now that FR-04a scopes to the study period
- [ ] Confirmation that the 147 out-of-period legacy rows are left alone rather than nulled, since they are outside the analysis either way and nulling them creates queue noise
- [ ] Confirmation that zero `MANUAL_GROUND_TRUTH`, `MANUAL_OVERRIDE`, or `ACCEPTED_SUGGESTION` rows are touched
- [ ] The resulting Needs Review count, which I expect to be **92 plus 427, so 519**
- [ ] Confirmation that `category_keyword` and `category_llm` are preserved, since only `category_final` and `category_final_source` should be cleared

If those come back as expected, run it for real without waiting for another exchange from me. Consider that a standing go-ahead conditional on the dry-run numbers matching.

---

## 7. Order from here

1. **§1** the table basis, and **§2** the cross-month count. Both are queries.
2. **The 574 dry run** (§6), then the live run if the numbers match.
3. **Outstanding from the FR numbering memo:** confirm the seven scheme mappings and send the full `mvp.md` FR list. Still the item blocking the traceability matrix and Chapter 3.
4. **Category Performance versus the Analysis category distribution section**, from §4 of that same memo. Still unanswered, and it decides whether the access fix is a nav change or a merge.
5. Everything else in that memo as capacity allows.

Items 3 and 4 are answers rather than builds and between them they unblock the largest remaining piece of writing.
