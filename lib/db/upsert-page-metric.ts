import { prisma } from '@/lib/prisma'
import type { PageMetricParseResult } from '@/lib/csv/validate-page-metric'
import type { PageMetricColumn } from '@/lib/csv/parse'
import { emptyCounts, isUnchanged, type UpsertCounts } from '@/lib/db/upsert-counts'

export async function upsertPageMetric(
  result: PageMetricParseResult
): Promise<UpsertCounts> {
  const counts = emptyCounts()
  const { column, rows } = result

  for (const row of rows) {
    const date = new Date(row.date)

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
