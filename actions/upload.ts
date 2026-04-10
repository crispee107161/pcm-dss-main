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
      error_message: 'No file provided',
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
    let retrained = false

    // --- Page metric files (UTF-16 LE with sep=, header) ---
    if (detectIfPageMetricBuffer(buffer)) {
      detectedType = 'PAGE_METRIC_CSV'
      const parsed   = parsePageMetricBuffer(buffer)
      const validated = validatePageMetricResult(parsed)
      const { inserted, updated } = await upsertPageMetric(validated)
      records_inserted = inserted
      records_updated  = updated

    } else {
      // --- Standard CSV files ---
      const { headers, rows } = parseCsvBuffer(buffer)
      const csvType = detectCsvType(headers)
      detectedType = csvType

      if (csvType === 'ADS_CSV') {
        const adRecords = validateAdsRows(rows)
        const { inserted, updated } = await upsertAds(adRecords)
        records_inserted = inserted
        records_updated  = updated
        retrained = await maybeRetrainRegression()

      } else if (csvType === 'POSTS_CSV') {
        const postRecords = validatePostsRows(rows)
        const { inserted, updated } = await upsertPosts(postRecords)
        records_inserted = inserted
        records_updated  = updated

      } else if (csvType === 'FOLLOWER_HISTORY_CSV') {
        const records = validateFollowerHistoryRows(rows)
        const { inserted, updated } = await upsertFollowerHistory(records)
        records_inserted = inserted
        records_updated  = updated

      } else if (csvType === 'PAGE_VIEWERS_CSV') {
        const records = validatePageViewersRows(rows)
        const { inserted, updated } = await upsertPageViewers(records)
        records_inserted = inserted
        records_updated  = updated

      } else if (csvType === 'DEMOGRAPHICS_CSV') {
        const result = validateDemographicsRows(headers, rows)
        const { inserted, updated } = await upsertDemographics(result)
        records_inserted = inserted
        records_updated  = updated
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
        error_message: null,
      },
    })

    revalidatePath('/dashboard/marketing')
    revalidatePath('/dashboard/marketing/page-metrics')
    revalidatePath('/dashboard/sales')

    return {
      status: 'SUCCESS',
      upload_type: detectedType,
      records_inserted,
      records_updated,
      retrained,
    }
  } catch (err) {
    const error_message = (err as Error).message

    try {
      await prisma.uploadLog.create({
        data: {
          user_id: userId,
          upload_type: detectedType,
          filename,
          status: 'FAILED',
          records_inserted: 0,
          records_updated: 0,
          error_message,
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
      error_message,
      retrained: false,
    }
  }
}
