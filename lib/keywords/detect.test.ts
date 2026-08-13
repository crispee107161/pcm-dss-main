import { describe, it, expect } from 'vitest'
import { detectCategoryFromText } from './detect'
import type { CategoryLabel } from '@/app/generated/prisma/client'

function kw(word: string, label: CategoryLabel) {
  return { word, label }
}

describe('detectCategoryFromText (ALG-04)', () => {
  it('returns UNCLASSIFIED with score 0 when no text is given', () => {
    expect(detectCategoryFromText(null, [kw('ryzen', 'PRODUCT_SHOWCASE')])).toEqual({
      label: 'UNCLASSIFIED',
      score: 0,
      tied: false,
    })
  })

  it('returns UNCLASSIFIED when no keyword matches — never forces a guess', () => {
    const result = detectCategoryFromText('a totally unrelated caption', [kw('ryzen', 'PRODUCT_SHOWCASE')])
    expect(result.label).toBe('UNCLASSIFIED')
    expect(result.score).toBe(0)
  })

  it('scores by keyword hit count, not first match', () => {
    const keywords = [kw('promo', 'PROMOTIONAL_OFFER'), kw('ryzen', 'PRODUCT_SHOWCASE')]
    // "promo" appears twice, "ryzen" once — PROMOTIONAL_OFFER should win despite
    // PRODUCT_SHOWCASE's higher tie-break priority, because its score is higher.
    const result = detectCategoryFromText('promo promo ryzen 5', keywords)
    expect(result.label).toBe('PROMOTIONAL_OFFER')
    expect(result.score).toBe(2)
    expect(result.tied).toBe(false)
  })

  it('breaks ties deterministically via CATEGORY_PRIORITY', () => {
    const keywords = [kw('build', 'PRODUCT_SHOWCASE'), kw('promo', 'PROMOTIONAL_OFFER')]
    const result = detectCategoryFromText('build and promo', keywords)
    expect(result.tied).toBe(true)
    expect(result.label).toBe('PRODUCT_SHOWCASE') // earlier in CATEGORY_PRIORITY
  })

  it('matches on word boundaries, not bare substrings', () => {
    // "sale" should not match inside "wholesaler"
    const result = detectCategoryFromText('wholesaler pricing', [kw('sale', 'PROMOTIONAL_OFFER')])
    expect(result.label).toBe('UNCLASSIFIED')
  })

  it('is case-insensitive', () => {
    const result = detectCategoryFromText('RYZEN 5 5600G build', [kw('ryzen', 'PRODUCT_SHOWCASE')])
    expect(result.label).toBe('PRODUCT_SHOWCASE')
  })

  it('NFKC-normalises stylised Unicode before matching', () => {
    // Mathematical-bold "RYZEN" — a real pattern found in 173/730 captions.
    const styled = '\u{1D411}\u{1D418}\u{1D419}\u{1D404}\u{1D40D}' // 𝐑𝐘𝐙𝐄𝐍
    const result = detectCategoryFromText(`${styled} 5 5600G`, [kw('ryzen', 'PRODUCT_SHOWCASE')])
    expect(result.label).toBe('PRODUCT_SHOWCASE')
  })

  it('matches multi-word phrases', () => {
    const result = detectCategoryFromText('comment down below your build!', [kw('comment down', 'ENTERTAINMENT')])
    expect(result.label).toBe('ENTERTAINMENT')
  })
})
