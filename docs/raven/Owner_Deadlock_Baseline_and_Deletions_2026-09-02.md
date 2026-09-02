# Second Owner account, per-fold baseline, and the two deletions

**Date:** 2 September 2026
**Re:** `Two_Engagement_Rates_and_Owner_Deadlock.md`
**Status:** three of five asks closed; two still need you

---

## 1. Dead code deleted

`actions/ai-insights.ts` and `components/analytics/AIInsightCard.tsx` are gone. Both were confirmed unreferenced by any live import before deletion — the only remaining mentions were a handful of comments elsewhere (`next.config.ts`, `lib/groq-model.ts`, `actions/classify-posts.ts`) explaining which files call `resolveGroqModel()`; those are updated to drop the stale reference rather than left pointing at a file that no longer exists.

---

## 2. Cross-validation baseline is now per-fold

`lib/stats/fr31-regression.ts` had one function, `crossValidate`, computing the model's MAE out-of-fold, and a separate few lines computing the baseline's MAE in-sample (median of all 108 observations, scored against those same 108). Added `crossValidateBaseline`, which mirrors `crossValidate`'s fold loop: for each fold, take the median of that fold's *training* partition and score it against that fold's *held-out* partition. `fitOneSpecification` now calls it instead of the old in-sample computation, so both sides of `maeImprovementVsBaseline` are out-of-fold and scored identically.

The figure moved as expected:

| | Old (in-sample) | New (per-fold, out-of-fold) |
|---|---|---|
| Baseline MAE | ₱5.83 | ₱5.86 |
| Baseline RMSE | ₱8.77 | ₱8.79 |
| Baseline MAPE | 26.9% | 27.1% |

Small movement, as you'd expect for a constant predictor — consistent with your read that the old asymmetry was understating rather than overstating the model's improvement. **`maeImprovementVsBaseline` is now 28.5%** (was 28.2%), confirmed via `scripts/fr31-dump.ts` against the live DB — both sides of that ratio are seeded and deterministic for a fixed dataset, so this is the exact figure, not an estimate. Nothing here is hardcoded — `RegressionSection.tsx` and `lib/data/analysis.ts` both read the live computed value, so Chapter 4 should cite 28.5%.

Test suite updated to match: the old test asserting the in-sample baseline figures is split into an in-sample-only test, a new per-fold-baseline test, and `maeImprovementVsBaseline` is now pinned exactly (it wasn't asserted numerically before — only bounded loosely against 80% of the baseline). 405/405 tests pass, typecheck clean.

- [ ] **Once you've re-run `stat-validation-check.py`/your independent recomputation, confirm the new baseline figures land where you'd expect** — I didn't touch the independent Python check, only the TypeScript side.
- [ ] **§5.4 of `FR31_Regression_Specification.md` and §7 of `FR31_Amendment_TypeScript_Implementation.md` still publish the old baseline row** (₱5.83/₱8.77/26.9%, "~29%" framed against ₱4.15 vs ₱5.83). Since that's your acceptance-test spec, I didn't touch it — flagging so you can update it to ₱5.86/₱8.79/27.1% and 28.5% rather than me rewriting your own document.
- [ ] **Two prior memos to you now describe a file that no longer exists**: `ERD_and_System_Architecture_Narrative_2026-09-02.md` §4 lists `actions/ai-insights.ts` as a live Groq caller, and `SSDLC_Security_Requirements_Implemented_2026-09-02.md`'s SR-D8 row says the scoping decision is "documented in code comments at both chat/insights call sites" — one of those two files is now deleted. Both are corrected by this memo rather than edited in place, since they're what was already sent. `CLAUDE.md` and `SECURITY.md`, which are ours (not sent-history), are updated directly.

---

## 3. Second Owner account: code is ready, DB write is not done

`actions/admin.ts`'s `createUser` already lets any Owner create another `BUSINESS_OWNER` account through the UI (`requireOwner()`-gated, logs `ACCOUNT_CREATED`) — no new code was needed for the live app. What I added is a second seeded Owner for the demo/dev environment, so it's guaranteed to exist without depending on someone remembering to click through the admin UI first:

- `prisma/seed.ts` now seeds a fourth user, `owner2@pcmerchandise.com` (`BUSINESS_OWNER`), gated behind a new `SEED_OWNER2_PASSWORD` env var (same ≥12-char validation as the other three).
- `.env.example` documents the new var and corrects a stale comment (said "at least 8 characters", code has required 12 since the SR-A3 fix).

- [ ] **I have not run `npx prisma db seed`** — that writes to the live Neon DB, and needs a real `SEED_OWNER2_PASSWORD` supplied first. Once that's set in `.env`, running the seed creates the account; want me to do that once you've picked a password, or will you run it?

**One design question for you.** As implemented, a second account removes today's deadlock, but nothing stops the deadlock from recurring — Owner A can still demote or deactivate Owner B (`updateUserRole`/`deactivateUser` only block acting on *yourself*, not on the last other Owner), after which a self-lockout is a deadlock again. That's proportionate to what you asked for ("create a second account"), but it's a provisioned mitigation rather than an invariant.

- [ ] **Do you want a "last active Owner" guard added** — refuse `updateUserRole`/`deactivateUser` if the target is the only other `BUSINESS_OWNER` — so NFR-12's new clause is structurally true rather than true only because two accounts happen to exist right now? It's a small change (~4 lines in `actions/admin.ts`) but it's scope beyond your original ask, so I'd rather you call it than assume it.

---

## Still open from your memo (not started, need your input)

- **FR-06 wording confirmation** — whether the advertising engagement-rate figure sums across an ad's monthly rows before dividing, and whether the two engagement-rate values share a column name at the schema level.
- **NFR-04** — re-run timing once deployed to the production URL.
- **NFR-06** — open the app in Safari (ideally iOS) before narrowing the browser-support requirement.

---

## Ours (unchanged from your memo)

Neon console auto-suspend check, the production timing re-run, the manuscript changes for §1, and your independent spot-check of the validation figures — all still pending on your end as you described.
