// docs/raven/Export_Verified_Repair_Approved.md §2 — approved write for
// nulling category_final/category_final_source on posts assigned through the
// S4 interface (MANUAL_OVERRIDE/ACCEPTED_SUGGESTION) AFTER the 574
// legacy-nulling run (scripts/raven-574-run.ts, committed c20a026,
// 2026-08-26 00:03 +0800 / 2026-08-25T16:03Z), returning them to the queue
// so the corpus doesn't carry a second, uncontrolled label provenance
// alongside the blind codebook coding. Candidates verified via
// raven-backlog-repair-dry-run.ts before this write.
//
// Scope: MANUAL_OVERRIDE and ACCEPTED_SUGGESTION only — deliberately excludes
// MANUAL_CHANGE_AFTER_FINALISATION (a third S4-interface provenance value,
// see actions/categorize.ts) and MANUAL_CODEBOOK_ASSIGNMENT (out-of-scope
// codebook coding, not S4). Checked 2026-09-04: zero in-period posts carried
// MANUAL_CHANGE_AFTER_FINALISATION after CUTOFF, so the narrower predicate
// below covered every row that actually needed repair.
//
// Already run once (2026-09-04): nulled exactly 3 posts — ids 24651/24652/
// 24653, post_ids 1439591281524093/1440342761448945/1440488374767717 — and
// restored the in-period queue from 516 to 519, matching Raven's own count.
// REPAIR_RUN_AT below closes the query window at that run, so this script is
// now a locked record of that one repair rather than a re-runnable broom: if
// S4 coding resumes and a similar cleanup is needed later, write a new
// dated script rather than re-running this one against a later cutoff.
//
// No CategoryAuditLog row was written for the reversal (unlike every
// app-driven write path). Considered adding one — CategoryAuditAction now
// has a SCRIPTED_REVERSAL value for it — but user_id is required and there
// is no system/service-user account: attributing it to Dan (the manager
// whose assignments this reverses) would misleadingly read as if he
// reversed his own work. Deferred rather than guessed; the record of what
// happened lives in this file's header and in
// docs/raven/Export_Verified_Repair_Approved.md. Revisit if a system-user
// concept gets added.
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { withStudyPeriod } from '../lib/data/study-period'

const CUTOFF = new Date('2026-08-25T16:03:25.000Z') // 574-run commit timestamp
const REPAIR_RUN_AT = new Date('2026-09-04T05:00:00.000Z') // upper bound: this script's one approved run
const EXPECTED_IDS = [24651, 24652, 24653]

function candidateWhere() {
  return withStudyPeriod({
    category_final_source: { in: ['MANUAL_OVERRIDE', 'ACCEPTED_SUGGESTION'] as const },
    category_final_assigned_at: { gt: CUTOFF, lt: REPAIR_RUN_AT },
  })
}

async function main() {
  const candidates = await prisma.facebookPost.findMany({
    where: candidateWhere(),
    select: { id: true, post_id: true },
    orderBy: { category_final_assigned_at: 'asc' },
  })

  const candidateIds = candidates.map((p) => p.id).sort((a, b) => a - b)
  const idsMatch = candidateIds.length === EXPECTED_IDS.length
    && candidateIds.every((id, i) => id === EXPECTED_IDS[i])
  if (!idsMatch) {
    console.error('ABORTING: candidate set does not match the approved repair.')
    console.error('  expected ids:', EXPECTED_IDS)
    console.error('  found ids:   ', candidateIds)
    console.error('This script is locked to the one repair approved in Export_Verified_Repair_Approved.md §2.')
    console.error('If a new batch needs the same treatment, write a new dated script instead of widening this one.')
    process.exitCode = 1
    return
  }

  console.log('Nulling', candidates.length, 'posts:', candidates.map((p) => p.post_id).join(', '))

  const result = await prisma.$transaction(async (tx) => {
    // Re-apply the read predicate (not just the id list) so a row that
    // drifted out of scope between the read and the write — e.g. a Manager
    // editing it in the S4 UI in the gap — can't be nulled anyway.
    return tx.facebookPost.updateMany({
      where: {
        AND: [candidateWhere(), { id: { in: candidateIds } }],
      },
      data: {
        category_final: null,
        category_final_source: null,
        category_final_assigned_at: null,
        category_final_assigned_by_id: null,
      },
    })
  })

  console.log('Rows updated:', result.count)

  const currentQueue = await prisma.facebookPost.count({ where: withStudyPeriod({ category_final: null }) })
  console.log('In-period queue (category_final null) after run:', currentQueue)

  console.log('\n=== CATEGORY_FINAL_SOURCE BREAKDOWN AFTER RUN (all posts, not study-period-scoped) ===')
  const bySource = await prisma.facebookPost.groupBy({ by: ['category_final_source'], _count: true })
  console.log(bySource)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
