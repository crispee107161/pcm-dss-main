import { prisma } from '@/lib/prisma'
import type { DemographicsResult } from '@/lib/csv/validate-demographics'
import { emptyCounts, isUnchanged, type UpsertCounts } from '@/lib/db/upsert-counts'

export async function upsertDemographics(
  result: DemographicsResult
): Promise<UpsertCounts> {
  const counts = emptyCounts()

  if (result.type === 'gender') {
    for (const row of result.rows) {
      const existing = await prisma.followerGender.findUnique({
        where: { gender: row.gender },
      })
      const update = { distribution: row.distribution }

      if (!existing) {
        await prisma.followerGender.create({ data: { gender: row.gender, ...update, captured_at: new Date() } })
        counts.inserted++
      } else if (isUnchanged(existing, update)) {
        // Value unchanged, but this upload re-confirmed it — touch the
        // snapshot date without counting it as a value change.
        await prisma.followerGender.update({ where: { gender: row.gender }, data: { captured_at: new Date() } })
        counts.unchanged++
      } else {
        await prisma.followerGender.update({ where: { gender: row.gender }, data: { ...update, captured_at: new Date() } })
        counts.updated++
      }
    }
  } else {
    for (const row of result.rows) {
      const existing = await prisma.followerTerritory.findUnique({
        where: { territory: row.territory },
      })
      const update = { distribution: row.distribution }

      if (!existing) {
        await prisma.followerTerritory.create({ data: { territory: row.territory, ...update, captured_at: new Date() } })
        counts.inserted++
      } else if (isUnchanged(existing, update)) {
        await prisma.followerTerritory.update({ where: { territory: row.territory }, data: { captured_at: new Date() } })
        counts.unchanged++
      } else {
        await prisma.followerTerritory.update({ where: { territory: row.territory }, data: { ...update, captured_at: new Date() } })
        counts.updated++
      }
    }
  }

  return counts
}
