// docs/raven/Content_Filters_Review.md §2, prisma/migrations/20260823150110_
// category_final_source_legacy_and_revision. Backfills every post that has
// category_final set but category_final_source NULL (the pre-2026-08-13
// migration backfill, before category_final_source existed) to the new
// LEGACY_IMPORT value. Run once, after the enum migration has been applied
// and Prisma Client regenerated (the new enum value must be committed
// before a query can reference it — a separate script/transaction from the
// migration itself, per Postgres's ALTER TYPE ... ADD VALUE rules).
import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  const before = await prisma.facebookPost.count({
    where: { category_final: { not: null }, category_final_source: null },
  })
  console.log('rows to backfill (category_final set, source NULL):', before)

  const result = await prisma.facebookPost.updateMany({
    where: { category_final: { not: null }, category_final_source: null },
    data: { category_final_source: 'LEGACY_IMPORT' },
  })
  console.log('rows updated:', result.count)

  const after = await prisma.facebookPost.count({
    where: { category_final: { not: null }, category_final_source: null },
  })
  console.log('remaining rows with source NULL (should be 0):', after)

  const bySource = await prisma.facebookPost.groupBy({ by: ['category_final_source'], _count: true })
  console.log('provenance breakdown after backfill:', bySource)

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
