import { prisma } from '@/lib/prisma'
import type { DemographicsResult } from '@/lib/csv/validate-demographics'

export async function upsertDemographics(
  result: DemographicsResult
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0

  if (result.type === 'gender') {
    for (const row of result.rows) {
      const existing = await prisma.followerGender.findUnique({
        where: { gender: row.gender },
      })
      await prisma.followerGender.upsert({
        where: { gender: row.gender },
        create: { gender: row.gender, distribution: row.distribution },
        update: { distribution: row.distribution },
      })
      if (existing) updated++
      else inserted++
    }
  } else {
    for (const row of result.rows) {
      const existing = await prisma.followerTerritory.findUnique({
        where: { territory: row.territory },
      })
      await prisma.followerTerritory.upsert({
        where: { territory: row.territory },
        create: { territory: row.territory, distribution: row.distribution },
        update: { distribution: row.distribution },
      })
      if (existing) updated++
      else inserted++
    }
  }

  return { inserted, updated }
}
