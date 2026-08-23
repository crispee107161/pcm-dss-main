import { describe, it, expect } from 'vitest'
import {
  ASSIGNABLE_LABELS,
  SELECTABLE_LABELS,
  selectableLabelText,
  suggestedCandidates,
  agreedSuggestion,
  isBatchConfirmEligible,
  type SuggestibleCategoryPost,
} from './category-picker'
import type { CategoryFlagReason, CategoryLabel } from '@/app/generated/prisma/client'

function post(overrides: Partial<SuggestibleCategoryPost> = {}): SuggestibleCategoryPost {
  return {
    keywordSuggestion: 'PRODUCT_SHOWCASE',
    llmSuggestion: 'PRODUCT_SHOWCASE',
    flagReasons: [],
    ...overrides,
  }
}

describe('ASSIGNABLE_LABELS vs SELECTABLE_LABELS', () => {
  it('SELECTABLE_LABELS is ASSIGNABLE_LABELS plus UNCLASSIFIED, listed last', () => {
    expect(SELECTABLE_LABELS).toEqual([...ASSIGNABLE_LABELS, 'UNCLASSIFIED'])
  })

  it('ASSIGNABLE_LABELS never contains UNCLASSIFIED — suggestion/batch-confirm logic depends on this', () => {
    expect(ASSIGNABLE_LABELS).not.toContain('UNCLASSIFIED')
  })
})

describe('selectableLabelText', () => {
  it('renders UNCLASSIFIED as "Unassigned"', () => {
    expect(selectableLabelText('UNCLASSIFIED')).toBe('Unassigned')
  })

  it('renders every other label via CATEGORY_LABEL_DISPLAY', () => {
    expect(selectableLabelText('PRODUCT_SHOWCASE')).toBe('Product Showcase')
  })
})

describe('suggestedCandidates', () => {
  it('collapses agreement to one candidate', () => {
    expect(suggestedCandidates(post())).toEqual(['PRODUCT_SHOWCASE'])
  })

  it('lists both candidates, alphabetically, on disagreement', () => {
    const result = suggestedCandidates(post({ keywordSuggestion: 'TESTIMONIAL', llmSuggestion: 'PRODUCT_SHOWCASE' }))
    expect(result).toEqual(['PRODUCT_SHOWCASE', 'TESTIMONIAL'])
  })

  it('never includes UNCLASSIFIED as a candidate, even when both methods abstain', () => {
    expect(suggestedCandidates(post({ keywordSuggestion: 'UNCLASSIFIED', llmSuggestion: 'UNCLASSIFIED' }))).toEqual([])
  })

  it('drops an abstaining method rather than surfacing UNCLASSIFIED as a candidate', () => {
    expect(suggestedCandidates(post({ keywordSuggestion: 'UNCLASSIFIED', llmSuggestion: 'ENTERTAINMENT' }))).toEqual(['ENTERTAINMENT'])
  })
})

describe('agreedSuggestion', () => {
  it('is the shared label when both methods agree on an assignable label', () => {
    expect(agreedSuggestion(post())).toBe('PRODUCT_SHOWCASE')
  })

  it('is undefined on disagreement', () => {
    expect(agreedSuggestion(post({ llmSuggestion: 'TESTIMONIAL' }))).toBeUndefined()
  })

  it('is undefined when both methods "agree" by both abstaining (UNCLASSIFIED)', () => {
    expect(agreedSuggestion(post({ keywordSuggestion: 'UNCLASSIFIED', llmSuggestion: 'UNCLASSIFIED' }))).toBeUndefined()
  })
})

describe('isBatchConfirmEligible', () => {
  it('is true for an unflagged, agreed, assignable post', () => {
    expect(isBatchConfirmEligible(post())).toBe(true)
  })

  it('is false when flagged', () => {
    expect(isBatchConfirmEligible(post({ flagReasons: ['SHORT_CAPTION' as CategoryFlagReason] }))).toBe(false)
  })

  it('is false on disagreement', () => {
    expect(isBatchConfirmEligible(post({ llmSuggestion: 'TESTIMONIAL' as CategoryLabel }))).toBe(false)
  })
})
