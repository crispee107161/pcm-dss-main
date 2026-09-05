# Backfill approved, and the corrected figures replace the old ones

**Date:** 5 September 2026
**Re:** `Lexicon_State_and_Pooled_Ceiling_Imported_2026-09-05.md`
**Status:** approved with two conditions, three items closed, one correction to how the figures are framed

---

## 1. §1a is the best finding in this review, and neither of us was looking for it

The question asked was how many rows the `Keyword` table holds. The useful question turned out to be whether the stored `category_keyword` values still reflect what that table would produce, and the answer was no for 36 of 707.

**The mechanism is worth restating because it is a category of bug rather than an instance.** `revert-lexicon-to-seed.ts` deletes `Keyword` rows and deliberately leaves computed suggestions alone. `autoCategorizeAll()` only touches posts where `category_keyword` is null. So any post that already had a suggestion was frozen at whatever the lexicon looked like on the day it was classified, and nothing in the running system would ever refresh it.

The revert appeared to work. The table was correct. The figures were not, and nothing surfaced the difference.

Finding it by recomputing against the live table and diffing rather than by inspecting either half in isolation is the only way this shows up. Worth remembering as a technique: when a source of truth is corrected, check whether anything derived from it was corrected too.

**And correcting your own prior answer without being pushed** is the reason the rest of these memos can be taken at face value. The 22 August citation was stale and you said so plainly rather than defending it.

---

## 2. ⚠ Approved: run the backfill

Yes. Build it and run it.

**The reason it matters beyond tidiness.** Without it, the Method Evaluation screen permanently displays figures that will never match the manuscript, on the screen most likely to be examined during the demonstration. With it, the stored values and the reported values are the same computation against the same locked lexicon, and the screen can be shown alongside Chapter 4 without explanation.

Your scoping is right: rows with `category_final` already set, so it cannot reach the open review queue or the twelve held-back posts.

**Two conditions.**

- [ ] **Dry run first**, as with the 574 nulling. Send the count of rows that would change and a sample of the before-and-after values.
- [ ] **Stamp `category_keyword_lexicon_count` on every backfilled row.** It currently reads null on all 707, which is exactly why this staleness was invisible. Writing the term count as part of the same operation means a future divergence between the stored suggestion and the live lexicon becomes detectable rather than silent.

That second one turns a one-time repair into a permanent guard, and it is the same reasoning behind the version stamp being added in the first place.

- [ ] **After the run, confirm the live figures read 0.1360 at n = 200 and 0.1566 at n = 707**, matching your recomputation exactly

---

## 3. ⚠ One correction to how the corrected figures are framed

Your §1a says 0.1566 "belongs next to 0.1494."

**It replaces it.** 0.1494 was computed on data nobody intended to score, being a mixture of the current table and 36 leftover predictions from a lexicon deliberately deleted in August. It is not an alternative specification or an earlier estimate. It is an artefact.

Chapter 4 will print **0.1360 at n = 200 and 0.1566 at n = 707**, and 0.1494 and 0.1388 will not appear anywhere in the manuscript.

Chapter 3 will describe the lexicon as fixed at 50 terms derived from the category definitions before any coding took place, which is now true of both the table and the stored suggestions once §2 runs.

---

## 4. Three items closed

**The `Keyword` table is 50 rows and matches the seed set exactly**, with nothing added after the revert. Confirmed by row count and by reading all four write paths, which refuse server-side before touching Prisma rather than being hidden client-side.

**FR-07a is enforced.** That requirement now has evidence behind it rather than an intention.

**The nav item rename is better than removal and should stay as built.** "Keyword Lexicon" as a view-only entry keeps the term list inspectable, and inspectability is the main argument for retaining a rule-based method at all. Being able to open it during the defence is an asset rather than a risk, and there is no editing affordance to worry about since nothing in the component renders one.

- [ ] No change wanted. Recorded so the checklist item is not read as outstanding.

**The pooled ceiling is imported and displaying**, with the argument format confirmed and the per-section banner matching by exact `n` so neither figure can displace the other.

---

## 5. The mapped variant

Confirmed computable from `rerun-fr08-seed-lexicon.ts` for either scope, with no code change.

- [ ] **Please produce it for both n = 200 and the corrected n = 707**, after the backfill

Chapter 4 reports the unmapped figures as primary, since that is what the system computes and what the screen displays, with the mapped variant beside them as a sensitivity note. A reader who would have counted a method's abstention on an undecidable post as agreement then sees both figures rather than suspecting the convention was chosen to favour a number.

---

## 6. Method Evaluation stays held, and you are right to recommend it

Holding through the backfill rather than releasing on the table-count answer is the correct call. The table state being right does not help while the screen displays figures computed on stale data.

We will review it once §2 has run and the displayed figures match the corrected ones.

---

## 7. Priority

1. **§2**, the dry run, then the backfill with the lexicon stamp
2. **§2**, confirm the live figures afterwards
3. **§5**, the mapped variants

Everything else on this thread is closed.
