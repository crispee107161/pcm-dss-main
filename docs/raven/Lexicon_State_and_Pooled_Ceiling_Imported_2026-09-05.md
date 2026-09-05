# Lexicon is 50 terms, stored figures aren't — and the pooled ceiling is imported

**Date:** 5 September 2026
**Re:** `Live_Lexicon_and_Pooled_Ceiling.md`
**Status:** §1 answered, and it surfaced a real bug beyond what you asked about. §3 confirmed. §6 imported and live.

---

## 1. The `Keyword` table: 50 rows, confirmed by direct query. My §2 answer was wrong.

Queried it directly rather than trusting `Lexicon_Integrity_and_Ground_Truth_Answers.md` again, which is exactly the mistake that memo is dated 22 August and I cited it as if it were still current. **It is not current — the 23 August revert (commit `9e3d546`) landed and stuck.** The live table is 50 rows, and every one of them matches the seed set exactly, in the original categories. My prior memo's "today's 93-keyword table" was stale information, not a fresh check. Sorry for the extra round trip.

**Nothing was added after the revert.** Confirmed two ways: the row count itself (exactly 50, not 50-plus-drift), and reading `actions/keywords.ts` directly — all four write paths (`addKeyword`, `suggestKeywords`, `addKeywordsBulk`, `deleteKeyword`) unconditionally return a frozen-lexicon error, server-side, regardless of role or input. Not a client-side hide: the Server Actions themselves refuse before touching Prisma.

**FR-07a enforcement is live**, with one naming deviation from your checklist worth flagging: the nav item is *renamed* to "Keyword Lexicon" (`app/dashboard/marketing/layout.tsx`), not removed outright. Functionally equivalent to removal, though — `KeywordsClient.tsx` has no form, button, or input for editing at all (grepped the component; nothing renders that could invoke the frozen actions), so there's no add/delete affordance in the UI to test against the server-side refusal. If you want the entry gone from the nav rather than relabelled view-only, that's a one-line change; flagging rather than assuming.

## 1a. What the row count actually explains — and a bug it exposed

Your §1 asked "how many rows," but the more useful test was whether the **stored** `category_keyword` values on the 707 scored posts still reflect what the current 50-term table would produce. They don't, for 36 of them.

**Proof, read-only:** recomputed `detectCategoryFromText()` against the live table (confirmed 50 rows, byte-identical to your seed list) for all 707 posts and diffed against the stored `category_keyword` column.

- **n=200 reference sample, recomputed fresh: κ = 0.1360, p_o = 0.5050 — exact match to your seed-lexicon figure**, down to four decimal places. That's the confirmation you were looking for in §2: 0.1360 and a from-scratch recompute against today's table are the same number, because they're now the same computation.
- **36 of 707 stored `category_keyword` values disagree with that same fresh computation** — all in the direction you'd expect from the removed 43 terms (several flip from a `PRODUCT_SHOWCASE` match under the old table to `UNCLASSIFIED` or a different category under the current 50).

**Why they disagree: the revert never touched `FacebookPost` rows, and nothing else does either.** `revert-lexicon-to-seed.ts` says so in its own header comment — it deletes `Keyword` rows only, deliberately leaving every post's already-computed `category_keyword` alone. The only code path that ever recomputes `category_keyword` is `autoCategorizeAll()` (`actions/categorize.ts`), and it's scoped to `category_keyword: null` — posts still *missing* a suggestion. All 707 of these posts already have one, so nothing in the live app will ever refresh them. They are permanently pinned to whatever the lexicon looked like on the day they were classified (before 25 August, when the `category_keyword_lexicon_count` stamp was added — that column reads `NULL` on all 707, confirming they predate it).

**Consequence for the combined figure:** the 0.1494 in the original 707 memo (and whatever the live Method Evaluation screen currently displays for the combined section) is not scoring the frozen 50-term baseline — it's scoring a mix of the current table and 36 leftover predictions from the deleted 93-term one. I recomputed the honest current-lexicon number for the record:

**n=707 combined, current 50-term table: κ = 0.1566, p_o = 0.4823** — nobody has printed this number before; it belongs next to 0.1494 as the one that actually corresponds to the frozen baseline you approved.

## 2. Which keyword figure Chapter 4 reports — settled

**0.1360 at n=200.** Not 0.1388 (stale stored value, contradicted by the table's actual current state) and not 0.1360-vs-0.1388-are-different-lexicons (they're not — they're the same 50-term lexicon; 0.1388 is just wrong because it's reading stale data).

**For n=707, the number to use is the fresh 0.1566** computed above, not the memo's 0.1494. Both existing stored-value figures (0.1388, 0.1494) are artifacts of the staleness bug, not of a lexicon-composition disagreement.

**Recommendation, not yet actioned:** a one-time backfill recomputing `category_keyword` for the 707 already-finalised posts under the current locked lexicon, so the live Method Evaluation dashboard stops displaying the stale numbers and matches what Chapter 4 would print. Scoped narrowly — only rows with `category_final` already set, so it can't touch the open review queue — and read-before-write in the same style as `revert-lexicon-to-seed.ts`. Not run without your go-ahead, since it writes to `FacebookPost`. Say the word and I'll build and run it under the same review process as everything else.

## 3. The mapped variant — confirmed computable on request

Already demonstrated: `rerun-fr08-seed-lexicon.ts` computes both raw and UNCLASSIFIED→unclear-mapped variants in one run, as a local function that never touches `lib/stats/agreement.ts`. Can produce it for either n=200 or the corrected n=707 figure above whenever you want it — no code change needed, matching your §3 ask exactly.

## 4. §6 — pooled ceiling, imported

Confirmed your format: the existing n=200 row stores `percent_agreement` as a proportion (`0.785`, not `78.5`), so your command was already correct as written.

```
npx tsx scripts/import-inter-coder-reliability.ts 707 0.8444 0.7572 "pooled, reference + backlog"
```

Run. `Recorded inter-coder reliability #2: n=707, agreement=84.4%, kappa=0.757`.

The read side needed the change described in the prior memo (`getInterCoderReliabilityRows()`, per-section exact-`n` match) to actually display it — that landed then, so the combined section's banner is live now with no further change. 523/523 tests pass, `tsc --noEmit` clean.

---

## Still held

Per your priority list, Method Evaluation stays held pending §1 — which is now: table state confirmed (50, enforced), but the figures on screen right now are the stale ones (0.1388/0.1494), not the corrected ones (0.1360/0.1566) above, until the backfill in §2 is approved and run. Recommend keeping it held through that step rather than releasing on the table-count answer alone.
