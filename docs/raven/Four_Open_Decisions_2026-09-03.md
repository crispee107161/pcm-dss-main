# Four open decisions before we close this thread

**Date:** 3 September 2026
**Re:** `Owner_Deadlock_Baseline_and_Deletions_2026-09-02.md`
**Status:** nothing new implemented since your last memo — this just collects what's waiting on you into one place

---

## 1. Confirm the new baseline figures

Per-fold cross-validation baseline is now live: ₱5.86 MAE / ₱8.79 RMSE / 27.1% MAPE, `maeImprovementVsBaseline` = 28.5% (was ₱5.83/₱8.77/26.9%/28.2% under the old in-sample computation). Pinned exactly in the test suite, reproduced via `scripts/fr31-dump.ts` against the live DB.

- [ ] Once you've re-run `stat-validation-check.py` / your independent recomputation, confirm the new figures land where you'd expect.

## 2. Update the FR31 spec documents

`FR31_Regression_Specification.md` §5.4 and `FR31_Amendment_TypeScript_Implementation.md` §7 still publish the old baseline row (₱5.83/₱8.77/26.9%, "~29%" framed against ₱4.15 vs ₱5.83).

- [ ] These are your acceptance-test documents — update them to ₱5.86/₱8.79/27.1% and 28.5%, or tell me to do it.

## 3. Second Owner account — who runs the seed

`actions/admin.ts`'s `createUser` already lets any Owner create another `BUSINESS_OWNER` through the UI. Separately, `prisma/seed.ts` now seeds a fourth dev/demo user (`owner2@pcmerchandise.com`) gated behind a new `SEED_OWNER2_PASSWORD` env var — but `npx prisma db seed` has not been run against the live Neon DB.

- [ ] Pick a password (≥12 chars, same validation as the other three) and tell me whether you want me to set `SEED_OWNER2_PASSWORD` and run the seed, or whether you'll run it yourself.

## 4. "Last active Owner" guard — in scope or not?

As implemented, a second account removes today's deadlock but doesn't prevent it recurring: Owner A can still demote or deactivate Owner B (`updateUserRole`/`deactivateUser` only block acting on *yourself*), after which a self-lockout is a deadlock again.

- [ ] Do you want a guard added — refuse `updateUserRole`/`deactivateUser` if the target is the only other `BUSINESS_OWNER` — so NFR-12's new clause is structurally true rather than true only because two accounts happen to exist right now? ~4 lines in `actions/admin.ts`. This is scope beyond your original ask ("create a second account"), so it needs your call rather than an assumption.

---

## Also still open (yours, unchanged)

- **FR-06 wording confirmation** — whether the advertising engagement-rate figure sums across an ad's monthly rows before dividing, and whether the two engagement-rate values share a column name at the schema level.
- **NFR-04** — re-run timing once deployed to the production URL.
- **NFR-06** — open the app in Safari (ideally iOS) before narrowing the browser-support requirement.
- Neon console auto-suspend check, the manuscript changes for §1 of the engagement-rates memo, and your independent spot-check of the validation figures.

None of items 1–4 above block the others — answer whichever you're ready to close first.
