import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { withStudyPeriod } from '../lib/data/study-period'
import { recomputeQueueFlagReasons } from '../lib/data/category-flags'

// docs/raven/Content_Second_Pass.md §4 — computeFlagReasons (lib/categorize/
// flag-reasons.ts) fired DISAGREEMENT whenever one method returned
// UNCLASSIFIED and the other a real category, alongside the UNCLASSIFIED
// reason itself — two contradictory reasons on the same post. Fixed at the
// source; this repairs category_flag_reasons already persisted under the old
// logic so the fix is visible without waiting for the next classification
// run to touch each affected post.
//
// USAGE
//   npx tsx scripts/recompute-flags-post-disagreement-fix.ts --dry-run
//   npx tsx scripts/recompute-flags-post-disagreement-fix.ts

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  // Code review (2026-09-05) — recomputeQueueFlagReasons only ever touches
  // withStudyPeriod rows (it's the queue's own scope). This query used to
  // run unscoped, so the dry-run's count included out-of-period posts the
  // write below was never going to change, overstating what the run did.
  const before = await prisma.facebookPost.findMany({
    where: withStudyPeriod({ category_final: null, category_flag_reasons: { has: 'DISAGREEMENT' } }),
    select: { id: true, category_keyword: true, category_llm: true, category_flag_reasons: true },
  })
  const stale = before.filter((p) => p.category_keyword === 'UNCLASSIFIED' || p.category_llm === 'UNCLASSIFIED')

  console.log(`${before.length} in-period queued post(s) currently carry DISAGREEMENT; ${stale.length} of those involve an UNCLASSIFIED side and will lose it.`)
  for (const p of stale) {
    console.log(`  id=${p.id} keyword=${p.category_keyword} llm=${p.category_llm} reasons=${p.category_flag_reasons.join(',')}`)
  }

  if (dryRun) {
    console.log('\nDry run — no writes made.')
    await prisma.$disconnect()
    return
  }

  await recomputeQueueFlagReasons()
  console.log('Queue flag reasons recomputed.')

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
