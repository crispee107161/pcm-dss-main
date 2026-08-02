import { prisma } from '@/lib/prisma'
import type { PageMetricParseResult } from '@/lib/csv/validate-page-metric'
import type { PageMetricColumn } from '@/lib/csv/parse'
import { parseIsoLocalAsManila } from '@/lib/csv/timezone'
import { emptyCounts, isUnchanged, type UpsertCounts } from '@/lib/db/upsert-counts'

export async function upsertPageMetric(
  result: PageMetricParseResult
): Promise<UpsertCounts> {
  const counts = emptyCounts()
  const { column, rows } = result

  for (const row of rows) {
    // row.date is an ISO-shaped string with no timezone (e.g. "2025-09-20T00:00:00") —
    // anchor it explicitly instead of letting the server's local clock decide.
    const date = parseIsoLocalAsManila(row.date)

    const existing = await prisma.pageMetricDaily.findUnique({ where: { date } })

    const update = { [column]: row.value } as Partial<Record<PageMetricColumn, number>>

    if (!existing) {
      await prisma.pageMetricDaily.create({ data: { date, ...update } })
      counts.inserted++
    } else if (isUnchanged(existing, update)) {
      counts.unchanged++
    } else {
      await prisma.pageMetricDaily.update({ where: { date }, data: update })
      counts.updated++
    }
  }

  return counts
}
