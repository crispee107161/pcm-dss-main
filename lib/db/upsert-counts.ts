/**
 * Shared 3-way counting for CSV upsert writers.
 *
 * Every upload writer decides between three outcomes for each row:
 *  - inserted: no existing row for the key
 *  - updated:  an existing row exists and at least one written field differs
 *  - unchanged: an existing row exists and every written field already matches
 */
export interface UpsertCounts {
  inserted: number
  updated: number
  unchanged: number
}

export function emptyCounts(): UpsertCounts {
  return { inserted: 0, updated: 0, unchanged: 0 }
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }
  return a === b
}

/**
 * True when every key present in `next` already equals the same key on `existing`.
 * Only the fields a writer's `update` block actually writes should be passed in
 * `next` — DB-managed columns (id, created_at, category_id, ...) are never compared.
 */
export function isUnchanged<T extends object>(
  existing: T,
  next: Partial<Record<keyof T, unknown>>
): boolean {
  return (Object.keys(next) as (keyof T)[]).every((key) =>
    valuesEqual(existing[key], next[key])
  )
}
