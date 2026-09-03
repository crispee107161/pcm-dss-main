# Open questions from the Upload/Content reply

**Date:** 3 September 2026
**Re:** three items from `Upload_and_Content_Reply_2026-09-03.md` that need your call,
not more code. Everything else in that memo is closed and shipped.

---

## 1. Does the em-dash rule reach the null-cell placeholder?

`—` is used in a handful of table cells to mean "no value" — an ad with no CPI yet, a
post with no view count, a row with no flag reason. That's a typographic convention,
not prose, so I left it alone rather than guess.

- Replacing it with a comma reads as a punctuation error, not a fix.
- Blanking the cell entirely loses the "nothing here" signal a quick scan or a
  screen-reader relies on.

**Question:** does §0.1 mean this too, or is it scoped to sentences and captions? If it
does reach placeholders, what should render instead — a word like "N/A", or something
else?

---

## 2. Is the en dash (`–`) in numeric ranges exempt?

`Aug 2025 – Jul 2026`, `IQR ₱19.07 – ₱37.63` style ranges use an en dash, not an em
dash. That's standard typography for a range, not the sentence-joining em dash §0.1
targets.

**Question:** confirming this is out of scope for the sweep, since I've been treating
it that way without an explicit answer from you.

---

## 3. Upload History's pre-`records_read` rows

Confirmed live: a row uploaded before the `records_read` column existed shows 0 Read
against a non-zero Duplicate count, which reads as a contradiction. There's no backfill
script for it. Currently rendered as a dash with a tooltip ("Not recorded for uploads
before this column was added") rather than the misleading 0.

**Question:** is a dash-with-tooltip the right permanent answer, or do you want the
historical rows backfilled instead (and if so, backfilled from what — the sum of the
other four columns, since that's the only figure available for those rows)?
