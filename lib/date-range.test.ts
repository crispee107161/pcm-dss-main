import { describe, it, expect } from 'vitest'
import { manilaDayRange } from './date-range'

describe('manilaDayRange', () => {
  it('returns null when neither from nor to is given (all time)', () => {
    expect(manilaDayRange(undefined, undefined)).toBeNull()
  })

  it('anchors the from boundary to the start of the Manila day', () => {
    const range = manilaDayRange('2025-09-20', undefined)
    expect(range?.gte?.toISOString()).toBe('2025-09-19T16:00:00.000Z')
    expect(range?.lte).toBeUndefined()
  })

  it('anchors the to boundary to the end of the Manila day', () => {
    const range = manilaDayRange(undefined, '2025-09-20')
    expect(range?.lte?.toISOString()).toBe('2025-09-20T15:59:59.999Z')
    expect(range?.gte).toBeUndefined()
  })

  it('anchors both boundaries when from and to are both given', () => {
    const range = manilaDayRange('2025-09-01', '2025-09-20')
    expect(range?.gte?.toISOString()).toBe('2025-08-31T16:00:00.000Z')
    expect(range?.lte?.toISOString()).toBe('2025-09-20T15:59:59.999Z')
  })

  it('treats a malformed from as absent instead of producing an Invalid Date', () => {
    const range = manilaDayRange('garbage', '2025-09-20')
    expect(range?.gte).toBeUndefined()
    expect(range?.lte?.toISOString()).toBe('2025-09-20T15:59:59.999Z')
  })

  it('returns null when both from and to are malformed', () => {
    expect(manilaDayRange('not-a-date', 'also-not-a-date')).toBeNull()
  })

  it('rejects a syntactically-shaped but calendar-invalid date', () => {
    expect(manilaDayRange('2025-13-40', undefined)).toBeNull()
  })
})
