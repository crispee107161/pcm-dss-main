'use server'

import { auth } from '@/lib/auth'
import { parseCsvBuffer, parsePageMetricBuffer } from '@/lib/csv/parse'
import { detectCsvType, detectIfPageMetricBuffer } from '@/lib/csv/detect'
import { validateAdsRows } from '@/lib/csv/validate-ads'
import { validatePostsRows } from '@/lib/csv/validate-posts'
import { validatePageMetricResult } from '@/lib/csv/validate-page-metric'
import { validateFollowerHistoryRows } from '@/lib/csv/validate-follower-history'
import { validatePageViewersRows } from '@/lib/csv/validate-page-viewers'
import { validateDemographicsRows } from '@/lib/csv/validate-demographics'
import { upsertAds } from '@/lib/db/upsert-ads'
import { upsertPosts } from '@/lib/db/upsert-posts'
import { upsertPageMetric } from '@/lib/db/upsert-page-metric'
import { upsertFollowerHistory } from '@/lib/db/upsert-follower-history'
import { upsertPageViewers } from '@/lib/db/upsert-page-viewers'
import { upsertDemographics } from '@/lib/db/upsert-demographics'
import { maybeRetrainRegression } from '@/lib/stats/regression'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { UploadResult, UploadType } from '@/types/index'

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
        const adRecords = validateAdsRows(rows)
        const { inserted, updated, unchanged } = await upsertAds(adRecords)
        records_inserted  = inserted
        records_updated   = updated
        records_unchanged = unchanged
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
        error_message: null,
      },
    })

    return {
      status: 'SUCCESS',
      upload_type: detectedType,
      records_inserted,
      records_updated,
      records_unchanged,
      retrained,
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
