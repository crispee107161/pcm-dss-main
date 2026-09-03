// docs/raven/Backlog_Coding_Export_Request.md §2 — dry run for nulling
// category_final/category_final_source on posts assigned through the S4
// interface (MANUAL_OVERRIDE/ACCEPTED_SUGGESTION) AFTER the 574
// legacy-nulling run (scripts/raven-574-run.ts, committed c20a026,
// 2026-08-26 00:03 +0800 / 2026-08-25T16:03Z), returning them to the queue
// so the corpus doesn't carry a second, uncontrolled label provenance
// alongside the blind codebook coding. READ-ONLY.
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { withStudyPeriod } from '../lib/data/study-period'

const CUTOFF = new Date('2026-08-25T16:03:25.000Z') // 574-run commit timestamp

async function main() {
  const candidates = await prisma.facebookPost.findMany({
    where: withStudyPeriod({
      category_final_source: { in: ['MANUAL_OVERRIDE', 'ACCEPTED_SUGGESTION'] },
      category_final_assigned_at: { gt: CUTOFF },
    }),
    select: {
      id: true, post_id: true, category_final: true, category_final_source: true,
      category_final_assigned_at: true, category_final_assigned_by_id: true,
    },
    orderBy: { category_final_assigned_at: 'asc' },
  })

  console.log('Rows that WOULD be nulled (assigned after 574-run cutoff', CUTOFF.toISOString(), '):', candidates.length)
  for (const p of candidates) {
    console.log(`  id=${p.id} post_id=${p.post_id} final=${p.category_final} source=${p.category_final_source} assigned_at=${p.category_final_assigned_at?.toISOString()} by_user=${p.category_final_assigned_by_id}`)
  }

  const currentQueue = await prisma.facebookPost.count({ where: withStudyPeriod({ category_final: null }) })
  console.log('\nCurrent in-period queue (category_final null):', currentQueue)
  console.log('Resulting queue after the run:', currentQueue + candidates.length)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
