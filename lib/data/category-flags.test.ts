import { describe, it, expect } from 'vitest'
import { isUnflaggedAgreed } from './category-flags'
import type { CategoryFlagReason, CategoryLabel } from '@/app/generated/prisma/client'

function post(overrides: Partial<{
  category_flag_reasons: CategoryFlagReason[]
  category_keyword: CategoryLabel | null
  category_llm: CategoryLabel | null
}> = {}) {
  return {
    category_flag_reasons: [],
    category_keyword: 'PRODUCT_SHOWCASE' as CategoryLabel,
    category_llm: 'PRODUCT_SHOWCASE' as CategoryLabel,
    ...overrides,
  }
}

describe('isUnflaggedAgreed', () => {
  it('is true when both methods agree on an assignable label with no flags', () => {
    expect(isUnflaggedAgreed(post())).toBe(true)
  })

  it('is false when the post has any flag reason', () => {
    expect(isUnflaggedAgreed(post({ category_flag_reasons: ['SHORT_CAPTION'] }))).toBe(false)
  })

  it('is false when the two methods disagree', () => {
    expect(isUnflaggedAgreed(post({ category_llm: 'TESTIMONIAL' }))).toBe(false)
  })

  it('is false when either method has not run yet', () => {
    expect(isUnflaggedAgreed(post({ category_keyword: null }))).toBe(false)
  })

  it('is false for UNCLASSIFIED agreement — not an assignable label', () => {
    expect(isUnflaggedAgreed(post({ category_keyword: 'UNCLASSIFIED', category_llm: 'UNCLASSIFIED' }))).toBe(false)
  })

  it('is false for UNCLEAR agreement — ground-truth-only label, never assignable', () => {
    expect(isUnflaggedAgreed(post({ category_keyword: 'UNCLEAR', category_llm: 'UNCLEAR' }))).toBe(false)
  })
})
