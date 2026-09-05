import { describe, it, expect } from 'vitest'
import { scoreGroundTruthPosts } from './method-evaluation'
import type { CategoryLabel, CategoryFinalSource } from '@/app/generated/prisma/client'

function post(source: CategoryFinalSource, overrides: Partial<{
  category_keyword: CategoryLabel | null
  category_llm: CategoryLabel | null
  category_final: CategoryLabel | null
}> = {}) {
  return {
    category_keyword: 'PRODUCT_SHOWCASE' as CategoryLabel,
    category_llm: 'PRODUCT_SHOWCASE' as CategoryLabel,
    category_final: 'PRODUCT_SHOWCASE' as CategoryLabel,
    category_final_source: source,
    ...overrides,
  }
}

describe('scoreGroundTruthPosts', () => {
  it('scores only the rows it is given, with no hidden filtering', () => {
    const referenceRows = [post('MANUAL_GROUND_TRUTH'), post('MANUAL_GROUND_TRUTH')]
    const backlogRows = [post('MANUAL_CODEBOOK_ASSIGNMENT')]

    const referenceOnly = scoreGroundTruthPosts(referenceRows)
    const combined = scoreGroundTruthPosts([...referenceRows, ...backlogRows])

    // Docs/raven/Backlog_Coding_Complete_v2.md §3 — the reference-only figure
    // must never include backlog rows, and the combined figure must include
    // every row exactly once (no double-count, no drop).
    expect(referenceOnly.n).toBe(2)
    expect(combined.n).toBe(3)
  })

  it('produces different kappa for referenceOnly vs combined when the backlog rows disagree differently', () => {
    const referenceRows = [
      post('MANUAL_GROUND_TRUTH', { category_keyword: 'PRODUCT_SHOWCASE', category_final: 'PRODUCT_SHOWCASE' }),
      post('MANUAL_GROUND_TRUTH', { category_keyword: 'TESTIMONIAL', category_final: 'PRODUCT_SHOWCASE' }),
    ]
    const backlogRows = [
      post('MANUAL_CODEBOOK_ASSIGNMENT', { category_keyword: 'ENTERTAINMENT', category_final: 'ENTERTAINMENT' }),
      post('MANUAL_CODEBOOK_ASSIGNMENT', { category_keyword: 'ENTERTAINMENT', category_final: 'ENTERTAINMENT' }),
    ]

    const referenceOnly = scoreGroundTruthPosts(referenceRows)
    const combined = scoreGroundTruthPosts([...referenceRows, ...backlogRows])

    expect(referenceOnly.keywordAgreement.n).toBe(2)
    expect(combined.keywordAgreement.n).toBe(4)
    expect(combined.keywordAgreement.percentAgreement).not.toBe(referenceOnly.keywordAgreement.percentAgreement)
  })

  it('returns a zeroed result when given no rows', () => {
    const result = scoreGroundTruthPosts([])
    expect(result.n).toBe(0)
    expect(result.keywordAgreement.n).toBe(0)
    expect(result.llmAgreement.n).toBe(0)
  })
})
