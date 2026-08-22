import { prisma } from '@/lib/prisma'
import type { UploadType } from '@/types/index'

export interface CoverageRow {
  label: string
  monthsLoaded: string | null
  lastUpload: { date: Date; filename: string; uploaderEmail: string } | null
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', year: 'numeric' }).format(date)
}

function formatUploadDate(date: Date): string {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

async function latestUpload(types: UploadType[]) {
  const log = await prisma.uploadLog.findFirst({
    where: { upload_type: { in: types }, status: 'SUCCESS' },
    orderBy: { uploaded_at: 'desc' },
    include: { user: { select: { email: true } } },
  })
  if (!log) return null
  return { date: log.uploaded_at, filename: log.filename, uploaderEmail: log.user.email }
}

// FR-05 (Response_Forecast_Upload_Sidebar.md §2.2): answers "has this already
// been uploaded?" before anyone starts, and surfaces gaps between the three
// export families — nothing here needs new persistence, it's all derived
// from the existing hierarchy tables + UploadLog's audit trail.
export async function getUploadCoverage(): Promise<CoverageRow[]> {
  const [adRange, postRange, pageMetricRange, adLog, postLog, pageLog] = await Promise.all([
    prisma.ad.aggregate({ _min: { reporting_starts: true }, _max: { reporting_starts: true } }),
    prisma.facebookPost.aggregate({ _min: { publish_time: true }, _max: { publish_time: true } }),
    prisma.pageMetricDaily.aggregate({ _min: { date: true }, _max: { date: true } }),
    latestUpload(['ADS_CSV']),
    latestUpload(['POSTS_CSV']),
    latestUpload(['PAGE_METRIC_CSV', 'FOLLOWER_HISTORY_CSV', 'PAGE_VIEWERS_CSV', 'DEMOGRAPHICS_CSV']),
  ])

  function monthsLoaded(min: Date | null, max: Date | null): string | null {
    if (!min || !max) return null
    return formatMonth(min) === formatMonth(max) ? formatMonth(min) : `${formatMonth(min)} – ${formatMonth(max)}`
  }

  return [
    {
      label: 'Advertising',
      monthsLoaded: monthsLoaded(adRange._min.reporting_starts, adRange._max.reporting_starts),
      lastUpload: adLog,
    },
    {
      label: 'Organic posts',
      monthsLoaded: monthsLoaded(postRange._min.publish_time, postRange._max.publish_time),
      lastUpload: postLog,
    },
    {
      label: 'Page-level',
      monthsLoaded: monthsLoaded(pageMetricRange._min.date, pageMetricRange._max.date),
      lastUpload: pageLog,
    },
  ]
}

export { formatUploadDate }
