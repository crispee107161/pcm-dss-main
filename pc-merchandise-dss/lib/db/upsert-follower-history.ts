import { prisma } from '@/lib/prisma'
import type { FollowerHistoryRecord } from '@/lib/csv/validate-follower-history'

export async function upsertFollowerHistory(
  records: FollowerHistoryRecord[]
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0

  for (const record of records) {
    const existing = await prisma.followerHistory.findUnique({ where: { date: record.date } })

    await prisma.followerHistory.upsert({
      where: { date: record.date },
      create: {
        date:         record.date,
        followers:    record.followers,
        daily_change: record.daily_change,
      },
      update: {
        followers:    record.followers,
        daily_change: record.daily_change,
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
