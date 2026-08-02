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
        await prisma.followerGender.create({ data: { gender: row.gender, ...update } })
        counts.inserted++
      } else if (isUnchanged(existing, update)) {
        counts.unchanged++
      } else {
        await prisma.followerGender.update({ where: { gender: row.gender }, data: update })
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
        await prisma.followerTerritory.create({ data: { territory: row.territory, ...update } })
        counts.inserted++
      } else if (isUnchanged(existing, update)) {
        counts.unchanged++
      } else {
        await prisma.followerTerritory.update({ where: { territory: row.territory }, data: update })
        counts.updated++
      }
    }
  }

  return counts
}
