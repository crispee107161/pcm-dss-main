import { describe, it, expect } from 'vitest'
import {
  interpretCpiDistribution, interpretFollowsRatio, interpretCategoryPerformance,
  interpretReachViewsTrend, interpretSpendMessagingCompare,
} from './interpretations'

describe('interpretCpiDistribution', () => {
  it('degrades gracefully with no ads', () => {
    expect(interpretCpiDistribution([], null, 'June 2026')).toContain('No advertisements ran')
  })

  it('degrades gracefully below the minimum for a distribution', () => {
    const result = interpretCpiDistribution([10, 20], { q1: 12, q3: 18, iqr: 6 }, 'June 2026')
    expect(result).toContain('Only 2 advertisements ran')
    expect(result).toContain('too few to describe a distribution')
  })

  it('singularises a single ad', () => {
    expect(interpretCpiDistribution([10], null, 'June 2026')).toContain('Only 1 advertisement ran')
  })

  it('states the IQR and the max/min ratio when both are meaningful', () => {
    const result = interpretCpiDistribution([10, 15, 20, 25, 100], { q1: 15, q3: 25, iqr: 10 }, 'June 2026')
    expect(result).toContain('Half cost between ₱15 and ₱25')
    expect(result).toContain('about 10 times the cheapest')
  })

  it('omits the ratio clause when it would round to about 1x', () => {
    const result = interpretCpiDistribution([19, 20, 21, 22], { q1: 19.75, q3: 21.25, iqr: 1.5 }, 'June 2026')
    expect(result).not.toContain('times the cheapest')
  })
})

describe('interpretFollowsRatio', () => {
  it('handles no data', () => {
    expect(interpretFollowsRatio([])).toContain('Not enough monthly data')
  })

  it('handles a single month', () => {
    const result = interpretFollowsRatio([{ period: 'Jun 2026', ratioPer100: 2.5 }])
    expect(result).toContain('about 2.5 follows per 100 visits')
    expect(result).toContain("can't be described yet")
  })

  it('describes a rising ratio and states the non-conversion caveat', () => {
    const result = interpretFollowsRatio([
      { period: 'May 2026', ratioPer100: 2.0 },
      { period: 'Jun 2026', ratioPer100: 4.0 },
    ])
    expect(result).toContain('risen from about 2.0')
    expect(result).toContain('to about 4.0')
    expect(result).toContain('not a conversion rate')
  })

  it('describes a steady ratio', () => {
    const result = interpretFollowsRatio([
      { period: 'May 2026', ratioPer100: 3.0 },
      { period: 'Jun 2026', ratioPer100: 3.01 },
    ])
    expect(result).toContain('held steady')
  })

  it('ignores null-ratio months (zero visits)', () => {
    const result = interpretFollowsRatio([
      { period: 'May 2026', ratioPer100: null },
      { period: 'Jun 2026', ratioPer100: 2.0 },
      { period: 'Jul 2026', ratioPer100: 4.0 },
    ])
    expect(result).toContain('risen from about 2.0')
  })
})

describe('interpretCategoryPerformance', () => {
  const LOW_CONFIDENCE_N = 3

  it('degrades gracefully with no posts', () => {
    const result = interpretCategoryPerformance(
      [{ label: 'Testimonial', medianEngagement: 0, n: 0 }],
      'June 2026', LOW_CONFIDENCE_N,
    )
    expect(result).toContain('No categorised posts')
  })

  it('does not contradict itself when the most-reliable category is also low-confidence', () => {
    // Every category is below the low-confidence threshold, so mostReliable
    // (max n) also satisfies "n < lowConfidenceN" — must not be named as
    // both "most reliable" and "shown dimmed" in the same sentence.
    const result = interpretCategoryPerformance(
      [
        { label: 'Testimonial', medianEngagement: 5, n: 1 },
        { label: 'Entertainment', medianEngagement: 3, n: 2 },
      ],
      'June 2026', LOW_CONFIDENCE_N,
    )
    expect(result).toContain('Entertainment is the most reliable comparison')
    expect(result).not.toContain('Entertainment rests on')
  })

  it('names a distinct low-confidence category when one exists outside top/most-reliable', () => {
    const result = interpretCategoryPerformance(
      [
        { label: 'Testimonial', medianEngagement: 9, n: 5 },
        { label: 'Product Showcase', medianEngagement: 4, n: 14 },
        { label: 'Entertainment', medianEngagement: 3, n: 2 },
      ],
      'June 2026', LOW_CONFIDENCE_N,
    )
    expect(result).toContain('Testimonial posts earned the highest rate')
    expect(result).toContain('Product Showcase is the most reliable comparison')
    expect(result).toContain('Entertainment rests on 2 posts and is shown dimmed')
  })

  it('collapses top and most-reliable into one clause when they are the same category', () => {
    const result = interpretCategoryPerformance(
      [{ label: 'Product Showcase', medianEngagement: 9, n: 14 }],
      'June 2026', LOW_CONFIDENCE_N,
    )
    expect(result).toContain('Product Showcase posts earned the highest rate and is also the most reliable comparison')
  })
})

describe('interpretReachViewsTrend', () => {
  it('degrades gracefully with fewer than 2 months', () => {
    expect(interpretReachViewsTrend([{ period: 'Jun 2026', total_reach: 100, total_views: 200 }]))
      .toContain('Not enough monthly data')
  })

  it('describes both rising together', () => {
    const result = interpretReachViewsTrend([
      { period: 'May 2026', total_reach: 100, total_views: 200 },
      { period: 'Jun 2026', total_reach: 300, total_views: 600 },
    ])
    expect(result).toContain('Both risen from May 2026 to Jun 2026')
  })

  it('does not throw when a month starts at zero reach', () => {
    const result = interpretReachViewsTrend([
      { period: 'May 2026', total_reach: 0, total_views: 0 },
      { period: 'Jun 2026', total_reach: 500, total_views: 800 },
    ])
    expect(result).not.toContain('Infinity')
  })

  it('describes divergent directions separately', () => {
    const result = interpretReachViewsTrend([
      { period: 'May 2026', total_reach: 100, total_views: 200 },
      { period: 'Jun 2026', total_reach: 300, total_views: 190 },
    ])
    expect(result).toContain('Reach has risen while views have fallen')
  })
})

describe('interpretSpendMessagingCompare', () => {
  it('degrades gracefully with fewer than 2 months', () => {
    const result = interpretSpendMessagingCompare(
      [{ period: 'Jun 2026', total_spend: 100, total_inquiries: 10, total_reach: 500 }],
      'Jun 2026', false,
    )
    expect(result.finding).toContain('Not enough monthly data')
    expect(result.reachExcludedNote).toBeNull()
  })

  it('never renders Infinity when the base month had zero conversations', () => {
    const rows = [
      { period: 'May 2026', total_spend: 1000, total_inquiries: 0, total_reach: 500 },
      { period: 'Jun 2026', total_spend: 1000, total_inquiries: 50, total_reach: 500 },
    ]
    const result = interpretSpendMessagingCompare(rows, 'May 2026', false)
    expect(result.finding).not.toContain('Infinity')
    expect(result.finding).toContain('conversations have risen from none')
  })

  it('does not crash or render Infinity when base reach is zero (no percentage to state, so no note)', () => {
    const rows = [
      { period: 'May 2026', total_spend: 1000, total_inquiries: 50, total_reach: 0 },
      { period: 'Jun 2026', total_spend: 1000, total_inquiries: 50, total_reach: 500 },
    ]
    const result = interpretSpendMessagingCompare(rows, 'May 2026', true)
    expect(result.reachExcludedNote).toBeNull()
  })

  it('anchors the finding to basePeriod, not rows[0], when they differ', () => {
    // buildIndexedData rebases to the first period where every series is
    // non-zero — here that is Jun, not rows[0] (May, which has 0 spend).
    const rows = [
      { period: 'May 2026', total_spend: 0, total_inquiries: 0, total_reach: 100 },
      { period: 'Jun 2026', total_spend: 1000, total_inquiries: 50, total_reach: 500 },
      { period: 'Jul 2026', total_spend: 1000, total_inquiries: 25, total_reach: 1000 },
    ]
    const result = interpretSpendMessagingCompare(rows, 'Jun 2026', false)
    // Should compare Jun -> Jul (conversations 50 -> 25, a 50% fall), not
    // May -> Jul (which would divide by zero spend/messaging).
    expect(result.finding).toContain('fallen about 50%')
    expect(result.finding).not.toContain('Infinity')
  })

  it('states which month conversations became more/less expensive relative to', () => {
    const rows = [
      { period: 'May 2026', total_spend: 1000, total_inquiries: 100, total_reach: 500 },
      { period: 'Jul 2026', total_spend: 1000, total_inquiries: 50, total_reach: 500 },
    ]
    const result = interpretSpendMessagingCompare(rows, 'May 2026', false)
    expect(result.finding).toContain('costing more than it did in May 2026')
  })

  it('excludes the reach note when reach did not grow much', () => {
    const rows = [
      { period: 'May 2026', total_spend: 1000, total_inquiries: 100, total_reach: 500 },
      { period: 'Jun 2026', total_spend: 1000, total_inquiries: 100, total_reach: 520 },
    ]
    const result = interpretSpendMessagingCompare(rows, 'May 2026', true)
    expect(result.reachExcludedNote).toBeNull()
  })
})
