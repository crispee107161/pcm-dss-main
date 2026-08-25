# Response to the four docs/raven-review memos (24 Aug)

**Date:** 25 August 2026
**Re:** `Content_Counts_and_Backlog.md`, `Followup_Questions_on_Completed_Work.md`, `FR07_Review_Row_Compliance (1).md`, `Needs_Review_Row_Design.md`, `Unassigned_Labels_and_Coding_Procedure.md`, `Note to Dev 1.txt`, `Note 2.txt`
**Method:** live read-only DB queries against the current database, plus code/git-history reading. No writes made to any table. Raw script deleted after use; figures below are copy-pasted from its output.

This is answers only. None of the requested code/UI changes have been implemented yet — see the checklist at the end for what's still open and needs a go-ahead.

---

## 1. The 716 vs 530 count — resolved, and it's not a bug

**Your 730 figure is stale.** Current live totals:

| Quantity | Count |
|---|---|
| Total `FacebookPost` rows | **916** |
| `category_final_source = MANUAL_GROUND_TRUTH` (locked benchmark) | 200 |
| All tab (`916 − 200`) | **716** |
| Needs Review (`category_final IS NULL`, excl. ground truth) | 130 |
| Unassigned (`category_final = UNCLASSIFIED`, excl. ground truth) | 0 |

716 = 916 − 200 exactly. There is no 14-post mystery — that arithmetic was built on 730, and 730 does not match any point in this database's actual history that I can find.

**Where the corpus really came from:** `UploadLog` shows 16 monthly `POSTS_CSV` uploads spanning **April 2025 through July 2026** (16 months, not 12), each timestamped and each `records_inserted` count summing — after dedup for re-uploaded months — to exactly 916. Zero duplicate `post_id`s. So 916 is not drift, corruption, or double-counting; it's 16 months of legitimate CSV ingestion, and it reached 916 on **2026-08-09**, four days before the ground-truth import (13 Aug) and two weeks before either of your provenance memos. This was already flagged once, in `Provenance_Audit_Results.md` (23 Aug): *"total corpus is 916, not the 730 cited in your memo... most likely corpus growth from CSV uploads."* That answer didn't reach you or didn't land — worth checking where your 730 number originates on your side, since it isn't reproducible from this database at any commit.

**The exclusion predicate**, current code (`lib/categorize/content-filter.ts`, `whereForFilter`):
```
EXCLUDE_GROUND_TRUTH = OR: [{ category_final_source: null }, { category_final_source: { not: 'MANUAL_GROUND_TRUTH' } }]
```
This excludes only `MANUAL_GROUND_TRUTH` rows (200), nothing else. The `OR` with `null` exists because Postgres/Prisma `!=` never matches `NULL` — this is the exact NULL-semantics fix from the 23 Aug review (which you'd already credited).

**Benchmark reachability:** confirmed unreachable by the Change action on any tab. `updatePostCategory` (`actions/categorize.ts`) hard-refuses any write where the row's existing `category_final_source` is `MANUAL_GROUND_TRUTH`, and `CategoryEditCell` renders those rows as a read-only "locked — ground truth" badge rather than an editable control. Both checks are server-side, not just UI.

**Provenance breakdown of the full 916** (this is also the direct answer to your "14 excluded posts" question — there are none; here's every row accounted for):

| `category_final_source` | Count |
|---|---|
| `MANUAL_GROUND_TRUTH` (locked) | 200 |
| `LEGACY_IMPORT` | 574 |
| `MANUAL_OVERRIDE` | 10 |
| `ACCEPTED_SUGGESTION` | 2 |
| `NULL` (Needs Review queue) | 130 |
| **Total** | **916** |

200 + 574 + 10 + 2 + 130 = 916, exactly. 574 + 10 + 2 + 130 = 716 = the All tab. No overlaps, no gaps.

---

## 2. Unassigned — confirmed, written only by explicit human action

`updatePostCategory` is the only write path to `category_final`, and it only ever writes `UNCLASSIFIED` when a Manager explicitly selects that option from `SELECTABLE_LABELS` — no automated path (`autoCategorizeAll`, `runLlmClassification`, the legacy backfill) ever writes it. It sits empty because the queue hasn't been worked yet, which matches your read.

---

## 3. Origin of the 574 LEGACY_IMPORT rows — this is the real finding

**Confirmed code path.** These 574 rows were never touched by `category_final_source` logic at all until the 23 Aug backfill. Before that, `category_final` for every pre-rework post came from the **12 Aug 2026 schema-rework migration** (`20260812090000_schema_rework_mvp_v2/migration.sql`), which copied the *old* `category_id` foreign key straight into the new `category_final` column:

```sql
UPDATE "FacebookPost" p
SET "category_final" = CASE c.name
  WHEN 'Product Showcase' THEN 'PRODUCT_SHOWCASE'::"CategoryLabel"
  ...
FROM "Category" c
WHERE p."category_id" = c.id;
```

So the real question is: what wrote the old `category_id`? Pre-rework `actions/categorize.ts` had **two** write paths to it:

1. `updatePostCategory(postId, categoryId)` — a genuine Manager click, one post at a time.
2. `autoCategorizeAll()` — a bulk action that ran `detectCategoryFromText()` (first-keyword-hit substring matching, the direct ancestor of today's ALG-04) against **every** uncategorized post in one pass and wrote the result straight to `category_id`.

Both wrote to the same column, and `CategoryAuditLog` (the audit table) **did not exist yet** — it was added 13 Aug, the day after the rework. So there is no audit trail that can distinguish "Manager clicked a dropdown" from "someone clicked the bulk auto-categorize button once" for anything that happened before 13 Aug. That's not a hedge, it's a real gap in what the data can prove.

**What the data does show, strongly:** cross-tabbing the 574 `LEGACY_IMPORT` rows' `category_final` against the *current* keyword and LLM suggestions on those same posts:

| | n | % of 574 |
|---|---|---|
| `category_final` matches current `category_keyword` | 552 | 96.2% |
| `category_final` matches current `category_llm` | 333 | 58.0% |
| Matches either | 554 | 96.5% |
| Missing a stored suggestion (either method) | 0 | 0% |

96% agreement with the keyword method, against 58% for the LLM, is a strong signature of a **single bulk keyword-matching pass**, not 574 individual manual selections — a human clicking through 574 rows wouldn't reproduce a first-hit substring matcher's answer 96% of the time, including its errors (the "Thanks Bossing" → Testimonial failure mode you flagged in §2 of the FR-07 memo is the same mechanism). It is consistent with someone running the old `autoCategorizeAll()` once against the full backlog before the rework, not with genuine manual triage.

This is circumstantial, not a signed confession — the keyword table's contents in mid-2026 aren't preserved from that exact moment, and current `category_keyword` is computed against today's reverted 50-term seed lexicon, not whatever was live then. But 96% is a lot of coincidence for two independently-arrived-at answers to agree on, especially with the keyword method's known failure modes reproduced.

**No CSV-supplied category exists to rule in as a third explanation** — `lib/csv/` has no category column in the POSTS_CSV parser at any point in git history, so "the category arrived pre-labelled in the raw export" is not on the table.

**Recommendation, not yet executed:** this reads as your "migration promoted suggestions" scenario. If you want to proceed on that basis, the recoverable path you described — null `category_final`/`category_final_source` on these 574 and return them to the queue — is a script I can write and dry-run before touching anything live. That would grow the 130-post backlog to ~704 (574 + 130), which changes the sizing of the researcher-coding plan in §3 of your Counts memo. Flagging that this is a decision for you and the team before I run it, given the size of the change.

**Arithmetic check (your §1 ask):** 574 (legacy) + 130 (queue) + 200 (ground truth) + 10 (manual override) + 2 (accepted suggestion) = 916, the actual corpus size, with zero overlap — `category_final_source` is a single-valued column per post, and the ground-truth import (13 Aug) ran *before* the legacy backfill (23 Aug), whose own `WHERE category_final_source IS NULL` filter excludes anything ground truth had already stamped. So none of the 200 benchmark posts are among the 574; confirmed both by the column's structure and by migration ordering.

---

## 4. FR-08 suggestion coverage on the 574 legacy rows

All 574 have both a stored `category_keyword` and a stored `category_llm` — **0 of 574 are missing either.** So the FR-08 recording clause is technically satisfied for these rows even though their *assigned* category didn't come through the same recorded-suggestion pipeline. Worth noting for Chapter 4: the suggestions are present, but if §3's finding holds, the *assigned* value duplicates the keyword suggestion rather than being independently decided.

---

## 5. Model selection — only one model was ever tried, no p-hacking

Answering directly since this determines how you frame it: **no.** `llama-3.1-8b-instant` was hardcoded from the start; it was never chosen from a field of candidates. It was replaced with `openai/gpt-oss-20b` only because Groq fully decommissioned the original model (confirmed via Groq's own `/models` endpoint and the deprecation error text) — there was no model left to pin back to, and no second model was evaluated and discarded. `gpt-oss-20b` is a literal model-id string, not an alias, hardcoded as `CLASSIFICATION_MODEL` in `actions/classify-posts.ts` (the shared auto-resolver `resolveGroqModel()` is used only for chat/insights/keyword-suggestion, where reproducibility doesn't matter).

Confirmed all four re-run conditions: identical prompt template (byte-identical, unedited since 14 Aug), temperature 0 (unchanged in every commit), same 200 `MANUAL_GROUND_TRUTH` posts, scored against `category_final` on those rows.

Given that, your framing is the right one: report **κ = 0.4645 as the primary figure** (what the deployed system currently produces, reproducible), with κ = 0.4443 (llama, historical) as a two-model robustness footnote — both land in the "moderate" band, and the historical figure is unaffected by the later switch since every one of the 63 historical `LlmClassificationRun` rows used llama, none used the new model.

---

## 6. The 14 August prompt "change" — it wasn't a change, it's the prompt's origin

Checked git history directly. `actions/classify-posts.ts` (and `buildPrompt()` inside it) has **no earlier history** — commit `5b852bd` (14 Aug 2026, 00:54:16 +0800) is the file's first appearance, full stop. There is no prior version of the prompt for it to have "changed" from.

The ground-truth CSV was imported by commit `d869566`, timestamped 14 Aug 2026, 00:55:28 +0800 — **one minute after** `5b852bd`, in the same session. Git commit timestamps reflect when `git commit` ran, not necessarily true development order, so I can't certify from timestamps alone which was authored first within that minute.

The sharper version of your question, then, isn't "did the prompt change inside the window" — it's **"was the categorisation prompt (its four category definitions, its instructions) written with the ground-truth answer key already sitting in the repo/DB?"** That's a real methodological question distinct from "did it get edited later" (it hasn't — zero diff since). I don't have a way to settle authorship order from git alone; if it matters for Chapter 3, the honest framing is that the prompt and the ground-truth import landed in the same commit batch, and the prompt's category definitions should be compared against `CODEBOOK_content_categories.md` (dated 12 Aug, i.e. genuinely prior to both) rather than assumed independent of the ground-truth labels themselves.

Every historical `LlmClassificationRun` row (all 63) postdates the prompt's only version — there's no "before the change" set to compare, because there was no earlier prompt.

---

## 7. FR-07 §1 — the null-caption bug, root cause found

This is a real, confirmed defect, not a data artifact. I pulled the 5 null-Title posts directly:

| id | keyword | LLM | final | flags |
|---|---|---|---|---|
| 23723 | UNCLASSIFIED | TESTIMONIAL | (null) | DISAGREEMENT, UNCLASSIFIED, SHORT_CAPTION |
| 24615 | UNCLASSIFIED | TESTIMONIAL | (null) | DISAGREEMENT, UNCLASSIFIED, SHORT_CAPTION |
| 24630 | UNCLASSIFIED | ENTERTAINMENT | ENTERTAINMENT | DISAGREEMENT, UNCLASSIFIED, ENTERTAINMENT_SUGGESTED, SHORT_CAPTION |
| 24904 | UNCLASSIFIED | ENTERTAINMENT | (null) | DISAGREEMENT, UNCLASSIFIED, ENTERTAINMENT_SUGGESTED, SHORT_CAPTION |
| 25053 | UNCLASSIFIED | ENTERTAINMENT | (null) | DISAGREEMENT, UNCLASSIFIED, ENTERTAINMENT_SUGGESTED, SHORT_CAPTION |

**Description is also null on all 5** — these aren't "Title empty, Description has the real caption" cases, both fields are genuinely empty.

**Which field the classifier reads:** neither Title-only nor Description-only. Both methods call `resolveCaption(title, description)` (`lib/keywords/caption.ts`), which returns whichever of the two fields is longer, falling back to `null` only when both are empty. This is documented, deliberate, and correct — 730/916-ish posts have empty Description, so Title-only would lose real caption text on about half the corpus. **Your Chapter 3 method description should name `resolveCaption` / "the longer of Title and Description," not "Title."**

**The keyword method behaves correctly on empty input** — `detectCategoryFromText` on a null/empty string returns no match, so `category_keyword = UNCLASSIFIED` on all 5, as it should.

**The LLM method does not abstain — this is the bug.** `buildPrompt()` (`actions/classify-posts.ts`) sends every post, including one with `"caption":""`, to Groq with the instruction *"Classify each post above into exactly one of PRODUCT_SHOWCASE, PROMOTIONAL_OFFER, TESTIMONIAL, ENTERTAINMENT"* — four options, no fifth "cannot determine" option, and nothing in the prompt tells the model what to do with an empty caption. The model complies with the instruction as given and picks one of the four regardless of input, which is exactly what's happening on these five rows. There's no code-level fallback field being read here (ruling out your hypothesis A) — the classifier legitimately receives `""` and is never told abstention is allowed (your hypothesis B, in effect).

This is a real fix, not just a flag-reason wording issue: **the LLM prompt/parsing needs an explicit "return UNCLASSIFIED (or similar) when the caption is empty or provides no basis for a decision" instruction and a fifth allowed output value**, or a pre-filter that short-circuits empty-caption posts to `UNCLASSIFIED` before calling Groq at all (cheaper, and removes the nondeterminism risk of relying on the model to self-censor). I'd lean toward the pre-filter — deterministic, free, and doesn't depend on the model reliably following an added instruction.

Once fixed, these 5 rows should show `category_keyword = UNCLASSIFIED`, `category_llm = UNCLASSIFIED`, no DISAGREEMENT flag (both methods agree — on abstaining), just SHORT_CAPTION/UNCLASSIFIED, and route to a human via "View post" rather than presenting a confident-looking two-way split.

**Caption-length threshold (§1.1):** `FLAG_SHORT_CAPTION_WORDS = 8` (`lib/categorize/flag-reasons.ts`) — **word count**, not character count. It's the NFKC-normalised caption's word count, `< 8` fires `SHORT_CAPTION`. This is already documented and dated in `S4_Flag_Thresholds_Answers.md` (p10 of caption length across the 730-post study period at the time it was set) — the "730" there refers to the corpus size at that specific historical measurement, separate from the current-total discrepancy in §1 above. Your character-based counts (5 null, 13 under 10 chars, 25 under 20 chars) use a different unit than the live threshold, so they're not directly comparable — the word-based figure is what Chapter 3 should cite.

**§2 (the graphics-card "Thanks Bossing" → Testimonial suggestion):** agreed, not a bug — a real instance of the κ=0.139 keyword failure mode. Worth checking the specific post's stored `category_keyword`/`category_llm` values before assuming it's the same "single chip" root cause as the null-caption rows (see next section) — I can pull that row's IDs if you send the post_id.

---

## 8. "Only one candidate chip shows on disagreement" — root cause, narrower than it looks

Checked the current code (`lib/categorize/category-picker.ts`, `suggestedCandidates()`). It already unions **both** the keyword and LLM suggestion when they differ — the intent you've asked for three memos running is implemented. But it filters out `UNCLASSIFIED` from the candidate set (by design — `UNCLASSIFIED` means "found nothing," not a real category to offer as a radio option), which means: **when one method disagrees by returning `UNCLASSIFIED` and the other returns a real category, only one chip renders under "Suggested."**

That's exactly what's happening on all 5 null-caption rows (keyword=UNCLASSIFIED, LLM=a real label) — single chip under Suggested, second slot silently absorbed into "Other categories" because `UNCLASSIFIED` was never a candidate to begin with. For a genuine two-real-category disagreement (e.g. keyword=PRODUCT_SHOWCASE vs LLM=TESTIMONIAL), both should already render correctly — I'd want the specific post_id for the graphics-card example to confirm it's the same mechanism rather than a second bug.

Practical read: fixing §7's LLM-abstention bug removes most instances of this — once the LLM also returns `UNCLASSIFIED` on empty/insufficient captions instead of guessing, the "single chip, flagged as a two-way split" case mostly stops occurring, because it was being caused by the same forced-guess behavior.

---

## 9. Unassigned coding procedure — the blocking question is answered, and it creates a tension

**§3 of your Unassigned memo: "did the 200 ground-truth coders work from captions only, or did they open the original posts?"**

Answered explicitly in `docs/notes/CODEBOOK_content_categories.md` (v1.0, 12 Aug 2026), §1 and §2 rule 3:

> "You are assigning one category to each post, based **only** on its caption."
> "**Code from the caption only.** Do not open Facebook to view the image or video. The automated methods only see the caption, so you must judge on the same information."

This is explicit, dated, and prior to the ground-truth import — not something that needs adding, it's already stated. Two consequences, matching the two directions you flagged:

- **Interpreting the human ceiling:** favorable, not harsh. κ = 0.6505 was achieved **without** visual access — the coders, the keyword method, and the LLM all worked from the same information (caption text only). It's a clean apples-to-apples comparison, not an inflated ceiling. State that explicitly in Chapter 3; it's a point in your favor.
- **Procedural consistency — this is the tension.** Your new Unassigned memo (§1) proposes reviewers open the original post and watch the video/image for the 130 backlog when the caption is insufficient. That is a **different procedure** than what produced the 200 (caption-only, explicitly forbidden from opening the post). If the 130 get coded with visual access and the 200 didn't, the corpus has two coding procedures after all — the exact outcome you said would be unacceptable in §80 of that same memo. Either (a) the 130 also get coded caption-only, consistent with the codebook and the 200, and Unassigned genuinely will catch more of the caption-less posts than "two or three, or none" — or (b) the codebook is explicitly amended with a dated addendum permitting visual access for the retrospective 130, and Chapter 3 discloses the two sets were coded under different information conditions. That's a decision for you and the team, not something I can resolve from the code — flagging it now because it's upstream of the backlog-coding sequencing in your Counts memo §3.1.

---

## 10. New `category_final_source` value for researcher/codebook assignment (A8)

Not yet added — needs a name before implementation. Suggest `MANUAL_CODEBOOK_ASSIGNMENT` (parallel to `MANUAL_GROUND_TRUTH`, distinguishes "researcher applied the same codebook retrospectively" from the original blind 200-post benchmark) or `RESEARCHER_ASSIGNMENT` if you'd rather it read more generically. This is a one-line schema enum addition plus a migration, same shape as the 23 Aug `LEGACY_IMPORT`/`MANUAL_CHANGE_AFTER_FINALISATION` addition — small, but blocks starting the backlog per your own sequencing, and per §3 above should probably wait until the 574-legacy question is actually settled one way or the other, since it changes how large that backlog job is.

---

## 11. Snapshots and read-only lexicon (A9)

Confirmed still in place from the 23 Aug work, nothing has touched it since (no commits to `actions/keywords.ts` or `KeywordsClient.tsx` after that date):
- `actions/keywords.ts` — every write path (`addKeyword`, `deleteKeyword`, `addKeywordsBulk`, `suggestKeywords`) refuses unconditionally, server-side.
- `KeywordsClient.tsx` — no forms, no AI suggestion panel, view-only term list.
- Lexicon reverted 93→50, byte-identical to `prisma/seed.ts` (confirmed again just now — the "live lexicon" re-run in §12 below came back identical to the seed re-run).
- Snapshots committed: `Seed_Lexicon_Snapshot_2026-08-23.md`, `Keyword_Lexicon_Snapshot_2026-08-22.md`.

**Not yet done:** a dedicated LLM prompt snapshot file. The prompt lives in `actions/classify-posts.ts` (version-controlled) but there's no standalone appendix-ready file the way the two lexicon snapshots exist. Small addition if you want it as a separate file rather than pointing the appendix at the source file directly.

**FR-07a (the lexicon-read-only requirement text you drafted):** reads accurately against the current implementation. No changes needed to what you wrote.

---

## 12. FR-08 re-run on the 50-term seed lexicon — already done, full output below (was reported without the confusion matrix; here it is)

Re-ran `scripts/rerun-fr08-seed-lexicon.ts` fresh. n=200, `MANUAL_GROUND_TRUTH` posts, ALG-04 unmodified.

**Seed lexicon (50 terms) — raw:** p_o = 0.5050 (101/200), p_e = 0.4271, **κ = 0.1360** (slight)

| Category | n | recall |
|---|---|---|
| Product Showcase | 109 | 0.8716 |
| Promotional Offer | 13 | 0.1538 |
| Testimonial | 56 | 0.0536 |
| Entertainment | 12 | 0.0833 |
| Unclear | 10 | 0.0000 |

Confusion matrix (rows = predicted, cols = actual):

| predicted \ actual | Product Showcase | Promotional Offer | Testimonial | Entertainment | Unclassified | Unclear |
|---|---|---|---|---|---|---|
| Product Showcase | 95 | 11 | 47 | 1 | 0 | 0 |
| Promotional Offer | 3 | 2 | 3 | 0 | 0 | 1 |
| Testimonial | 0 | 0 | 3 | 0 | 0 | 0 |
| Entertainment | 0 | 0 | 0 | 1 | 0 | 0 |
| Unclassified | 11 | 0 | 3 | 10 | 0 | 9 |
| Unclear | 0 | 0 | 0 | 0 | 0 | 0 |

**With UNCLASSIFIED→UNCLEAR mapping:** p_o = 0.5500 (110/200), p_e = 0.4293, **κ = 0.2115** (fair). Only the Unclear row changes (recall 0.0000 → 0.9000). Mapping is implemented as a separate reporting variant in the re-run script only — `lib/stats/agreement.ts` itself is unchanged, so the live Method Evaluation dashboard is unaffected either way, per your own instruction not to change the live rules mid-comparison.

**Live lexicon (current `Keyword` table) re-run:** identical numbers to the seed lexicon in every field (κ = 0.1360 raw / 0.2115 mapped) — expected, since the live table is currently byte-identical to the seed after the revert. This is a live re-confirmation, not a stale figure.

Confirmed: nothing in the lexicon was altered before this re-run, and this was scored on the current post-revert state, matching your instruction.

---

## 13. Content_Screen_Review.md

Not found anywhere in this repo or in prior memory of this session's history — agreeing with your suspicion that it didn't arrive rather than that it was skipped. Please resend; from your summary in §4 of the Followup memo it sounds substantially covered by the two new files in `docs/raven-review/` (`FR07_Review_Row_Compliance (1).md` and `Needs_Review_Row_Design.md`), but the batch-confirm reconciliation (30 of 130, seven counts) and the "what does agreement certify at κ=0.139" question aren't addressed anywhere I can find — those need the original doc.

---

## 14. Two loose ends from your own notes

- **`Note 2.txt`** says to put "no caption text" back into the Unassigned reason-capture list, but `Unassigned_Labels_and_Coding_Procedure.md` §2.3 explicitly removes it with a stated rationale ("if the only problem is a missing caption, the answer is to open the post, not to mark it uncategorisable"). These two documents currently disagree with each other — not something I can resolve; flagging so you can tell me which one is current before I build the reason-capture list.
- **`Note to Dev 1.txt`** ("the manuscript now counts by ID, so any screen showing 297 or 24 needs to show 309 and 26") — I can't find 297, 24, 309, or 26 anywhere in the current Content screens, the categorisation counts above, or the ad/campaign counts I'm aware of. This note may be about a different screen than Content (Ads/campaigns, maybe?) — can you point me at which screen and metric this refers to?

---

## 15. Nothing implemented yet — what's still open

**Blocks the backlog / needs your decision first:**
- [ ] §3: null the 574 `LEGACY_IMPORT` rows and return to queue? (recommended by the evidence, not yet executed — this is a live-data change)
- [ ] §9: resolve the Note 2.txt vs. Unassigned-memo contradiction on "no caption text" as a valid reason
- [ ] §9: decide caption-only vs. visual-access procedure for the 130, and whether the codebook needs a dated addendum either way
- [ ] §10: confirm the new `category_final_source` value name (`MANUAL_CODEBOOK_ASSIGNMENT`?)

**Code fixes, ready to build once you say go:**
- [ ] §7: LLM prompt/pipeline doesn't abstain on empty caption — pre-filter or prompt fix, your call on which
- [ ] §8: mostly resolved by the above; re-check after
- [ ] Needs_Review_Row_Design.md's five UI changes (radio affordance, filled selected state, button label swap, disabled-state color, button placement)
- [ ] FR07 memo §3: flag reasons rendered inline instead of "+N more"; Unassigned moved to its own line, relabelled
- [ ] Unassigned label revisions (§2 of that memo): tab → "No category", subtitle, empty state, chip text, "View post" prominence + new-tab
- [ ] FR-07 revised wording (§4): accept the text; "generated once at ingestion with recorded method version" isn't built yet — suggestions are still generated on-demand by the two Generate buttons, which is the mechanism your memo names as the likely route to unrecorded/re-generated suggestions

**Still not verified in a live browser** — same standing caveat as every prior phase in `Consolidation_Plan_Checklist.md`.
