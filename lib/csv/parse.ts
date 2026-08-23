import Papa from 'papaparse'

export interface ParseResult {
  headers: string[]
  rows: Record<string, string>[]
}

/**
 * Standard parser — handles UTF-16 LE, UTF-8 BOM, and plain UTF-8.
 * Used for Ads CSV, Posts CSV, FollowerHistory, Viewers, Demographics.
 */
export function parseCsvBuffer(buffer: Buffer): ParseResult {
  const bytes = new Uint8Array(buffer)

  let text: string

  // UTF-16 LE BOM: 0xFF 0xFE
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    const decoder = new TextDecoder('utf-16le')
    text = decoder.decode(buffer)
  }
  // UTF-8 BOM: 0xEF 0xBB 0xBF
  else if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    const decoder = new TextDecoder('utf-8')
    text = decoder.decode(buffer)
  }
  // UTF-8 no BOM
  else {
    const decoder = new TextDecoder('utf-8')
    text = decoder.decode(buffer)
  }

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  })

  if (result.errors && result.errors.length > 0) {
    const fatalErrors = result.errors.filter((e) => e.type === 'Delimiter' || e.type === 'Quotes')
    if (fatalErrors.length > 0) {
      throw new Error(`CSV parse error: ${fatalErrors[0].message}`)
    }
  }

  const headers = result.meta.fields ?? []
  const rows = result.data

  return { headers, rows }
}

export type PageMetricColumn = 'follows' | 'interactions' | 'link_clicks' | 'views' | 'viewers' | 'visits'

export interface PageMetricRow {
  date: string   // ISO datetime string as-is from the file
  value: number
}

export interface PageMetricParseResult {
  column: PageMetricColumn
  rows: PageMetricRow[]
}

// Maps the metric name line (line 2) to a DB column name
const METRIC_NAME_MAP: Record<string, PageMetricColumn> = {
  'Facebook follows':     'follows',
  'Follows':              'follows',
  'Content interactions': 'interactions',
  'Interactions':         'interactions',
  'Facebook link clicks': 'link_clicks',
  'Link clicks':          'link_clicks',
  'Views':                'views',
  'Viewers':              'viewers',
  'Facebook visits':      'visits',
  'Visits':               'visits',
}

/**
 * Special parser for the 5 UTF-16 LE page metric files.
 * These files have 2 junk lines before the real headers:
 *   Line 1: sep=,
 *   Line 2: "Metric Name"   ← identifies which column to fill
 *   Line 3: "Date","Primary"
 *   Lines 4+: data rows
 */
export function parsePageMetricBuffer(buffer: Buffer): PageMetricParseResult {
  const bytes = new Uint8Array(buffer)

  if (!(bytes[0] === 0xff && bytes[1] === 0xfe)) {
    throw new Error('Page metric file must be UTF-16 LE encoded')
  }

  const decoder = new TextDecoder('utf-16le')
  let text = decoder.decode(buffer)

  // Strip BOM character if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }

  const lines = text.split('\n').map(l => l.replace(/\r$/, ''))

  // Line index 0: "sep=," — skip
  // Line index 1: "<Metric Name>" — extract
  // Line index 2: "Date","Primary" — real headers
  // Line index 3+: data

  if (lines.length < 3) {
    throw new Error('Page metric file has too few lines')
  }

  // Extract metric name — strip surrounding quotes
  const rawMetricName = lines[1].replace(/^"|"$/g, '').trim()
  const column = METRIC_NAME_MAP[rawMetricName]
  if (!column) {
    throw new Error(
      `Unknown page metric name: "${rawMetricName}". ` +
      `Expected one of: ${Object.keys(METRIC_NAME_MAP).join(', ')}`
    )
  }

  // Parse from line 3 onwards using PapaParse
  const dataText = lines.slice(2).join('\n')
  const result = Papa.parse<{ Date: string; Primary: string }>(dataText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  })

  const rows: PageMetricRow[] = result.data
    .filter(r => r.Date && r.Primary !== undefined)
    .map(r => ({
      date: r.Date.trim(),
      value: parseInt(r.Primary, 10) || 0,
    }))

  return { column, rows }
}

export interface AgeGenderRow {
  age_bracket: string
  men_pct: number
  women_pct: number
}

export interface AudienceRankRow {
  label: string
  pct: number
}

export interface AudienceParseResult {
  ageGender: AgeGenderRow[]
  topCities: AudienceRankRow[]
}

// Audience.csv's "Top cities" block is a row of quoted labels, then a row
// of quoted percentage values.
//
// "Top countries" and "Top pages" are deliberately NOT in this map:
//  - "Top countries" is the exact same Meta snapshot already ingested from
//    the dedicated FollowerTopTerritories (1).csv file into FollowerTerritory
//    (verified byte-for-byte: same countries, same order, same values, just
//    percent vs. fraction scale). Parsing it here too would render two
//    country charts with identical numbers under different headings.
//  - "Top pages" (a Meta "audience also likes" affinity score) isn't used
//    anywhere in this app — dropped rather than ingested and never displayed.
// Both fall through to the "unrecognized block" branch below and are
// skipped, same as the trailing Follows block.
const RANK_BLOCK_KEYS: Record<string, keyof Omit<AudienceParseResult, 'ageGender'>> = {
  'Top cities': 'topCities',
}

// Splits one already-dequoted CSV line into fields, respecting quoted commas
// (city labels like "Quezon City, Philippines" contain a comma inside quotes).
function parseQuotedLine(line: string): string[] {
  const result = Papa.parse<string[]>(line, { delimiter: ',' })
  return (result.data[0] ?? []).map((s) => s.trim())
}

// A garbled cell ("N/A", "—", empty) must fail the upload, not become a
// clean 0 that then passes every downstream range/sum check in
// validate-audience.ts as if it were real data (this is a required field on
// every row here, unlike e.g. validate-ads.ts's optional numeric columns,
// which do default to null on a bad cell).
function parsePercentCell(raw: string | undefined, context: string): number {
  const val = parseFloat(raw ?? '')
  if (isNaN(val)) {
    throw new Error(`${context}: expected a number, got "${raw ?? ''}"`)
  }
  return val
}

/**
 * Parser for Audience.csv — UTF-16 LE, `sep=,` preamble, then several
 * blocks stacked in one file (not one table). Only two shapes are actually
 * ingested (see RANK_BLOCK_KEYS above for why "Top countries"/"Top pages" aren't):
 *   1. "Age & gender" — age-bracket rows x Men/Women percentage columns
 *   2. "Top cities"   — one row of city labels, one row of percentages
 * Every other block ("Top countries", "Top pages", the trailing daily
 * "Follows" series, and anything Meta adds in future exports) is skipped by
 * scanning to the next blank line, rather than special-cased — that keeps
 * this parser forward-compatible with new/reordered blocks instead of
 * relying on any particular block always appearing in a fixed position
 * (see docs/data_catalog.md §3.2).
 */
export function parseAudienceBuffer(buffer: Buffer): AudienceParseResult {
  const bytes = new Uint8Array(buffer)

  if (!(bytes[0] === 0xff && bytes[1] === 0xfe)) {
    throw new Error('Audience file must be UTF-16 LE encoded')
  }

  const decoder = new TextDecoder('utf-16le')
  let text = decoder.decode(buffer)
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }

  const lines = text.split('\n').map(l => l.replace(/\r$/, ''))

  const result: AudienceParseResult = { ageGender: [], topCities: [] }

  const isBlank = (idx: number) => idx >= lines.length || lines[idx].trim() === ''

  // lines[0] is "sep=,"; blocks start at lines[1], each separated by a blank line.
  let i = 1
  while (i < lines.length) {
    if (isBlank(i)) { i++; continue }

    const blockLabel = lines[i].replace(/^"|"$/g, '').trim()
    i++

    if (blockLabel === 'Age & gender') {
      // Skip the `"","Men","Women"` sub-header — but only consume the line
      // if it actually looks like that header (empty first cell), not just
      // "any non-blank line". Otherwise a block with no data at all (label
      // immediately followed by a blank line) would have that blank
      // separator consumed and misread the *next* block's label as data,
      // and an export that ever drops the sub-header would lose its first
      // real data row.
      if (!isBlank(i) && parseQuotedLine(lines[i])[0] === '') i++
      while (!isBlank(i)) {
        const cols = parseQuotedLine(lines[i])
        if (cols[0]) {
          result.ageGender.push({
            age_bracket: cols[0],
            men_pct: parsePercentCell(cols[1], `Age & gender (${cols[0]}, Men)`),
            women_pct: parsePercentCell(cols[2], `Age & gender (${cols[0]}, Women)`),
          })
        }
        i++
      }
    } else if (blockLabel in RANK_BLOCK_KEYS) {
      const key = RANK_BLOCK_KEYS[blockLabel]
      // Only consume the labels/values rows if they're actually present
      // (not blank/EOF) — a block missing its values row is treated as
      // truncated (no rows pushed) rather than defaulting every label to
      // pct: 0. This guards against running past a blank separator or EOF;
      // it does not protect against a values row that's simply absent with
      // no blank line before the next block's label, which would still be
      // misread as the values row (an even more malformed export than
      // observed in practice).
      const labels = !isBlank(i) ? parseQuotedLine(lines[i]) : []
      if (labels.length > 0) i++
      const values = !isBlank(i) ? parseQuotedLine(lines[i]) : []
      if (values.length > 0) i++
      if (values.length > 0) {
        labels.forEach((label, idx) => {
          if (!label) return
          result[key].push({ label, pct: parsePercentCell(values[idx], `${blockLabel} (${label})`) })
        })
      }
    } else {
      // Unrecognized/unwanted block ("Top countries", "Follows", or
      // anything future exports add) — skip to the next blank line rather
      // than fail the whole upload or hardcode assumptions about ordering.
      while (!isBlank(i)) i++
    }
  }

  return result
}
