import { prisma } from '@/lib/prisma'
import type { FollowerHistoryRecord } from '@/lib/csv/validate-follower-history'
import { emptyCounts, isUnchanged, type UpsertCounts } from '@/lib/db/upsert-counts'

export async function upsertFollowerHistory(
  records: FollowerHistoryRecord[]
): Promise<UpsertCounts> {
  const counts = emptyCounts()

  for (const record of records) {
    const existing = await prisma.followerHistory.findUnique({ where: { date: record.date } })

    const update = {
      followers:    record.followers,
      daily_change: record.daily_change,
    }

    if (!existing) {
      await prisma.followerHistory.create({ data: { date: record.date, ...update } })
      counts.inserted++
    } else if (isUnchanged(existing, update)) {
      counts.unchanged++
    } else {
      await prisma.followerHistory.update({ where: { date: record.date }, data: update })
      counts.updated++
    }
  }

  return counts
}
