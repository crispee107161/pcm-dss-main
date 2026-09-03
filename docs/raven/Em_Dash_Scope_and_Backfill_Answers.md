# Three answers, and a scope clarification on the em dash rule

**Date:** 3 September 2026
**Re:** `Upload_and_Content_Open_Questions_2026-09-03.md`
**Status:** three answers, no work beyond what you have already done

---

## 1. The rule does not reach null placeholders. Keep the dash.

You are right and I stated the rule too broadly.

**Scope: sentences and captions only.** Anything a reader parses as prose. A dash in a table cell meaning "no value" is a typographic convention, not prose, and both of your objections are correct: a comma there reads as a punctuation error, and blanking the cell loses the signal that something is deliberately absent rather than accidentally missing.

- [ ] No change. Placeholders stay as they are.

The rule exists because em dashes joining clauses in body copy read as machine-written prose, which is a stylistic concern about how the interface sounds. It has nothing to say about table cells.

**Revised wording for §0.1**, so this does not need asking again:

> No em dashes in sentences or captions. Use commas, full stops, or parentheses. This does not apply to the dash used as a null-value placeholder in table cells, which is a typographic convention rather than prose.

---

## 2. En dashes in ranges are exempt. You have been treating them correctly.

"Aug 2025 – Jul 2026" and "₱19.07 – ₱37.63" are correct typography for a range and are not what the rule targets. The rule is about the em dash used to join clauses.

- [ ] No change required.

**One optional preference, entirely your call.** Plain "to" often reads better than a dash in interface copy, particularly on a screen where the reader is scanning rather than reading closely: "Aug 2025 to Jul 2026". Slightly longer, marginally clearer, and it removes any residual dash-heaviness from the copy.

If you would rather leave the en dashes, that is fine. This is preference rather than correctness and I would not spend time on it.

---

## 3. The dash with tooltip is the right permanent answer. Do not backfill.

Backfilling from the sum of the other four columns would **invent a figure that was never recorded.** Those uploads genuinely have no read count, and the sum happens to be a plausible value rather than a known one. Storing it would make an unrecorded number indistinguishable from a recorded one, which is the same class of problem as the demographic snapshot dates backfilled to the migration timestamp.

Your current handling is better than either alternative:

- The dash says the value is absent
- The tooltip says why
- Every future upload records the real figure, so the dashes only ever appear on historical rows and the problem shrinks on its own

- [ ] No change. Keep it as built.

**One small bonus in this answer.** If a panelist asks why some rows show a dash, "that column was added after those uploads and we did not invent a value for them" is a good sentence to be able to say. It is the same reasoning behind "date not recorded" on the demographic cards, and the consistency across both is worth having.

---

## 4. Note on the Executive Dashboard

Not treating it as final yet, and not asking for anything now.

Two items from that memo are still open on our side rather than yours: the plain-language interpretations, and the sub-₱1,000 dimming on the Least Efficient table. Separately, the toggle styling and the indexed-axis fix from the Trend Analysis memo use the same components as the dashboard's compare trend panel, so that screen will change when those land.

We will re-check every screen from the top once the whole Owner account has been walked, rather than declaring screens closed one at a time. Screenshots for the appendix come after that, since taking them now would mean retaking them.

No action. Recorded so the dashboard is not treated as closed on either side.
