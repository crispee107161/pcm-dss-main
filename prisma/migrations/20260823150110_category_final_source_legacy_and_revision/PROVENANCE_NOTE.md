# Provenance note — read alongside `migration.sql`

**Added:** 2026-08-25, in response to `docs/raven/Four_Remaining_Gaps_Please_Confirm.md` item 4.

This file is a note only — `migration.sql` itself is unedited. Editing an
already-applied migration would create real checksum drift against
`_prisma_migrations` (confirmed clean via `npx prisma migrate status` on
2026-08-25); the gap being documented here is in what the file's comments
*imply happened*, not in the SQL that ran.

## What `migration.sql` actually does

Two additive `ALTER TYPE ... ADD VALUE IF NOT EXISTS` statements. Nothing
else. No `UPDATE` statement is part of this migration — it never wrote
`LEGACY_IMPORT` or `MANUAL_CHANGE_AFTER_FINALISATION` onto any row. It only
made those two enum values legal.

## Where the comment goes stale

The migration's inline comment says:

> Confirmed via `scripts/category-final-audit.ts`: 704 rows currently
> match this pattern.

That was an accurate audit finding on 2026-08-23, the day the migration was
written — 704 rows had `category_final` set with `category_final_source`
still `NULL`. It reads as if it describes the scope of a backfill, but no
backfill ran until two days later, under different scoping rules, with a
different resulting count:

- **2026-08-25:** the same shape of gap was re-audited (`scripts/raven-574-run.ts`
  dry run) and found **574** candidate rows — not 704; the corpus and the
  audit query had both moved on in the interim.
- Of those 574, only rows falling inside the study period (`FR-04a`,
  landed later that same day — see `docs/raven/FR04a_Implementation_and_731st_Post_Response_2026-08-25.md`)
  were actually written: **427 rows** were set to `LEGACY_IMPORT`.
- The remaining **147** out-of-period rows were deliberately left
  untouched — not an oversight, a scoping decision.
- See `docs/raven/574_Live_Run_Confirmation_2026-08-25.md` for the run
  confirmation and counts.

So: **704** (comment, 08-23 audit) → **574** (candidates, 08-25 re-audit)
→ **427** (actually backfilled, 08-25, in-period only). None of those
numbers is wrong for what it measured; the migration file's comment is
just frozen at the first of the three and reads, out of context, like a
description of the eventual backfill.

## Why this wasn't folded into the migration itself

The backfill is data, not schema — it belongs in a script
(`scripts/raven-574-run.ts`), applied once against live data, not in a
migration that could run again against a fresh database and either no-op
incorrectly or need its own idempotency handling. Keeping the enum
addition (schema, replayable) separate from the backfill (data, one-shot,
already-run) is the correct split; the gap was only that nothing recorded
the split explicitly until now.
