export type CsvType =
  | 'ADS_CSV'
  | 'POSTS_CSV'
  | 'PAGE_METRIC_CSV'
  | 'FOLLOWER_HISTORY_CSV'
  | 'PAGE_VIEWERS_CSV'
  | 'DEMOGRAPHICS_CSV'

// 93-column monthly export (data/New_FB_Ads_Data/) — the system's sole ads input
// (mvp.md §4.7). Keyed on `Ad ID` + `Amount spent (PHP)` per data_catalog.md §5.1 —
// never on `Ad name` (297 names across 309 IDs, same doc §1).
const ADS_REQUIRED_HEADERS    = ['Ad ID', 'Amount spent (PHP)']
// Older Facebook exports (pre-2025) omit Reach/Views — Post ID + Publish time + Post type is unique enough
const POSTS_REQUIRED_HEADERS  = ['Post ID', 'Publish time', 'Post type']
const FOLLOWER_HIST_HEADERS   = ['Date', 'Followers', 'Difference in followers from previous day']
const VIEWERS_HEADERS         = ['Date', 'Total Viewers', 'New Viewers', 'Returning Viewers']
const GENDER_HEADERS          = ['Gender', 'Distribution']
// Facebook exports this column as either "Top territories" or "Top Territories"
// depending on export vintage — match case-insensitively.
const TERRITORY_HEADER_NAMES  = ['top territories']

// Page metric CSVs (Follows, Interactions, etc.) have identical headers: Date + Primary
// They are UTF-16 LE files identified by the metric name line — detection for these
// is done at the buffer level before calling detectCsvType.
const PAGE_METRIC_HEADERS = ['Date', 'Primary']

export function detectCsvType(headers: string[]): CsvType {
  const hasAll = (required: string[]) =>
    required.every((h) => headers.includes(h))
  const lowerHeaders = headers.map((h) => h.toLowerCase())
  const hasAllCaseInsensitive = (required: string[]) =>
    required.every((h) => lowerHeaders.includes(h))

  if (hasAll(ADS_REQUIRED_HEADERS))       return 'ADS_CSV'
  if (hasAll(POSTS_REQUIRED_HEADERS))     return 'POSTS_CSV'

  // FollowerHistory must be checked before Viewers (both have "Date")
  if (hasAll(FOLLOWER_HIST_HEADERS))  return 'FOLLOWER_HISTORY_CSV'
  if (hasAll(VIEWERS_HEADERS))        return 'PAGE_VIEWERS_CSV'

  // Demographics — Gender takes priority since Territory also has 'Distribution'
  if (hasAll(GENDER_HEADERS) && headers.length === 2)                 return 'DEMOGRAPHICS_CSV'
  if (hasAllCaseInsensitive(TERRITORY_HEADER_NAMES) && headers.includes('Distribution')) return 'DEMOGRAPHICS_CSV'

  // Page metric files — detected at buffer level, but include a header fallback
  if (hasAll(PAGE_METRIC_HEADERS) && headers.length === 2) return 'PAGE_METRIC_CSV'

  throw new Error(
    `CSV type could not be detected from headers: [${headers.join(', ')}]. ` +
    `Accepted files: Ads Manager CSV, Facebook Insights (Posts) CSV, ` +
    `FollowerHistory, Viewers, FollowerGender, FollowerTopTerritories, ` +
    `or any Page-Level Metric CSV (Follows, Interactions, Link clicks, Views, Viewers, Visits).`
  )
}

/**
 * Pre-checks the raw buffer for UTF-16 LE page metric files BEFORE standard parsing.
 * Returns 'PAGE_METRIC_CSV' if the buffer is UTF-16 LE with the "sep=," + metric name pattern,
 * otherwise returns null (proceed with standard detection).
 */
export function detectIfPageMetricBuffer(buffer: Buffer): boolean {
  const bytes = new Uint8Array(buffer)
  if (!(bytes[0] === 0xff && bytes[1] === 0xfe)) return false

  // Decode first ~100 bytes and check for sep=, pattern
  const decoder = new TextDecoder('utf-16le')
  const preview = decoder.decode(buffer.slice(0, 200))
  const stripped = preview.charCodeAt(0) === 0xfeff ? preview.slice(1) : preview
  const firstLine = stripped.split('\n')[0].replace(/\r$/, '').trim()
  return firstLine === 'sep=,'
}
