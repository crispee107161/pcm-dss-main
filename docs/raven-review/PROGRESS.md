# docs/raven-review — development progress tracker

Tracks work against the 5 memos + 2 notes in this folder (all dated 24 Aug
2026). Update this file as items close — it's a tracker, not a spec; the
source `.md`/`.txt` files in this folder stay the source of what was asked.

Legend: ✅ Done · 🟡 Partial/deferred · ⬜ Not started · 📌 Decision needed from Raven/team · 📝 Manuscript text, not code

Related: `docs/raven/Content_Review_Response_2026-08-25.md` (first response —
answers only, nothing implemented), `docs/raven/Content_Review_Response_Followup_2026-08-26.md`
(implementation + post-review fixes, commits `794a3ba..20d48be`).

---

## Content_Counts_and_Backlog.md

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | 716 vs 530 count discrepancy | ✅ | Resolved — 730 was a stale figure on Raven's side; live corpus is 916, all reconciles exactly (916 = 200 ground truth + 574 legacy + 130 queue at the time). |
| 2 | Confirm Unassigned is human-only, never machine-written | ✅ | Confirmed — `updatePostCategory` is the only write path. |
| 3.1 | Resolve 574 legacy rows before starting backlog | ✅ | Done in an earlier session (`574_Live_Run_Confirmation_2026-08-25.md`) — 427 in-period rows nulled/requeued, 147 out-of-period left alone. |
| 3.2 | New `category_final_source` value for codebook-based assignment | ✅ | `MANUAL_CODEBOOK_ASSIGNMENT` added (migration `20260825181409`) + `scripts/import-codebook-assignment.ts`, refuses to touch `MANUAL_GROUND_TRUTH` rows. |
| 3.2 | Audit trail for codebook assignments | 🟡 | Existing `category_final_assigned_by_id`/`_at` columns are used, but the import script (like `import-ground-truth.ts` before it) stamps `assigned_by_id: null` for an external CSV import — no researcher account is recorded. Flag if you want per-researcher attribution. |
| 3.3 | Leave 10-15 posts uncategorised; tell us if it drops below 10 | 📌 | Process instruction for whoever runs the backlog coding, not a code task. |
| 4 | FR-08 gap: do the 574 legacy rows carry recorded suggestions? | ✅ | Answered — all 574 have both `category_keyword` and `category_llm` recorded. |
| 5 | If you only do one thing: the exclusion predicate | ✅ | Answered and confirmed server-side (ground truth unreachable by any edit path). |

## Followup_Questions_on_Completed_Work.md

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Origin of the 574 `LEGACY_IMPORT` rows | ✅ | Traced to the 12 Aug schema-rework migration copying the old `category_id` FK; 96% match to current keyword suggestions is strong evidence of a single bulk `autoCategorizeAll()` pass, not manual triage. |
| 2 | Model selection — was it p-hacked? | ✅ | Confirmed no — only one model (`gpt-oss-20b`) was ever tried; the old model was fully decommissioned by Groq, not swapped for a better score. |
| 3 | 14 Aug prompt "change" | ✅ | Confirmed it's the prompt's *origin* commit, not a later edit — no prior version exists in git history. |
| 4 | `Content_Screen_Review.md` never arrived | ⬜ | Still hasn't reached this repo. Its specific asks (batch-confirm reconciliation of 30/130, "what does agreement certify at κ=0.139") remain unaddressed. **Please resend if still wanted.** |
| 5 | FR-08 keyword κ re-run on 50-term seed lexicon | ✅ | Done — κ=0.1360 raw / 0.2115 with UNCLASSIFIED→UNCLEAR mapping, full confusion matrix reported. |
| 5 | Lexicon read-only, snapshots committed | ✅ | Confirmed still in place (`actions/keywords.ts` refuses all writes server-side); snapshot files exist. LLM prompt standalone snapshot file: not done (prompt lives in version-controlled source instead). |

## FR07_Review_Row_Compliance.md

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | 5 null-caption posts investigation | ✅ | Root cause found: LLM had no abstain option and force-guessed on empty captions. Keyword method already correctly returned `UNCLASSIFIED`. |
| 1 | Fix: classifier field / abstain on empty input | ✅ | `resolveCaption` confirmed correct (longer of Title/Description); LLM pre-filter added so captionless posts never reach Groq — stamped `UNCLASSIFIED` directly. |
| 1 | Repair the 5 posts' existing (pre-fix) wrong guesses | ✅ | `scripts/repair-captionless-llm-guesses.ts` run against live data — all 5 nulled, will get a correct `UNCLASSIFIED` on next run. |
| 1.1 | Report caption-length threshold | ✅ | `FLAG_SHORT_CAPTION_WORDS = 8` (word count, not character count) — reported and already documented. |
| 2 | "Thanks Bossing" → Testimonial suggestion | ✅ | Confirmed as a real κ=0.139 keyword failure mode, not a bug — no fix needed. |
| 3.1 | Show both candidates on disagreement | ✅ | Was already implemented pre-session (`suggestedCandidates` unions both); the single-chip cases were all downstream of the LLM abstention bug (§1), now fixed. |
| 3.2 | Flag reasons inline, no "+N more" | ✅ | Done. |
| 3.2 | Confirm all four FR-07 flag conditions implemented, distinct wording | ✅ | Confirmed (`DISAGREEMENT`, `UNCLASSIFIED`, `ENTERTAINMENT_SUGGESTED`, `SHORT_CAPTION`). |
| 3.3 | Separate Unassigned from the four categories, relabel | ✅ | Own line, divider, unified label via `selectableLabelText`. |
| 3.4 | "No title"/"View post" spacing | ✅ | Checked — already rendered as separate elements, not a real bug by the time this was reviewed. |
| 3.4 | Relabel "Search by title" → "Search captions" | ✅ | Fixed (was missed in the first implementation pass, caught on a follow-up check). |
| 4 | Revised FR-07 manuscript wording | 📝 | Not applied — Chapter 3 text, left for you to accept/adapt. |
| 5 | New FR-07a (lexicon read-only requirement) | 📝 | Not applied — same as above; the *behavior* it describes is implemented and confirmed, just not written into a requirements doc. |
| — | "Suggestions generated once at ingestion, method version recorded" | ⬜ | Still generated on-demand via the two Generate buttons. Not built — would be a real architecture change. |

## Needs_Review_Row_Design.md

| # | Item | Status | Notes |
|---|---|---|---|
| 2.1 | Radio circle / empty-checkbox affordance on chips | ✅ | Implemented via a named `group/option` + filled/unfilled dot. |
| 2.2 | Real selected state (filled background, not border shift) | ✅ | Done — `bg-primary` fill on selection. |
| 2.3 | Button label switches with state | ✅ | "Select a category" (disabled) → "Save category" (enabled). |
| 2.4 | Disabled state actually looks disabled (grey, not dim red) | ✅ | Done. |
| 2.5 | Move button beside chips, not below | 🟡 | **Skipped** — the card layout didn't accommodate this cleanly at narrower widths; the higher-value part (label/color/affordance) is done, placement stays stacked. |
| 3 | Both candidates shown on disagreement | ✅ | Pre-existing, confirmed working once §1's LLM bug was fixed. |
| 3 | Flag reasons inline | ✅ | Done. |
| 4 | Separate Unassigned, own line, fuller label | ✅ | Done. |

## Unassigned_Labels_and_Coding_Procedure.md

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | "View post" made prominent action | ✅ | Restyled as a bordered action pill. |
| 1 | Opens in a new tab | ✅ | Was already true, confirmed. |
| 1 | Thumbnail inline on short-caption rows | ⬜ | Explicitly marked "if cheap" in the memo — skipped. |
| 2.1 | Tab renamed "Unassigned" → "No category" | ✅ | Display-only; internal filter value/enum unchanged. |
| 2.1 | Subtitle rewritten ("Reviewed, not skipped") | ✅ | Done, both Marketing Manager and Owner routes. |
| 2.1 | Empty-state copy updated | ✅ | Done. |
| 2.2 | Chip relabelled, own line, visually separated | ✅ | Unified with `selectableLabelText('UNCLASSIFIED')` = "No category" rather than a separate wording, per a code-review finding (see §4 below). |
| 2.3 | Revised 4-option reason-capture list, "no caption text" removed | ⬜ | **Not built.** No reason-capture UI exists in the app at all — this was never implemented, in this pass or any prior one. |
| 2.3 | Reason displayed as column + available in export | ⬜ | Same as above — depends on the reason-capture field existing first. |
| 3 | Coding procedure question (caption-only vs. visual access) | ✅ | Answered and decided: caption-only, matching the 200-post ground truth codebook. No addendum needed. |
| — | Carried-over items (candidates, flag reasons, 4 conditions, threshold) | ✅ | All covered above under FR07/Needs_Review rows. |

## Note 2.txt (restore "no caption text" as a reason)

| Status | Notes |
|---|---|
| 📌 Decided | Contradicted `Unassigned_Labels_and_Coding_Procedure.md`'s deliberate removal of the same item. Decision made 2026-08-26: kept removed (if the only problem is a missing caption, the answer is to open the post, not mark it uncategorisable). No reason-capture UI exists yet regardless — see above. |

## Note to Dev 1.txt (297/24 → 309/26 count mismatch)

| Status | Notes |
|---|---|
| ⬜ **Unresolved** | Flagged back to Raven in the 25 Aug response — these numbers don't correspond to anything findable in the Content screens, categorisation counts, or ad/campaign figures checked so far. **Still waiting on which screen/metric this refers to.** |

---

## Open items summary (nothing else outstanding beyond these)

**Waiting on Raven/team:**
- `Content_Screen_Review.md` — never received; please resend
- `Note to Dev 1.txt`'s "297/24 → 309/26" — which screen/metric?
- Whether per-researcher attribution is wanted on codebook-assignment imports (currently unattributed, like the ground-truth import)

**Deliberately deferred (flagged, not silently dropped):**
- FR-07 revised manuscript wording + new FR-07a (Chapter 3 text)
- "Suggestions generated once at ingestion, with recorded method version" (architecture change)
- Reason-capture UI for marking Unassigned (never built)
- Thumbnail inline on short-caption rows (marked optional)
- Save button placement beside vs. below chips (layout constraint)

**Actual backlog coding** (519 posts, caption-only, codebook-based): script is ready (`scripts/import-codebook-assignment.ts`), no CSV has been coded/imported yet — that's the research team's work, not a code task.
