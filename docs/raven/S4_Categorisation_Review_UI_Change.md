# Categorisation Review — UI change: stop showing which method said what

**Date:** 21 August 2026
**Affects:** S4 Categorisation Review screen only
**Does NOT affect:** storage, FR-08 method evaluation, the ground truth, or any computation

---

## 0. The change in one line

The review screen should stop labelling suggestions by their source method. It should still use method disagreement as a triage signal — it just shouldn't tell the Marketing Manager which method produced which label.

**Nothing about the data layer changes.** `category_keyword` and `category_llm` must still be stored separately, exactly as they are now. This is a display change, not a schema change.

---

## 1. Why

The Marketing Manager isn't adjudicating between algorithms. He wants to know what the post is and whether the system got it right.

Showing him *"keyword rule: testimonial · LLM: product_showcase"* asks him to referee a methods comparison, which is not his job and not a decision he's equipped to make. Worse, it invites him to develop a preference — "the AI one is usually right" — and start rubber-stamping whichever source he's decided to trust. That defeats the entire purpose of the review queue.

The methods comparison has a proper home already: **S8 Method Evaluation (FR-08)**, plus Chapter 4 of the manuscript. That's where a panelist looks for it. It doesn't need to be on a working screen.

**But the disagreement itself stays as a triage signal.** Two independent methods diverging is the strongest indicator we have that a post sits on a category boundary, and it costs nothing because both values are already stored. We keep the signal, we drop the attribution.

---

## 2. What changes on S4

### 2.1 Flag reason wording — remove method names

**Now:**
```
⚠ Methods disagree: testimonial vs product_showcase
⚠ Keyword method returned UNCLASSIFIED
⚠ LLM suggested entertainment
```

**Change to:**
```
⚠ Needs review — the automated methods produced different results for this post
⚠ Needs review — the post's category could not be determined automatically
⚠ Needs review — entertainment was suggested, which is a rare category
⚠ Needs review — this caption is very short
```

Same triage logic underneath. No method names surfaced.

### 2.2 Suggestion display — unlabelled options, nothing pre-selected

**On flagged posts where the two methods disagree,** present both candidate categories as options to choose from, in a neutral order, with **neither pre-selected**:

```
Suggested categories for this post:
  ( ) Testimonial
  ( ) Product showcase

Or choose another:
  ( ) Promotional offer   ( ) Entertainment   ( ) Unassigned
```

Do not indicate which method produced which. Do not order them by "the better method first." Randomise or alphabetise the two, consistently.

**On flagged posts where only one suggestion exists** (the other method abstained), show that one suggestion plus the full set of alternatives, still with nothing pre-selected.

**On unflagged posts** (both methods agree, no other flag), the agreed label *is* the batch-confirm value. No conflict to present, no method attribution needed.

### 2.3 Everything else on S4 stays

- "View post" permalink link on flagged items — unchanged
- Batch confirm for unflagged posts — unchanged
- Locked view for the 200 ground-truth posts — unchanged, still no permalink there
- `source` stamping on every write — unchanged

---

## 3. ⚠ What must NOT change

This is the part where a well-intentioned simplification would break something expensive.

### 3.1 Keep both suggestions stored separately

```
category_keyword   -- keep
category_llm       -- keep
category_final     -- keep
category_ground_truth  -- keep
review_status      -- keep
```

**If you simplify the storage to match the simplified UI — for example collapsing to a single `category_suggested` column — FR-08 breaks.** Cohen's kappa is computed for *each method* against the manual labels. With one merged column there's nothing to compare.

Worse: the 200 ground-truth posts were coded by hand by two people over an evening, blind, before any suggestion existed. If the per-method suggestions are lost, that comparison cannot be reconstructed and the manual labelling would have to be redone from scratch. Objective 2 depends on it.

**The UI hides the attribution. The database keeps it.**

### 3.2 Keep the flag reason stored per-post

Store *which* condition(s) fired, not just a boolean. The UI shows the generic wording, but we need the specific counts for the manuscript:

> "Of the 530 posts reviewed, X were flagged for method disagreement, Y for automated non-determination, Z for a rare-category suggestion, and W for caption length."

That breakdown goes in Chapter 4. Can't produce it from a boolean.

### 3.3 S8 Method Evaluation is unaffected

S8 keeps showing everything: both methods named, percentage agreement, Cohen's kappa, confusion matrix, per-category recall, and our human inter-coder ceiling (κ = 0.6505, 78.5% agreement, n = 200). That screen is *for* the comparison. Don't apply this change there.

---

## 4. Requirement wording update

FR-07 in Chapter 3's Table 3 is being shortened to match — the specific flag conditions move to the algorithm section (§3.4) where implementation detail belongs. New wording, build to this:

> **FR-07 — Content categorisation and review.** The system shall generate a suggested content category for each organic post from its accompanying text, assigning one of product showcase, promotional offer, testimonial, and entertainment, shall prioritise for individual review those posts whose category could not be determined with confidence, and shall allow the remainder to be confirmed in batches. The system shall allow the marketing manager to accept, change, or set the category of any post, to consult the original post where the caption is not sufficient, and to record a post as unassigned where its content cannot be determined, retaining the manual assignment as the final value.

Note what's still in there and still binding: individual review for low-confidence posts, batch confirm for the rest, manager-only final assignment, permalink consultation, and the unassigned state. Only the enumeration of flag conditions moved out of the requirement text.

---

## 5. Checklist

**Status as of 2026-08-22.** Both §2.2 (attribution/pre-selection) and §2.1/§3.2 (flag-reason triage + batch confirm) are now implemented. Thresholds for two of the four flag conditions (RARE_CATEGORY, SHORT_CAPTION) were not specified anywhere in the codebase or docs prior to this build and were chosen during implementation — see the "Thresholds chosen" note below; treat them as provisional until confirmed against real review data.

**Change**
- [x] Flag reasons reworded — no method names in user-facing copy on S4 — done: `FLAG_REASON_MESSAGE` (`lib/categorize/flag-reasons.ts`) uses the memo's §2.1 generic wording verbatim (RARE_CATEGORY's wording is generic — "a rare category was suggested" — rather than naming the specific category, to avoid a message that could go stale as the rare-category baseline shifts across the review period).
- [x] Disagreeing suggestions shown as unlabelled options, consistent order, none pre-selected — done: `PendingCell` dedupes `keywordSuggestion`/`llmSuggestion` into unlabelled `CategoryBadge`s, alphabetized by display label. Presented as read-only badges plus the existing category `Select`, not the checkbox mockup in §2.2 — same effect (no attribution, no forced pick), different control.
- [x] Single-suggestion flagged posts show that suggestion plus alternatives, none pre-selected — done via the same badge + `Select` mechanism; `defaultSelection` only pre-fills for a human proposal or full agreement.
- [x] Unflagged posts still batch-confirm to the agreed label — done: new `batchConfirmAgreed` action (`actions/categorize.ts`) finalises every post with zero flag reasons, both methods agreeing, and no pending Team proposal, in one transaction; "Batch confirm agreed (N)" button in `CategorizeClient.tsx`, Manager-only.

**Do not change**
- [x] `category_keyword` and `category_llm` still stored separately — unaffected
- [x] Flag reason stored per-post as specific condition(s), not a boolean — done: `FacebookPost.category_flag_reasons CategoryFlagReason[]` (migration `20260822011857_add_category_flag_reasons`), recomputed and persisted by `lib/data/category-flags.ts` `recomputeQueueFlagReasons` whenever a suggestion is (re)generated. **Superseded by §5a below**: this line originally described a rare-category baseline that shifted as posts were confirmed, requiring a recompute on every `category_final` change too. That baseline was removed when `RARE_CATEGORY` became `ENTERTAINMENT_SUGGESTED` (a pure per-post condition), so the recompute-on-`category_final`-change calls no longer exist — see §5a's note on `recomputeQueueFlagReasons()` calls being deleted from `updatePostCategory`/`acceptPendingCategory`/`bulkAcceptPendingCategories`/`batchConfirmAgreed`.
- [x] S8 Method Evaluation still shows both methods by name with full statistics — unaffected, not touched
- [x] Ground-truth 200 still locked, still no permalink on that view — unaffected, not touched
- [x] `source` still stamped on every write — unaffected; `batchConfirmAgreed` stamps `category_final_source: 'ACCEPTED_SUGGESTION'` and logs a new `BATCH_CONFIRM` audit action, same pattern as the existing accept/override/bulk-accept actions

**Verify after the change**
- [x] FR-08 still computes: run it and confirm you get two separate kappa figures — `npx vitest run agreement` → 6/6 passing, kappa still computed per-method
- [ ] Grep S4 for `keyword`, `LLM`, `Groq`, `ALG-04`, `ALG-05` in user-facing strings — should return nothing — **still fails literally**, deliberately. Remaining hits are the trigger buttons ("Auto-Categorize (keyword baseline)", "Classify with AI (LLM)") and the "Manage Keywords" footer link — these name the algorithm being *invoked*, not attribution on a suggestion being *reviewed*, which is what §1's rationale is actually about. Flag if the checklist should be read literally instead and these should be renamed too.
- [x] Full suite green after the change: `npx tsc --noEmit` clean, `npx vitest run` → 305/305 passing (10 new tests added for `lib/categorize/flag-reasons.ts`)

**Thresholds chosen during implementation (no prior spec existed for these)**
- Short caption: **fewer than 10 words** (`SHORT_CAPTION_WORD_THRESHOLD`, `lib/categorize/flag-reasons.ts`)
- Rare category: any assignable category whose share of **confirmed** (`category_final`) posts is **below 10%** (`RARE_CATEGORY_SHARE_THRESHOLD`), suppressed entirely until at least **20 posts** are confirmed (`RARE_CATEGORY_MIN_CONFIRMED`) so the baseline isn't computed from noise early in the review
- Both should be confirmed or adjusted once real review data exists, and reported alongside the manuscript's flag-condition breakdown as a methodology choice, not treated as pre-existing spec

**Done**
- [x] Manuscript breakdown query — `scripts/category-flag-breakdown.ts` (`npx tsx scripts/category-flag-breakdown.ts`), same standalone-script pattern as `scripts/compute_kappa.py` / `scripts/fr15-deliverables-dump.ts`. Reads `category_flag_reasons` off every post finalised through S4 (`category_final_source` = `ACCEPTED_SUGGESTION` or `MANUAL_OVERRIDE`; the 200 `MANUAL_GROUND_TRUTH` posts are excluded — they never entered the queue).

## 5a. Raven's answers (`S4_Flag_Thresholds_Answers.md`, 22 Aug) — applied

- [x] `FLAG_SHORT_CAPTION_WORDS = 8` (`lib/categorize/flag-reasons.ts`), counted on the NFKC-normalised caption — same string the classifiers see, per §1's implementation note
- [x] Entertainment flag made unconditional — `RARE_CATEGORY` (10%-share threshold + 20-post suppression guard) removed entirely and replaced with `ENTERTAINMENT_SUGGESTED`, fired whenever either method suggests `ENTERTAINMENT`. Migration `20260822013000_rename_rare_category_to_entertainment_suggested` (`ALTER TYPE ... RENAME VALUE`, confirmed no row used the old value first). Removing the dynamic rarity computation also removed its dependency on the confirmed-category distribution — the now-unnecessary `recomputeQueueFlagReasons()` calls after `updatePostCategory`/`acceptPendingCategory`/`bulkAcceptPendingCategories`/`batchConfirmAgreed` were deleted too, since every flag condition is now a pure function of one post's own fields
- [x] Trigger buttons renamed: "Auto-Categorize (keyword baseline)" → **"Generate suggestions"**, "Classify with AI (LLM)" → **"Generate AI suggestions"** (`CategorizeClient.tsx`)
- [x] Confirmed: `category_flag_reasons` stores condition identifiers (`CategoryFlagReason[]`, e.g. `['DISAGREEMENT','SHORT_CAPTION']`), never a computed value — this was already true before the rarity rule was removed and remains true now that it's gone
- [x] Re-ran the flag pass and backfilled the 141 posts currently in the S4 queue (they had suggestions generated before this code existed, so had no flags yet — one-off backfill via `recomputeQueueFlagReasons()`, no `category_final` touched, no Groq calls). Also hit and fixed a real bug this surfaced: the original `$transaction`-wrapped bulk write timed out against Prisma's 5s default at 141-row scale; switched to plain concurrent `Promise.all` writes since flags are a derived cache, not audit-paired decision data — no atomicity requirement.

**Numbers for Chapter 4** (2026-08-22, live dev DB):
- Corpus-wide `SHORT_CAPTION` sanity check: **87/916 posts (9.5%)** fall under 8 words. Note the denominator mismatch against Raven's table (730 posts) — this DB currently holds **916** `FacebookPost` rows, not 730; worth reconciling with Raven which 916-vs-730 scoping is correct for "the study period" before this number goes in Chapter 3.
- Current S4 queue (n=141, the review-in-progress subset — **not** the "530" the memo cites; only 1 post has been finalised through S4 so far, so the queue total doesn't match either. Also worth reconciling with Raven): 30 unflagged, 111 flagged — DISAGREEMENT 111, UNCLASSIFIED 96, ENTERTAINMENT_SUGGESTED 77, SHORT_CAPTION 54 (a post can count under more than one).
- The manuscript breakdown script (`category-flag-breakdown.ts`) itself still reports n=1 reviewed, since almost nothing has been finalized through S4 yet — re-run it once real review volume exists.

**Open with Raven:** the 730/916 and 530/141 count mismatches above — likely just scoping (e.g. organic-only vs. all posts, or a stale headline number in the memo), but flagging rather than guessing which is right.

**Nothing left outstanding from this memo that's mine to build.** Both threshold/wording questions are answered and applied; the two count mismatches above are the only open item, and they're a data-reconciliation question for Raven, not implementation work.

---

## 6. Why this is worth doing now rather than later

Two reasons.

**It's cheap now and expensive after the 530 are reviewed.** If the Manager works through the queue seeing method labels, he'll form a preference, and the labels he produces will partly reflect that preference rather than the captions. Those labels feed FR-17's content category comparison and Objective 4. Better to have the review start under the right conditions.

**It removes a defence question we don't need.** A panelist seeing method names on the working screen may reasonably ask whether the Manager's choices were influenced by knowing which was the "AI" suggestion. With the attribution hidden, the answer is that he chose from the caption, which is the answer we want.
