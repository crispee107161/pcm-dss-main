# Analysis screen: implemented, five things to confirm before this is closed

**Date:** 5 September 2026
**Re:** `Analysis_Corrections_Accepted.md`
**Status:** all of §5's priority list is coded, tested (492 passing), and self-reviewed. Not committed yet. Five questions below, none blocking, all worth an answer before the panel sees this screen.

---

## 1. Both specification documents have landed

Per your §6: `FR31_Regression_Specification.md` §2, §7, and the §9 checklist now read r = 0.958 (the n = 108 population the exclusion actually justifies), with the n = 187 figure of 0.984 noted separately. §6's display rule is amended to match the code (flagged rows shown by default, full list behind a toggle). `docs/mvp.md`'s matching callout is corrected too.

- [ ] Treat the specification as the current description, as agreed.

---

## 2. Two older memos still cite r = 0.984 for the n = 108 population

Not touched, and I want to check that's right rather than assume it.

`FR_Numbering_and_Remaining_Gaps.md` (25 Aug, lines 90 and 177) and `FR_Table_Clarifications_Response_2026-08-25.md` (lines 77 and 201) both state the reach/spend exclusion as "r = 0.984" without the population qualifier — the same wrong-population citation §8 corrected in the specification.

I left these alone on the reasoning that they're dated correspondence, a record of what was believed on 25 August, and rewriting history to match a correction discovered eleven days later would make the trail harder to follow, not easier. But I recognise that leaves the *wrong number* sitting in the document most likely to get cross-referenced for the traceability matrix.

- [ ] Confirm: leave the correspondence as-is (the specification is the corrected source of truth), or amend those two files as well?

---

## 3. Which cohort the month-of-life headline quotes

Your §2.1 worked example quotes the "ran three months or more" cohort: ₱15.66 → ₱13.64. With two cohorts on screen (≥2-month and ≥3-month survival thresholds), the generator now always quotes the more inclusive one — more data, and it happens to match your example exactly once truncated correctly. I want to confirm that's the right rule rather than something that happens to agree with your example by coincidence.

- [ ] Confirm: the headline should always quote the most inclusive cohort with a usable curve, not (say) the longest-running one.

---

## 4. The residual diagnostic section doesn't use the disclosure pattern §2 applies everywhere else

Every other section now leads with a plain-language sentence and puts the supporting notation behind "See the numbers behind this." The residual diagnostic doesn't: the sentence, the table of flagged advertisements, and the mandatory caption are all visible at top level with no collapse, and only "show all advertisements" (the full 108-row list) is gated.

I made that call because §6 frames the two-row table as "the operational payoff" and the caption as mandatory, which reads as "this is the finding, not notation behind the finding" — a first draft nested the whole thing inside the disclosure and it made both invisible by default, which contradicted that framing. But it's the one section on the page that reads structurally differently from the rest.

- [ ] Confirm that's the right exception, or say if it should match the other sections' pattern instead.

---

## 5. Bare em dashes used as "not applicable" table markers

§0.1's em-dash rule is applied to all interface prose. Left alone: the bare `—` character used as a null/not-applicable placeholder in table cells (secondary-specification columns when no secondary fit exists, missing R² cells, and similar). These aren't punctuation in a sentence, they're a table convention, and swapping them for something else would be a display-semantics change, not a copy fix.

- [ ] Confirm bare `—` placeholders are outside the rule's scope, or say what should replace them if not.

---

## 6. Priority

Nothing here blocks a commit on my end — items 3 and 4 are implemented and behaving as described above, and would need a follow-up change only if you want them done differently. Items 1, 2, and 5 are pure confirmations.

1. **§1**, acknowledgement that both documents are current.
2. **§4**, since it's the one structural deviation from §2's pattern and easiest to get wrong reading the screen cold.
3. **§2, §3, §5** as capacity allows.
