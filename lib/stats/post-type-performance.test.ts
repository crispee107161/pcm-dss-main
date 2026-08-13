import { describe, it, expect } from 'vitest'
import { computePostTypePerformance, type PostForTypePerformance } from './post-type-performance'

function post(overrides: Partial<PostForTypePerformance> & { post_type: string }): PostForTypePerformance {
  return { reach: 0, engagement_rate: 0, views: 0, ...overrides }
}

describe('computePostTypePerformance', () => {
  it('groups by post type and computes the median of each metric', () => {
    const posts = [
      post({ post_type: 'Photo', reach: 100, engagement_rate: 1, views: 200 }),
      post({ post_type: 'Photo', reach: 300, engagement_rate: 3, views: 400 }),
      post({ post_type: 'Photo', reach: 200, engagement_rate: 2, views: 300 }),
    ]
    const rows = computePostTypePerformance(posts)
    expect(rows).toEqual([
      { postType: 'Photo', n: 3, medianReach: 200, medianEngagementRate: 2, medianViews: 300 },
    ])
  })

  it('sorts rows by n descending, so the dominant formats lead the table', () => {
    const posts = [
      post({ post_type: 'Reel' }),
      post({ post_type: 'Photo' }),
      post({ post_type: 'Photo' }),
      post({ post_type: 'Photo' }),
      post({ post_type: 'Video' }),
      post({ post_type: 'Video' }),
    ]
    const rows = computePostTypePerformance(posts)
    expect(rows.map(r => r.postType)).toEqual(['Photo', 'Video', 'Reel'])
  })

  it('keeps a single-post type as its own low-n row rather than dropping it', () => {
    const posts = [
      post({ post_type: 'Photo' }),
      post({ post_type: 'Link', reach: 430, engagement_rate: 1.16, views: 769 }),
    ]
    const rows = computePostTypePerformance(posts)
    const linkRow = rows.find(r => r.postType === 'Link')
    expect(linkRow).toEqual({ postType: 'Link', n: 1, medianReach: 430, medianEngagementRate: 1.16, medianViews: 769 })
  })

  it('returns an empty array for no posts', () => {
    expect(computePostTypePerformance([])).toEqual([])
  })
})
