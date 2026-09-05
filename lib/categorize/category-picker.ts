import { CATEGORY_LABEL_DISPLAY } from '@/lib/category-label'
import type { CategoryLabel, CategoryFlagReason } from '@/app/generated/prisma/client'

// FR-13: the four labels ALG-04/ALG-05 can actually produce as a suggestion.
// UNCLASSIFIED means a method found nothing — it's never a candidate, so it
// stays out of this list (assignableSuggestion below is what dedupes
// suggestion chips/radios). It's still manually assignable by a Manager as
// "Unassigned" — see SELECTABLE_LABELS, which is the list for that — per the
// Phase-3 sanity-check decision in docs/raven/Consolidation_Plan_Checklist.md.
export const ASSIGNABLE_LABELS: CategoryLabel[] = ['PRODUCT_SHOWCASE', 'PROMOTIONAL_OFFER', 'TESTIMONIAL', 'ENTERTAINMENT']

// Every category a Manager can manually finalize a post as, including
// "Unassigned" (category_final = UNCLASSIFIED) — always listed last, never
// treated as a suggested candidate. Deliberately a separate list from
// ASSIGNABLE_LABELS above: batch-confirm eligibility and suggestion
// derivation must never auto-treat UNCLASSIFIED as a real answer.
export const SELECTABLE_LABELS: CategoryLabel[] = [...ASSIGNABLE_LABELS, 'UNCLASSIFIED']

// docs/raven-review/Unassigned_Labels_and_Coding_Procedure.md §2.1 renamed
// this state to "No category" everywhere a person reads it — code review
// (2026-08-26) caught that the rename had only reached the tab and the
// picker chip, leaving "Unassigned" on the confirm dialog, the badge, and
// the dropdown for the exact same value in the exact same interaction.
// Changed once, here, so every caller stays in sync by construction.
//
// docs/raven/Content_Second_Pass.md §1 — UNCLEAR joined UNCLASSIFIED on the
// "No category" tab (content-filter.ts's whereForFilter) as the same
// concept from a different mechanism (human coder vs. system abstain). Code
// review caught that this function still routed UNCLEAR to its raw
// CATEGORY_LABEL_DISPLAY entry ("Unclear"), so the tab titled "No category"
// was rendering manuscript language on every row it exists to surface —
// exactly what §0.3 bans. UNCLEAR reads "No category" here too now.
export function selectableLabelText(label: CategoryLabel): string {
  return label === 'UNCLASSIFIED' || label === 'UNCLEAR' ? 'No category' : CATEGORY_LABEL_DISPLAY[label]
}

export function categoryEditLabel(value: string | null): string {
  if (value === null || value === '') return '(None)'
  return selectableLabelText(value as CategoryLabel)
}

// Structural subset of ContentPostRow (components/marketing/ContentClient.tsx)
// — kept minimal and here rather than imported from that 'use client' file so
// these pure functions stay importable from a plain Vitest test.
export interface SuggestibleCategoryPost {
  keywordSuggestion: CategoryLabel | null
  llmSuggestion: CategoryLabel | null
  flagReasons: CategoryFlagReason[]
}

// A suggestion usable as a select default must be one of the four assignable
// labels — UNCLASSIFIED means "the method found nothing," not a category
// choice, and UNCLEAR is ground-truth-only. Mirrors isUnflaggedAgreed's
// ASSIGNABLE_LABELS membership check (lib/data/category-flags.ts) so
// isBatchConfirmEligible below can't diverge from what the server actually
// confirms.
export function assignableSuggestion(label: CategoryLabel | null): CategoryLabel | undefined {
  return label && ASSIGNABLE_LABELS.includes(label) ? label : undefined
}

// Used only to size the "Batch confirm" button (isBatchConfirmEligible
// below) — the Manager's own picker never pre-selects (docs/raven/
// Categorisation_Workflow_Consolidation.md §4.1: "nothing pre-selected").
export function agreedSuggestion(post: SuggestibleCategoryPost): CategoryLabel | undefined {
  const keyword = assignableSuggestion(post.keywordSuggestion)
  const llm = assignableSuggestion(post.llmSuggestion)
  return keyword && llm && keyword === llm ? keyword : undefined
}

// docs/raven/S4_Categorisation_Review_UI_Change.md §2.2: candidates shown as
// unlabelled, deduped (agreement collapses to one), alphabetically ordered —
// never which method produced which. Shared by the read-only SuggestionCell
// (Owner/Team) and the Manager's CategoryPicker so both derive the same set.
export function suggestedCandidates(post: SuggestibleCategoryPost): CategoryLabel[] {
  return Array.from(
    new Set([assignableSuggestion(post.keywordSuggestion), assignableSuggestion(post.llmSuggestion)]
      .filter((v): v is CategoryLabel => v !== undefined))
  ).sort((a, b) => CATEGORY_LABEL_DISPLAY[a].localeCompare(CATEGORY_LABEL_DISPLAY[b]))
}

// Mirrors lib/data/category-flags.ts's isUnflaggedAgreed (server-only, can't
// be imported into a client bundle) — kept in sync by both reading the same
// fields the same way, and by assignableSuggestion sharing its
// ASSIGNABLE_LABELS membership check. Used only to size the "Batch confirm"
// button; the action itself re-derives eligibility server-side before
// writing.
export function isBatchConfirmEligible(post: SuggestibleCategoryPost): boolean {
  return post.flagReasons.length === 0 && agreedSuggestion(post) !== undefined
}
