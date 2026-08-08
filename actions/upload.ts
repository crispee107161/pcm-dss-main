'use server'

import { auth } from '@/lib/auth'
import { parseCsvBuffer, parsePageMetricBuffer } from '@/lib/csv/parse'
import { detectCsvType, detectIfPageMetricBuffer } from '@/lib/csv/detect'
import { validateAdsRows } from '@/lib/csv/validate-ads'
import { validateAdsDailyRows, type AdsDailyFilterSummary } from '@/lib/csv/validate-ads-daily'
import { validatePostsRows } from '@/lib/csv/validate-posts'
import { validatePageMetricResult } from '@/lib/csv/validate-page-metric'
import { validateFollowerHistoryRows } from '@/lib/csv/validate-follower-history'
import { validatePageViewersRows } from '@/lib/csv/validate-page-viewers'
import { validateDemographicsRows } from '@/lib/csv/validate-demographics'
import {
  upsertAds,
  resolveMonthlySupersession,
  assertNoDuplicateKeys,
  findExistingDailyRowsForMonthlyUpload,
  partitionMonthlyRecordsAgainstDaily,
} from '@/lib/db/upsert-ads'
import { upsertPosts } from '@/lib/db/upsert-posts'
import { upsertPageMetric } from '@/lib/db/upsert-page-metric'
import { upsertFollowerHistory } from '@/lib/db/upsert-follower-history'
import { upsertPageViewers } from '@/lib/db/upsert-page-viewers'
import { upsertDemographics } from '@/lib/db/upsert-demographics'
import { maybeRetrainRegression } from '@/lib/stats/regression'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { UploadResult, UploadType } from '@/types/index'

const MAX_NAMED_ROWS_IN_WARNING = 20

// Caps the ad names interpolated into a warning message — an upload with
// hundreds of affected rows would otherwise write an unbounded string into
// the UploadLog row.
function summarizeRows(rows: { ad_name: string; ad_set_name: string }[]): string {
  const shown = rows.slice(0, MAX_NAMED_ROWS_IN_WARNING).map((r) => `"${r.ad_name}" / "${r.ad_set_name}"`).join('; ')
  const remaining = rows.length - MAX_NAMED_ROWS_IN_WARNING
  return remaining > 0 ? `${shown}; and ${remaining} more` : shown
}

export async function revalidateDashboards() {
  revalidatePath('/dashboard/marketing', 'layout')
  revalidatePath('/dashboard/sales', 'layout')
}

export async function uploadCSV(
  prevState: UploadResult | null,
  formData: FormData
): Promise<UploadResult> {
  const session = await auth()

  if (!session?.user) {
    return {
      status: 'FAILED',
      upload_type: 'ADS_CSV',
      records_inserted: 0,
      records_updated: 0,
      records_unchanged: 0,
      error_message: 'Unauthorized: you must be logged in',
      retrained: false,
    }
  }

  if (session.user.role !== 'MARKETING_MANAGER') {
    return {
      status: 'FAILED',
      upload_type: 'ADS_CSV',
      records_inserted: 0,
      records_updated: 0,
      records_unchanged: 0,
      error_message: 'Forbidden: only Marketing Managers can upload CSV files',
      retrained: false,
    }
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return {
      status: 'FAILED',
      upload_type: 'ADS_CSV',
      records_inserted: 0,
      records_updated: 0,
      records_unchanged: 0,
      error_message: 'No file provided',
      retrained: false,
    }
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
  if (file.size > MAX_FILE_SIZE) {
    return {
      status: 'FAILED',
      upload_type: 'ADS_CSV',
      records_inserted: 0,
      records_updated: 0,
      records_unchanged: 0,
      error_message: 'File too large. Maximum allowed size is 10 MB.',
      retrained: false,
    }
  }

  const filename = file.name
  const userId = parseInt(session.user.id, 10)
  let detectedType: UploadType = 'ADS_CSV'

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let records_inserted = 0
    let records_updated = 0
    let records_unchanged = 0
    let retrained = false
    let filterSummary: AdsDailyFilterSummary | undefined
    let uploadWarning: string | null = null

    // --- Page metric files (UTF-16 LE with sep=, header) ---
    if (detectIfPageMetricBuffer(buffer)) {
      detectedType = 'PAGE_METRIC_CSV'
      const parsed   = parsePageMetricBuffer(buffer)
      const validated = validatePageMetricResult(parsed)
      const { inserted, updated, unchanged } = await upsertPageMetric(validated)
      records_inserted  = inserted
      records_updated   = updated
      records_unchanged = unchanged

    } else {
      // --- Standard CSV files ---
      const { headers, rows } = parseCsvBuffer(buffer)
      const csvType = detectCsvType(headers)
      detectedType = csvType

      if (csvType === 'ADS_CSV') {
        const parsedAdRecords = validateAdsRows(rows)
        assertNoDuplicateKeys(parsedAdRecords)

        // Same atomicity requirement as the daily path below: the
        // daily-overlap read and the upsert must commit as one unit, or a
        // failure partway through could leave monthly rows silently
        // dropped from the skip check with nothing written to replace them.
        const { skipped, inserted, updated, unchanged } = await prisma.$transaction(
          async (tx) => {
            const existingDaily = await findExistingDailyRowsForMonthlyUpload(parsedAdRecords, tx)
            const { keep, skipped: droppedRows } = partitionMonthlyRecordsAgainstDaily(parsedAdRecords, existingDaily)
            const counts = await upsertAds(keep, tx)
            return { skipped: droppedRows, ...counts }
          },
          { timeout: 120_000, maxWait: 15_000 }
        )
        records_inserted  = inserted
        records_updated   = updated
        records_unchanged = unchanged
        if (skipped.length > 0) {
          uploadWarning = `${skipped.length} monthly-granularity row(s) overlap existing daily data for the same ad and were skipped to avoid double-counting: ${summarizeRows(skipped)}`
        }
        if (inserted > 0 || updated > 0) {
          retrained = await maybeRetrainRegression()
        }

      } else if (csvType === 'ADS_DAILY_CSV') {
        const { records: adRecords, summary } = validateAdsDailyRows(rows)
        // Checked before the transaction opens so a malformed file never triggers
        // the supersede delete in the first place.
        assertNoDuplicateKeys(adRecords)

        // Delete-then-upsert must commit as one unit: if the upsert loop fails
        // partway through (bad row, connection drop) after monthly rows were
        // already deleted, an unwound transaction is the only way to avoid
        // permanently losing that data with nothing written to replace it.
        const { supersededMonthlyRows, survivors, inserted, updated, unchanged } = await prisma.$transaction(
          async (tx) => {
            // Rows in `survivors` are ads that couldn't be matched to the daily
            // file by name (usually a rename between exports) — left in place,
            // not deleted. Harmless to training: maybeRetrainRegression excludes
            // non-daily-granularity rows independently of this outcome.
            const { supersededCount, survivors: surviving } = await resolveMonthlySupersession(adRecords, tx)
            const counts = await upsertAds(adRecords, tx)
            return { supersededMonthlyRows: supersededCount, survivors: surviving, ...counts }
          },
          { timeout: 120_000, maxWait: 15_000 }
        )
        records_inserted  = inserted
        records_updated   = updated
        records_unchanged = unchanged
        filterSummary = { ...summary, supersededMonthlyRows, unmatchedMonthlyRows: survivors.length }
        if (survivors.length > 0) {
          uploadWarning = `${survivors.length} monthly-granularity row(s) could not be matched to this daily file by ad name (likely renamed between exports) and were left in place: ${summarizeRows(survivors)}`
        }
        // Daily rows carry `total_messaging_contacts` (never `inquiries` — this export
        // has no "Purchases" column), which is the regression DV as of the messaging-
        // conversations pivot (see DV-PIVOT-PLAN.md), so retraining now applies here too.
        if (inserted > 0 || updated > 0) {
          retrained = await maybeRetrainRegression()
        }

      } else if (csvType === 'POSTS_CSV') {
        const postRecords = validatePostsRows(rows)
        const { inserted, updated, unchanged } = await upsertPosts(postRecords)
        records_inserted  = inserted
        records_updated   = updated
        records_unchanged = unchanged

      } else if (csvType === 'FOLLOWER_HISTORY_CSV') {
        const records = validateFollowerHistoryRows(rows)
        const { inserted, updated, unchanged } = await upsertFollowerHistory(records)
        records_inserted  = inserted
        records_updated   = updated
        records_unchanged = unchanged

      } else if (csvType === 'PAGE_VIEWERS_CSV') {
        const records = validatePageViewersRows(rows)
        const { inserted, updated, unchanged } = await upsertPageViewers(records)
        records_inserted  = inserted
        records_updated   = updated
        records_unchanged = unchanged

      } else if (csvType === 'DEMOGRAPHICS_CSV') {
        const result = validateDemographicsRows(headers, rows)
        const { inserted, updated, unchanged } = await upsertDemographics(result)
        records_inserted  = inserted
        records_updated   = updated
        records_unchanged = unchanged

      } else {
        throw new Error(`Unsupported CSV type: ${csvType}`)
      }
    }

    await prisma.uploadLog.create({
      data: {
        user_id: userId,
        upload_type: detectedType,
        filename,
        status: 'SUCCESS',
        records_inserted,
        records_updated,
        records_unchanged,
        records_superseded: filterSummary?.supersededMonthlyRows ?? 0,
        warning_message: uploadWarning,
      },
    })

    return {
      status: 'SUCCESS',
      upload_type: detectedType,
      records_inserted,
      records_updated,
      records_unchanged,
      retrained,
      filter_summary: filterSummary,
    }
  } catch (err) {
    const internalMessage = (err as Error).message
    const clientMessage = 'Upload failed. Please check your file and try again.'

    try {
      await prisma.uploadLog.create({
        data: {
          user_id: userId,
          upload_type: detectedType,
          filename,
          status: 'FAILED',
          records_inserted: 0,
          records_updated: 0,
          records_unchanged: 0,
          error_message: internalMessage,
        },
      })
    } catch {
      // Ignore logging errors
    }

    return {
      status: 'FAILED',
      upload_type: detectedType,
      records_inserted: 0,
      records_updated: 0,
      records_unchanged: 0,
      error_message: clientMessage,
      retrained: false,
    }
  }
}
