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

// §2.1's reworded wording — no method names, ever. ENTERTAINMENT_SUGGESTED's
// text names the category (that's not attribution — it's not saying which
// method suggested it), per docs/raven/S4_Flag_Thresholds_Answers.md §2.
export const FLAG_REASON_MESSAGE: Record<CategoryFlagReason, string> = {
  DISAGREEMENT: 'Needs review — the automated methods produced different results for this post',
  UNCLASSIFIED: "Needs review — the post's category could not be determined automatically",
  ENTERTAINMENT_SUGGESTED: 'Needs review — entertainment was suggested for this post',
  SHORT_CAPTION: 'Needs review — this caption is very short',
}

// Same copy as FLAG_REASON_MESSAGE without the leading "Needs review — ",
// for compact per-row display (e.g. CategorizeClient's flag-reason column)
// where the column header already conveys that. Kept as its own field
// rather than derived via string surgery so editing FLAG_REASON_MESSAGE's
// prefix can't silently desync the short form.
export const FLAG_REASON_SHORT: Record<CategoryFlagReason, string> = {
  DISAGREEMENT: 'the automated methods produced different results for this post',
  UNCLASSIFIED: "the post's category could not be determined automatically",
  ENTERTAINMENT_SUGGESTED: 'entertainment was suggested for this post',
  SHORT_CAPTION: 'this caption is very short',
}
