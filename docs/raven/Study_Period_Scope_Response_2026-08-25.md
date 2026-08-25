# Response to `Study_Period_Scope_Audit.md`

**Date:** 25 August 2026
**Re:** the blocking audit in §2, the priority ground-truth check in §9, and the FR-04a proposal in §4
**Method:** live read-only DB queries (`scripts/study-period-scope-audit.ts`), plus a targeted follow-up query on the two boundary posts. No writes made to any table.

---

## 0. Running the §9 check first surfaced a bug in the check itself, not just the answer

First pass, using UTC midnight as the Aug-2025/Jul-2026 boundary, found **1 of 200** ground-truth posts before the study period (`post_id 1143183467831544`, `publish_time` `2025-07-31T18:25:00Z`) and an in-period total of 729.

That was wrong. `publish_time` is stored as UTC after being anchored to Manila local time at ingestion (`lib/csv/timezone.ts`, `parseIsoLocalAsManila` — appends `+08:00` to the raw CSV timestamp before parsing). `18:25 UTC` on 31 Jul is `02:25` on 1 Aug in Manila. A boundary check against UTC midnight silently reintroduces the exact bug the ingestion code exists to prevent. Corrected to Manila-local boundaries (`2025-08-01T00:00:00+08:00` through `2026-07-31T23:59:59+08:00`):

## 1. §9 answer: zero ground-truth posts are out of period

**All 200 `MANUAL_GROUND_TRUTH` posts fall inside 1 Aug 2025 – 31 Jul 2026, Manila local time.** κ = 0.6505, the keyword κ, the LLM κ, and every confusion matrix in the response document are computed on an in-scope sample. Nothing about §2.1's "large number out of period, redraw the sample" branch applies. You can treat this as closed.

Worth flagging for Chapter 3 regardless: the corpus contains exactly 2 posts whose raw export timestamp sits within 8 hours of the Aug-1 boundary and would misclassify under naive UTC bucketing (the ground-truth one above, plus one `LEGACY_IMPORT` post, `1142974524519105`, `19:57 UTC` / `03:57 Manila`). Both are correctly in-period. If anyone re-runs this check later without noticing the Manila anchoring, they'll reproduce my first wrong answer.

## 2. §2 cross-tab, filled in

| `category_final_source` | In period (Aug 2025–Jul 2026) | Before Aug 2025 | After Jul 2026 | Total |
|---|---|---|---|---|
| MANUAL_GROUND_TRUTH | 200 | 0 | 0 | 200 |
| LEGACY_IMPORT | 427 | 147 | 0 | 574 |
| MANUAL_OVERRIDE | 10 | 0 | 0 | 10 |
| ACCEPTED_SUGGESTION | 2 | 0 | 0 | 2 |
| NULL (queue) | 92 | 38 | 0 | 130 |
| **Total** | **731** | **185** | **0** | **916** |

Zero posts fall after 31 Jul 2026 — the sixteen-month range is one-sided (four extra months at the front, none at the back).

## 3. The sixteen `UploadLog` entries and what each extra month contributed

`UploadLog` has 47 `POSTS_CSV` rows total (each month was uploaded 2–4 times — an initial insert plus later re-uploads that only touched `records_updated`, zero net new posts each time), collapsing to 16 distinct months by `records_inserted`:

| Month | Posts inserted | In declared study period? |
|---|---|---|
| Apr 2025 | 44 | No |
| May 2025 | 54 | No |
| Jun 2025 | 44 | No |
| Jul 2025 | 43 | No |
| Aug 2025 | 52 | Yes |
| Sep 2025 | 81 | Yes |
| Oct 2025 | 83 | Yes |
| Nov 2025 | 65 | Yes |
| Dec 2025 | 47 | Yes |
| Jan 2026 | 59 | Yes |
| Feb 2026 | 52 | Yes |
| Mar 2026 | 84 | Yes |
| Apr 2026 | 46 | Yes |
| May 2026 | 33 | Yes |
| Jun 2026 | 68 | Yes |
| Jul 2026 | 61 | Yes |

The four extra months (Apr–Jul 2025) contribute **185 posts** — matches the "before" total in §2 exactly, confirming no extra-month post landed inside the declared window and no in-period post leaked into the extra-month count.

## 4. The in-period total is 731, not 730 — a real, unexplained 1-post gap

This is a new finding, not something your memo raised. Every check above passed; this one didn't. In-period total is **731**, one more than the manuscript's stated 730, even measured on the correct Manila-anchored boundary with the ground-truth check clean.

I haven't chased this further — didn't want to start guessing at which single post explains it without your input on where 730 was originally counted from (same open question as the 916-vs-730 gap in the prior response: this repo's DB doesn't reproduce 730 at any commit I can find, so I can't diff against a known-good baseline). Two candidates worth ruling in or out on your side:
- Whether 730 was counted by calendar month bucket (which could differ from a strict Aug-1–Jul-31 date-range count by exactly one boundary post, the same failure mode as §0 above, just wherever your 730 figure was originally produced)
- Whether one of the 916 posts is a genuine duplicate/near-duplicate that inflates the in-period count by one despite `post_id` being unique (I re-confirmed zero duplicate `post_id`s across all 916, so if this is the answer it'd have to be two distinct `post_id`s referring to the same real-world post — a content-level dupe, not a database-level one)

Send me whatever produced the 730 figure and I'll diff it directly rather than guessing.

## 5. FR-04a — implementable, small

The proposed FR reads as a straightforward addition: validate `publish_time` (already parsed and Manila-anchored at ingestion) against two configurable boundary dates, report the out-of-period count in the upload result (the `UploadLog`/toast summary already has a slot for this pattern — `records_superseded` is the closest existing analog), and add the boundary to every `lib/stats/` query that currently reads the full `FacebookPost` table unfiltered. Rough size: one migration (two `DateTime` fields, wherever study config lives — there's no existing settings table, so this likely wants one), one filter helper mirroring `lib/categorize/content-filter.ts`'s `whereForFilter` pattern, and updates to whichever stats modules don't already scope by date range. A day, maybe a day and a half including the four `lib/stats/` modules that would need the added `WHERE`. Full sizing needs the FR text finalized first — this is a rough read from the shape of the ask, not a scoped estimate.

I have not implemented FR-04a, nulled the 574 `LEGACY_IMPORT` rows, or touched any live data — everything in your §3 "queued behind the audit" list is still queued. This memo only answers the audit itself.

---

## Summary for your §9 "if you do one thing"

Zero of the 200 ground-truth posts are out of period. Every kappa in the response document stands. The one thing that changed is the in-period total is 731, not 730 — send me the source of the 730 figure and I'll close that gap next.
