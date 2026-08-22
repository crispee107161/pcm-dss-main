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

  if (categoryKeyword !== null && categoryLlm !== null && categoryKeyword !== categoryLlm) {
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
export const FLAG_REASON_SHORT: Record<CategoryFlagReason, string> = {
  DISAGREEMENT: 'Needs your judgment — this post sits between two categories',
  UNCLASSIFIED: "Needs your judgment — the system couldn't determine a category",
  ENTERTAINMENT_SUGGESTED: 'Check this one — entertainment is often over-suggested',
  SHORT_CAPTION: 'Open the post — the caption is too short to classify from text',
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

// Stacking every fired reason read as an undifferentiated wall of warnings
// (docs/raven/S4_Presentation_Fix.md §1) — callers show only the first
// (most informative) entry plus a count of the rest, expandable on demand.
export function rankFlagReasons(reasons: CategoryFlagReason[]): CategoryFlagReason[] {
  return [...reasons].sort((a, b) => FLAG_REASON_RANK[a] - FLAG_REASON_RANK[b])
}
