# Categorisation workflow consolidation — plan & progress

Tracks both `Categorisation_Workflow_Consolidation.md` (22 Aug) and Raven's
`Lexicon_Drift_Rerun_Spec.md` reply (23 Aug), merged into one priority order per
her §6. Update this file as items land — it's the single source of truth for
"what's done" across sessions.

---

## Sanity-check notes (pre-Phase 2, decided 2026-08-23)

Cross-checked this plan against the actual schema/code before starting Phase 2. Two
gaps found; both resolved here rather than left open, so Phase 3/4 can be built without
re-litigating this.

**"Unassigned" doesn't exist in the app yet, despite FR-07 requiring it.**
`CategorizeClient.tsx`'s `ASSIGNABLE_LABELS` (line 27) explicitly excludes
`UNCLASSIFIED` from manual selection ("a system-set outcome... not a manual choice"),
and there is no `review_status` field anywhere in `schema.prisma` — Raven's Phase-4
filter design (`review_status = 'unresolvable'`) references a field that was never
built; likely her own shorthand for a concept, same pattern as her earlier
`category_ground_truth` naming that turned out to just be `category_final` + a source
flag.
- **Decision: no schema migration.** `UNCLASSIFIED` becomes a manually assignable
  `category_final` value (drop it from `ASSIGNABLE_LABELS`'s exclusion). "Unassigned"
  everywhere in Phase 3/4 (the row radio option, the Phase-4 filter) means
  `category_final === 'UNCLASSIFIED'`. This is a live design decision, not just an
  implementation detail — worth a line to Raven so she knows what "Unassigned" resolves
  to in the build, but it does not block starting Phase 2/3.

**Phase 2's original checklist undercounted what references Propose.**
Besides `TeamProposeCell`/`category_pending`, three more things touch it:
`CategoryAuditAction.PROPOSE` (schema enum), its label in `lib/data/audit-log.ts`, and
`User.category_proposals` (the relation). **Decision: leave all three in place.**
Historical `PROPOSE` audit rows must survive (the memo's own Verify section requires
the audit trail stay intact), and an enum value referenced by existing rows can't be
cheaply dropped anyway. Phase 2 removes the *write path* (the UI, the action, the
`category_pending` column), not the historical record of it.

---

## Phase 1 — Lexicon integrity (blocks Chapter 3/4)

- [x] **Re-run FR-08 against the 50-keyword seed baseline** — `scripts/rerun-fr08-seed-lexicon.ts`, read-only, doesn't touch the live `Keyword` table. Results: `docs/raven/FR08_Seed_Lexicon_Rerun_Results.md`.
  - [x] Report n, p_o, p_e, κ, confusion matrix, per-category recall — seed lexicon
  - [x] Same for the live 93-keyword lexicon, for comparison (§4, optional — done, cheap to produce)
  - [x] UNCLASSIFIED→unclear mapping implemented as a separate reported variant, not a change to `lib/stats/agreement.ts` (confirmed it wasn't previously implemented anywhere)
  - [x] Nothing in the lexicon "fixed" before re-running (miscategorised keywords left as-is, per her explicit warning)
  - [x] Both lexicons snapshotted to committed files: `Seed_Lexicon_Snapshot_2026-08-23.md` (new), `Keyword_Lexicon_Snapshot_2026-08-22.md` (existing)
  - [x] Drop-in Chapter 3 paragraph drafted
  - **Finding:** κ is statistically flat (0.136 seed vs 0.139 live) — drift didn't inflate the score, it traded Testimonial recall for Product Showcase recall. Reported as a methodological finding, not a disqualifying contamination.
  - **Open:** confidence interval on κ not computed — flagged to Raven, small add if she wants it for the manuscript.

- [x] **Make the lexicon read-only, enforced server-side**
  - [x] `actions/keywords.ts` — every write path (`addKeyword`, `deleteKeyword`, `addKeywordsBulk`, `suggestKeywords`) refuses unconditionally, not gated on role/UI
  - [x] `KeywordsClient.tsx` — no forms, no AI panel, plain view of the term list
  - [x] Nav + page renamed "Manage Keywords" → "Keyword Lexicon" (kept reachable rather than removed outright, since her own bullet says to keep a view-only display — **flag to Raven**: her checklist literally said "remove from nav," I read that + "keep a view-only display" together as rename-not-delete; confirm that's what she meant)
  - [x] `tsc` clean, 317/317 tests pass

- [x] **Reverted live lexicon 93 → 50, Option A** (`docs/raven/Provenance_Followup_and_Revised_Order.md` §2.2, decided 2026-08-23) — `scripts/revert-lexicon-to-seed.ts`, dry-run verified first (matched exactly the 43 terms already documented in `Keyword_Lexicon_Snapshot_2026-08-22.md`, including the two terms Raven named by name — `customerstory`, `satisfiedcustomer` — both confirmed filed under Promotional Offer, not Testimonial), then run for real. Live table is now byte-identical to `prisma/seed.ts`. Evaluated (`FR08_Seed_Lexicon_Rerun_Results.md`'s seed-lexicon numbers, κ=0.136) now equals deployed. No new snapshot needed — both the pre-revert live-93 snapshot and the seed-50 snapshot were already committed the same day.

---

## Phase 2 — Remove Propose (§2 of the 22 Aug memo) — done 2026-08-23

- [x] Remove `TeamProposeCell` and the propose action from `CategorizeClient.tsx`
- [x] Drop `category_pending` — nothing reads or writes it anywhere in the live code path (schema column left in place, no migration — per the sanity-check decision above)
  - Removed `proposePostCategory(Form)`, `acceptPendingCategory`, `rejectPendingCategory`, `bulkAcceptPendingCategories` from `actions/categorize.ts` entirely (all existed only to read/write `category_pending`)
  - `updatePostCategory`'s override write no longer nulls `category_pending`/`category_pending_by` — those columns are simply never touched again, not actively cleared
  - `batchConfirmAgreed`'s eligibility query dropped its `category_pending: null` filter (moot now that nothing sets it)
- [x] Set Marketing Team to view-only on categorisation — `ActionCell` now renders "View only" for any role except `MARKETING_MANAGER` (Team and Owner share the same branch)
- [x] Confirm no `defaultSelection` logic still reads `category_pending` — now `agreedSuggestion(post) ?? ''` only
- [x] Reconciled `actions/categorize.ts`, both `categorize/page.tsx` routes (dropped `category_pending`/`pending_by` from the select + row mapping), `scripts/fr15-deliverables-dump.ts` (dropped the pending count and the C3 pending-breakdown query — diagnostic script, not the live path)
- [x] **Left in place** (per sanity-check decision above): `CategoryAuditAction.PROPOSE` enum value, its label in `lib/data/audit-log.ts`, `User.category_proposals` relation — historical audit rows depend on all three
- [x] `tsc` clean, 317/317 tests pass

**Note:** existing rows with a non-null `category_pending` (if any exist in a live DB) are now inert — nothing reads them, and the old "proposed by X" badge is gone from the UI. They just render as plain suggestions until Phase 3's queue UI replaces this screen. No backfill/cleanup script was written since this wasn't asked for and the checklist explicitly deferred any schema change.

## Phase 3 — Row interaction fix (§4 of the 22 Aug memo) — done 2026-08-23

- [x] Show both candidate categories as selectable, unlabelled radio options when methods disagree — `CategoryPicker`/`CategoryOption` in `CategorizeClient.tsx`, chips are the radios themselves, no separate dropdown
- [x] Nothing pre-selected — `ManagerActionCell`'s `selected` state starts at `''`; `agreedSuggestion` is no longer read to seed it (only still used to size the "Batch confirm" button)
- [x] One "Save category" button, enabled only once a selection exists (`disabled={... || selected === ''}`) — went with the single-button option the memo offered as equally valid, not the two-button Confirm/Save split
- [x] "Override" removed from the primary action entirely — button reads "Save category", dialog reads "Finalize as ___?" with no override language. (There's no "Categorised" filter yet to reserve the word for — that's Phase 4; the word just doesn't appear anywhere on this screen right now)
- [x] Header reads "Suggested" for the read-only roles' display (Owner/Team); the Manager's picker has its own "Suggested for this post" / "Other categories" labels instead, per the memo's §4.1 mockup — neither ever names keyword vs LLM
- [x] "Unassigned" option added as `SELECTABLE_LABELS` (`ASSIGNABLE_LABELS` + `UNCLASSIFIED`, always listed last) — a **new, separate list** from `ASSIGNABLE_LABELS`, not a mutation of it. `ASSIGNABLE_LABELS` still excludes `UNCLASSIFIED` because it's also used to derive *suggestions* (`assignableSuggestion`/`suggestedCandidates`) and batch-confirm eligibility (`agreedSuggestion`) — letting `UNCLASSIFIED` into that list would make two methods' shared "found nothing" register as an agreed real answer. No schema change, per the sanity-check decision above.
- [x] `tsc` clean, 317/317 tests pass

**Not verified in a live browser** — no browser automation tool was available this session. Only `tsc` and the automated test suite ran; someone should click through the Manager view (disagreement row, agreement row, zero-suggestion row, the Save dialog, and Owner/Team's read-only view) before this is called done-done.

## Phase 4 — Merge Content Library + Categorisation Review (§3 of the 22 Aug memo) — done 2026-08-23

- [x] Single "Content" sidebar entry replacing both — marketing nav's "Content Library" + "Categorization Review" pair collapsed to one "Content" entry (`app/dashboard/marketing/layout.tsx`); owner's single existing entry relabeled "Content" too (`app/dashboard/owner/layout.tsx`), same route
- [x] Filter: Needs review (default) / All / Categorised / Unassigned, in the query string (`?filter=`, read via `searchParams` in both `categorize/page.tsx` routes, switched by `FilterTabs` in the client component via `router.push`) — "Unassigned" = `category_final === 'UNCLASSIFIED'`, not a separate field, per the sanity-check decision above
- [x] `CategorizeClient` + `ContentLibraryClient` → one component, `components/marketing/ContentClient.tsx` (`posts`, `role`, `filter` props; `canEdit` is derived inside from `role === 'MARKETING_MANAGER'` rather than passed in, since every caller already computes it the same way)
- [x] Triage columns (suggestions, review reasons, batch confirm) render only on "Needs review" — `QueueView` (card layout, unchanged Phase-3 behavior) vs `LibraryTable` (table layout, new) are two different sub-views switched by `filter`, not one component conditionally hiding columns — see note below
- [x] One write path to `category_final` — both `QueueView`'s `ManagerActionCell` and `LibraryTable`'s `CategoryEditCell` call `updatePostCategory`; the old FormData-wrapped `updatePostCategoryForm` (Content Library's only caller) is deleted as dead code
- [x] `/dashboard/marketing/content` → redirects to `/dashboard/marketing/categorize?filter=all`
- [x] `/dashboard/owner/content` deleted (already orphaned)
- [x] Search carried over to all four filters (queue already had it; `LibraryTable` gets its own copy for the other three)
- [x] Views/engagement-rate columns preserved on non-queue filters — `LibraryTable`'s Views/Engagement columns, straight from the old Content Library table
- [x] Provenance (`source`, user, timestamp) shown on non-queue rows — new `ProvenanceCell`, reads `category_final_source` + `category_final_assigned_by`/`_at` (both routes now select these; they weren't selected before)
- [x] `tsc` clean, production build clean (`npm run build`), 317/317 tests pass

**Deviation from the memo, flagged rather than silently resolved:** §3.5's table describes "Search and post-type filters" as already existing on Content Library "today, and should carry over." The pre-merge `ContentLibraryClient.tsx` (read before deleting it) had neither — no search box, no post-type filter, just a paginated table. Search was carried over anyway (cheap, matches the stated intent). A post-type filter was **not invented** — there's nothing to carry over, and building a new one wasn't asked for. Flag to Raven if it's actually wanted.

**Layout note:** the memo's column table (§3.5) reads as one component conditionally showing/hiding columns. What's built instead is `QueueView` (the Phase-3 card list, entirely unchanged) and `LibraryTable` (a new table, closer to the old Content Library's shape) as two sibling views inside `ContentClient`, switched by `filter`. Same outcome — one component, one file, one filter prop, one write path — but the "Needs review" queue keeps its card layout rather than being forced into the same table shape as the other three filters, since the memo's cost section (§3.6) only requires "a filter and conditional columns," not identical DOM per filter.

**Not verified in a live browser** — same caveat as Phase 3: no browser automation tool was available this session. `tsc`, `next build`, and the test suite all pass, but nobody has clicked through all four filters, the tab switching, search on the library table, or the provenance display yet.

## Verify (from the 22 Aug memo's own checklist, applies once Phases 2-4 land)

- [x] Ground-truth 200 remain locked and excluded from the queue — untouched by any Phase 2-4 change; ground truth writes only ever go through `scripts/import-ground-truth.ts`, which none of this touched
- [x] Audit trail still records every category write with user and timestamp — `updatePostCategory` (the one write path, Phase 4) still writes a `CategoryAuditLog` row with `action: 'OVERRIDE'` on every call, unchanged
- [x] Flag reasons still stored per-post as identifiers — `category_flag_reasons` untouched by Phases 2-4; still populated by `recomputeQueueFlagReasons` and read by `FlagReasonCell`

---

## Order

Per Raven's revised §6: **1 → 2 → 3 → 4** above, done sequentially, smallest-to-largest
within 2-4. All four phases are closed as of 2026-08-23, pending a live-browser
click-through (Phases 3 and 4 were only verified via `tsc`/build/tests — see their
notes above) and Raven's confirmation on the two flagged items: the "rename vs.
delete" question on the Keyword Lexicon nav item (Phase 1) and the post-type-filter
gap (Phase 4).

## Post-review fixes (2026-08-23)

`code-review-analyst` ran against the full Phase 2-4 diff; verdict "needs work" — one
real bug plus hardening gaps, nothing structural. All actioned same session:

- [x] **Ground-truth rows are now actually locked**, not just excluded from the queue.
  `updatePostCategory` (`actions/categorize.ts`) refuses any write where the existing
  row's `category_final_source` is `MANUAL_GROUND_TRUTH` — this is the real
  enforcement, since it's the one write path. `CategoryEditCell`
  (`components/marketing/ContentClient.tsx`) additionally renders those rows
  read-only (badge + "locked — ground truth" label) rather than showing an editable
  dropdown next to the "Ground truth import" provenance text — that juxtaposition in
  the new "Categorised" filter is exactly what the review flagged as an accident
  waiting to happen. The earlier "Ground-truth 200 remain locked" Verify line above
  was true of the queue exclusion but not of an edit attempt from elsewhere — it now is.
- [x] **`Prisma.FacebookPostWhereInput` typed explicitly** on the `where` clause in
  both `categorize/page.tsx` routes — previously an un-annotated `const`, which meant
  a typo'd field name would have compiled clean and silently returned the wrong post
  set (excess-property checking doesn't apply to a `where` built as a variable rather
  than an inline literal).
- [x] **"Categorised" and "Unassigned" are now mutually exclusive** —
  `category_final: { not: null, notIn: ['UNCLASSIFIED'] }` in both `whereForFilter`
  functions. They read as tabs in one filter set (only "All" is meant to be
  inclusive), and "Unassigned" existing to isolate posts nobody could categorise only
  works if Categorised doesn't also show them.
- [x] **Owner/Team no longer see "Unclassified" where the Manager sees "Unassigned"**
  for the same `UNCLASSIFIED` value — `CategoryBadge` now renders through
  `selectableLabelText` (shared with the picker/dropdown) instead of
  `CATEGORY_LABEL_DISPLAY` directly.
- [x] **The pure predicates are now unit-tested**, not just embedded in a `'use
  client'` component. Extracted `ASSIGNABLE_LABELS`, `SELECTABLE_LABELS`,
  `selectableLabelText`, `categoryEditLabel`, `assignableSuggestion`,
  `agreedSuggestion`, `suggestedCandidates`, `isBatchConfirmEligible` to
  `lib/categorize/category-picker.ts` (17 new tests in
  `category-picker.test.ts`), including a direct assertion that
  `SELECTABLE_LABELS === [...ASSIGNABLE_LABELS, 'UNCLASSIFIED']` and that
  `ASSIGNABLE_LABELS` never contains `UNCLASSIFIED` — the exact invariant the review
  was asked to check by hand. `ContentClient.tsx` now imports these instead of
  redefining them.
- [x] **`parseFilter`/`ContentFilter` deduplicated** — moved to
  `lib/categorize/content-filter.ts` (`parseContentFilter`, tested), imported by both
  route files instead of two copies that could silently drift. `FILTER_DESCRIPTIONS`
  copy was left per-page (marketing vs. owner "(view only)" wording is intentionally
  different prose, not duplicated logic).
- [x] **Dead `categorySelectLabel` export removed** from `lib/category-label.ts` — its
  only caller was the deleted `ContentLibraryClient.tsx`.
- [x] `tsc` clean, production build clean, 334/334 tests pass (317 + 17 new).

**Not fixed, by design:** no DB-level pagination added to the non-queue filters
(`LibraryTable` still fetches the full filtered set and paginates client-side at 50) —
flagged LOW by the review and inherited unchanged from the pre-merge Content Library,
not a regression introduced by this session.

**Still open, needs a human call:** whether a Manager should ever be able to
overwrite a ground-truth row at all was answered here as "no, hard block" — flag to
Raven if that's wrong. Same live-browser caveat as Phases 3/4 above still applies;
these fixes were verified the same way (`tsc`/build/tests), not by clicking through
the "Categorised" filter, the ground-truth lock UI, or the now-excluded Unassigned
rows.

---

## Phase 5 — Provenance follow-up + Content filter fixes (2026-08-23)

Responds to `docs/raven/Provenance_Followup_and_Revised_Order.md` and
`docs/raven/Content_Filters_Review.md`. Full plan and reasoning:
`docs/raven/Provenance_Audit_Results.md`, `docs/raven/LLM_Prompt_Model_Provenance.md`.

### Answered, no code change needed
- [x] **Content_Filters_Review §1 ("All/Categorised identical") was a misdiagnosis** — `whereForFilter` was already correct; confirmed with real counts (All=916, Needs Review=130, Categorised=786, Unassigned=0, 130+786+0=916). Screenshots caught a page-1 coincidence from `publish_time desc` ordering.
- [x] **§2.3/§3 queue audit** — every non-import `category_final` assignment traces to one account, `marketing@pcmerchandise.com` (MARKETING_MANAGER). The three flagged 3 AM-ish timestamps confirmed exactly (UTC→PHT). The audit trail records the account, not the physical person — stated plainly rather than papered over; whether Sir Dan personally made those edits is a question for the team.
- [x] **§2.1 LLM run history** — all 63 historical `LlmClassificationRun` rows used `llama-3.1-8b-instant`; none since Groq deprecated it (commit `a308813`, which introduced the auto-resolving `resolveGroqModel()`). The κ=0.444 figure is unaffected by that later change.

### Fixed
- [x] **Lexicon reverted 93→50 (Option A)** — `scripts/revert-lexicon-to-seed.ts`, dry-run verified against `Keyword_Lexicon_Snapshot_2026-08-22.md` first. Live table now matches `prisma/seed.ts` exactly.
- [x] **LLM model pinned** — `actions/classify-posts.ts` now hardcodes `CLASSIFICATION_MODEL = 'openai/gpt-oss-20b'` for this action only (the shared `resolveGroqModel()` auto-resolver stays for chat/insights/keywords, where reproducibility doesn't matter). Re-run against the 200 ground-truth posts confirmed κ=0.4645 vs the stored 0.4443 — no degradation.
- [x] **Legacy provenance backfill** — new `CategoryFinalSource` enum values `LEGACY_IMPORT` and `MANUAL_CHANGE_AFTER_FINALISATION` (migration `20260823150110_category_final_source_legacy_and_revision`, applied manually via `prisma db execute` + `migrate resolve` — Neon's pooler doesn't support Prisma's advisory lock for `migrate dev`/`deploy`). 574 rows backfilled to `LEGACY_IMPORT` (`scripts/backfill-legacy-provenance.ts`). `ProvenanceCell` now renders "Legacy import" instead of a bare dash.
- [x] **Ground truth now invisible, not just uneditable** — `EXCLUDE_GROUND_TRUTH` added to `whereForFilter` (all three remaining filters), closing Content_Filters_Review §9 Q6.
- [x] **Second write-path armed, not always-live** — `CategoryEditCell` now starts read-only (badge + "Change" button) for an already-finalised post; clicking Change arms the dropdown+Save. `updatePostCategory` derives `MANUAL_CHANGE_AFTER_FINALISATION` vs `MANUAL_OVERRIDE` server-side from the row's own prior state, not a client flag.
- [x] **First assignment routed through triage** — a post with no `category_final` at all renders "Categorise in review →" on All instead of an editable dropdown; only Needs Review can set a category for the first time.
- [x] **`whereForFilter` deduped** — moved to `lib/categorize/content-filter.ts`, both `categorize/page.tsx` routes import it instead of carrying byte-identical copies.
- [x] **Categorised tab dropped** (Content_Filters_Review §7, "probably not, and I would drop it") — `ContentFilter` is now `'needs-review' | 'all' | 'unassigned'`. Three tabs.
- [x] **Per-filter empty states** — `LIBRARY_EMPTY_STATE` in `ContentClient.tsx`; Unassigned no longer claims "No organic posts uploaded yet." with 900+ posts in the corpus.
- [x] **Row count on All/Unassigned** — matches the queue's "N in queue" convention.
- [x] **Method Evaluation restricted to Marketing Manager** — `app/dashboard/owner/method-evaluation/` deleted (confirmed near-duplicate, no unique content), nav entry removed from `app/dashboard/owner/layout.tsx`.
- [x] **Suggestion acceptance rate added** — `getSuggestionAcceptanceRate()` in `lib/data/method-evaluation.ts`, new card on the marketing Method Evaluation page. Separately labelled, no kappa, bucketed by month of `category_final_assigned_at` (no ingestion-period field exists to bucket by instead).
- [x] **`BATCH_CONFIRM` audit label added** — was rendering as the raw enum string.
- [x] British spelling pass on `ContentClient.tsx` and both `categorize/page.tsx` routes (`categorised`/`Uncategorised`/`categorise`) — not extended app-wide.
- [x] `tsc` clean, production build clean, 339/339 tests pass (334 + 5 new: `content-filter.test.ts`'s `whereForFilter` coverage + the removed-value fallback case).

### Not done — deferred, flagged rather than silently skipped
- [ ] Category filter, post-type filter, and provenance filter on the All tab (Content_Filters_Review §7.1's fuller 3-tab proposal) — the tab count changed, the additional filters did not.
- [ ] Sortable Views/Engagement columns on `LibraryTable`.
- [ ] Search still matches title only, not the full `resolveCaption(title, description)` text the classifiers actually read — mislabelling not fixed either.
- [ ] Cohen's kappa Definition of Terms entry — Raven's own action item on her side of the manuscript, not this codebase.

**Not verified in a live browser this session either** — same caveat as every prior phase. `tsc`, `next build`, and the test suite pass; the dev server was restarted clean and responds 200 on `/login`, but nobody has clicked through the three tabs, the Change-to-arm flow, the ground-truth exclusion, or the new acceptance-rate card yet.

### Post-review fixes (2026-08-23)

`code-review-analyst` ran against the full Phase 5 diff. One CRITICAL bug found and fixed; several hardening gaps addressed same session.

- [x] **🔴 CRITICAL, fixed — `EXCLUDE_GROUND_TRUTH` had wrong NULL semantics.** `{ category_final_source: { not: 'MANUAL_GROUND_TRUTH' } }` does not match rows where the column is NULL (SQL/Prisma `!=` never matches NULL) — every unreviewed post has a NULL source, so this silently emptied the entire Needs Review queue (130→0) and shrank All by the same 130 (916 total → 586 instead of the correct 716). Verified live against the DB both before the fix (needs-review=0, all=586 — wrong) and after (`whereForFilter` now uses an explicit `OR: [{ source: null }, { source: { not: ... } }]`; confirmed needs-review=130, all=716=916−200 excluded ground-truth, unassigned=0 — all correct). The `content-filter.test.ts` assertions the review flagged as tautological (comparing against the same constant under test) were replaced with literal expected shapes plus a small semantics simulation that would have caught this class of bug.
- [x] **🟠 HIGH, fixed — a decommissioned/unavailable pinned model would have silently corrupted `category_llm`.** `classify-posts.ts`'s per-batch catch treated every non-rate-limit failure the same: mark UNCLASSIFIED, write it, move on — including a model-not-found error, which would then never be retried (`category_llm: null` is the selection predicate). Added `GroqModelUnavailableError` detection (404 / `model_not_found` / `model_decommissioned` / "does not exist") that aborts the whole run with nothing written instead. Also stopped persisting `UNCLASSIFIED` for ordinary transient failures (network blip, malformed JSON after retry) — those rows now stay `null` so the next run retries them, rather than permanently stamping a wrong answer into the column FR-15's kappa reads. `ClassifyPostsResult` gained `batchesFailed`, surfaced in the UI toast.
- [x] **🟡 MEDIUM, fixed — `rerun-fr08-llm-model.ts` could have silently understated kappa on a rate-limit blip.** A batch that exhausted all retries fell through to the same `?? 'UNCLASSIFIED'` as a genuine model prediction, feeding a transient failure into the reported agreement figure with no indication in the output. Failed posts are now excluded from the comparison (not counted as UNCLASSIFIED) and reported with a `WARNING: N post(s) excluded … re-run before citing this figure` line.
- [x] **🟡 MEDIUM, fixed — `getSuggestionAcceptanceRate()` field names inverted their own meaning.** `overallKeywordRate`/`overallLlmRate` measured *alteration*, not acceptance, under a metric literally named "acceptance rate" — a future reader or citation would get it backwards. Renamed to `keywordAlteredRate`/`llmAlteredRate`.
- [x] **🟡 MEDIUM, fixed — `CategoryEditCell`'s "Categorise in review" link hardcoded the marketing route.** Worked today only because `canEdit` (which gates the link) happens to equal `role === 'MARKETING_MANAGER'` too — an incidental guard, not an intentional one. `baseRoute` is now threaded down explicitly from `ContentClient` through `LibraryTable`.
- [x] Migration `ALTER TYPE … ADD VALUE` statements given `IF NOT EXISTS` — the manual `db execute`-based application path (Neon pooler workaround) has no built-in idempotency check of its own.
- [x] `scripts/revert-lexicon-to-seed.ts` now defaults to a dry run; deleting requires an explicit `--confirm` flag, inverted from the previous "pass a flag to preview" default for a script that deletes from a real database.
- [x] `tsc` clean, production build clean, 342/342 tests pass (339 + 3 new NULL-semantics tests).

**Not fixed, flagged by the review, left for later:** a `directUrl` on the Prisma datasource pointing at Neon's non-pooled endpoint (would make `prisma migrate dev` work normally instead of needing the manual `db execute` + `migrate resolve` dance every time — currently tribal knowledge in this session's transcript, now also written up in this checklist and `docs/raven/Consolidation_Plan_Checklist.md`); a test asserting `revert-lexicon-to-seed.ts`'s hand-copied 50-word list matches `prisma/seed.ts`'s mapping exactly (word AND category, not just word); whether a `CategoryAuditLog` action should distinguish first-assignment from revision the way `category_final_source` now does (currently both write `action: 'OVERRIDE'`) — flagged as a question for Raven, not obviously a bug.

**Still not verified in a live browser** — same standing caveat. The critical bug above is exactly the class of issue that caveat exists for; it was caught by an independent code-review pass plus a live read-only DB query, not by clicking through the UI, and a live click-through remains the one thing that hasn't happened yet.
