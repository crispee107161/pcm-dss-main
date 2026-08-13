import { describe, it, expect } from 'vitest'
import { manilaDayRange, addDaysToIsoDate, diffDaysInclusive, priorEqualWindow } from './date-range'

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

describe('addDaysToIsoDate', () => {
  it('adds days within a month', () => {
    expect(addDaysToIsoDate('2025-09-10', 5)).toBe('2025-09-15')
  })

  it('subtracts days across a month boundary', () => {
    expect(addDaysToIsoDate('2025-09-01', -1)).toBe('2025-08-31')
  })

  it('crosses a year boundary', () => {
    expect(addDaysToIsoDate('2025-12-31', 1)).toBe('2026-01-01')
  })
})

describe('priorEqualWindow', () => {
  it('returns the equal-length window immediately before the given range', () => {
    expect(priorEqualWindow('2025-09-10', '2025-09-19')).toEqual({
      from: '2025-08-31',
      to: '2025-09-09',
    })
  })

  it('matches the window length of the original range', () => {
    const { from, to } = priorEqualWindow('2025-09-01', '2025-09-20')
    expect(diffDaysInclusive(from, to)).toBe(diffDaysInclusive('2025-09-01', '2025-09-20'))
  })

  it('handles a single-day range', () => {
    expect(priorEqualWindow('2025-09-10', '2025-09-10')).toEqual({
      from: '2025-09-09',
      to: '2025-09-09',
    })
  })

  it('crosses a month boundary for the prior window', () => {
    expect(priorEqualWindow('2025-10-01', '2025-10-05')).toEqual({
      from: '2025-09-26',
      to: '2025-09-30',
    })
  })
})
