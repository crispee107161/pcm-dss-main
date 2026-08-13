// One-off backfill: divides any FollowerGender/FollowerTerritory row whose
// `distribution` is stored in percent form (e.g. 73.70) down to fraction
// form (0.737), matching the canonical unit validate-demographics.ts now
// enforces for all new uploads. See lib/csv/validate-demographics.ts for the
// same >1 threshold and rationale.
//
// Idempotent: only touches rows where distribution > 1, so re-running after
// a successful backfill is a no-op.
//
// Usage: npx tsx scripts/backfill-demographics-scale.ts [--dry-run]

import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const genderRows = await prisma.followerGender.findMany({ where: { distribution: { gt: 1 } } })
  const territoryRows = await prisma.followerTerritory.findMany({ where: { distribution: { gt: 1 } } })

  if (genderRows.length === 0 && territoryRows.length === 0) {
    console.log('No percent-form rows found — nothing to backfill.')
    return
  }

  for (const row of genderRows) {
    const next = row.distribution / 100
    console.log(`FollowerGender[${row.gender}]: ${row.distribution} -> ${next}`)
    if (!dryRun) {
      await prisma.followerGender.update({ where: { id: row.id }, data: { distribution: next } })
    }
  }

  for (const row of territoryRows) {
    const next = row.distribution / 100
    console.log(`FollowerTerritory[${row.territory}]: ${row.distribution} -> ${next}`)
    if (!dryRun) {
      await prisma.followerTerritory.update({ where: { id: row.id }, data: { distribution: next } })
    }
  }

  console.log(dryRun ? '\nDry run — no changes written.' : '\nBackfill complete.')
}

main()
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
