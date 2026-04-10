/**
 * Detects a category suggestion from a text string based on a keyword map.
 * Returns the category id of the first matching keyword, or null if none match.
 */
export function detectCategoryFromText(
  text: string | null | undefined,
  keywords: Array<{ word: string; category_id: number }>
): number | null {
  if (!text) return null
  const lower = text.toLowerCase()
  for (const kw of keywords) {
    if (lower.includes(kw.word.toLowerCase())) {
      return kw.category_id
    }
  }
  return null
}
