// JSON-encoded so a value containing a space can never collide with a
// different set of parts whose word boundary happens to fall in the same
// place (e.g. ('A B', 'C') vs ('A', 'B C')) — a real risk given how
// space-heavy Facebook ad/ad-set names are. Shared by every place that keys
// or groups ad rows by (ad_name, ad_set_name[, ...]) — upsert dedup,
// day-coverage supersession, daily-CSV row merging, and regression
// aggregation all need the same collision-safe key.
export function pairKey(...parts: string[]): string {
  return JSON.stringify(parts)
}
