# Audit of All docs/raven Files Dated 2026-09-04

Date: 5 September 2026
Scope: every file in `docs/raven/` with a Sep 4, 2026 filesystem mtime, verified against current code/git state — not against what the memos themselves claim.

## File inventory (by mtime, chronological)

| # | File | mtime | Type |
|---|---|---|---|
| 1 | `Groq_Configuration_Requirements.md` | Sep 4 05:35 | Requirements (dated in-body "Sep 3") |
| 2 | `classification-prompt-snapshot.txt` | Sep 4 05:44 | Artifact |
| 3 | `Groq_Configuration_Status_2026-09-04.md` | Sep 4 05:44 | Reply |
| 4 | `Em_Dash_Scope_and_Backfill_Answers.md` | Sep 4 05:56 | Reply (in-body dated "3 September 2026" — see §Discrepancies) |
| 5 | `Groq_Account_Ownership_and_Remaining_Items.md` | Sep 4 06:10 | Follow-up |
| 6 | `Account_Items_Reply_2026-09-04.md` | Sep 4 06:41 | Reply |
| 7 | `LLM_Prompt_Model_Provenance.md` | Sep 4 06:42 | Correction to an Aug 23 memo |
| 8 | `ZDR_Closed_and_Next_Steps.md` | Sep 4 06:46 | Closure |
| 9 | `Backlog_Coding_Export_Request.md` | Sep 4 06:49 | New request |
| 10 | `Backlog_Export_and_Answers_2026-09-04.md` | Sep 4 06:56 | Reply |
| 11 | `Top_Ads_Review.md` | Sep 4 07:08 | Bug report |
| 12 | `Top_Ads_Review_Fix_and_Corrections_2026-09-04.md` | Sep 4 07:48 | Fix report |
| 13 | `Export_Verified_Repair_Approved.md` | Sep 4 12:11 | Approval |
| 14 | `Top_Ads_Accepted_and_Filter_Question.md` | Sep 4 13:19 | Acceptance + new question |
| 15 | `Trend_Analysis_Review.md` | Sep 4 15:13 | Bug report |
| 16 | `Trend_Analysis_Review_Corrections_2026-09-04.md` | Sep 4 15:48 | Fix report |
| 17 | `Rankings_Review.md` | Sep 4 14:36 | Review |
| 18 | `Analysis_Screen_Review.md`* | Sep 4 08:12 | Review (*content dated Sep 3; grouped here as Sep-4-mtime) |
| 19 | `Analysis_Screen_Review_Corrections_2026-09-04.md` | Sep 4 08:12 | Self-correction |
| 20 | `Analysis_Corrections_Accepted.md` | Sep 4 23:38 | Acceptance |
| 21 | `Backlog_Coding_Complete_v2.md` | Sep 4 23:38 | Delivery |
| 22 | `backlog_final_labels.csv` | Sep 4 23:38 | Data artifact (507 rows) |
| 23 | `Trend_Analysis_Corrections_and_Confidence_Decision.md` | Sep 4 23:38 | Decision |
| 24 | `zdr-ss.jpg` | Sep 4 06:36 | Screenshot artifact |

## Verified status table

| File | What it requested/reported | Verified current status | Evidence |
|---|---|---|---|
| Groq_Configuration_Requirements.md | ZDR must be enabled before signing; model pinning, key handling, data-transmission scope | ZDR closed same day (#8). Model/key handling already compliant. | See #8; `actions/classify-posts.ts`, `actions/chat.ts` use `process.env.GROQ_API_KEY` only |
| classification-prompt-snapshot.txt | Committed snapshot of ALG-05 prompt | Matches `PROMPT_TEMPLATE` in `actions/classify-posts.ts:102` verbatim | Direct diff, confirmed by subagent read |
| Groq_Configuration_Status_2026-09-04.md | Confirms temperature constants + prompt snapshot landed | ✅ Confirmed: `CLASSIFICATION_TEMPERATURE=0` (`classify-posts.ts:39` — corrected from the original citation of line 36, which is `CLASSIFICATION_MODEL`), `CHAT_TEMPERATURE=0.4` (`chat.ts:14-19`) | Code read |
| Em_Dash_Scope_and_Backfill_Answers.md | Scopes em-dash cleanup, backfill rules | Reply to a Sep-3 thread; content is Sep-3-dated despite Sep-4 mtime | See §Discrepancies |
| Groq_Account_Ownership_and_Remaining_Items.md | Discloses Groq account is **personally owned by the developer**, not the client org; asks for ZDR + NDA-signatory + post-defence account decision | ZDR: ✅ closed (#8). Post-defence account ownership/billing arrangement and NDA-signatory confirmation: 🔴 **open, requires a human decision** — not something code can resolve | No artifact exists resolving this; not referenced in PROGRESS.md |
| Account_Items_Reply_2026-09-04.md | Confirms single prompt snapshot; corrects stale "keywords.ts calls Groq" claim; flags TESTIMONIAL-category customer-naming risk | `lib/groq-model.ts:5` comment now correctly states keywords.ts never calls Groq (header comment spans lines 2-5, corrected from the original single-line-4 citation). TESTIMONIAL customer-naming risk: 🔴 **still open, never sampled/verified** | Code read; no sampling script or memo closes this |
| LLM_Prompt_Model_Provenance.md | Corrects its own Aug 23 claims (prompt snapshot now exists; `ai-insights.ts` deleted; keywords.ts non-caller) | ✅ Verified — `ai-insights.ts` deletion and keywords.ts non-caller status both hold in current code | `git log`, `lib/groq-model.ts` |
| ZDR_Closed_and_Next_Steps.md | Closes ZDR (org-wide toggle enabled); flags a **process complaint** about a near-duplicate-filename memo almost being skipped, asks for filename/date discipline going forward | ZDR: accepted as closed (console setting, not code-verifiable). Process ask: **advisory only, no code follow-up needed** | N/A — procedural |
| Backlog_Coding_Export_Request.md | Requests 504-row export CSV, 3-post repair, 12-post defence hold-back, import-format spec | ✅ Fully actioned — see chain below | — |
| Backlog_Export_and_Answers_2026-09-04.md | Delivers the export, specifies import format | ✅ `scripts/import-codebook-assignment.ts` matches described format exactly | Code read |
| Top_Ads_Review.md | **Correctness bug**: Top Ads/Campaign Rankings ranked ad-months not ads, inflating counts/duplicating rows, wrong #1 | ✅ Fixed | Commit `73c4d29`; `aggregateAdsById` in `lib/stats/campaign-rankings.ts:94` |
| Top_Ads_Review_Fix_and_Corrections_2026-09-04.md | Confirms fix landed (454 tests); raises the non-messaging-spend CPI question for FR-31/Budget Reallocation | ✅ Fix confirmed via `2c1dddf`. The raised question is answered below (🔴 for Budget Reallocation) | `git log`; see next rows |
| Export_Verified_Repair_Approved.md | Approves 3-post null-repair + 12 hold-backs; asks whether classification/keyword methods NFKC-normalize captions the same way human coders read them | Repair: ✅ landed (`ddd4e41`). Normalization question: ❓ **not independently verified in this pass** | `git log`; normalization logic not traced |
| Top_Ads_Accepted_and_Filter_Question.md | Computes filter impact (24/187 ads, up to 98.9% CPI inflation, 6 ads over threshold); **directly asks whether FR-31 regression and Budget Reallocation apply the same non-messaging-spend filter** | **FR-31 regression: ✅ correctly excludes non-messaging rows** — filtered by `result_type === FR31_RESULT_TYPE` both at the query level (`lib/data/analysis.ts`, `scripts/fr31-dump.ts`) and defensively inside `fr31-regression.ts:168`. **Budget Reallocation: 🔴 NOT fixed** — see finding below | Direct code read, this session |
| Rankings_Review.md | Em dashes, jargon, same-figures-different-tabs issue needing a derived (not hardcoded) explanation, caveat rewrite, missing headline finding | 🟡 Partially verified — the captions-from-same-rows fix landed (`c74c9bf`, 2026-09-05 05:11:55 — corrected from the original citation of 05:18), which also lands the Trend Analysis confidence-tier work (row below), but §2.1/§4/§5 checklist items were not individually re-verified line-by-line in this pass | `git log`; recommend a dedicated follow-up pass |
| Analysis_Screen_Review.md + _Corrections + _Accepted | Findings-first restructure, cohort survivorship fix, remove causal-advice sentence, UNCLEAR exclusion in both headline and table, residual-table truncation, r=0.958 vs 0.984 mismatch | ✅ Verified fully implemented | Commit `f8c8522`; `AnalysisView.tsx:53-54,170-171` (NON_CATEGORY_ROW_LABEL covers UNCLASSIFIED+UNCLEAR); `FR31_Regression_Specification.md:58,205,218,250` shows r=0.958 |
| Backlog_Coding_Complete_v2.md + backlog_final_labels.csv | Delivers 507 reconciled labels (κ=0.7966); requests FR-08 validation expand 200→707 posts | ✅ Import landed — commit `a863e06`; `CategoryLabel.MANUAL_CODEBOOK_ASSIGNMENT` present in `prisma/schema.prisma:75`. The 707-post FR-08 expansion itself is answered in `FR08_707_Expansion_Response_2026-09-05.md` (Sep 5, outside this file's date but the direct resolution) | `git log`, schema read |
| Trend_Analysis_Review.md + _Corrections | False "3/12 months" banner; toggle appears disabled; compressed axis; root cause = hardcoded `TARGET_PERIODS` literal | ✅ Fixed | Commits `dc837d9`, `92efdbe`; `TrendAnalysisView.tsx:19,62,88,97-98,103,125` confirms no literal array remains, both `reporting_starts`/`reporting_ends` used |
| Trend_Analysis_Corrections_and_Confidence_Decision.md | Decides to widen `Confidence` type to add `'high'` tier rather than drop ROUGH GUIDE badge | ✅ **Corrected 2026-09-05 (was wrongly marked open in the original version of this audit).** `lib/insights/trend-insight.ts:10` already reads `export type Confidence = 'high' \| 'medium' \| 'low'`, with a comment at line 18 citing this memo's §3.1 directly. Landed in commit `c74c9bf` — the same commit already cited two rows above in this table for the Rankings-captions fix, whose own commit message states it "widens the Trend Analysis confidence badge... to a real high/medium/low assessment... per the Trend Analysis review docs." This was missed in the first pass because `git show --stat` wasn't run on a commit already open for another finding | `lib/insights/trend-insight.ts:10,18`; commit `c74c9bf` |
| zdr-ss.jpg | Screenshot of Groq Console ZDR toggle | Accepted as evidence per surrounding memos; not independently re-inspected pixel-by-pixel | — |

## New finding from this audit — CORRECTED 2026-09-05, see below

**Original claim (wrong): "Budget Reallocation still has the CPI-inflation bug that was already fixed elsewhere."** An independent code-review pass caught that this finding misread the code by looking at `aggregateByAdId` in isolation, without composing it with the query that fed it. Leaving the incorrect original text below, struck through, rather than silently deleting it — see the correction underneath for what's actually true.

~~`Top_Ads_Accepted_and_Filter_Question.md` (#14) explicitly asked whether `fr31-regression.ts` and Budget Reallocation apply the same "exclude non-messaging-month spend" filter that Top Ads (`2c1dddf`) and Ad-Set Ranking (`a295d79`) were fixed to apply. No memo answered this for Budget Reallocation, and no commit addresses it. Direct verification today confirms it was never fixed: `app/dashboard/owner/budget-reallocation/page.tsx:27` and `lib/reports/report-data.ts:22` both filtered on `total_messaging_contacts: { not: null }`, while `aggregateByAdId` summed `amount_spent` across all rows for an ad. Per `Top_Ads_Accepted_and_Filter_Question.md`'s own impact estimate (24/187 ads affected, up to 98.9% CPI inflation, 6 ads crossing the ₱1,000 threshold), this can move which ads land in Q1/Q4 and the reported Q4→Q1 counterfactual-inquiries figure — a Chapter-4-relevant number.~~

**Correction: the bug direction was backwards, and the "6 ads crossing the threshold" impact figure never applied here — it was carried over from the Top Ads analysis without being re-derived.**

`aggregateByAdId`'s unconditional `spend + ad.amount_spent` was real, but it never ran on unfiltered data: both callers' Prisma `WHERE` clause already excluded every row with `total_messaging_contacts: null` at the database level, before `aggregateByAdId` ever saw it. Since `lib/csv/validate-ads.ts` only sets `total_messaging_contacts` to a non-null value on a messaging row, non-messaging rows never reached the aggregation function at all. So the "over-counting" bug described above — the one that was real in Top Ads and Ad-Set Ranking, where the row set fed to aggregation was unfiltered — could not happen here.

The actual (much smaller) risk was the opposite direction: the same null-proxy filter also excludes a genuinely messaging-optimised row whose "Results" cell was blank in the CSV (spend real, `total_messaging_contacts` null because the cell was blank, not because the row is non-messaging) — that row's real messaging spend was being dropped from the query entirely, an under-counting risk, not an over-counting one. We checked this against the frozen 486-row messaging dump `lib/stats/__fixtures__/fr31-raw-ads.json`: **zero rows have a blank Results cell**, so on current data this was a latent risk with no live effect — `n`, the quartile split, `q1Cpi`, and the counterfactual figure are all unchanged.

**Fixed anyway**, since the risk is real for any future upload with a blank Results cell: both call sites now select `result_type` and fetch the unfiltered study-period population, and `aggregateByAdId` filters on `result_type` internally so the function is correct regardless of what its caller's query does — the same principle as `2c1dddf`/`a295d79`, applied for the right reason this time. New tests cover the blank-Results-row case directly. 528/528 tests pass, `tsc --noEmit` clean, build succeeds. Not committed yet, pending review.

## Discrepancies

1. **`Em_Dash_Scope_and_Backfill_Answers.md`** carries an Sep 4 mtime but its own header text says "Date: 3 September 2026" and it replies to a Sep-3 thread. Likely authored Sep 3, touched Sep 4. Flagged, not corrected.
2. **`docs/PROGRESS.md` is stale relative to all Sep 4/5 work.** Its doneness summary is stamped `(2026-09-03)` and has zero mentions of: ZDR closure, the 507-post backlog import, `MANUAL_CODEBOOK_ASSIGNMENT`, the Top Ads/Rankings ranking-unit fixes, or the Trend Analysis/Analysis-screen restructure — despite all being real, committed, verified changes. This should be the top documentation-hygiene item to close.

## Open items requiring a human decision (not code-resolvable)

1. Post-defence Groq account ownership/billing arrangement (`Groq_Account_Ownership_and_Remaining_Items.md`).
2. NDA-signatory confirmation for the personally-held Groq account.
3. ~~TESTIMONIAL-category customer-naming risk — never sampled to confirm no customer-identifying captions are surfaced.~~ **Checked 2026-09-05**: real risk found, two posts name an actual customer. See `Sep4_5_Audit_Followups_and_Open_Items_2026-09-05.md` §4 for the specific posts and the decision needed from Raven on how to handle them.

## Open items requiring code work

1. ~~Budget Reallocation non-messaging-spend filter (new finding above) — highest priority, Chapter-4-relevant.~~ **Corrected and fixed 2026-09-05** — see the correction above. It was a latent risk with zero live-data impact (verified against the frozen messaging dump), not a live bug. Fixed anyway; not committed, pending review.
2. ~~Trend Analysis confidence-tier widening (`'high'` type) — decided, not built.~~ **Corrected: already built**, see table above — closed.
3. Rankings screen §2–§5 checklist — needs a dedicated line-by-line re-verification pass (only the captions fix was confirmed this session).
4. ~~NFKC-normalization confirmation for classification/keyword methods vs. how the 507 human-coded labels were read (`Export_Verified_Repair_Approved.md`).~~ **Checked 2026-09-05**: confirmed both `lib/keywords/detect.ts:41,45` and `actions/classify-posts.ts:271` normalize captions with NFKC before matching/sending to the LLM.
5. `docs/PROGRESS.md` update to reflect all Sep 4/5 landed work.

## Correction log

An independent fact-check pass (2026-09-05) re-verified this audit's claims against the repo and found one substantive error and several minor citation drifts, corrected above. A second, code-review pass (also 2026-09-05, during implementation of the Budget Reallocation fix) found the Budget Reallocation finding itself was wrong in its bug-direction and impact-sizing claims — see the corrected finding above, which is the more serious of the two corrections in this document:
- **Budget Reallocation finding was wrong.** The original claim read `aggregateByAdId` in isolation without composing it with the query that fed it, and carried over an impact estimate ("6 ads crossing the ₱1,000 threshold") from the Top Ads analysis without re-deriving it for this file. The actual risk was a different, smaller, latent one with zero effect on current data.
- **Trend Analysis confidence-tier widening was wrongly marked "decided, not built."** It is built (`lib/insights/trend-insight.ts:10,18`, commit `c74c9bf`) — missed originally because `git show --stat` wasn't run on a commit already open for another finding in the same table.
- Two line-number citations were off by 1-3 lines (`classify-posts.ts` temperature constant, `lib/groq-model.ts` comment) and one commit timestamp was off by ~7 minutes — corrected in place above.
