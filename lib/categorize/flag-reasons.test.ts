import { describe, it, expect } from 'vitest'
import { computeFlagReasons, captionWordCount, rankFlagReasons, type FlagReasonInput } from './flag-reasons'

function input(overrides: Partial<FlagReasonInput> = {}): FlagReasonInput {
  return {
    categoryKeyword: 'PRODUCT_SHOWCASE',
    categoryLlm: 'PRODUCT_SHOWCASE',
    caption: 'This is a perfectly ordinary caption with more than eight words in it.',
    ...overrides,
  }
}

describe('captionWordCount', () => {
  it('counts whitespace-separated words', () => {
    expect(captionWordCount('one two three')).toBe(3)
  })

  it('returns 0 for null, empty, or whitespace-only captions', () => {
    expect(captionWordCount(null)).toBe(0)
    expect(captionWordCount('')).toBe(0)
    expect(captionWordCount('   ')).toBe(0)
  })

  it('normalises fullwidth characters before splitting, matching what the classifiers see', () => {
    // U+FF21 FULLWIDTH LATIN CAPITAL LETTER A, NFKC-normalises to ASCII "A".
    expect(captionWordCount('Ａ build for sale')).toBe(4)
  })
})

describe('computeFlagReasons', () => {
  it('returns no reasons when both methods agree on a non-entertainment category with a long caption', () => {
    const reasons = computeFlagReasons(input())
    expect(reasons).toEqual([])
  })

  it('flags DISAGREEMENT when the two methods return different assignable labels', () => {
    const reasons = computeFlagReasons(input({ categoryKeyword: 'PRODUCT_SHOWCASE', categoryLlm: 'TESTIMONIAL' }))
    expect(reasons).toContain('DISAGREEMENT')
  })

  it('does not flag DISAGREEMENT when one method has not run yet (null)', () => {
    const reasons = computeFlagReasons(input({ categoryKeyword: 'PRODUCT_SHOWCASE', categoryLlm: null }))
    expect(reasons).not.toContain('DISAGREEMENT')
  })

  it('flags UNCLASSIFIED when either method returns UNCLASSIFIED', () => {
    const keywordUnclassified = computeFlagReasons(input({ categoryKeyword: 'UNCLASSIFIED', categoryLlm: 'TESTIMONIAL' }))
    const llmUnclassified = computeFlagReasons(input({ categoryKeyword: 'TESTIMONIAL', categoryLlm: 'UNCLASSIFIED' }))
    expect(keywordUnclassified).toContain('UNCLASSIFIED')
    expect(llmUnclassified).toContain('UNCLASSIFIED')
  })

  it('flags ENTERTAINMENT_SUGGESTED unconditionally when either method suggests it', () => {
    const fromKeyword = computeFlagReasons(input({ categoryKeyword: 'ENTERTAINMENT', categoryLlm: 'TESTIMONIAL' }))
    const fromLlm = computeFlagReasons(input({ categoryKeyword: 'TESTIMONIAL', categoryLlm: 'ENTERTAINMENT' }))
    expect(fromKeyword).toContain('ENTERTAINMENT_SUGGESTED')
    expect(fromLlm).toContain('ENTERTAINMENT_SUGGESTED')
  })

  it('flags SHORT_CAPTION for captions under 8 words', () => {
    const reasons = computeFlagReasons(input({ caption: 'one two three four five six seven' }))
    expect(reasons).toContain('SHORT_CAPTION')
  })

  it('does not flag SHORT_CAPTION at exactly 8 words', () => {
    const reasons = computeFlagReasons(input({ caption: 'one two three four five six seven eight' }))
    expect(reasons).not.toContain('SHORT_CAPTION')
  })

  it('flags SHORT_CAPTION for a null caption', () => {
    const reasons = computeFlagReasons(input({ caption: null }))
    expect(reasons).toContain('SHORT_CAPTION')
  })

  it('can report multiple conditions at once', () => {
    const reasons = computeFlagReasons(
      input({ categoryKeyword: 'TESTIMONIAL', categoryLlm: 'ENTERTAINMENT', caption: 'short' })
    )
    expect(reasons).toEqual(
      expect.arrayContaining(['DISAGREEMENT', 'ENTERTAINMENT_SUGGESTED', 'SHORT_CAPTION'])
    )
    expect(reasons).toHaveLength(3)
  })

  it('does not flag DISAGREEMENT when one method returns UNCLASSIFIED and the other a real category', () => {
    const keywordUnclassified = computeFlagReasons(input({ categoryKeyword: 'UNCLASSIFIED', categoryLlm: 'ENTERTAINMENT' }))
    const llmUnclassified = computeFlagReasons(input({ categoryKeyword: 'ENTERTAINMENT', categoryLlm: 'UNCLASSIFIED' }))
    expect(keywordUnclassified).not.toContain('DISAGREEMENT')
    expect(llmUnclassified).not.toContain('DISAGREEMENT')
  })

  it('does not flag DISAGREEMENT when both methods return UNCLASSIFIED', () => {
    const reasons = computeFlagReasons(input({ categoryKeyword: 'UNCLASSIFIED', categoryLlm: 'UNCLASSIFIED' }))
    expect(reasons).not.toContain('DISAGREEMENT')
  })
})

describe('rankFlagReasons', () => {
  it('orders disagreement before entertainment before unclassified before short caption', () => {
    const ranked = rankFlagReasons(['SHORT_CAPTION', 'UNCLASSIFIED', 'ENTERTAINMENT_SUGGESTED', 'DISAGREEMENT'])
    expect(ranked).toEqual(['DISAGREEMENT', 'ENTERTAINMENT_SUGGESTED', 'UNCLASSIFIED', 'SHORT_CAPTION'])
  })

  it('returns a single reason unchanged', () => {
    expect(rankFlagReasons(['SHORT_CAPTION'])).toEqual(['SHORT_CAPTION'])
  })

  it('returns an empty array unchanged', () => {
    expect(rankFlagReasons([])).toEqual([])
  })

  it('does not mutate the input array', () => {
    const input: Parameters<typeof rankFlagReasons>[0] = ['SHORT_CAPTION', 'DISAGREEMENT']
    rankFlagReasons(input)
    expect(input).toEqual(['SHORT_CAPTION', 'DISAGREEMENT'])
  })
})
