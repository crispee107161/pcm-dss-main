# Analysis screen review: corrections found while implementing

**Date:** 4 September 2026
**Re:** Owner account, Analysis — reply to `Analysis_Screen_Review.md`
**Status:** Nothing coded yet. `Analysis_Screen_Review.md` is unchanged; read this alongside it before implementation starts, since a few of its quotes and mappings need correcting first.

---

## 1. The core findings all hold

Every substantive complaint in the original memo checked out against the live code: em dashes in the section headers and prose, bare notation at the top level, the causal-advice sentence in the frequency diagnostic, the month-3 survivorship break in the cohort curve, the ≥2-months label being off by a calendar month, the residual table rendering all 108 rows against a two-row header claim, and the r = 0.958/0.984 mixup. §9's Chapter 4 figures also reproduce exactly against `docs/PROGRESS.md`.

None of the priority order in §11 changes. The corrections below are quotes, attributions, and two things the review didn't catch — none of them flip a verdict.

---

## 2. Corrections, by section

**§4.** The quoted screen text used a comma ("frequency levels, retiring ads early") where the actual copy uses an em dash ("frequency levels — retiring ads early"). Worth noting only because §0.1 is the standing em-dash rule this exact section is invoked to enforce — fixed in the doc.

**§5.** The table header says "Advertisements." The screen labels this column "Ad-Months (n)," and the code comment (`lib/stats/ad-lifecycle.ts`) is explicit that it's ad-rows present at that month index, not distinct ads. They coincide here only because no cohort ad has a gap month. Matters for the fix: truncate by month index reaching the cohort's survival threshold, not by "n equals cohort size" — the latter would silently mistruncate a cohort with a paused-then-resumed ad.

**§7.** Two errors in the identifier list, not just the mapping gap:
- ALG-09 isn't in the expandable block at all — it's in the top-level Model Specification card (`RegressionSection.tsx`), visible without expanding anything. "Remove identifiers from the expandable text" as scoped wouldn't touch it.
- FR-09 is missing from the list, and it's an active collision rather than a simple omission. The expandable block uses "FR-09" for Views vs. Reach, but the manuscript mapping (`FR_Numbering_and_Remaining_Gaps.md`) has manuscript FR-09 = internal FR-19 (ranking comparison), a different feature. The block currently carries one identifier that means two different things depending on which scheme the reader has loaded.
- The manuscript mapping list also dropped FR-12 (present via FR-11/FR-12 → internal FR-31), even though §1 and §6 of the same memo use FR-12 elsewhere.

**§8.** 0.984 isn't confined to `FR31_Regression_Specification.md` §2 — it also appears in §7 and the §9 checklist of that document. All three need correcting, or two stale instances survive the fix.

**§2.1.** "About 29 per cent" should read ~28.5% — the spec was already updated to that figure (and the ₱4.19-vs-₱4.15 gap in §9) the day before this memo, on 2026-09-03. §9 isn't wrong to state the reconciliation, just re-deriving something already closed.

**§9.** LM = 9.2866 and JB = 106.005 are sourced from `FR31_Amendment_TypeScript_Implementation.md`, not `FR31_Regression_Specification.md`. Minor, but worth fixing since §8 in the same memo names its source file precisely.

**§3.** Two things:
1. The 516/215 split is already stale. `Backlog_Export_and_Answers_2026-09-04.md` (the day after this memo) identifies three wrongly categorised posts; nulling them returns the queue to 519 uncategorised / 212 categorised. `Backlog_Coding_Export_Request.md` separately notes the count drifted 519→518→516 within minutes even before that repair. Treat 516/215 as a snapshot when this section is acted on, not a number to hardcode into the fix.
2. **This one the review missed, and it undercuts its own argument:** the headline sentence doesn't actually exclude Unclear, only Unclassified. `AnalysisView.tsx` filters the callout candidate pool on `category !== 'UNCLASSIFIED' && r.n >= 3`. Unclear is a real `CategoryLabel` value (`lib/category-label.ts`) with n = 10, which clears the n ≥ 3 floor and is not filtered by the Unclassified check. So the plain-language sentence is currently eligible to name Unclear as the best- or worst-performing category — the same defect §3 spends most of its length arguing about the table. Added a checklist item to exclude Unclear from the headline-sentence filter too, not just the table display.

**§6.** One thing the review missed: `FR31_Regression_Specification.md` §6 currently reads "Display: ad name, spend, actual CPI, predicted CPI, ratio — sorted by ratio descending" as one instruction, with the 1.5 flag threshold described separately. The screen showing all 108 rows is a literal, compliant reading of that spec text as written. The fix here is a spec change, not only a code fix — both need to land together, or the next person to check compliance reads the current (unfixed) build as correct against an unamended spec.

---

## 3. One forward-reference, not a correction

§2.1's month-of-life bullet uses "ran three months or more," which is the §5.1 fix applied ahead of the current screen text ("≥2 months"). Not wrong, but reads as a contradiction on a first pass before reaching §5.1. Added a one-line pointer in the doc so it doesn't need re-explaining.

---

## 4. Net effect

`Analysis_Screen_Review.md` is untouched — this memo carries every correction instead, so it's the second document to check against when implementing each numbered section above. Nothing here changes what's queued in §11 of the original; §4 (delete the advice sentence) is still first.
