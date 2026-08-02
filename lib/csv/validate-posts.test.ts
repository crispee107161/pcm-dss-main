import { describe, it, expect } from 'vitest'
import { validatePostsRows } from './validate-posts'

function baseRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    'Post ID': '123',
    'Publish time': '09/01/2025 21:13',
    'Post type': 'Photo',
    Permalink: 'https://facebook.com/x',
    Reach: '100',
    Reactions: '5',
    Comments: '2',
    Shares: '1',
    Views: '50',
    ...overrides,
  }
}

describe('validatePostsRows', () => {
  it('parses Publish time as Asia/Manila regardless of process timezone', () => {
    const [record] = validatePostsRows([baseRow()])
    expect(record.publish_time.toISOString()).toBe('2025-09-01T13:13:00.000Z')
  })

  it('is deterministic — parsing the same string twice yields the same instant', () => {
    const [a] = validatePostsRows([baseRow()])
    const [b] = validatePostsRows([baseRow()])
    expect(a.publish_time.getTime()).toBe(b.publish_time.getTime())
  })

  it('computes engagement_rate as a percentage (0-100), not a ratio', () => {
    const [record] = validatePostsRows([baseRow()])
    expect(record.engagement_rate).toBeCloseTo(8, 5)
  })
})
