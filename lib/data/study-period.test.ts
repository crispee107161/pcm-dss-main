import { describe, it, expect } from 'vitest'
import { STUDY_PERIOD_START, STUDY_PERIOD_END, isInStudyPeriod, STUDY_PERIOD_POST_WHERE, withStudyPeriod } from './study-period'

describe('study period boundaries', () => {
  // docs/raven/Study_Period_Scope_Response_2026-08-25.md §0 — publish_time is
  // stored UTC after being anchored to Manila local at ingestion, so the
  // declared boundary must resolve to Manila midnight, not UTC midnight. A
  // naive UTC boundary here would reproduce the exact bug the audit caught.
  it('resolves the start boundary to Aug 1 2025 00:00 Manila (Jul 31 16:00 UTC)', () => {
    expect(STUDY_PERIOD_START.toISOString()).toBe('2025-07-31T16:00:00.000Z')
  })

  it('resolves the end boundary to Jul 31 2026 23:59:59 Manila (Jul 31 15:59:59 UTC)', () => {
    expect(STUDY_PERIOD_END.toISOString()).toBe('2026-07-31T15:59:59.000Z')
  })
})

describe('isInStudyPeriod', () => {
  it('accepts a post published inside the declared window', () => {
    expect(isInStudyPeriod(new Date('2025-12-01T00:00:00Z'))).toBe(true)
  })

  it('rejects a post published before the window', () => {
    expect(isInStudyPeriod(new Date('2025-07-01T00:00:00Z'))).toBe(false)
  })

  it('rejects a post published after the window', () => {
    expect(isInStudyPeriod(new Date('2026-08-15T00:00:00Z'))).toBe(false)
  })

  // The two boundary posts from Study_Period_Scope_Response_2026-08-25.md §0-1
  // — both correctly in-period once anchored to Manila local time.
  it('accepts the ground-truth boundary post (18:25 UTC Jul 31 = 02:25 Aug 1 Manila)', () => {
    expect(isInStudyPeriod(new Date('2025-07-31T18:25:00Z'))).toBe(true)
  })

  it('accepts the legacy-import boundary post (19:57 UTC Jul 31 = 03:57 Aug 1 Manila)', () => {
    expect(isInStudyPeriod(new Date('2025-07-31T19:57:00Z'))).toBe(true)
  })
})

describe('withStudyPeriod', () => {
  it('returns the bare study-period filter when no existing where is passed', () => {
    expect(withStudyPeriod()).toEqual(STUDY_PERIOD_POST_WHERE)
  })

  it('ANDs an existing where-clause with the study-period filter rather than replacing it', () => {
    const existing = { category_final: null }
    expect(withStudyPeriod(existing)).toEqual({ AND: [existing, STUDY_PERIOD_POST_WHERE] })
  })
})
