# FR-08 at 707: reconciled

**Date:** 5 September 2026
**Re:** `FR08_707_Figures_to_Reconcile.md`
**Status:** §1 and §2 answered from data, not memory — both close. §4 confirmed. §3 built, waiting on your pooled figure to light up.

---

## 1. Which model produced the suggestions being scored — answered

Queried `category_llm_model` (added in the 25 Aug migration) and, for the rows that predate that column, `LlmClassificationRun.post_ids` (the internal DB id, not `post_id` — that array is `Int[]`, first pass at this joined on the wrong key and came up empty).

**The 200 reference posts:** every `category_llm` value traces to `llama-3.1-8b-instant`, run 2026-08-13. Zero rows trace to `gpt-oss-20b`. Confirmed independently of the earlier `Provenance_Audit_Results.md` finding — same answer, different method (internal-id overlap against `LlmClassificationRun`, not just the run log's own model-name history).

**The 507 backlog posts:** the same 2026-08-13 run covered these too — it wasn't scoped to the 200, it classified the whole content library that existed at the time, which is why 63 runs × ~15 posts covers ~930 rows. **504 of 507 (99.4%) are `llama-3.1-8b-instant`.** Three posts (`1427101452773076`, `1258344172982139`, `1240078464808710`) were reclassified later under the now-pinned `gpt-oss-20b`, and `category_llm_model` confirms the stored value for exactly those three reflects that re-run.

**So the 707 figure is not two models scored as one method — it's 704/707 (99.6%) one model, with three posts touched by a second.** All three predicted `UNCLASSIFIED` under both models (`category_final = UNCLEAR` on all three) — the re-run didn't change their prediction, so it doesn't move the confusion matrix or kappa either way. Not requesting a re-run: nothing here contaminates the figure Chapter 4 would print. Flagging the three post_ids in case you want them re-pinned to `llama` for strict consistency, but the practical effect is zero.

The read-only `rerun-fr08-llm-model.ts` comparison (κ=0.4645 under `gpt-oss-20b`, the number quoted in your memo) never wrote to `category_llm` — confirmed by the script itself (explicit no-write, and its own closing log line says so). That figure was a comparison run, not what's stored.

## 2. Which keyword kappa is current — answered

**0.1388 is current.** `lib/data/method-evaluation.ts` scores the *live* `category_keyword` column (today's 93-keyword table) through `computeAgreement()` in `lib/stats/agreement.ts`, unmapped. That raw, live-lexicon figure is exactly what `FR08_Seed_Lexicon_Rerun_Results.md` labelled "C. Live lexicon (93 keywords) — raw."

- **0.1360** is the 50-keyword seed lexicon (the fixed pre-registration baseline) — a different, frozen lexicon, not what's live.
- **0.2115** is that same seed lexicon *with* the UNCLASSIFIED→unclear mapping applied — a variant computed only inside the one-off re-run script, never touching `lib/stats/agreement.ts`.

**The mapping is not applied anywhere in the live app**, confirmed directly in `agreement.ts`'s own comment: `UNCLASSIFIED` (method abstained) and `UNCLEAR` (human said "cannot decide") are scored as distinct labels everywhere, "a deliberate design choice, documented in `lib/category-label.ts`, not an oversight" (quoting `FR08_Seed_Lexicon_Rerun_Results.md` §3.2, which is still accurate). That's why unclear recall reads 0.0% for both methods at both scopes in this memo — consistent with your inference, now confirmed at the code level rather than inferred from the symptom.

## 3. Pooled ceiling — built, not populated

`import-inter-coder-reliability.ts` needed no change to accept a third row — it's an unstructured insert (`n`, `percentAgreement`, `kappa`, `notes`), so running it a third time for the pooled set works today: `npx tsx scripts/import-inter-coder-reliability.ts 707 <agreement> <kappa> "pooled, reference + backlog"`.

The read side did need a change and is now in: `getInterCoderReliability()` (singular, latest-row-wins) is replaced with `getInterCoderReliabilityRows()` (all rows), and the Method Evaluation page now matches each section's ceiling banner to its own `n` independently — the reference section still only lights up for `n=200`, and the combined section now has its own banner slot that only renders for a row matching `n=707` exactly. Importing the pooled row doesn't touch or risk displacing the existing `n=200` banner (the bug this scoping exists to prevent, per your §4 memo). 523/523 tests pass, `tsc --noEmit` clean.

Send the pooled n/agreement/kappa whenever you have it — the banner appears with no further code change on our side.

## 4. The 719 vs 707 gap — confirmed exactly

Queried it directly rather than trusting the earlier explanation: 12 posts, all `category_final_source IN (MANUAL_OVERRIDE, ACCEPTED_SUGGESTION)` — 10 `MANUAL_OVERRIDE`, 2 `ACCEPTED_SUGGESTION`, all pre-dating the legacy nulling, none coded against the codebook. 719 total categorised − 12 = 707. That is the whole of the difference — confirmed, safe to state in Chapter 4.

---

## Where this lives

- `lib/data/method-evaluation.ts` — `getInterCoderReliability()` → `getInterCoderReliabilityRows()`.
- `app/dashboard/marketing/method-evaluation/page.tsx` — per-section ceiling banner lookup by exact `n` match; combined-section banner added, gated on a pooled row existing.

Not committed — investigation-only queries were read-only and discarded; the two file changes above are the only code diff and are staged alongside the existing uncommitted FR-08 707 work, pending your read.
