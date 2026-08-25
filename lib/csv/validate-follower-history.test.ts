import { describe, it, expect } from 'vitest'
import { validateFollowerHistoryRows } from './validate-follower-history'

describe('validateFollowerHistoryRows', () => {
  it('anchors "Month Day" (assumed 2025) to Asia/Manila midnight', () => {
    const { valid: [record] } = validateFollowerHistoryRows([
      { Date: 'August 18', Followers: '100', 'Difference in followers from previous day': '2' },
    ])
    expect(record.date.toISOString()).toBe('2025-08-17T16:00:00.000Z')
  })

  // FR-04/FR-07: an unparseable row is rejected individually, the rest of
  // the file is still processed — docs/raven/Four_Remaining_Gaps_Please_Confirm.md §3.
  it('rejects an unparseable date without discarding the rest of the file', () => {
    const { valid, rejected } = validateFollowerHistoryRows([
      { Date: 'not a date', Followers: '100' },
      { Date: 'August 18', Followers: '100', 'Difference in followers from previous day': '2' },
    ])
    expect(valid).toHaveLength(1)
    expect(rejected).toEqual([{ row: 1, reason: expect.stringMatching(/Could not parse/) }])
  })
})
