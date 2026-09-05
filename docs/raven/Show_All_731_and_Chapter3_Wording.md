# Show all 731 on both Content screens, and the Chapter 3 wording is right

**Date:** 5 September 2026
**Re:** `Content_Second_Pass_Response_2026-09-05.md` and `Upload_Data_Closing_Response_2026-09-05.md`
**Status:** one decision, one confirmation, both tabs close after these

---

## 1. §1: the tab was never broken, and I framed the question wrongly

Two mechanisms exist and I assumed one of them was a mistake. They are not.

`category_final` holds the label. `review_status` holds whether a human looked at the post and made a decision. The tab correctly requires both, because "labelled unclear" and "reviewed and found to have no determinable category" are different states and the distinction is worth keeping.

The codebook import wrote the label and never touched the status, so those 18 posts genuinely had not been marked as reviewed. Backfilling the status on exactly those 18, rather than loosening the tab's filter, is the correct fix.

**Reading the predicate before changing it, and finding that the sensible-looking change would have been wrong, is the part worth naming.** Filtering on `category_final = UNCLEAR` alone would have made the tab show any post carrying that label regardless of whether anyone had reviewed it, which is not what the tab is for.

- [ ] Closed. No further action.

---

## 2. ⚠ Decision on the 531: show all 731 on both Content screens

You accepted the argument and then found the thing that actually settles it. **Category Performance and Post Type Performance already include the reference posts**, so this screen is the odd one out rather than the exception.

Three screens showing 731 and one showing 531, with no explanation available on any of them, is an inconsistency rather than a protection.

### 2.1 Owner's screen

- [ ] **Show all 731**, with the 200 reference posts marked as locked

The screen is view-only throughout, so nothing is protected by hiding them. FR-08 requires the reference sample to be **not editable**, and it already is not.

### 2.2 Marketing Manager's screen

- [ ] **Show all 731 there too, with the reference posts locked and not editable**

Here the exclusion did have a real job, since she can edit. But locked-and-visible does that job just as well and removes the same unexplained gap. FR-08 is satisfied by the edit path refusing, not by the row being absent.

- [ ] **Confirm the server-side write path refuses on `MANUAL_GROUND_TRUTH` rows**, so the lock is enforced rather than only rendered

If that guard does not already exist, it needs adding before the rows become visible on her screen. That is the one piece of this change that is not cosmetic.

### 2.3 The subtitle

With the exclusion gone, the clause explaining it goes too:

> Every organic post and its assigned category (view only).

Which removes the ground-truth wording problem by removing the thing that needed explaining.

---

## 3. §4 and §5 accepted as landed

**The null-suggestion guard.** Requiring two non-null suggestions that differ before raising the disagreement flag, and confirming the same class of bug does not exist in the FR-08 comparison path, is more than was asked for. The comparison path being correct means no reported figure was ever affected by this, only the review reasons on screen.

**The provenance line.** Placed beneath the table where the inconsistency is visible.

**§6, the register pass.** Status rather than instruction throughout, and dropping "Entertainment is often over-suggested" is right. That sentence was advice about the system's behaviour rather than a fact about the post.

---

## 4. §1.1 of the Upload response: the wording is right

Not knowing whether Meta revises daily figures retroactively, and saying so rather than guessing, is the correct answer. What you did establish is worth having: three uploads of the same file, byte-identical, no change. That proves the file is stable and says nothing about re-exports, and you were careful to draw exactly that line.

**Chapter 3 will state**, close to your wording:

> The client's exports as provided constitute the study's source data. The system does not re-fetch from the platform, so all reported figures derive from those files. Whether a subsequent re-export from the platform would return identical values for the same date range was not tested, and Chapter 1's Limitations already notes that organic post figures are cumulative and reflect the state of those figures on the date of export.

**One thing worth adding to it.** The advertising side does have supporting evidence: monthly figures are period-scoped and did not move across three separate export dates. So two of the three sources are empirically stable even though the page-level side is untested. That is worth one clause rather than leaving the reader to assume all three are equally unknown.

- [ ] No action. Confirming so the sentence is settled.

---

## 5. §2 of the Upload response: confirmed

The out-of-period count renders only when non-zero, in both the API response and the UI, verified at both layers rather than one.

Your observation about the count reading zero on every advertising and organic upload was the useful part. A permanent line saying nothing teaches the user to skip the summary, and then they miss it on the one upload where it matters.

- [ ] Closed.

---

## 6. What closes when §2 lands

**Upload Data** is closed now. Nothing outstanding.

**Content** closes once §2 lands, subject to §2.2's guard question.

---

## 7. Priority

1. **§2.2's guard question**, since it determines whether §2 is a display change or something more
2. **§2.1** and **§2.2**, the visibility change on both screens
3. **§2.3**, the subtitle, which follows automatically
