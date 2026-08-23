import { describe, it, expect } from 'vitest'
import { parseContentFilter } from './content-filter'

describe('parseContentFilter', () => {
  it('passes through each recognised value', () => {
    expect(parseContentFilter('all')).toBe('all')
    expect(parseContentFilter('categorised')).toBe('categorised')
    expect(parseContentFilter('unassigned')).toBe('unassigned')
    expect(parseContentFilter('needs-review')).toBe('needs-review')
  })

  it('falls back to needs-review for an unrecognised value', () => {
    expect(parseContentFilter('bogus')).toBe('needs-review')
  })

  it('falls back to needs-review when absent', () => {
    expect(parseContentFilter(undefined)).toBe('needs-review')
  })
})
