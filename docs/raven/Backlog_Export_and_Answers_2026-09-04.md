# Backlog export, hold-back proposal, and answers

**Date:** 4 September 2026
**Re:** `Backlog_Coding_Export_Request.md`

---

## §2.1 — who is working the queue

`marketing@pcmerchandise.com` (Dan Mintong Carullo, MARKETING_MANAGER). Confirmed from `CategoryAuditLog` — their most recent action was an OVERRIDE at 2026-09-03T05:34Z.

I'll ask them to hold until the coding is imported. Flagging here so it's on record when it happened relative to the export below.

---

## §2 — the three posts already categorised, with counts

Count by `category_final_source`, in-period:

| source | count |
|---|---|
| `MANUAL_GROUND_TRUTH` | 200 |
| `MANUAL_OVERRIDE` | 13 |
| `ACCEPTED_SUGGESTION` | 2 |
| null (queue) | 516 |

15 posts total carry `MANUAL_OVERRIDE`/`ACCEPTED_SUGGESTION` (there's no literal `MANUAL_SELECTION` value in the schema — that's these two sources combined), but only **3 were assigned after the 574 legacy-nulling run** (cutoff: the run's commit, 2026-08-25T16:03:25Z). The other 12 predate it and were never part of that backlog — leaving them alone.

The 3, dry-run confirmed, all by the same account (`user_id 1`, Dan):

| id | post_id | final category | assigned at |
|---|---|---|---|
| 24653 | 1440488374767717 | PRODUCT_SHOWCASE | 2026-08-26T17:59:05Z |
| 24652 | 1440342761448945 | TESTIMONIAL | 2026-09-03T05:34:13Z |
| 24651 | 1439591281524093 | PRODUCT_SHOWCASE | 2026-09-03T05:34:34Z |

Nulling these returns the queue from 516 to 519 — matches your 519→518→516 observation exactly (in reverse). `category_keyword`/`category_llm` untouched either way; dry-run script is `scripts/raven-backlog-repair-dry-run.ts`.

**Not run yet.** Since it's only 3, want me to go ahead, or do you want to sign off first?

---

## §3 — hold-back proposal, 12 posts

Selected from the current queue to cover all four flag conditions (a post satisfying more than one condition at once is realistic, not an error):

| condition | id | post_id |
|---|---|---|
| DISAGREEMENT | 23713, 23715, 23717 | keyword/LLM methods disagree |
| UNCLASSIFIED | 23723, 23763, 23789 | one or both methods returned no result |
| ENTERTAINMENT_SUGGESTED | 23728, 23744, 23750 | LLM suggested Entertainment |
| SHORT_CAPTION | 23881, 24028, 24861 | caption below the length threshold |

These are excluded from the export below. Change any of them if you'd rather pick your own — the export script takes the id list as a constant (`HOLD_BACK_IDS` in `scripts/raven-backlog-coding-export.ts`).

---

## §1 — the export

`scripts/output/raven-backlog-coding-export.csv`, columns `post_id,caption`, UTF-8.

- Queue size (in-period, `category_final` null): **516**
- Held back per §3: **12**
- **Exported rows: 504**
- Of those, **3 have an empty caption** — included as blank cells, not filtered out (the 4th empty-caption post in the queue, id 23723, is one of the UNCLASSIFIED hold-backs above)
- Caption = `resolveCaption(title, description)` — the longer of Title/Description, same rule the classifier reads. Confirmed against `lib/keywords/caption.ts`.

I'll send you the CSV file directly (not just leave it in the repo), same as the ZDR screenshot. Let me know if you want it split into two identical copies or you'll duplicate it yourselves.

---

## §4 — import format, answered from the script and codebook

Read `scripts/import-codebook-assignment.ts` and `docs/notes/CODEBOOK_content_categories.md` rather than guessing:

- **Shape:** `post_id,category` — exactly those header names, case-sensitive.
- **Category strings:** lowercase snake_case, matching the existing codebook exactly: `product_showcase`, `promotional_offer`, `testimonial`, `entertainment`. (Matching is actually case-insensitive in the parser, but write them as the codebook specifies.)
- **No-category case:** use `unclear`. It's a real 5th label already wired end-to-end (`CategoryLabel.UNCLEAR`) for exactly this — "the caption genuinely does not permit a decision." No new value needed.
- **Extra columns:** yes, safely ignored. The parser reads by header name (`row.post_id`, `row.category`) and never rejects unknown columns, so keep `reason` and `notes` in the file you send — no need to strip them before import.
- **Header row:** required.
- **Encoding:** UTF-8, UTF-8-with-BOM, or UTF-16LE all auto-detected — send whatever your spreadsheet tool exports.
- **Delimiter:** comma.

---

## Priority note

Sending §2.1 (ask Dan to hold) right away since it's one message and every post categorised between now and the import is one more to reverse. §1/§3 (export + hold-back) are ready pending your sign-off on the 12 hold-back picks. §2 (the 3-post repair) is dry-run only until you confirm.
