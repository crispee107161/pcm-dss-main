// FR-13a — a demographic snapshot is only as fresh as its stalest row, so
// this reports the oldest captured_at among the rows actually displayed,
// not the newest (which could hide a row nobody has re-uploaded in months).
// captured_at is null for rows still carrying migration 20260825050000's
// backfill (see migration 20260825233000) — that instant was never a real
// snapshot date, so it's represented as NULL rather than a sentinel value
// application code would have to know to compare against. See
// docs/raven/Four_Remaining_Gaps_Please_Confirm.md §2.
// Returns null when there's nothing to caption, "date not recorded" when
// the oldest displayed row has never been touched by a real upsert, or a
// formatted date once a real re-upload has replaced that row.
export function demographicSnapshotLabel(rows: { captured_at: Date | null }[]): string | null {
  if (rows.length === 0) return null
  if (rows.some(r => r.captured_at === null)) return 'date not recorded'
  const dates = rows.map(r => r.captured_at as Date)
  const oldest = dates.reduce((min, d) => (d < min ? d : min), dates[0])
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(oldest)
}

// A ready-to-append UI suffix (" — as of 25 Aug 2026" / " — date not
// recorded" / "") so callers don't have to special-case the "not recorded"
// phrasing themselves.
export function demographicSnapshotSuffix(rows: { captured_at: Date | null }[]): string {
  const label = demographicSnapshotLabel(rows)
  if (label === null) return ''
  return label === 'date not recorded' ? ` — ${label}` : ` — as of ${label}`
}
