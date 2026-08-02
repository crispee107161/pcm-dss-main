import { describe, it, expect } from 'vitest'
import { parseIsoLocalAsManila } from './timezone'

describe('parseIsoLocalAsManila', () => {
  it('anchors a naive ISO-local string to +08:00 regardless of process timezone', () => {
    const d = parseIsoLocalAsManila('2025-09-01T21:13:00')
    expect(d.toISOString()).toBe('2025-09-01T13:13:00.000Z')
  })

  it('anchors a midnight timestamp to the correct UTC instant', () => {
    const d = parseIsoLocalAsManila('2025-09-20T00:00:00')
    expect(d.toISOString()).toBe('2025-09-19T16:00:00.000Z')
  })
})
