import { prisma } from '@/lib/prisma'
import type { PageViewersRecord } from '@/lib/csv/validate-page-viewers'

export async function upsertPageViewers(
  records: PageViewersRecord[]
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0

  for (const record of records) {
    const existing = await prisma.pageViewers.findUnique({ where: { date: record.date } })

    await prisma.pageViewers.upsert({
      where: { date: record.date },
      create: {
        date:              record.date,
        total_viewers:     record.total_viewers,
        new_viewers:       record.new_viewers,
        returning_viewers: record.returning_viewers,
      },
      update: {
        total_viewers:     record.total_viewers,
        new_viewers:       record.new_viewers,
        returning_viewers: record.returning_viewers,
      },
    })

    if (existing) {
      updated++
    } else {
      inserted++
    }
  }

  return { inserted, updated }
}
