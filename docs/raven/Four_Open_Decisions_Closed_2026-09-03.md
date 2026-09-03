# Four open decisions — closed

**Date:** 3 September 2026
**Re:** `Seed_Password_Owner_Guard_and_Safari.md`
**Status:** all four items that were mine to close are closed. Safari (§4) is deliberately deferred, not forgotten.

---

## 1. Seed password — done

Ran `npx prisma db seed` myself, per your preference not to have a second person writing to the live database.

`owner2@pcmerchandise.com` already existed in production from an earlier password-reset pass (still on the placeholder password), so the seed script's create-if-missing logic was a no-op for it. Set its password directly to `marble-saffron-quartz-67` and cleared lockout/forced-change flags. Verified against the live DB afterward: `BUSINESS_OWNER`, active, unlocked, no forced password change, password hash confirmed matching.

- [x] `npx prisma db seed` run
- [x] `owner2@pcmerchandise.com` confirmed to exist and sign in

## 2. Last-active-Owner guard — already done

This landed the day before your reply arrived (commit `6d6975c`, 2026-09-03), so there was nothing left to add. For the record, it's the four-line version you described: `updateUserRole`/`deactivateUser` in `actions/admin.ts` refuse to act on the target if doing so would leave fewer than two capable `BUSINESS_OWNER`s, the refusal names the real invariant rather than reading as a generic denial, and it's logged through `lib/security-log.ts`.

`code-review-analyst` caught and fixed three issues before it landed: the guard originally counted `is_active` only (a locked-out-but-not-deactivated Owner still counted as capable, leaving the deadlock reachable) — now also checks `is_locked: false`; the naming implied a floor of one Owner when the logic enforces two — renamed and reworded; the guard ran before re-authentication — moved to run after.

## 3. FR-06: the two facts

- **Sum-before-divide, confirmed.** `lib/stats/correlation-selection.ts`'s `aggregateByAdId` sums `post_engagements` and `reach` per `ad_id` across all of an ad's monthly rows first, then the ratio is computed from those totals — same ALG-09 pattern as every other CPI/engagement figure in the app. The code comment says as much directly.
- **No shared column name, confirmed.** The organic rate is stored as `FacebookPost.engagement_rate` (a precomputed percentage). The advertising side has no equivalent stored column — it holds a raw count, `Ad.post_engagements`, and the rate is computed at read time from that count divided by `reach`. There's no collision at the schema level; they're distinguishable both by name and by kind (stored percentage vs. derived-on-the-fly ratio).

FR-06's revised wording and the two Definition of Terms entries can go ahead on these.

## 4. Safari check — deferred, not declined

Holding this one back deliberately for now; it'll be done manually before NFR-06's wording is finalized, per your note that it decides whether the requirement covers Chrome-only or Chrome-and-Safari.

---

## Also fixed while closing this out

A code review of the uncommitted doc changes (PROGRESS.md, both FR-31 docs, the two new ERD narratives) turned up four factual errors before they got committed — worth flagging since they'd have sat in acceptance-test and schema-verification documents otherwise:

- PROGRESS.md still listed `docs/erd_schema.sql` as not regenerated for the lockout columns/`SecurityEventLog`; it was regenerated in commit `3225df2` and is already committed. Removed the stale line.
- `FR31_Regression_Specification.md`'s "~28.5% (MAE ₱4.15 vs ₱5.86)" didn't recompute — that pairing is actually ~29%; 28.5% is the live TS app's figure (CV MAE ₱4.19, not the table's Python-reference ₱4.15). Restored ~29% for the table pairing and added a note on why the live app reports a slightly different number.
- The new `ERD_Narrative_2026-09-03.md` claimed "all 20 models" confirmed; it's 21 — the doc's own "13 standalone + 8 FK-bearing" math already said so.
- Same doc claimed `SecurityEventLog`'s FK was the only SET NULL among User-rooted relationships; two `FacebookPost` FKs are also SET NULL. Fixed the description and the diagram-layout note so a diagram built from it doesn't draw those two relationships as RESTRICT.

Not fixed, lower priority, still there if you want them: the two new ERD narrative docs disagree with each other about which one supersedes the other, both have the security-hardening commit dated a day late (2026-09-03 instead of the actual 2026-09-02), and there's a minor section-numbering glitch in the Tagalog memo. Also still open: whether the three rendered diagram binaries (~826 KB) should be tracked in git, same question as the `aug15-copy/docs/pdfs` one you already have open.

## Still on your side, unchanged

Neon console auto-suspend check, the production timing re-run once deployed, your independent validation spot-check (including the new baseline figures), and the manuscript changes.
