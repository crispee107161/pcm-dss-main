# Analysis corrections accepted, and one resequencing

**Date:** 4 September 2026
**Re:** `Analysis_Screen_Review_Corrections_2026-09-04.md`
**Status:** all corrections accepted, two of them consequential, one section moves after the import

---

## 1. Checking before building was the right order

Nothing coded yet, every claim verified against source first, and the corrections sent before starting rather than discovered halfway through. That is how this should work and it caught two things I had wrong.

---

## 2. Two corrections that change the work rather than the wording

### 2.1 The headline sentence has the same defect as the table

You are right, and this undercuts my own argument in a way I did not see.

`AnalysisView.tsx` filters the callout candidate pool on `category !== 'UNCLASSIFIED' && n >= 3`. **Unclear is a real `CategoryLabel` with 10 posts**, so it clears the floor and is not caught by the Unclassified check.

So the plain-language sentence can currently name Unclear as the best or worst performing category, which is exactly the thing §3 spends most of its length arguing the table should not do. I checked the table and never looked at the filter behind the sentence.

- [ ] **Exclude Unclear from the headline-sentence filter as well as from the table**

### 2.2 The residual table is compliant with the specification as written

Also right, and it changes what the fix is.

`FR31_Regression_Specification.md` §6 says to display ad name, spend, actual CPI, predicted CPI, and ratio sorted by ratio descending, with the 1.5 threshold described separately. Rendering all 108 rows is a literal reading of that.

So the code is not wrong against the spec. **The spec is wrong**, and both have to change together. Otherwise the next person checking compliance reads the unfixed build as correct against an unamended document.

- [ ] **Amend `FR31_Regression_Specification.md` §6** to state that the table displays only advertisements exceeding the threshold, with the full sorted list available behind a toggle
- [ ] Land the spec change and the code change together

---

## 3. Three corrections accepted, no change to the finding

**§5, the column is ad-months not advertisements.** The distinction matters for the fix rather than the diagnosis. Truncate by month index reaching the cohort's survival threshold, not by comparing n against the cohort size, since the latter would mistruncate a cohort containing a paused-then-resumed advertisement. The survivorship break at month 3 stands as the problem.

**§8, 0.984 appears three times.** In §2, §7, and the §9 checklist. All three need correcting or two stale instances survive. Thank you for looking rather than taking my file reference at face value.

**§7, FR-09 is an active collision.** The expandable block uses it for views versus reach while manuscript FR-09 is the ranking comparison. One identifier meaning two different things depending on which scheme the reader has in mind is a stronger argument for removing identifiers than the one I made. And ALG-09 sitting in the top-level Model Specification card rather than the expandable block means the scoped fix would have missed it.

- [ ] **Remove requirement identifiers from all user-facing text**, including the Model Specification card, not only the expandable block

**§4, §2.1, §9.** The em dash in the quoted text, the 28.5 per cent already superseding 29, and the source file for the two diagnostic figures. All accepted, none changes anything.

---

## 4. ⚠ §3 moves to after the import

This is the only resequencing.

Your point that 516 and 215 are a snapshot is right, and it is about to be more than stale. The 507 reconciled labels are with you now.

**After the import the figures become roughly:** 707 categorised across five labels, plus 18 in Unclear, plus the 12 held back. The Unclassified row drops from 516 to 12.

Three consequences:

The **provisional caveat in §3.1 largely goes away.** Most posts will be categorised, so a note saying most are not would be wrong.

The **headline sentence changes**, since it is generated from counts that are about to move. Entertainment at 23 posts becomes Entertainment at a much larger number, and the best-performing category may not be the same one.

The **Unclassified row stops dominating**, which was most of the argument for moving it below a divider. Worth still doing, since 12 uncategorised posts and 18 no-category posts are still not comparable to the four real categories, but the visual problem shrinks considerably.

- [ ] **Do §3 after the import**, working from the figures then rather than these
- [ ] §2.1's Distribution by Category sentence likewise, since it must be generated from the new counts

Everything else in the memo can proceed now.

---

## 5. Priority, revised

1. **§4**, delete the advice sentence. Unchanged, still first, still the only causal claim in the system.
2. **§6**, the residual table and the specification amendment together, per §2.2 above.
3. **§5**, truncate the cohort curves by month index.
4. **§7**, remove all requirement identifiers including the Model Specification card.
5. **§8**, all three instances of 0.984.
6. **§2**, the restructure.
7. **§3** and the Distribution by Category sentence, **after the import**.
8. **§0.1**, the em dash sweep.

---

## 6. One note on the specification

Two documents now need amending rather than one: `FR31_Regression_Specification.md` §6 for the residual table, and §2, §7, and the §9 checklist for the collinearity figure.

Both go into Chapter 3 as the description of the analytical procedure, so they need to be right rather than merely superseded by the code.

- [ ] Tell us when both land and we will treat the specification as the current description
