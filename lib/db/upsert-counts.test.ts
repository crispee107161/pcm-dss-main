import { describe, it, expect } from 'vitest'
import { emptyCounts, isUnchanged } from './upsert-counts'

describe('emptyCounts', () => {
  it('starts all three buckets at zero', () => {
    expect(emptyCounts()).toEqual({ inserted: 0, updated: 0, unchanged: 0 })
  })
})

describe('isUnchanged', () => {
  it('returns true when every field in next matches existing', () => {
    const existing = { reach: 100, impressions: 500 }
    const next = { reach: 100, impressions: 500 }
    expect(isUnchanged(existing, next)).toBe(true)
  })

  it('returns false when one scalar field differs', () => {
    const existing = { reach: 100, impressions: 500 }
    const next = { reach: 100, impressions: 501 }
    expect(isUnchanged(existing, next)).toBe(false)
  })

  it('treats null-to-value as a change (page-metric column fill case)', () => {
    const existing = { follows: null, interactions: 42 }
    const next = { follows: 10 }
    expect(isUnchanged(existing, next)).toBe(false)
  })

  it('treats null and undefined as equal, so an absent-optional validator field cannot misfire', () => {
    const existing = { link_clicks: null }
    const next = { link_clicks: undefined }
    expect(isUnchanged(existing, next)).toBe(true)
  })

  it('treats equal Date instances as unchanged even when they are different objects', () => {
    const existing = { reporting_ends: new Date('2026-01-01T00:00:00Z') }
    const next = { reporting_ends: new Date('2026-01-01T00:00:00Z') }
    expect(isUnchanged(existing, next)).toBe(true)
  })

  it('detects a changed Date value', () => {
    const existing = { reporting_ends: new Date('2026-01-01T00:00:00Z') }
    const next = { reporting_ends: new Date('2026-01-02T00:00:00Z') }
    expect(isUnchanged(existing, next)).toBe(false)
  })

  it('ignores keys present on existing but absent from next', () => {
    const existing = { id: 1, created_at: new Date(), reach: 100 }
    const next = { reach: 100 }
    expect(isUnchanged(existing, next)).toBe(true)
  })
})
