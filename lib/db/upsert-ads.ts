import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/app/generated/prisma/client'
import type { AdRecord } from '@/lib/csv/validate-ads'
import { emptyCounts, isUnchanged, type UpsertCounts } from '@/lib/db/upsert-counts'
import { pairKey } from '@/lib/pair-key'

// Accepted by every function below so callers can run the delete-then-upsert
// sequence inside a single `prisma.$transaction` and get one atomic write.
type Db = typeof prisma | Prisma.TransactionClient

/**
 * Two rows sharing (ad_name, ad_set_name, reporting_starts) within the same
 * upload would otherwise silently overwrite each other (last-write-wins) in
 * the upsert loop below, discarding one row's metrics with no signal to the
 * uploader. Throws on the first collision found.
 */
export function assertNoDuplicateKeys(records: AdRecord[]): void {
  const seenKeys = new Set<string>()
  for (const record of records) {
    const dedupeKey = pairKey(record.ad_name, record.ad_set_name, record.reporting_starts.toISOString())
    if (seenKeys.has(dedupeKey)) {
      throw new Error(
        `Duplicate row for ad "${record.ad_name}" / ad set "${record.ad_set_name}" on ${record.reporting_starts.toISOString().slice(0, 10)} - remove the duplicate before re-uploading.`
      )
    }
    seenKeys.add(dedupeKey)
  }
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

interface ExistingAdRow {
  id: number
  ad_name: string
  ad_set_name: string
  reporting_starts: Date
  reporting_ends: Date
}

/**
 * A pre-existing Ad row spanning more than one calendar day is a monthly/
 * aggregate-granularity row (e.g. from the older ADS_CSV export). Once a
 * daily-granularity upload's own date range fully contains that row's span,
 * the aggregate row would double count that period in every downstream sum
 * (spend, results, regression inputs), so it's identified here as superseded
 * and removed, not merged.
 *
 * Coverage is checked at the file level (the upload's overall date range),
 * not per-ad per-day. Facebook's daily export omits zero-delivery days for a
 * given ad by design — a one-off reel or a single-day test ad will never have
 * a row for most days in a month, and that's expected, not a truncated file.
 * Requiring literal day-by-day coverage per ad (the original approach) meant
 * almost no real ad ever qualified, permanently blocking supersession for any
 * month with sparse delivery. What actually signals a truncated/partial
 * upload is the *file's* date span falling short of the monthly row's span,
 * which this still catches. An ad with zero rows anywhere in the file despite
 * a nonzero monthly aggregate is a separate, real mismatch between sources —
 * that row is deliberately left unsuperseded rather than guessed at.
 */
export function findSupersededMonthlyRowIds(dailyRecords: AdRecord[], existingRows: ExistingAdRow[]): number[] {
  if (dailyRecords.length === 0) return []

  const dayTimes = dailyRecords.map((r) => r.reporting_starts.getTime())
  const fileRangeStart = Math.min(...dayTimes)
  const fileRangeEnd = Math.max(...dayTimes)

  const pairsPresentInFile = new Set(dailyRecords.map((r) => pairKey(r.ad_name, r.ad_set_name)))

  return existingRows
    .filter((row) => {
      const spanMs = row.reporting_ends.getTime() - row.reporting_starts.getTime()
      if (spanMs < ONE_DAY_MS) return false // already single-day (daily) granularity

      if (fileRangeStart > row.reporting_starts.getTime()) return false // file starts after the row - partial coverage
      if (fileRangeEnd < row.reporting_ends.getTime()) return false // file ends before the row - partial coverage

      return pairsPresentInFile.has(pairKey(row.ad_name, row.ad_set_name))
    })
    .map((row) => row.id)
}

export interface SurvivingMonthlyRow {
  ad_name: string
  ad_set_name: string
  reporting_starts: Date
  reporting_ends: Date
}

export interface MonthlySupersessionResult {
  supersededCount: number
  // A monthly row can survive supersession for two different reasons: a
  // genuinely truncated/partial daily file (a real risk
  // `findSupersededMonthlyRowIds` already guards against), or an ad whose
  // name simply doesn't match between the monthly and daily exports (a
  // rename, an emoji added later) - unresolvable by string matching, not a
  // data-integrity risk. Callers must not delete these rows, but they're
  // safe to leave in the DB: `maybeRetrainRegression` filters training to
  // daily-granularity rows independently of supersession outcome, so a
  // stray monthly row here can never enter training as a month-sized
  // outlier. Surfaced purely for visibility/manual review.
  survivors: SurvivingMonthlyRow[]
}

/**
 * Deletes monthly-granularity Ad rows superseded by an incoming daily
 * upload, and reports the monthly rows in the same overlap window that were
 * NOT superseded (survivors). Must run in the same transaction as
 * `upsertAds` for the same records, and before it, so a failure partway
 * through never leaves monthly rows deleted without their daily replacements
 * written.
 *
 * The overlap candidates are fetched once and reused for both the delete
 * and the survivor list — a second `findMany` with the same `where` clause
 * would either duplicate this same pre-delete snapshot or (if run after the
 * delete) require re-deriving "survivor" from a smaller row set anyway, so
 * there's no correctness reason to pay for two round trips.
 */
export async function resolveMonthlySupersession(records: AdRecord[], db: Db = prisma): Promise<MonthlySupersessionResult> {
  if (records.length === 0) return { supersededCount: 0, survivors: [] }

  const dayTimes = records.map((r) => r.reporting_starts.getTime())
  const rangeStart = new Date(Math.min(...dayTimes))
  const rangeEnd = new Date(Math.max(...dayTimes))

  const candidates = await db.ad.findMany({
    where: {
      reporting_starts: { lte: rangeEnd },
      reporting_ends: { gte: rangeStart },
    },
    select: { id: true, ad_name: true, ad_set_name: true, reporting_starts: true, reporting_ends: true },
  })

  const supersededIds = new Set(findSupersededMonthlyRowIds(records, candidates))
  if (supersededIds.size > 0) {
    await db.ad.deleteMany({ where: { id: { in: [...supersededIds] } } })
  }

  const survivors = candidates.filter(
    (row) => !supersededIds.has(row.id) && row.reporting_ends.getTime() - row.reporting_starts.getTime() >= ONE_DAY_MS
  )

  return { supersededCount: supersededIds.size, survivors }
}

/**
 * Reverse of `findSupersededMonthlyRowIds`: a monthly (multi-day) upload
 * arriving *after* daily data already exists for the same ad/ad-set would
 * otherwise insert an aggregate row on top of those daily rows, double
 * counting that period in every raw spend/messaging sum. Existing
 * daily-granularity rows are always treated as authoritative — any incoming
 * monthly record whose (ad_name, ad_set_name) has an existing daily row
 * overlapping its span is dropped rather than merged.
 */
export function partitionMonthlyRecordsAgainstDaily(
  records: AdRecord[],
  existingDailyRows: ExistingAdRow[]
): { keep: AdRecord[]; skipped: AdRecord[] } {
  const dailyByPair = new Map<string, ExistingAdRow[]>()
  for (const row of existingDailyRows) {
    if (row.reporting_ends.getTime() - row.reporting_starts.getTime() >= ONE_DAY_MS) continue
    const key = pairKey(row.ad_name, row.ad_set_name)
    const list = dailyByPair.get(key) ?? []
    list.push(row)
    dailyByPair.set(key, list)
  }

  const keep: AdRecord[] = []
  const skipped: AdRecord[] = []
  for (const record of records) {
    const dailyRows = dailyByPair.get(pairKey(record.ad_name, record.ad_set_name))
    const overlapped = dailyRows?.some(
      (row) => row.reporting_starts.getTime() <= record.reporting_ends.getTime()
        && row.reporting_ends.getTime() >= record.reporting_starts.getTime()
    )
    ;(overlapped ? skipped : keep).push(record)
  }

  return { keep, skipped }
}

/**
 * Fetches existing daily-granularity rows overlapping an incoming monthly
 * upload's date range, for `partitionMonthlyRecordsAgainstDaily`. Must run
 * before `upsertAds` in the same transaction, mirroring
 * `deleteSupersededMonthlyRows`.
 */
export async function findExistingDailyRowsForMonthlyUpload(records: AdRecord[], db: Db = prisma): Promise<ExistingAdRow[]> {
  if (records.length === 0) return []

  const dayTimes = records.flatMap((r) => [r.reporting_starts.getTime(), r.reporting_ends.getTime()])
  const rangeStart = new Date(Math.min(...dayTimes))
  const rangeEnd = new Date(Math.max(...dayTimes))

  return db.ad.findMany({
    where: {
      reporting_starts: { lte: rangeEnd },
      reporting_ends: { gte: rangeStart },
    },
    select: { id: true, ad_name: true, ad_set_name: true, reporting_starts: true, reporting_ends: true },
  })
}

function toWrittenFields(record: AdRecord) {
  return {
    reporting_ends: record.reporting_ends,
    attribution_setting: record.attribution_setting,
    reach: record.reach,
    impressions: record.impressions,
    link_clicks: record.link_clicks,
    amount_spent: record.amount_spent,
    total_messaging_contacts: record.total_messaging_contacts,
    results: record.results,
    cost_per_result: record.cost_per_result,
    inquiries: record.inquiries,
  }
}

/**
 * A per-record `findUnique` + `create`/`update` loop was 2 sequential
 * round trips per row - fine for the old monthly files (dozens of rows) but
 * a full month of daily rows (hundreds) blew past the interactive
 * transaction's timeout before finishing (observed: 120s+ on a single file).
 * Fetching existing rows once and batching inserts collapses the common
 * case (first-time daily upload, everything new) to two round trips total;
 * only genuine re-upload conflicts fall back to a per-record update, which
 * is a small enough set not to risk the timeout again.
 */
export async function upsertAds(records: AdRecord[], db: Db = prisma): Promise<UpsertCounts> {
  assertNoDuplicateKeys(records)

  const counts = emptyCounts()
  if (records.length === 0) return counts

  const dayTimes = records.map((r) => r.reporting_starts.getTime())
  const rangeStart = new Date(Math.min(...dayTimes))
  const rangeEnd = new Date(Math.max(...dayTimes))

  const existingRows = await db.ad.findMany({
    where: { reporting_starts: { gte: rangeStart, lte: rangeEnd } },
  })
  const existingByKey = new Map(
    existingRows.map((row) => [pairKey(row.ad_name, row.ad_set_name, row.reporting_starts.toISOString()), row])
  )

  const toCreate: (ReturnType<typeof toWrittenFields> & {
    ad_name: string
    ad_set_name: string
    reporting_starts: Date
  })[] = []
  const toUpdate: AdRecord[] = []

  for (const record of records) {
    const key = pairKey(record.ad_name, record.ad_set_name, record.reporting_starts.toISOString())
    const existing = existingByKey.get(key)
    const update = toWrittenFields(record)

    if (!existing) {
      toCreate.push({
        ad_name: record.ad_name,
        ad_set_name: record.ad_set_name,
        reporting_starts: record.reporting_starts,
        ...update,
      })
    } else if (isUnchanged(existing, update)) {
      counts.unchanged++
    } else {
      toUpdate.push(record)
    }
  }

  if (toCreate.length > 0) {
    await db.ad.createMany({ data: toCreate })
    counts.inserted += toCreate.length
  }

  // Rare path - a handful of rows at most, so per-record updates here don't
  // reintroduce the timeout risk the bulk path above exists to avoid.
  for (const record of toUpdate) {
    await db.ad.update({
      where: {
        ad_name_ad_set_name_reporting_starts: {
          ad_name: record.ad_name,
          ad_set_name: record.ad_set_name,
          reporting_starts: record.reporting_starts,
        },
      },
      data: toWrittenFields(record),
    })
    counts.updated++
  }

  return counts
}
