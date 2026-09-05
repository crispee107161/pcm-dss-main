import { ASSIGNABLE_LABELS } from '@/lib/categorize/category-picker'
import type { CategoryLabel, CategoryFlagReason } from '@/app/generated/prisma/client'

// docs/raven/S4_Flag_Thresholds_Answers.md §1 — p10 of caption length across
// the 730-post study period, counted on the NFKC-normalised caption (the
// same string fed to the classifiers, not the raw field). Chapter 3
// wording: "fewer than eight words, corresponding to approximately the
// tenth percentile of caption length across the 730 posts in the study
// period."
export const FLAG_SHORT_CAPTION_WORDS = 8

export function captionWordCount(caption: string | null): number {
  if (!caption) return 0
  const trimmed = caption.normalize('NFKC').trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export interface FlagReasonInput {
  categoryKeyword: CategoryLabel | null
  categoryLlm: CategoryLabel | null
  caption: string | null
}

// Pure per-post condition set — no DB access, so it's unit-testable and
// reusable from both the suggestion-writing actions and the recomputation
// helper (lib/data/category-flags.ts). Deliberately depends on nothing but
// this one post's own fields — see ENTERTAINMENT_SUGGESTED's doc comment in
// prisma/schema.prisma for why a cross-post rarity computation was rejected.
export function computeFlagReasons({ categoryKeyword, categoryLlm, caption }: FlagReasonInput): CategoryFlagReason[] {
  const reasons: CategoryFlagReason[] = []

  // docs/raven/Content_Second_Pass.md §4 — UNCLASSIFIED means a method found
  // nothing, so it is not a candidate a real suggestion can disagree with.
  // Code review (2026-09-05) caught the first fix expressing this as a
  // denylist (categoryKeyword !== 'UNCLASSIFIED'), the opposite shape from
  // category-picker.ts's assignableSuggestion/ASSIGNABLE_LABELS allowlist —
  // a denylist silently stops matching intent the moment a sixth label (or
  // UNCLEAR reaching these fields) exists. Sharing ASSIGNABLE_LABELS keeps
  // both "what counts as a real suggestion" checks the same shape by
  // construction.
  if (
    categoryKeyword !== null &&
    categoryLlm !== null &&
    ASSIGNABLE_LABELS.includes(categoryKeyword) &&
    ASSIGNABLE_LABELS.includes(categoryLlm) &&
    categoryKeyword !== categoryLlm
  ) {
    reasons.push('DISAGREEMENT')
  }
  if (categoryKeyword === 'UNCLASSIFIED' || categoryLlm === 'UNCLASSIFIED') {
    reasons.push('UNCLASSIFIED')
  }
  if (categoryKeyword === 'ENTERTAINMENT' || categoryLlm === 'ENTERTAINMENT') {
    reasons.push('ENTERTAINMENT_SUGGESTED')
  }
  if (captionWordCount(caption) < FLAG_SHORT_CAPTION_WORDS) {
    reasons.push('SHORT_CAPTION')
  }

  return reasons
}

// docs/raven/S4_Presentation_Fix.md §2.3 — written as an instruction to the
// Manager (what the situation is *for him*, what to do about it), not a
// description of which internal check fired. Superseded the original
// "Needs review — <system internals>" wording (and the now-removed
// FLAG_REASON_MESSAGE constant it lived in): a fixed "Needs review — "
// prefix doesn't fit once each condition has its own framing verb. Still no
// method names, ever, per docs/raven/S4_Flag_Thresholds_Answers.md §2 —
// ENTERTAINMENT_SUGGESTED's text names the category, not which method
// suggested it.
//
// docs/raven/Content_Second_Pass.md §6 — stacked reasons were mixing status
// ("Needs your judgment") with instruction ("Check this one", "Open the
// post"), so a row with several reasons read as two different kinds of
// sentence in one block. All four are now status, since the row already
// carries its own action (the picker/Open link) beside it.
export const FLAG_REASON_SHORT: Record<CategoryFlagReason, string> = {
  DISAGREEMENT: 'Two categories suggested',
  // Code review (2026-09-05) — fires when either or both methods return
  // UNCLASSIFIED. "No suggestion from one method" is false in the
  // both-abstain case (a real, currently-occurring post), so this has to
  // stay true for one or two abstaining methods alike.
  UNCLASSIFIED: 'No category suggested',
  ENTERTAINMENT_SUGGESTED: 'Entertainment suggested, often over-applied',
  SHORT_CAPTION: 'Caption too short to classify',
}

// docs/raven/S4_Presentation_Fix.md §2.2 — most-informative-first. Two
// independent methods actively disagreeing is the strongest signal of a
// genuine boundary case; a mechanical caption-length check is the weakest.
// Display-only ordering — doesn't affect computeFlagReasons or storage.
const FLAG_REASON_RANK: Record<CategoryFlagReason, number> = {
  DISAGREEMENT: 1,
  ENTERTAINMENT_SUGGESTED: 2,
  UNCLASSIFIED: 3,
  SHORT_CAPTION: 4,
}

// docs/raven/S4_Presentation_Fix.md §1 originally had callers show only the
// first (most informative) entry plus a count of the rest, expandable on
// demand — docs/raven-review/FR07_Review_Row_Compliance.md §3.2 and
// Needs_Review_Row_Design.md §3 overruled that for the Needs Review row
// specifically ("+N more" hides reasons behind a click; there are at most
// four, each a short phrase, show them all). This function's ranking is now
// used only to pick which reason gets the emphasized/first-line treatment
// when every reason is shown — see FlagReasonCell in ContentClient.tsx.
export function rankFlagReasons(reasons: CategoryFlagReason[]): CategoryFlagReason[] {
  return [...reasons].sort((a, b) => FLAG_REASON_RANK[a] - FLAG_REASON_RANK[b])
}
