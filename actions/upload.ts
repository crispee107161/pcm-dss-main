'use server'

import { auth } from '@/lib/auth'
import { parseCsvBuffer, parsePageMetricBuffer, parseAudienceBuffer } from '@/lib/csv/parse'
import { detectCsvType, detectIfPageMetricBuffer, detectIfAudienceBuffer } from '@/lib/csv/detect'
import { validateAdsRows } from '@/lib/csv/validate-ads'
import { validatePostsRows } from '@/lib/csv/validate-posts'
import { validatePageMetricResult } from '@/lib/csv/validate-page-metric'
import { validateFollowerHistoryRows } from '@/lib/csv/validate-follower-history'
import { validatePageViewersRows } from '@/lib/csv/validate-page-viewers'
import { validateDemographicsRows } from '@/lib/csv/validate-demographics'
import { validateAudienceResult } from '@/lib/csv/validate-audience'
import { upsertAds, assertNoDuplicateKeys } from '@/lib/db/upsert-ads'
import { upsertPosts } from '@/lib/db/upsert-posts'
import { upsertPageMetric } from '@/lib/db/upsert-page-metric'
import { upsertFollowerHistory } from '@/lib/db/upsert-follower-history'
import { upsertPageViewers } from '@/lib/db/upsert-page-viewers'
import { upsertDemographics } from '@/lib/db/upsert-demographics'
import { upsertAudience } from '@/lib/db/upsert-audience'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { UploadResult, UploadType } from '@/types/index'
import type { AdRecord } from '@/lib/csv/validate-ads'
import type { PostRecord } from '@/lib/csv/validate-posts'

export async function revalidateDashboards() {
  revalidatePath('/dashboard/marketing', 'layout')
  revalidatePath('/dashboard/owner', 'layout')
}

// FR-04/FR-05: both the Owner and the Marketing Manager have Ads Manager +
// Page access and both pull exports in practice — routing every upload
// through one role would just add a pointless hop (see
// docs/raven/Response_Forecast_Upload_Sidebar.md §2.1). MARKETING_TEAM stays
// excluded.
const UPLOAD_ALLOWED_ROLES = new Set(['MARKETING_MANAGER', 'BUSINESS_OWNER'])

function formatPeriodLabel(min: Date, max: Date): string {
  const fmt = new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric', day: 'numeric' })
  return min.toDateString() === max.toDateString() ? fmt.format(min) : `${fmt.format(min)} – ${fmt.format(max)}`
}

// FR-05 (Response_Forecast_Upload_Sidebar.md §2.3): with two roles able to
// upload, warn before silently replacing a period someone already loaded.
// Returns a NEEDS_CONFIRMATION result (nothing written yet) when the
// incoming file's date range already has records on file, or null to
// proceed straight to the upsert.
async function checkAdPeriodOverlap(records: AdRecord[]): Promise<UploadResult | null> {
  if (records.length === 0) return null
  const dates = records.map((r) => r.reporting_starts.getTime())
  const min = new Date(dates.reduce((a, b) => Math.min(a, b)))
  const max = new Date(dates.reduce((a, b) => Math.max(a, b)))

  const existing = await prisma.ad.aggregate({
    where: { reporting_starts: { gte: min, lte: max } },
    _count: { id: true },
    _sum: { amount_spent: true },
  })
  if (existing._count.id === 0) return null

  const incomingSpend = records.reduce((s, r) => s + r.amount_spent, 0)

  return {
    status: 'NEEDS_CONFIRMATION',
    upload_type: 'ADS_CSV',
    records_inserted: 0,
    records_updated: 0,
    records_unchanged: 0,
    periodLabel: formatPeriodLabel(min, max),
    existing: { count: existing._count.id, totalSpend: existing._sum.amount_spent ?? 0 },
    incoming: { count: records.length, totalSpend: incomingSpend },
  }
}

async function checkPostPeriodOverlap(records: PostRecord[]): Promise<UploadResult | null> {
  if (records.length === 0) return null
  const dates = records.map((r) => r.publish_time.getTime())
  const min = new Date(dates.reduce((a, b) => Math.min(a, b)))
  const max = new Date(dates.reduce((a, b) => Math.max(a, b)))

  const existingCount = await prisma.facebookPost.count({
    where: { publish_time: { gte: min, lte: max } },
  })
  if (existingCount === 0) return null

  return {
    status: 'NEEDS_CONFIRMATION',
    upload_type: 'POSTS_CSV',
    records_inserted: 0,
    records_updated: 0,
    records_unchanged: 0,
    periodLabel: formatPeriodLabel(min, max),
    existing: { count: existingCount },
    incoming: { count: records.length },
  }
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
    }
  }

  if (!UPLOAD_ALLOWED_ROLES.has(session.user.role)) {
    return {
      status: 'FAILED',
      upload_type: 'ADS_CSV',
      records_inserted: 0,
      records_updated: 0,
      records_unchanged: 0,
      error_message: 'Forbidden: only the Business Owner or Marketing Manager can upload CSV files',
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
    }
  }

  const filename = file.name
  const userId = parseInt(session.user.id, 10)
  const confirmed = formData.get('confirmed') === 'true'
  let detectedType: UploadType = 'ADS_CSV'

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let records_inserted = 0
    let records_updated = 0
    let records_unchanged = 0

    // --- Audience.csv (UTF-16 LE, same sep=, preamble as page metrics but a
    // multi-block demographic file, not a single daily metric) — must be
    // checked before the page-metric branch below, which it would otherwise
    // also match and fail with "Unknown page metric name". ---
    if (detectIfAudienceBuffer(buffer)) {
      detectedType = 'AUDIENCE_CSV'
      const parsed = parseAudienceBuffer(buffer)
      const validated = validateAudienceResult(parsed)
      const { inserted, updated, unchanged } = await upsertAudience(validated)
      records_inserted  = inserted
      records_updated   = updated
      records_unchanged = unchanged

    // --- Page metric files (UTF-16 LE with sep=, header) ---
    } else if (detectIfPageMetricBuffer(buffer)) {
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

        if (!confirmed) {
          const overlap = await checkAdPeriodOverlap(parsedAdRecords)
          if (overlap) return overlap
        }

        const counts = await prisma.$transaction(
          (tx) => upsertAds(parsedAdRecords, tx),
          { timeout: 120_000, maxWait: 15_000 }
        )
        records_inserted  = counts.inserted
        records_updated   = counts.updated
        records_unchanged = counts.unchanged

      } else if (csvType === 'POSTS_CSV') {
        const postRecords = validatePostsRows(rows)

        if (!confirmed) {
          const overlap = await checkPostPeriodOverlap(postRecords)
          if (overlap) return overlap
        }

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
      },
    })

    return {
      status: 'SUCCESS',
      upload_type: detectedType,
      records_inserted,
      records_updated,
      records_unchanged,
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
    }
  }
}
