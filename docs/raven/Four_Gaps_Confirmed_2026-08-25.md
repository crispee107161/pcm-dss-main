# Four gaps — confirmed, item by item

**Date:** 25 August 2026
**Re:** `Four_Remaining_Gaps_Please_Confirm.md`

All four are closed. Verified against a full test run and a production
build after every code change (`npm test`: 376/376 passed; `npm run
build`: clean, tsc included).

---

## Item 1: snapshot date — done, took the "failing that" option

Went with **"date not recorded"** rather than tracking down the client's
real export date, since that would have meant reopening the data-collection
conversation this late. `lib/data/demographic-snapshot.ts`'s
`demographicSnapshotLabel()` now returns `"date not recorded"` for any row
whose `captured_at` equals the migration backfill timestamp, and the real
date otherwise. Both dashboards (owner + marketing page-metrics) use it.

**Backfill timestamp:** `2026-08-25` (the date the `captured_at` column was
added and backfilled — migration `20260825050000_add_demographic_snapshot_dates`).
Every demographic row currently carries that value, so as of today every
card reads "date not recorded." That flips automatically the moment a real
demographics file is re-uploaded, since fresh uploads write the actual
`captured_at` from that point forward.

## Item 2: validators — extended to all five

`follower-history`, `page-viewers`, `page-metric`, `demographics`, and
`audience` validators now return `{ valid, rejected }` sets on the same
per-row pattern as ads/posts, all routed through the shared
`lib/csv/row-validation.ts` helper. `records_rejected` on `UploadLog`
captures the full rejected list; the response payload caps at 20 rows,
same as before. All seven ingestion paths now satisfy FR-04 as written —
no narrowing needed.

## Item 3: session window — closed

Added a per-request `is_active` check inside the `session` callback
(`lib/auth.ts`), alongside the existing sign-in-time check in `authorize`.
At ~10 accounts the extra query is not measurable overhead. A deactivated
account now loses access on its next request, not just its next sign-in —
no more 8-hour window. `UserManagement.tsx` also got a `reactivateUser`
action wired in, since deactivation with no way back would have been a
dead end.

## Item 4: migration drift — documented, not reconciled

Checked first: `npx prisma migrate status` reports no drift — the
migration file's checksum matches what's recorded as applied, so nothing
was hand-edited after the fact. The actual gap is narrower than "the file
was modified" — it's that the file's own comment describes an audit
finding that went stale.

`20260823150110_category_final_source_legacy_and_revision/migration.sql`
only adds two enum values; it never contained the backfill `UPDATE`. Its
comment cites "704 rows currently match this pattern" from the
2026-08-23 audit. The actual backfill ran two days later
(`scripts/raven-574-run.ts`, per `574_Live_Run_Confirmation_2026-08-25.md`)
against a re-audited count of 574 candidates, of which 427 in-period rows
were written and 147 out-of-period rows were deliberately left alone.

Editing the migration file itself would have introduced the exact problem
being fixed — a real checksum mismatch against `_prisma_migrations` — so
instead I added
`prisma/migrations/20260823150110_.../PROVENANCE_NOTE.md`, which lays out
the 704 → 574 → 427 chain and why the backfill was correctly kept out of
the migration (data mutation, one-shot, not something that should replay
against a fresh database).

---

## Summary for the matrix

| Item | Resolution |
|---|---|
| 1 — snapshot date | Done. "Date not recorded" fallback; backfill timestamp 2026-08-25 |
| 2 — validators | Done. All 5 remaining files extended; 7/7 ingestion paths now per-row |
| 3 — session window | Done. Per-request `is_active` check in session callback |
| 4 — migration drift | Documented via `PROVENANCE_NOTE.md`; migration file itself untouched, no checksum drift |
