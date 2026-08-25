# Three decisions, and the FR table is writable now

**Date:** 25 August 2026
**Re:** `FR16_Fixes_Demographics_Answer_and_Upload_Pass_2026-08-25.md`
**Status:** two behavioural gaps to fix, one requirement to add, and confirmation that nothing else blocks the matrix

---

## 0. You corrected me on demographics and you were right

I treated `Audience.csv`, `Gender.csv`, and `FollowerTopTerritories.csv` as a fourth export family. They are not. They are the demographic-snapshot subset of the page-level bundle, sitting alongside the six daily-series files, and FR-05's three-family test is satisfied by them being page-level. Your split of the question into ingestion versus display was the right move and it produced a much narrower gap than the one I raised.

Also worth acknowledging: the scale trap I flagged was already handled, with fraction-versus-percent auto-detection in `validate-demographics.ts`, and documented before I raised it.

Two more things in this memo I want to name. Verifying the 187 advertisement count **independently** rather than assuming FR-21's population matched in composition is exactly the discipline this whole review has needed. And leaving code comments on the split Dashboard rows explaining why they are separated means a future edit will not silently recombine them.

---

## 1. ⚠ The FR-04 validation gap must be fixed, not documented

This is the most serious finding in the review, and it is the one place where the system does the **opposite** of what a requirement states rather than merely omitting something.

Manuscript **FR-04**:

> "shall report rows failing validation **without discarding the remainder of the file**"

The code throws on the first invalid row and fails the whole upload. One bad row discards the file.

**Why this cannot be documented as a partial.** It is demonstrable in thirty seconds. A panelist asks what happens with a malformed row, someone uploads a file with one, and the system rejects all of it while the requirements table says it should not. Every other partial in this review is an omission a reasonable person accepts. This one reads as the requirement being untrue.

**The fix, and it closes two gaps at once:**

- [ ] Collect per-row validation errors rather than throwing on the first
- [ ] Insert the valid rows
- [ ] Return the rejected count and the reasons, surfaced in the upload summary alongside the existing figures

That second gap is FR-05's missing "rejected" figure. There is no rejected count today precisely because the code has no concept of a partially rejected file, so per-row validation produces the figure as a side effect.

### 1.1 On the figure count, and how to map the three you have

You counted four named figures in FR-05 and I said five. Reading it again, the requirement names five: **records read, stored, updated, rejected, and identified as duplicates.**

But you do not need five new concepts. Map what exists:

| Requirement | Code | Status |
|---|---|---|
| stored | `records_inserted` | have it |
| updated | `records_updated` | have it |
| duplicates | `records_unchanged` | **accept this mapping** |
| read | sum of all four | trivial, it is the parsed row count |
| rejected | new, from §1's fix | comes free with per-row validation |

**`records_unchanged` is your duplicates figure.** A row identical to one already stored is a duplicate by any sensible reading, and inventing a sixth concept to satisfy a word would be worse than mapping the one you have. I will note the mapping in Chapter 3 so the manuscript and the UI agree.

So the work is: per-row validation, a rejected count, and a read total. Not five new figures.

---

## 2. ⚠ Soft-delete users, and check whether delete is already broken

Manuscript **FR-02** says create, modify, **deactivate**, and reset credentials. The code hard-deletes.

Two problems, and the second is the one that matters.

**The wording mismatch.** Deactivate suspends, delete destroys. Different operations with different consequences.

**The audit trail.** FR-20 requires the audit trail to record the user for every upload and every manual category assignment. Hard deletion makes those records unattributable, which cuts directly against the provenance work this review has spent three days establishing. A system that can erase who did what is not one whose audit trail can be cited in Chapter 3.

**And it may already be broken.** You flagged that `UploadLog.user_id` is a required relation with no `onDelete` specified, so Prisma defaults to `Restrict`. Deleting any user who has ever uploaded a file should throw a foreign-key error.

- [ ] **Run the five-minute live check.** Does deleting a user with upload history currently fail? I want to know whether this is a feature that needs changing or a button that has never worked.
- [ ] **Add an `is_active` flag and soft-delete.** One-column migration, matches the requirement, preserves the audit trail, and resolves the foreign-key problem as a side effect since nothing gets deleted.
- [ ] Deactivated users cannot authenticate, retain their audit history, and appear in User Management marked inactive

Rename the action and the button to Deactivate at the same time.

---

## 3. Demographics: write the requirement, keep the charts

Per your framing, and my call as you asked:

> **FR-13a Audience composition reporting.** The system shall report the demographic composition of the page audience by gender, age bracket, country, and city, stating the date of the snapshot from which each figure is drawn.

**The snapshot-date clause is the part I need you to check.** Unlike the six daily series, these files are point-in-time. They cannot be scoped to the study period the way FR-04a scopes everything else, because there is no per-row date to filter on.

- [ ] **Is a snapshot date captured at ingestion?** The upload timestamp, a date parsed from the file, or anything else?
- [ ] If not, is one recoverable, and how hard would capturing it be going forward?

If no date exists, Chapter 3 cannot state when the audience composition was measured, and a figure like "60.1 per cent of followers are in the Philippines" has no time attached to it. That weakens an otherwise useful Chapter 4 finding. If capturing it is cheap, do it. If not, I will state in Limitations that the demographic snapshot reflects the state at export rather than a period average, which is honest but less good.

---

## 4. FR-27 cohort curves: leave them

You correctly held this pending my call. **Skip it.** Owner-only, the frequency diagnostic already carries full interpretation, and it is the lowest-value item remaining. The matrix records FR-16 as met with the cohort-curve interpretation noted as partial.

---

## 5. Everything else is closed

The ad-month label with the indicative-significance line, the Dashboard row split, and all four FR-18 fixes are done and accepted. Demographic ingestion is confirmed authorised under FR-05. Content is confirmed from the earlier pass. Upload Data's detection, encoding handling, and overlap confirmation all check out against FR-03 and FR-04.

**I am writing the FR table now.** The three items above do not block it. FR-04, FR-02, and FR-13a get their rows written to the intended behaviour, and if any of the three has not landed by the time Chapter 3 is finalised I will mark that row partial with a stated reason rather than hold the whole table.

That said, §1 in particular I would like landed rather than documented, for the reason in that section.

---

## 6. Order

1. **§1**, per-row validation and the rejected count. The only item that could embarrass us in a live demo.
2. **§2**, the five-minute delete check, then the soft-delete migration.
3. **§3**, whether a snapshot date exists. A lookup.
4. Nothing else.

Three days of this and the system is in materially better shape than when we started. Thank you for the thoroughness, particularly on the last two findings, which came from a pass I asked for as confirmation and which turned out to be discovery.
