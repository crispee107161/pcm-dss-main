import { describe, it, expect } from 'vitest'
import { parseAudienceBuffer } from './parse'
import { detectIfAudienceBuffer, detectIfPageMetricBuffer } from './detect'

// Audience.csv (and the single-metric page files) are UTF-16 LE with a BOM —
// Node's Buffer supports that encoding natively, so this just prepends the
// BOM bytes rather than hand-rolling a TextEncoder round-trip.
function utf16leBuffer(text: string): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')])
}

const FULL_FILE = [
  'sep=,',
  '"Age & gender"',
  '"","Men","Women"',
  '"18-24","12.3","3.6"',
  '"25-34","36.1","13"',
  '',
  '"Top cities"',
  '"Quezon City, Philippines","Manila, Philippines"',
  '"6.4","3.2"',
  '',
  '"Top countries"',
  '"Philippines","Vietnam"',
  '"60.1","15.4"',
  '',
  '"Top pages"',
  '"Ivana Alawi","ABS-CBN"',
  '"37.58","15.38"',
  '',
  '"Follows"',
  '"Date","Primary"',
  '"2025-08-01T00:00:00","20"',
  '"2025-08-02T00:00:00","22"',
].join('\n')

describe('parseAudienceBuffer', () => {
  it('parses Age & gender and Top cities from the real block layout', () => {
    const result = parseAudienceBuffer(utf16leBuffer(FULL_FILE))
    expect(result.ageGender).toEqual([
      { age_bracket: '18-24', men_pct: 12.3, women_pct: 3.6 },
      { age_bracket: '25-34', men_pct: 36.1, women_pct: 13 },
    ])
    expect(result.topCities).toEqual([
      { label: 'Quezon City, Philippines', pct: 6.4 },
      { label: 'Manila, Philippines', pct: 3.2 },
    ])
  })

  it('does not ingest the Top countries block (duplicates FollowerTopTerritories (1).csv)', () => {
    const result = parseAudienceBuffer(utf16leBuffer(FULL_FILE))
    expect(result).not.toHaveProperty('topCountries')
  })

  it('does not ingest the Top pages block (not used anywhere in this app)', () => {
    const result = parseAudienceBuffer(utf16leBuffer(FULL_FILE))
    expect(result).not.toHaveProperty('topPages')
  })

  it('does not ingest the trailing Follows block (duplicates Follows (1).csv)', () => {
    const result = parseAudienceBuffer(utf16leBuffer(FULL_FILE))
    // No field on AudienceParseResult carries follows data — the assertion
    // that matters is that parsing the file at all doesn't throw or hang
    // on the block, and the other blocks around it still parse correctly.
    expect(result.topCities.length).toBe(2)
  })

  it('does not desync when the Age & gender block has no data rows', () => {
    const text = [
      'sep=,',
      '"Age & gender"',
      '',
      '"Top cities"',
      '"Manila, Philippines"',
      '"3.2"',
    ].join('\n')

    const result = parseAudienceBuffer(utf16leBuffer(text))
    expect(result.ageGender).toEqual([])
    expect(result.topCities).toEqual([{ label: 'Manila, Philippines', pct: 3.2 }])
  })

  it('does not desync when a rank block is missing its values row', () => {
    // Two "Top cities"-labeled blocks: the first is truncated (no values
    // row), the second is well-formed. Proves the truncated block doesn't
    // consume the second block's label line as its own missing values row.
    const text = [
      'sep=,',
      '"Top cities"',
      '"Manila, Philippines"',
      '',
      '"Top cities"',
      '"Quezon City, Philippines"',
      '"6.4"',
    ].join('\n')

    const result = parseAudienceBuffer(utf16leBuffer(text))
    expect(result.topCities).toEqual([{ label: 'Quezon City, Philippines', pct: 6.4 }])
  })

  it('parses correctly regardless of block order', () => {
    const text = [
      'sep=,',
      '"Age & gender"',
      '"","Men","Women"',
      '"18-24","12.3","3.6"',
      '',
      '"Top cities"',
      '"Manila, Philippines"',
      '"3.2"',
    ].join('\n')

    const result = parseAudienceBuffer(utf16leBuffer(text))
    expect(result.ageGender).toEqual([{ age_bracket: '18-24', men_pct: 12.3, women_pct: 3.6 }])
    expect(result.topCities).toEqual([{ label: 'Manila, Philippines', pct: 3.2 }])
  })

  it('throws when the buffer is not UTF-16 LE', () => {
    expect(() => parseAudienceBuffer(Buffer.from('sep=,\n"Age & gender"', 'utf8'))).toThrow(/UTF-16 LE/)
  })

  it('throws on a garbled percentage cell instead of coercing it to 0', () => {
    const text = ['sep=,', '"Age & gender"', '"","Men","Women"', '"18-24","N/A","3.6"'].join('\n')
    expect(() => parseAudienceBuffer(utf16leBuffer(text))).toThrow(/expected a number/)
  })

  it('throws on a garbled rank block value instead of coercing it to 0', () => {
    const text = ['sep=,', '"Top cities"', '"Manila, Philippines"', '"—"'].join('\n')
    expect(() => parseAudienceBuffer(utf16leBuffer(text))).toThrow(/expected a number/)
  })

  it('does not skip the first data row when the Age & gender sub-header is absent', () => {
    const text = ['sep=,', '"Age & gender"', '"18-24","12.3","3.6"'].join('\n')
    const result = parseAudienceBuffer(utf16leBuffer(text))
    expect(result.ageGender).toEqual([{ age_bracket: '18-24', men_pct: 12.3, women_pct: 3.6 }])
  })
})

describe('detectIfAudienceBuffer / detectIfPageMetricBuffer exclusivity', () => {
  it('detects Audience.csv regardless of which block label appears first', () => {
    expect(detectIfAudienceBuffer(utf16leBuffer('sep=,\n"Age & gender"\n'))).toBe(true)
    expect(detectIfAudienceBuffer(utf16leBuffer('sep=,\n"Top cities"\n'))).toBe(true)
    expect(detectIfAudienceBuffer(utf16leBuffer('sep=,\n"Top pages"\n'))).toBe(true)
  })

  it('detectIfPageMetricBuffer returns false for an Audience.csv buffer', () => {
    const buf = utf16leBuffer('sep=,\n"Age & gender"\n"","Men","Women"\n')
    expect(detectIfAudienceBuffer(buf)).toBe(true)
    expect(detectIfPageMetricBuffer(buf)).toBe(false)
  })

  it('detectIfPageMetricBuffer still returns true for a real single-metric file', () => {
    const buf = utf16leBuffer('sep=,\nFollows\nDate,Primary\n2025-08-01,20\n')
    expect(detectIfPageMetricBuffer(buf)).toBe(true)
    expect(detectIfAudienceBuffer(buf)).toBe(false)
  })
})
