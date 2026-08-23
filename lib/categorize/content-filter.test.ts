import { describe, it, expect } from 'vitest'
import { parseContentFilter, whereForFilter, EXCLUDE_GROUND_TRUTH } from './content-filter'

describe('parseContentFilter', () => {
  it('passes through each recognised value', () => {
    expect(parseContentFilter('all')).toBe('all')
    expect(parseContentFilter('unassigned')).toBe('unassigned')
    expect(parseContentFilter('needs-review')).toBe('needs-review')
  })

  it('falls back to needs-review for an unrecognised value', () => {
    expect(parseContentFilter('bogus')).toBe('needs-review')
  })

  // docs/raven/Content_Filters_Review.md §7 — 'categorised' was dropped
  // 2026-08-23; a stale bookmark/link carrying the old value must not show
  // every post unfiltered, so it falls back like any other unrecognised
  // value rather than being special-cased.
  it('falls back to needs-review for the removed categorised value', () => {
    expect(parseContentFilter('categorised')).toBe('needs-review')
  })

  it('falls back to needs-review when absent', () => {
    expect(parseContentFilter(undefined)).toBe('needs-review')
  })
})

describe('whereForFilter', () => {
  it('needs-review requires no final category and excludes ground truth', () => {
    expect(whereForFilter('needs-review')).toEqual({
      category_final: null,
      OR: [{ category_final_source: null }, { category_final_source: { not: 'MANUAL_GROUND_TRUTH' } }],
    })
  })

  it('unassigned requires UNCLASSIFIED and excludes ground truth', () => {
    expect(whereForFilter('unassigned')).toEqual({
      category_final: 'UNCLASSIFIED',
      OR: [{ category_final_source: null }, { category_final_source: { not: 'MANUAL_GROUND_TRUTH' } }],
    })
  })

  it('all applies no predicate beyond excluding ground truth', () => {
    expect(whereForFilter('all')).toEqual({
      OR: [{ category_final_source: null }, { category_final_source: { not: 'MANUAL_GROUND_TRUTH' } }],
    })
  })
})

// Code review (2026-08-23) caught that Prisma's `{ not: 'X' }` on a nullable
// column does not match NULL rows — a version of EXCLUDE_GROUND_TRUTH without
// the explicit `OR: [{ field: null }, ...]` branch silently emptied the
// entire needs-review queue in production (every unreviewed post has a NULL
// category_final_source) despite passing the toEqual assertions above, since
// those only check the where-clause's *shape*, not its SQL semantics. This
// simulates Prisma's actual NULL-matching behaviour for the specific shapes
// this module produces, so a regression back to a bare `not` fails a test
// instead of only failing in a live browser.
function matchesGroundTruthExclusion(source: string | null): boolean {
  return EXCLUDE_GROUND_TRUTH.OR.some((clause) => {
    if ('category_final_source' in clause && clause.category_final_source === null) return source === null
    const notClause = clause.category_final_source as { not: string } | undefined
    return notClause !== undefined && source !== notClause.not && source !== null
  })
}

describe('EXCLUDE_GROUND_TRUTH NULL semantics', () => {
  it('matches a post with no category_final_source yet (unreviewed)', () => {
    expect(matchesGroundTruthExclusion(null)).toBe(true)
  })

  it('matches a post finalised through the normal workflow', () => {
    expect(matchesGroundTruthExclusion('MANUAL_OVERRIDE')).toBe(true)
    expect(matchesGroundTruthExclusion('LEGACY_IMPORT')).toBe(true)
  })

  it('excludes a ground-truth benchmark post', () => {
    expect(matchesGroundTruthExclusion('MANUAL_GROUND_TRUTH')).toBe(false)
  })
})
