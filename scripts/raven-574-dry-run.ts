// Dry run for docs/raven/731st_Post_Reconciliation_and_574_Greenlight_v2.md §6 —
// nulling category_final/category_final_source on in-period LEGACY_IMPORT
// rows so they re-enter the S4 review queue. READ-ONLY: no Prisma update/
// delete calls. Report only; the live run is a separate script, run only
// after this dry run's numbers are confirmed against Raven's expectations.
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { withStudyPeriod } from '../lib/data/study-period'

async function main() {
  const inPeriodLegacyImport = await prisma.facebookPost.findMany({
    where: withStudyPeriod({ category_final_source: 'LEGACY_IMPORT' }),
    select: { id: true, post_id: true, category_keyword: true, category_llm: true, category_final: true, category_final_source: true },
  })
  console.log('Rows that WOULD be nulled (in-period LEGACY_IMPORT):', inPeriodLegacyImport.length)
  console.log('  expected: 427', inPeriodLegacyImport.length === 427 ? '(MATCH)' : '(MISMATCH)')

  const outOfPeriodLegacyImport = await prisma.facebookPost.count({
    where: { category_final_source: 'LEGACY_IMPORT', NOT: withStudyPeriod({ category_final_source: 'LEGACY_IMPORT' }) },
  })
  console.log('\nOut-of-period LEGACY_IMPORT rows (would be left alone):', outOfPeriodLegacyImport)
  console.log('  expected: 147', outOfPeriodLegacyImport === 147 ? '(MATCH)' : '(MISMATCH)')

  // The nulling WHERE is an equality condition on category_final_source
  // ('LEGACY_IMPORT'), so it structurally cannot select any other value —
  // this isn't a runtime risk to check, it's a property of the query. The
  // real risk would be a WHERE built on category_final: { not: null } (or
  // similar), which WOULD sweep in the protected sources. Confirming the
  // inPeriodLegacyImport rows selected above are 100% LEGACY_IMPORT proves
  // the actual clause used.
  const nonLegacyImportInSelection = inPeriodLegacyImport.filter((p) => p.category_final_source !== 'LEGACY_IMPORT')
  console.log('\nRows selected above whose category_final_source is NOT LEGACY_IMPORT (must be 0):', nonLegacyImportInSelection.length, nonLegacyImportInSelection.length === 0 ? '(OK)' : '(!!! STOP)')

  const currentQueue = await prisma.facebookPost.count({ where: withStudyPeriod({ category_final: null }) })
  console.log('\nCurrent in-period Needs Review (category_final null) count:', currentQueue)
  console.log('  expected: 92', currentQueue === 92 ? '(MATCH)' : '(MISMATCH)')

  const resultingQueue = currentQueue + inPeriodLegacyImport.length
  console.log('\nResulting Needs Review count after the run (current queue + rows nulled):', resultingQueue)
  console.log('  expected: 519', resultingQueue === 519 ? '(MATCH)' : '(MISMATCH)')

  const missingKeywordOrLlm = inPeriodLegacyImport.filter((p) => p.category_keyword === null && p.category_llm === null)
  console.log('\nOf the rows that would be nulled, how many already have BOTH category_keyword and category_llm null (i.e. nothing to preserve):', missingKeywordOrLlm.length)
  console.log('(The live run must only clear category_final/category_final_source — category_keyword and category_llm are untouched either way, this line just flags rows with nothing there to begin with.)')

  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
