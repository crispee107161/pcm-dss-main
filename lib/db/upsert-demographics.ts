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

      await prisma.followerGender.upsert({
        where: { gender: row.gender },
        create: { gender: row.gender, ...update },
        update,
      })

      if (!existing) counts.inserted++
      else if (isUnchanged(existing, update)) counts.unchanged++
      else counts.updated++
    }
  } else {
    for (const row of result.rows) {
      const existing = await prisma.followerTerritory.findUnique({
        where: { territory: row.territory },
      })
      const update = { distribution: row.distribution }

      await prisma.followerTerritory.upsert({
        where: { territory: row.territory },
        create: { territory: row.territory, ...update },
        update,
      })

      if (!existing) counts.inserted++
      else if (isUnchanged(existing, update)) counts.unchanged++
      else counts.updated++
    }
  }

  return counts
}
