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

export type PageMetricColumn = 'follows' | 'interactions' | 'link_clicks' | 'views' | 'visits'

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
  'Content interactions': 'interactions',
  'Facebook link clicks': 'link_clicks',
  'Views':                'views',
  'Facebook visits':      'visits',
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
