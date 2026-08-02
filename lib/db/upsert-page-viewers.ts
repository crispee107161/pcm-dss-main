import { prisma } from '@/lib/prisma'
import type { PageViewersRecord } from '@/lib/csv/validate-page-viewers'
import { emptyCounts, isUnchanged, type UpsertCounts } from '@/lib/db/upsert-counts'

export async function upsertPageViewers(
  records: PageViewersRecord[]
): Promise<UpsertCounts> {
  const counts = emptyCounts()

  for (const record of records) {
    const existing = await prisma.pageViewers.findUnique({ where: { date: record.date } })

    const update = {
      total_viewers:     record.total_viewers,
      new_viewers:       record.new_viewers,
      returning_viewers: record.returning_viewers,
    }

    if (!existing) {
      await prisma.pageViewers.create({ data: { date: record.date, ...update } })
      counts.inserted++
    } else if (isUnchanged(existing, update)) {
      counts.unchanged++
    } else {
      await prisma.pageViewers.update({ where: { date: record.date }, data: update })
      counts.updated++
    }
  }

  return counts
}
