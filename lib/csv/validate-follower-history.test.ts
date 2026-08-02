import { describe, it, expect } from 'vitest'
import { validateFollowerHistoryRows } from './validate-follower-history'

describe('validateFollowerHistoryRows', () => {
  it('anchors "Month Day" (assumed 2025) to Asia/Manila midnight', () => {
    const [record] = validateFollowerHistoryRows([
      { Date: 'August 18', Followers: '100', 'Difference in followers from previous day': '2' },
    ])
    expect(record.date.toISOString()).toBe('2025-08-17T16:00:00.000Z')
  })

  it('throws on an unparseable date', () => {
    expect(() =>
      validateFollowerHistoryRows([{ Date: 'not a date', Followers: '100' }])
    ).toThrow()
  })
})
