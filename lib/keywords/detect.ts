import type { CategoryLabel } from '@/app/generated/prisma/client'

// ALG-04 tie-break priority — ties resolve to whichever category comes first
// here (same order as the reference CATEGORY_LEXICON in the handoff), not
// insertion order of the keyword rows, so the result is deterministic
// regardless of how the Keyword table happens to be queried.
const CATEGORY_PRIORITY: CategoryLabel[] = [
  'PRODUCT_SHOWCASE',
  'PROMOTIONAL_OFFER',
  'TESTIMONIAL',
  'ENTERTAINMENT',
]

export interface CategorySuggestion {
  label: CategoryLabel
  score: number
  tied: boolean
}

const UNCLASSIFIED_RESULT: CategorySuggestion = { label: 'UNCLASSIFIED', score: 0, tied: false }

function escapeRegExp(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * ALG-04: weighted keyword scoring with a deterministic tie-break.
 * Every keyword hit contributes 1 to its category's score (the lexicon is
 * user-curated per category rather than per-term weighted); the highest-scoring
 * category wins, ties resolve via CATEGORY_PRIORITY, and a score of 0 returns
 * UNCLASSIFIED rather than a forced guess.
 */
export function detectCategoryFromText(
  text: string | null | undefined,
  keywords: Array<{ word: string; label: CategoryLabel }>
): CategorySuggestion {
  if (!text) return UNCLASSIFIED_RESULT

  // NFKC first — 173/730 captions use stylised Unicode (e.g. mathematical-bold
  // "𝐑𝐘𝐙𝐄𝐍") that won't substring-match a plain-ASCII keyword otherwise.
  const normalized = text.normalize('NFKC').toLowerCase()

  const scores = new Map<CategoryLabel, number>()
  for (const kw of keywords) {
    const word = kw.word.normalize('NFKC').toLowerCase().trim()
    if (!word) continue
    const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'g')
    const matches = normalized.match(pattern)
    if (!matches) continue
    scores.set(kw.label, (scores.get(kw.label) ?? 0) + matches.length)
  }

  let maxScore = 0
  for (const score of scores.values()) {
    if (score > maxScore) maxScore = score
  }
  if (maxScore === 0) return UNCLASSIFIED_RESULT

  const topLabels = CATEGORY_PRIORITY.filter((label) => scores.get(label) === maxScore)
  return { label: topLabels[0], score: maxScore, tied: topLabels.length > 1 }
}
