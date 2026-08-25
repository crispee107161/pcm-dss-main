// LIVE run for docs/raven/731st_Post_Reconciliation_and_574_Greenlight_v2.md §6.
// Nulls category_final/category_final_source on in-period LEGACY_IMPORT rows
// so they re-enter the S4 review queue as backlog (per FR-04a scoping).
// Does NOT touch category_keyword or category_llm, does NOT touch
// out-of-period rows, does NOT touch MANUAL_GROUND_TRUTH/MANUAL_OVERRIDE/
// ACCEPTED_SUGGESTION rows (the WHERE is an equality condition on
// category_final_source, so those are structurally unreachable).
//
// Run scripts/raven-574-dry-run.ts first and confirm its numbers match
// before running this. This script performs a real UPDATE.
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { withStudyPeriod } from '../lib/data/study-period'

async function main() {
  const result = await prisma.facebookPost.updateMany({
    where: withStudyPeriod({ category_final_source: 'LEGACY_IMPORT' }),
    data: { category_final: null, category_final_source: null },
  })
  console.log('Rows updated:', result.count)
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
