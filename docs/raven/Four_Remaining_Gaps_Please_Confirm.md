# Four remaining gaps, and please confirm each one back to me

**Date:** 25 August 2026
**Re:** `Three_Fixes_Landed_2026-08-25.md`
**Status:** the FR table is written. These four are the last open items against it.

---

## 0. Please reply on each item by number

The functional requirements table is finalised and going into Chapter 3. Each requirement will be marked implemented, partial, or not implemented in the traceability matrix, and **the four items below decide four of those marks.**

So I need an explicit yes or no on each, not a general update. If something is fixed, say which item number and what it now does. If something is not going to be fixed, say so plainly and I will record it as a partial with a stated reason, which is a perfectly acceptable outcome as long as I know.

What I cannot do is guess. A requirement marked implemented that turns out to be partial is the one thing that would genuinely damage us at the defence.

---

## 1. What landed, accepted

All three from the previous memo are done and verified.

**Per-row validation.** Both validators return valid and rejected sets, the dedupe check moved to a per-row rejection, and all five FR-05 figures now flow through with the mapping exactly as specified. Capping the response payload at 20 rejected rows while storing the full list in `UploadLog` is a better design than either extreme.

**Soft-delete.** Confirming the foreign-key rule was `RESTRICT` by querying the constraint rather than deleting a real user was the right way to run that check. It also established something useful: the delete button never worked for any account with activity. Adding `reactivateUser` unprompted was correct, since deactivate with no way back is a dead end.

**Snapshot dates.** Reporting the **oldest** `captured_at` among displayed rows rather than the newest is exactly right, and it is the kind of judgement I would not have thought to specify.

**On the migration workaround:** writing the SQL by hand and marking it resolved, rather than running `migrate reset` on live data, was the correct call. See item 4.

---

## 2. ⚠ Item 1: the snapshot date now displays a date that is wrong

This one came out of the fix rather than existing before it, so it is not something you could have anticipated.

`captured_at` was backfilled to the migration timestamp, so the four demographic cards currently display **"as of 25 August 2026."** That is not when the client exported the data. The page-level series runs to 31 July 2026, so the real export happened at some point after that, and the figure on screen now asserts a date with confidence rather than acknowledging it is unknown.

**FR-13a requires the snapshot date to be stated.** A wrong date is worse than an absent one, because an absent date invites a question and a wrong date invites a wrong answer.

Two ways to resolve, and either is fine:

- **Preferred.** We ask the client when the demographic files were pulled and you set `captured_at` on the backfilled rows to that date.
- **Failing that.** Display "date not recorded" for rows whose `captured_at` equals the backfill timestamp, until a genuine re-upload replaces them.

- [ ] **Item 1: which approach, and is it done?**
- [ ] Send me the exact backfill timestamp either way, so I know which rows are affected

---

## 3. ⚠ Item 2: five validators still discard the whole file on one bad row

You flagged this yourself as a disclosed scope boundary, which I appreciate. Here is why I want it closed rather than accepted.

**FR-04 does not distinguish between file types.** It says the system shall report each row failing validation without discarding the remainder of the file. Full stop, all uploads.

So as written, the requirement is met for **two of seven ingestion paths**. Ads and organic posts are fixed. Follower history, page viewers, page metrics, demographics, and audience still throw on the first failure.

Your reasoning for the boundary is sound on the merits, since those are simpler parses with smaller blast radius. But the demographics and audience validators now sit behind FR-13a, which is a requirement in the table, and page metrics feeds FR-13. Three of the five are no longer low-traffic edge cases, they are load-bearing for named requirements.

**Extending is the same pattern you already wrote**, applied to five more files. If that is a couple of hours, I would rather have it than narrow the requirement.

- [ ] **Item 2: extended to all five, extended to some, or not doing it?**
- [ ] If some, which ones

If the answer is no, I will narrow FR-04 to name the record types it covers, which is honest but weaker.

---

## 4. Item 3: the eight-hour session window after deactivation

You disclosed this rather than letting me find it, which is the right instinct.

The system has roughly ten staff accounts. A per-request database lookup at that scale costs nothing measurable, and it closes the gap between FR-02's deactivation clause and a deactivated user retaining access for up to eight hours.

I am not treating this as urgent. Deactivation blocking the next login is defensible and I can state it in Chapter 3 as a stated behaviour. But if the fix is a check in the `jwt` or `session` callback and an afternoon, the cleaner story is worth having.

- [ ] **Item 3: closing it, or leaving it as a documented behaviour?**

Your call on this one, genuinely. Either answer works as long as I know which to write.

---

## 5. Item 4: the migration marked modified after it was applied

`20260823150110_category_final_source_legacy_and_revision` no longer describes what was actually done to the database.

Ordinarily a housekeeping matter. Here it sits awkwardly, because provenance is one of the central themes of this study. We have documented the lexicon drift, the legacy-import origin, the study-period scoping, and the audit trail, and a migration history that does not match the schema is the same category of problem in a different place.

I am not asking for `migrate reset`, which would drop the database and is obviously off the table. What I would like is either the file reconciled to what was applied, or a note in the repository recording what the discrepancy is and why it exists, so the answer is written down rather than reconstructed if anyone asks.

- [ ] **Item 4: reconciled, documented, or left as is?**

Low priority relative to items 1 and 2.

---

## 6. Recorded as partial, no action needed

FR-27's lifecycle cohort curves display record counts but no plain-language interpretation. Per my previous memo, deliberately skipped. Owner-only, the frequency diagnostic within the same card already carries full interpretation, and it was the lowest-value of the five FR-18 items.

The matrix will record FR-18 as met with this one section noted as partial. Nothing to do.

Also noted and not requested: the absence of automated test coverage on Server Actions. It predates this work, it is not a regression, and no requirement turns on it.

---

## 7. Summary of what I need back

| Item | Question | Priority |
|---|---|---|
| 1 | Snapshot date: real date, or "not recorded"? Is it done? | Highest |
| 2 | Five validators: extended, partially, or not? | High |
| 3 | Session check: closing it or documenting it? | Your call |
| 4 | Migration drift: reconciled, documented, or left? | Low |

A one-line answer per item is enough. I only need to know which mark goes in the matrix.

---

## 8. For the record

The functional requirements table is now twenty-five requirements, up from twenty. Five were added over this review: study period validation, keyword lexicon integrity, audience composition reporting, advertisement-level performance ranking, and category efficiency reporting. Twelve were revised substantively.

Three of the five new ones exist because your passes found screens doing real work with no requirement behind them. That is the opposite of the feature-sprawl problem we were worried about, and the table is more accurate for it.
