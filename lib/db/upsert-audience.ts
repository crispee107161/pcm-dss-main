import type { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { AudienceResult, AudienceRankRecord } from '@/lib/csv/validate-audience'
import { emptyCounts, isUnchanged, type UpsertCounts } from '@/lib/db/upsert-counts'

function addCounts(a: UpsertCounts, b: UpsertCounts): UpsertCounts {
  return { inserted: a.inserted + b.inserted, updated: a.updated + b.updated, unchanged: a.unchanged + b.unchanged }
}

// Top cities/pages are top-10-of-many snapshots, not a fixed label set — a
// label that falls out of this month's top 10 must be pruned, or it lingers
// forever and silently blends into "Other" in AudienceRankChart's fold-past-10
// grouping (looks plausible, is actually stale). Delete-then-upsert keeps
// unchanged/updated tracking for labels that persist across uploads while
// guaranteeing no stale label survives.
async function upsertRankRows(
  tx: Prisma.TransactionClient,
  category: 'city' | 'page',
  rows: AudienceRankRecord[]
): Promise<UpsertCounts> {
  const counts = emptyCounts()

  // An empty `rows` here means this block didn't parse (missing/truncated
  // in the upload), not "the audience now has zero cities/pages" — Prisma's
  // `notIn: []` matches every row, so without this guard the delete below
  // would wipe the entire category on a bad or partial file instead of
  // leaving last upload's data in place.
  if (rows.length === 0) return counts

  const currentLabels = rows.map((r) => r.label)

  await tx.followerAudienceRank.deleteMany({
    where: { category, label: { notIn: currentLabels } },
  })

  for (const row of rows) {
    const key = { category_label: { category, label: row.label } }
    const existing = await tx.followerAudienceRank.findUnique({ where: key })
    const update = { distribution: row.distribution }

    if (!existing) {
      await tx.followerAudienceRank.create({ data: { category, label: row.label, ...update } })
      counts.inserted++
    } else if (isUnchanged(existing, update)) {
      counts.unchanged++
    } else {
      await tx.followerAudienceRank.update({ where: key, data: update })
      counts.updated++
    }
  }

  return counts
}

export async function upsertAudience(result: AudienceResult): Promise<UpsertCounts> {
  return prisma.$transaction(
    async (tx) => {
      let counts = emptyCounts()

      for (const row of result.ageGender) {
        const existing = await tx.followerAgeGender.findUnique({ where: { age_bracket: row.age_bracket } })
        const update = { men_distribution: row.men_distribution, women_distribution: row.women_distribution }

        if (!existing) {
          await tx.followerAgeGender.create({ data: { age_bracket: row.age_bracket, ...update } })
          counts.inserted++
        } else if (isUnchanged(existing, update)) {
          counts.unchanged++
        } else {
          await tx.followerAgeGender.update({ where: { age_bracket: row.age_bracket }, data: update })
          counts.updated++
        }
      }

      counts = addCounts(counts, await upsertRankRows(tx, 'city', result.topCities))
      counts = addCounts(counts, await upsertRankRows(tx, 'page', result.topPages))

      return counts
    },
    // Same timeout/maxWait convention as upsertAds — one row-per-round-trip
    // transaction over ~26 rows comfortably exceeds Prisma's 5s default
    // against a pooled Neon connection.
    { timeout: 120_000, maxWait: 15_000 }
  )
}
