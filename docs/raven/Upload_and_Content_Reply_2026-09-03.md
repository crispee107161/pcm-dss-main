# Reply to `Upload_and_Content_Review_Revised_v2.md`

**Date:** 3 September 2026
**Re:** the four numbered items and the two standing rules, on Upload and Content.

---

## §2 — who is working the queue

Pulled this from the database rather than asking around; `category_final_assigned_by`
and `category_final_assigned_at` are stamped on every row.

**Account:** `marketing@pcmerchandise.com` (MARKETING_MANAGER). No other account has
touched `category_final` in the study period.

**One correction to the memo's own terms first:** `MANUAL_SELECTION` isn't a value the
schema has ever had. `CategoryFinalSource` is `MANUAL_GROUND_TRUTH`,
`ACCEPTED_SUGGESTION`, `MANUAL_OVERRIDE`, `LEGACY_IMPORT`,
`MANUAL_CHANGE_AFTER_FINALISATION`, or `MANUAL_CODEBOOK_ASSIGNMENT`. Interface
categorisation lands as `ACCEPTED_SUGGESTION` or `MANUAL_OVERRIDE`. Whatever term is
used going forward, worth the two of us using the same one.

**What's actually there, in the study period:**

| source | count |
|---|---|
| `NULL` (uncategorised) | 516 |
| `MANUAL_GROUND_TRUTH` | 200 |
| `MANUAL_OVERRIDE` | 13 |
| `ACCEPTED_SUGGESTION` | 2 |

15 posts total carry interface provenance, not 3. Of those 15:

- **13 are old** — 19 Aug to 26 Aug, before this review cycle. Whatever this was, it
  predates the concern raised here.
- **2 are today** — both at 05:34 UTC (3 Sep), 21 seconds apart, same account, single
  session. This is almost certainly the live activity the 519→518→516 drift is
  reflecting.

So: not "someone working the queue" ongoing, but one short session this morning that
touched 2 posts. Worth confirming with the account holder whether that was a deliberate
test or genuine triage, since either way it should stop until the coding session per the
original memo — but the exposure is 2 posts, not an open-ended backlog.

### §2.1 — same query or two

Traced both: Dashboard's uncategorised count is the `category_final: null` bucket of
`groupBy(category_final)` over `STUDY_PERIOD_POST_WHERE`
(`lib/data/dashboard.ts:260`). Content's needs-review filter is
`withStudyPeriod({ category_final: null, ...EXCLUDE_GROUND_TRUTH })`
(`lib/categorize/content-filter.ts:49`). `EXCLUDE_GROUND_TRUTH` never affects a row with
a null `category_final` (ground-truth rows always have one set), so the two predicates
are equivalent. Confirmed: one query, two moments in time, not two definitions.

---

## §3 — Upload History columns

Confirmed present: `components/upload/UploadHistory.tsx:57-61` renders Read, Added,
Changed, Duplicate, and Rejected, backed by the persisted `records_read`.

Two things worth flagging while confirming:

1. **Desktop-only claim.** Read and Rejected are `hidden md:table-cell`; Added, Changed,
   and Duplicate are `hidden sm:table-cell`. "Carries all five" is only true above the
   `md` breakpoint — on a narrow phone, three of the five are hidden.
2. **The predicted contradiction is live**, and now handled: a row with `records_read`
   defaulting to 0 against a non-zero Duplicate count now renders the Read cell as a
   dash with a title explaining it predates the column, instead of a misleading 0.

---

## §4.1 — de-dup note

Reworded. Your suggested replacement ("matched by their platform identifier") isn't
accurate either — the match key differs by file type: posts on Post ID, ads on
advertisement identifier plus reporting period, page-level metrics on date alone (which
has no "platform identifier" at all). Went with:

> "Records are matched on the identifier each file type carries, so re-uploading the
> same file is safe and never creates duplicates."

---

## §4.2 — unflagged rows

Done, with one correction from an internal review pass: empty `flagReasons` doesn't by
itself mean the two methods agreed, since `DISAGREEMENT` only fires when *both* methods
produced a value and they differ. A post where one method hasn't run yet (or neither
has) also has an empty flag set. The cell now checks the same `isBatchConfirmEligible`
predicate the Batch confirm button uses, so it can't say "Both methods agree" on a post
`SuggestionCell` is simultaneously showing as "Uncategorised" — unflagged-but-not-yet-
suggested rows now read "Waiting for suggestions" instead.

---

## §0.2 — plain language

The `IQR ₱x – ₱y (n=N)` string you quoted as the counter-example was live on the
Executive Dashboard median CPI card. Fixed, along with the box-plot's `Q1`/`Q3` axis
labels and the remaining bare `n=` captions on that screen. Not deferring this one to
"as each screen is reviewed" since we already knew where it was.

---

## §0.1 — em dashes

Swept the prose on Upload and Content: the drop-zone note, the de-dup note, dialog
copy, filter-option labels, and button hint text. Two things I did **not** touch, and
want your call on before I do:

1. **The `—` used as a table null-cell placeholder** (no CPI value, no date, no flag
   reason). This isn't prose, it's a typographic convention for "no data." Replacing it
   with a comma reads as broken punctuation; blanking the cell entirely loses the
   "nothing here" signal a screen-reader or a quick scan relies on. Left these alone
   pending your read on whether the rule is meant to reach placeholders at all.
2. **The en dash (`–`) in numeric ranges** (`STUDY_PERIOD_LABEL`'s "Aug 2025 – Jul
   2026", IQR ranges). That's correct typography for a range, not the sentence-joining
   em dash the rule targets. Assuming this is exempt unless you say otherwise.

Also didn't sweep the three cut-feature views (`SimulationView`, `RegressionView`,
`CorrelationView`) or `LaggedCorrelationPanel` — they're unlinked from nav per
`mvp.md` §5, so it's dead-code diff until/unless they come back in scope.

One more question alongside the two above: `— None —` (the "clear category" select
option, and the shared `categoryEditLabel()` helper it comes from) has been changed to
`(None)`, which is arguably the same null/absence convention as the table placeholders
I left alone. Landed on treating it as prose rather than a placeholder, since it's a
selectable menu action's label, not a data-absence indicator in a table cell, but flag
it in case you read it the other way.

---

## Verified before writing this

`npx tsc --noEmit` clean, `npm test` 434/434, `npm run build` clean. (Test count moved
from 410 at the time I first drafted this to 434 now — new tests landed from
concurrent dashboard-side work in this shared tree, not from anything above.) No
commits yet — these changes sit alongside dashboard-side work already in progress in
this working tree (Manila month-bucketing fix, ad-table spend-dimming, and most of the
plain-language sentence generation on the Executive Dashboard), so this reply covers
only the Upload and Content items above; the rest will get its own note when that
lands.
