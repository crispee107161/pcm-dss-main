import { prisma } from '@/lib/prisma'
import type { PageMetricParseResult } from '@/lib/csv/validate-page-metric'

export async function upsertPageMetric(
  result: PageMetricParseResult
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0
  const { column, rows } = result

  for (const row of rows) {
    const date = new Date(row.date)

    const existing = await prisma.pageMetricDaily.findUnique({ where: { date } })

    await prisma.pageMetricDaily.upsert({
      where: { date },
      create: {
        date,
        [column]: row.value,
      },
      update: {
        [column]: row.value,
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
