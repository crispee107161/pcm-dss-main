# Go ahead on the 574. And the corpus is provably complete at the closing boundary.

**Date:** 25 August 2026
**Re:** `574_Dry_Run_and_731_Boundary_Reconciliation_Response_2026-08-25.md`
**Status:** three things closed, one go-ahead, one argument worth having in Chapter 3

---

## 1. Run the 574 script

All five dry-run figures match. 427 nulled, 147 out-of-period left alone, zero rows reachable from any other provenance value, 92 currently in queue, 519 resulting.

**Explicit confirmation, as requested: run it.**

Two details I appreciated in the dry run. The point that the other provenance values are **structurally unreachable** rather than empirically zero is a stronger guarantee than the one I asked for, since it holds on every future run and not just this one. And checking that none of the 427 have both suggestions already null means we are returning rows with real prior data to the queue rather than blanks, which matters for FR-07's flag reasons firing correctly when they reappear.

Send the post-run counts and I will treat the backlog as 519 from that point.

---

## 2. 731 confirmed. The manuscript is being changed.

Table 2 in Chapter 3 goes from 730 to 731, with the note about Meta's export tool assigning boundary posts to files that do not always match their Manila publish date.

Your §2 method was the right one. Correlating `created_at` against `UploadLog.uploaded_at` would have produced a confident wrong answer, and abandoning it for direct parsing of the raw CSVs is why the result is trustworthy. **Zero mismatches across 811 rows** in the twelve real client exports is a clean finding.

Your 811 reconciles against our side exactly: 730 posts across the twelve months, plus the 81-row duplicate September re-export, is 811. So we are parsing the same corpus.

---

## 3. The corpus is provably complete at the closing boundary, and this belongs in Chapter 3

Your §2 closes the question of whether posts were *misfiled*. It leaves open the more important question, which neither of us has stated: could an **in-period post have been missed entirely**, having landed in an export file nobody holds?

That question can be closed by argument rather than by data.

The one confirmed crossing, `1142974524519105`, publishes at 03:57 Manila on 1 August 2025 and sits in the July 2025 file. It was pushed **backward**, into the file for the month before its Manila publish month. That is the signature of UTC-based bucketing, since Manila is UTC+8 and a UTC timestamp is therefore always on the same calendar day as its Manila counterpart or the day before, never the day after.

**A UTC-based bucket can only ever push a post backward.** So for an in-period post to have landed in an August 2026 file we do not hold, its bucket date would need to be on or after 1 August 2026 while its Manila publish date was on or before 31 July 2026. Under UTC bucketing that is impossible.

The data agrees. Our latest in-period post publishes at **21:00 Manila on 31 July 2026**, three hours short of the closing boundary, and the two before it are at 02:01 and 22:02 on 30 and 31 July. Nothing sits in the window where a boundary effect could operate even if the bucketing convention were something else.

**So the twelve client exports contain every in-period post.** The opening boundary is covered because the July 2025 file exists in your ingestion and its one crossing post is already counted in the 731. The closing boundary is covered because backward-only bucketing cannot push an in-period post forward into a file that was never pulled.

That argument goes into Chapter 3 alongside the timezone note. It converts "we think the corpus is complete" into "the corpus is complete, and here is why," which is a much better answer if a panelist asks whether anything was missed.

- [ ] Sanity-check the reasoning against what you know of the export tool. If you have any evidence Meta buckets on something that could run *ahead* of Manila publish time, the argument fails and I need to know.

---

## 4. One residual oddity, low priority

Your §2 finds zero mismatches across 811 rows, meaning every post in the twelve client exports sits in the file matching its own Manila publish time. But `1142974524519105` publishes on 1 August Manila and sits in the July file.

So Meta's July 2025 export and its August 2025 export used **different bucketing conventions**, or the same convention applied inconsistently. Both cannot be true of one tool behaving one way.

The likeliest explanation is that the sixteen files were not all pulled in one session, and Meta's date picker behaves differently depending on how the range is specified or when the pull happened.

It changes nothing. The post is in the database once, classified correctly, and counted in the 731. I am noting it because it is the kind of loose thread that resurfaces later, and because it means the source filename is not a reliable indicator of a post's month. Scoping on `publish_time`, which FR-04a already does, is the right design and now has a documented reason.

No action. Recorded only.

---

## 5. The mixed-basis table

Noted and closed, no apology needed. Fourteen of sixteen months agreeing on both bases is exactly the condition under which a single-row inconsistency hides, and you found it in one pass once asked. Using the source-file column for diffs against our exports from here.

The May 2025 discrepancy and the four candidate boundary posts you found in the pre-period months need no follow-up. They sit entirely inside the excluded range and FR-04a keeps them out of every analytical path.

---

## 6. Where things stand

Closing with this memo: the 716 arithmetic, the study-period scope, the ground-truth composition, the 731st post, the cross-month audit, the upload table basis, the 574 dry run, the FR numbering, and Category Performance versus the Analysis category section.

Still open, from `FR_Mapping_Complete_and_Category_CPI_Gap.md`, sent earlier today:

1. **Cost per inquiry by content category.** FR-14 and FR-17 both require it, FR-07 categorises organic posts only, and Chapter 1 states an organic post cannot be traced to the advertisement it became. Either two requirements are partly unmet or there is an undocumented matching step. Highest priority of what remains, because it decides two rows of the matrix and possibly two requirement rewrites.
2. **Gate FR-21 and FR-31 away from Marketing Team.** Live access-control gap, small fix.
3. **Label the two engagement rates distinctly**, and tell me which convention FR-29 uses.
4. **Category Performance onto the Manager nav.**
5. **The full traceability matrix**, now unblocked.
6. **Confirm FR-15a and FR-17a** describe Top Ads and Category Performance accurately.

Item 1 is the only one that could still change requirement text.
