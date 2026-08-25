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
    const { valid: [record] } = validatePostsRows([baseRow()])
    expect(record.publish_time.toISOString()).toBe('2025-09-01T13:13:00.000Z')
  })

  it('is deterministic — parsing the same string twice yields the same instant', () => {
    const { valid: [a] } = validatePostsRows([baseRow()])
    const { valid: [b] } = validatePostsRows([baseRow()])
    expect(a.publish_time.getTime()).toBe(b.publish_time.getTime())
  })

  it('computes engagement_rate as a percentage (0-100), not a ratio', () => {
    const { valid: [record] } = validatePostsRows([baseRow()])
    expect(record.engagement_rate).toBeCloseTo(8, 5)
  })

  it('parses a numeric Views value', () => {
    const { valid: [record] } = validatePostsRows([baseRow({ Views: '50' })])
    expect(record.views).toBe(50)
  })

  it('parses a blank Views cell as null, not 0 — FR-19/ALG-07 must exclude it explicitly', () => {
    const { valid: [record] } = validatePostsRows([baseRow({ Views: '' })])
    expect(record.views).toBeNull()
  })

  // FR-04/FR-07: a row that fails validation must be reported, not discard
  // the rest of the file — docs/raven/Three_Decisions_and_FR_Table_Writable.md §1.
  it('rejects a single malformed row without discarding the rest of the file', () => {
    const rows = [
      baseRow({ 'Post ID': 'good-1' }),
      baseRow({ 'Post ID': '' }), // missing required field
      baseRow({ 'Post ID': 'good-2' }),
    ]
    const { valid, rejected } = validatePostsRows(rows)

    expect(valid).toHaveLength(2)
    expect(valid.map(r => r.post_id)).toEqual(['good-1', 'good-2'])
    expect(rejected).toHaveLength(1)
    expect(rejected[0].row).toBe(2)
    expect(rejected[0].reason).toMatch(/Post ID/)
  })
})
