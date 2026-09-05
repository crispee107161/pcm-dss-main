# Content, second pass: two bugs and one exclusion worth reversing

**Date:** 5 September 2026
**Re:** Owner account, Content
**Status:** two bugs, one design decision, two copy items

---

## 0. ⚠ Standing rules

### 0.1 No em dashes in sentences or captions

Table cell placeholders are outside this rule.

### 0.2 Plain language over statistical notation

### 0.3 Never reference the study or the research in interface copy

**See §3, where this is currently broken.**

---

## 1. ⚠ The No category tab is empty and should hold 18 posts

The codebook import wrote 18 posts as `unclear`. The tab shows none.

**The likely cause is two mechanisms for one concept.** FR-07 describes the manager recording a post as unassigned, which is presumably a flag or a `review_status` value, and the tab was built to filter on that. The import wrote `category_final = UNCLEAR` instead. So those 18 have a category but were never marked through the mechanism the tab reads.

- [ ] **What is the tab's filter predicate?**
- [ ] **Should it filter on `category_final = UNCLEAR` rather than on a separate flag?**

If the two mechanisms are genuinely separate, the same split affects anything else counting no-category posts, so it is worth finding out where else that predicate is used.

The Executive Dashboard reports 719 categorised and 12 pending against 731 total, which accounts for the 18 as categorised. So the count is right elsewhere and only this tab is missing them.

---

## 2. ⚠ 531 posts: the arithmetic is right, the exclusion is not

531 is 731 less the 200 reference posts. Correct as computed.

But **the Owner is view-only on this entire screen.** Every row shows "View only" and there is no Change action anywhere.

FR-08 requires the reference sample to be **not editable**. It does not require it to be invisible, and hiding it from a read-only view protects nothing that is not already protected.

**What the exclusion costs.** The Executive Dashboard tells the owner 731 posts. This screen tells him 531. Nothing on either screen connects the two, and the 200 missing posts have no explanation available to him.

- [ ] **Show all 731 on the Owner's view**, marking the 200 reference posts as locked rather than removing them

That satisfies FR-08, removes an unexplained gap between two screens, and is more honest than presenting a corpus that appears 200 posts smaller than it is.

**On the Marketing Manager's screen the exclusion has a real job**, since she can edit. Locked-and-visible would work there too and would be consistent, but that is a separate decision and not urgent.

---

## 3. The subtitle uses manuscript language

> "Every organic post and its assigned category, excluding the locked ground-truth benchmark (view only)."

"Ground-truth benchmark" means nothing to the account holder. Same defect as the FR-06 tooltip on the dashboard and the study-wide analysis caption before it.

- [ ] **If §2 lands, the clause disappears** and the subtitle becomes "Every organic post and its assigned category (view only)."
- [ ] **If §2 is declined**, reword to something like "Every organic post and its assigned category. A fixed set of 200 posts used to check the system's accuracy is not shown here."

The first is better. It removes the need to explain something by removing the thing that needed explaining.

---

## 4. ⚠ The disagreement flag is firing on a null suggestion

The post titled "As it should be" shows four review reasons at once:

> Needs your judgment. This post sits between two categories.
> Check this one. Entertainment is often over-suggested.
> Needs your judgment. The system couldn't determine a category.
> Open the post. The caption is too short to classify from text.

**The first and third cannot both be true.** A post either has two competing candidates or has none.

And only one chip renders, Entertainment, which tells you what actually happened: one method returned nothing, the other returned Entertainment.

**That is "a method returned no result", not a disagreement.** A null is not a candidate, so there is nothing for the other suggestion to disagree with.

- [ ] **Require two non-null suggestions that differ before raising the disagreement flag**

This is the same class of problem as the empty-caption post that showed a Testimonial suggestion back in August. A null being treated as a value rather than as an absence.

Once fixed, most posts will carry one or two reasons rather than four, which also resolves most of §6.

---

## 5. The provenance column is correct but needs one line of explanation

Some rows read "Manual selection, Marketing Manager, Aug 20, 2026, 2:54 AM" and others read a bare "Codebook assignment".

**Both are right.** The manual rows are the twelve that predate the legacy nulling and were correctly retained. Codebook assignments carry no user because the coding was performed outside the system by two researchers working from a spreadsheet, which was a deliberate methodological choice.

But a reader cannot tell that from the screen, and an inconsistent column invites the question of why some entries have a name and others do not.

- [ ] **Add one line beneath the table**, something like: "Codebook assignments were made outside the system by the research coders, so no individual account is recorded against them."

---

## 6. On the interface

**The flags are now inline rather than behind a "+N more" link**, which is what was asked for and it reads much better.

The remaining problem is register. Four stacked reasons currently mix status with instruction: "Needs your judgment" twice, plus "Check this one" and "Open the post". A reader parses two different kinds of sentence in one block.

- [ ] **Pick one register.** Either all status ("Two categories suggested", "No suggestion from one method", "Caption too short to classify") or all instruction. Status reads better here, since the row already has an action beside it.

Most of the clutter resolves once §4 lands, since posts will stop carrying four reasons at once. Worth doing the register pass at the same time rather than separately.

---

## 7. Priority

1. **§1**, the empty No category tab. Eighteen posts are invisible on the tab built to show them.
2. **§4**, the null disagreement flag. It is producing contradictory text on screen.
3. **§2**, the 531 exclusion. A decision rather than a bug.
4. **§3**, which follows from §2.
5. **§5** and **§6**, both small.
