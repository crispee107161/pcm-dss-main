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
