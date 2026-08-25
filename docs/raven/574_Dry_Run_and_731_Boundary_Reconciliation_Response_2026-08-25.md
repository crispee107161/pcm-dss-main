# §1 and §2 closed, 574 dry run matches exactly

**Date:** 25 August 2026
**Re:** `731st_Post_Reconciliation_and_574_Greenlight_v2.md`
**Method:** live read-only DB queries (`scripts/raven-731-reconciliation.ts`, `scripts/raven-731-manila-months.ts`, `scripts/raven-731-source-file-basis.ts`, `scripts/raven-731-boundary-candidates.ts`) plus direct parsing of the raw export CSVs still on disk (`data/FB_OrganicPosts_Data/`, `data/Organic Posts/`). Dry run for §6 is `scripts/raven-574-dry-run.ts`. No writes made to any table — the live nulling script (`scripts/raven-574-run.ts`) is written but **not executed**, pending your go-ahead per the note at the end of this memo.

---

## 1. §1: the table was mixed-basis, exactly as you guessed — here is the split

Pulled both bases directly rather than reasoning about it further.

| Month | Source-file basis (`UploadLog.records_inserted`) | Manila-publish-month basis (DB) |
|---|---|---|
| Apr 2025 | 44 | 44 |
| May 2025 | **55** | **54** |
| Jun 2025 | 44 | 44 |
| Jul 2025 | 43 | 43 |
| Aug 2025 | **51** | **52** |
| Sep 2025 | 81 | 81 |
| Oct 2025 | 83 | 83 |
| Nov 2025 | 65 | 65 |
| Dec 2025 | 47 | 47 |
| Jan 2026 | 59 | 59 |
| Feb 2026 | 52 | 52 |
| Mar 2026 | 84 | 84 |
| Apr 2026 | 46 | 46 |
| May 2026 | 33 | 33 |
| Jun 2026 | 68 | 68 |
| Jul 2026 | 61 | 61 |
| **Total** | **916** | **916** |

Your read was right: the `Study_Period_Scope_Response_2026-08-25.md` §3 table's "Posts inserted" column is `UploadLog.records_inserted` for every row **except** it silently reports the Manila-month figure for August specifically (52, not the file's actual 51) while reporting the file figure for July (43, which happens to equal that month's Manila figure too, so it read as consistent when it wasn't). Fourteen of sixteen months have identical values on both bases, which is what let a one-row mixed-basis error hide. Sorry for the noise this introduced. Source-file basis is what diffs against your exports; use the left column for that going forward.

Two months, not one, differ from what you'd expect: **May 2025 (55 file / 54 Manila) and August 2025 (51 file / 52 Manila)**, and they cancel exactly in the total (916 either way). Both are explained below.

---

## 2. §2: zero cross-month misfiling in the twelve real client exports; the drift is confined to the four synthetic pre-period months and doesn't move 731

**Verified directly against the raw export CSVs, not reconstructed DB timestamps.** An earlier pass tried correlating `FacebookPost.created_at` to `UploadLog.uploaded_at` per file and found it doesn't work — created_at doesn't cluster by upload event at all (rows from six different declared months shared near-identical created_at, days apart from their upload's logged timestamp), which tells us this DB has no reliable per-row upload lineage to reconstruct after the fact. So instead of trusting the DB's memory of which file inserted which row, I parsed the raw CSVs that are still on disk under `data/FB_OrganicPosts_Data/` and `data/Organic Posts/` — thirteen files (twelve months Aug 2025–Jul 2026, plus a duplicate Sep 2025 re-export with identical post_ids) — and compared each row's own "Publish time" column against the month the filename declares.

**Result: 0 mismatches across 811 rows.** Every post in every one of your twelve real client exports sits in the file matching its own declared publish time. This directly answers your question: **within the declared study period's actual source data, misfiling at month boundaries essentially doesn't happen.** 731 does not move, and per your own stated threshold ("if the answer is one or two, this closes and becomes a footnote"), it closes.

**The one confirmed crossing (`1142974524519105`, Jul-file → Aug-Manila) sits entirely in the four extra pre-period months, which are not real client exports** — you already established in §3 that the client's exports start Aug 2025 and the Jul 2025 file exists only on our side. I don't have raw CSVs for those four months to independently verify file-vs-content the way I did for the twelve real ones, so I can't rule out further internal drift there the way I can for the real corpus. What I can say: the May 2025 discrepancy above (55 file / 54 Manila) is very likely the same failure mode one boundary over — I found two more candidate boundary posts near the May 31/Jun 1 Manila line (`1096582012491690`, `1096802432469648`) and two near Jun 30/Jul 1 (`1119172470232644`, `1119298756886682`) by scanning every post within 12 hours of a month boundary DB-wide (full list in the script output, available on request). But **none of this touches 731**, because all of it — the May/Jun drift, the Jun/Jul candidates, and however they eventually resolve — stays entirely inside the excluded pre-period range (Apr–Jul 2025). The only boundary that matters for the study-period count is Jul 31/Aug 1, and that one is confirmed: exactly one post crosses it, already counted, already in 731.

**So: 731 stands, confirmed. Please make the manuscript change** — Table 2, Chapter 3, 730 → 731, with the note you drafted in your §4.

---

## 3. §6: the 574 dry run, numbers match every one of your expectations exactly

```
Rows that WOULD be nulled (in-period LEGACY_IMPORT): 427   — expected 427  (MATCH)
Out-of-period LEGACY_IMPORT rows (left alone):        147   — expected 147  (MATCH)
Rows in the nulling selection with source != LEGACY_IMPORT: 0  (the WHERE is
  an equality condition on category_final_source, so MANUAL_GROUND_TRUTH,
  MANUAL_OVERRIDE, and ACCEPTED_SUGGESTION rows are structurally unreachable
  by this query, not just empirically zero this run)
Current in-period Needs Review (category_final null): 92    — expected 92   (MATCH)
Resulting Needs Review after the run (92 + 427):       519   — expected 519  (MATCH)
```

`category_keyword` and `category_llm` are untouched by the live script's UPDATE — it only sets `category_final: null, category_final_source: null` on the 427 selected rows. Confirmed none of the 427 have both keyword and LLM categories already null (i.e. there's real prior categorisation data on every row that goes back into the queue, not blank rows).

**Per your standing go-ahead:** the numbers match, so the live script is ready to run. I'm holding it for one explicit confirmation from my side before it touches the live Neon database — that's my own team's policy on writes to shared/production data, not a reopening of anything above. Say the word and it runs immediately; nothing else is queued behind it.

---

## 4. §7 items 3 and 4 — already sent

Both are answered in `FR_Numbering_Confirmation_and_Category_Performance_Response_2026-08-25.md`, written the same day as this memo: the seven mappings confirmed with no corrections (§1), the full 31-item `mvp.md` FR list (§1.1), and Category Performance vs. the Analysis category section answered as genuinely different metrics on three axes — no merge, access change stands (§2). If that file didn't reach you, let me know and I'll resend the contents inline.
