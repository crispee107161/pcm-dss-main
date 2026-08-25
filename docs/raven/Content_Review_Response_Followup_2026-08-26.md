# Follow-up on the docs/raven-review backlog — decisions made, code shipped

**Date:** 26 August 2026
**Re:** `Content_Review_Response_2026-08-25.md` §15's open checklist

---

## 1. Decisions

- **574 legacy rows:** already resolved before this session started — see `574_Live_Run_Confirmation_2026-08-25.md`. 427 in-period rows nulled and returned to the queue (147 out-of-period rows untouched, per FR-04a scoping). Nothing further needed here.
- **Note 2.txt vs. `Unassigned_Labels_and_Coding_Procedure.md`:** the latter is current. "No caption text" stays removed from reason capture — if the only problem is a missing caption, the answer is to open the post, not mark it uncategorisable. (No reason-capture UI exists yet either way — flagging that as a separate, not-yet-built feature if you still want it; it wasn't on the "ready to build" list.)
- **130/519-post backlog coding procedure:** caption-only, matching the 200-post ground-truth sample and the existing codebook. No codebook addendum needed, no two-procedure disclosure required in Chapter 3.
- **New provenance enum value:** `MANUAL_CODEBOOK_ASSIGNMENT`, added via migration `20260825181409_add_manual_codebook_assignment_source`. Distinct from `MANUAL_GROUND_TRUTH` (the locked 200) and `LEGACY_IMPORT`.

## 2. Shipped

- **`scripts/import-codebook-assignment.ts`** — same CSV shape and all-or-nothing validation as `import-ground-truth.ts` (`post_id, category`), stamps `MANUAL_CODEBOOK_ASSIGNMENT` instead of `MANUAL_GROUND_TRUTH`, and additionally **refuses outright** if any target row is already `MANUAL_GROUND_TRUTH` (aborts the whole import, not just that row) — the ground-truth sample can't be touched by this path even by mistake. Ready whenever the researchers' coding sheet for the backlog is ready to import.
- **LLM empty-caption abstention fixed** (`actions/classify-posts.ts`) — this was the real bug behind the null-caption post rendering a confident two-way "disagreement." `classifyBatch` now splits each batch by whether `resolveCaption()` produced any text: captionless posts are stamped `UNCLASSIFIED` directly and never sent to Groq at all (deterministic, free, no reliance on the model reliably self-abstaining); only posts with real caption text reach the prompt. If every post in a batch is captionless, Groq isn't called at all for that batch.
- **Needs Review row UI**, per `Needs_Review_Row_Design.md`:
  - Category chips now show an explicit radio-dot affordance (empty ring → filled dot), distinguishing them from the static Photos/Videos type badges that were causing the "the button looks broken" misread.
  - Selected state is now a filled `bg-primary` pill, not a subtle border-color shift.
  - The action button's label now switches with state: **"Select a category"** (disabled) → **"Save category"** (enabled) — no separate helper text needed.
  - Disabled state recolored to neutral grey (`bg-secondary`/`border`), red reserved for the enabled state, so the two no longer read as "the same button at different opacity."
  - Unassigned is now visually separated below the four real categories (own line, divider), relabelled **"No category applies"** with a one-line explanation, instead of sitting in the same chip row as Product Showcase/Promotional Offer/Entertainment.
- **Flag reasons rendered inline** — "+N more" removed; all fired reasons for a row show at once (there are at most four, each a short phrase).
- **Unassigned label revisions**, per `Unassigned_Labels_and_Coding_Procedure.md` §2: tab renamed "Unassigned" → **"No category"** (internal filter value/enum unchanged — display-only), subtitle updated to "Posts reviewed and found to have no determinable category. Reviewed, not skipped." on both Marketing Manager and Owner routes, empty-state copy updated to match.
- **"View post" made prominent** on the Needs Review row — now a bordered action pill instead of a small text link under the title; already opened in a new tab (confirmed, no change needed there).

## 3. Not touched this pass

- FR-07's revised manuscript wording (§4 of `FR07_Review_Row_Compliance.md`) and the new FR-07a — these are Chapter 3 text, not code; didn't want to edit manuscript prose without being asked.
- "Suggestions generated once at ingestion, with a recorded method version" — still generated on-demand via the two Generate buttons, as flagged in the 25 Aug response. Not in this pass's scope; flag if you want it prioritized next.
- Moving the Save button beside the chip row rather than below it (`Needs_Review_Row_Design.md` §2.5) — the card layout didn't accommodate that cleanly at narrower widths, so it stays stacked; the higher-value part of that fix (label/color/affordance) is done.
- A reason-capture field for marking a post Unassigned (dropdown/free-text of why) — this was never built, in this pass or before. Not on the "ready to build" list in the 25 Aug response, so treating it as still open rather than done.

## 4. Still waiting on you / the team

- **`Content_Screen_Review.md`** — still hasn't reached this repo. Its specific asks (batch-confirm reconciliation of 30/130, "what does agreement certify at κ=0.139") remain unaddressed because the source document doesn't exist here to work from. Please resend if you still want it actioned.
- **The actual backlog coding** — `scripts/import-codebook-assignment.ts` is built and ready, but no researcher-coded CSV has been imported yet. That's the research team's work, not a code task.

## 5. Verification

`tsc --noEmit` clean, full suite 374/374 passing, `npm run build` succeeds (all routes compile). Not verified in a live browser this session — same standing caveat as prior phases.

## 6. Post-review fixes (code-review-analyst pass, same day)

A review of this diff caught two real defects and one incomplete rename before commit:

- **Audit-log misattribution, fixed.** In a batch with both captioned and captionless posts, `LlmClassificationRun.raw_response` (Groq's actual reply, covering only the captioned subset) was being logged against `post_ids` for the whole batch — implying Groq saw posts it never received. `classifyBatch` now reports which ids it skipped; the logged response gets an explicit note naming them when the batch was mixed.
- **The 5 captionless posts repaired, not just the code path.** The abstention fix only changed behavior for *future* `runLlmClassification()` runs — the 5 posts that motivated the fix already carried a stale guessed `category_llm` from before it, and the selection query (`category_llm: null`) would never have re-picked them up. Ran `scripts/repair-captionless-llm-guesses.ts` (dry-run confirmed the exact 5 ids first) — all 5 nulled, queue flags recomputed. They'll get a real `UNCLASSIFIED` on the next classification run.
- **"Unassigned" rename unified.** The earlier pass renamed the tab and the picker chip to "No category" language but left the confirm dialog, badge, and dropdown saying "Unassigned" — same click, three names for the same state. `selectableLabelText('UNCLASSIFIED')` is now the single source ("No category"), used everywhere including the picker chip; only the explanatory line beside it is separate text.
- Also: `hasCaption` now reuses the existing tested `captionWordCount` instead of a second, driftable definition of "no caption"; a stale comment describing the old "+N more" collapse behavior was corrected; the radio-dot `group` was named (`group/option`) so it can't accidentally couple to an unrelated future ancestor `.group`.

**Not fixed, by design:** `app/layout.tsx` and `components/admin/UserManagement.tsx` are unrelated work from an earlier session (Toaster/admin-toast) and are being kept out of this commit rather than bundled in. The new migration (`20260825181409`) also swept in 4 unrelated `DROP DEFAULT` statements from prior schema drift — already applied to the live DB, so editing the file now would just reopen the checksum-mismatch problem fixed earlier this session; noting it here instead of touching it.

Re-verified after fixes: `tsc --noEmit` clean, 374/374 tests, `npm run build` succeeds.
