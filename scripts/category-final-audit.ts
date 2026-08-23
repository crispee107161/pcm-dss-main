// docs/raven/Provenance_Followup_and_Revised_Order.md §2.3 and
// docs/raven/Content_Filters_Review.md §3/§9 Q4 — read-only audit. Answers:
// (1) which account set category_final on which post, and when, so we can
// confirm or refute the "group member on the Marketing Manager account"
// concern; (2) which Groq model actually produced the currently-stored
// category_llm values, since commit a308813 (23 Aug) replaced the pinned
// 'llama-3.1-8b-instant' constant with a runtime auto-resolver; (3) the true
// row counts behind the four Content-screen filters, to settle
// Content_Filters_Review §1's "All and Categorised return identical rows"
// report against the actual `whereForFilter` predicates rather than a read
// of the source code alone.
//
// Read-only: no Prisma write calls anywhere in this file.
import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  // --- (1) who set category_final, grouped by account ---
  console.log('=== CATEGORY_FINAL ASSIGNMENTS BY ACCOUNT ===')
  const assignments = await prisma.facebookPost.findMany({
    where: { category_final: { not: null } },
    select: {
      id: true,
      post_id: true,
      category_final: true,
      category_final_source: true,
      category_final_assigned_at: true,
      category_final_assigned_by: { select: { id: true, email: true, role: true } },
    },
    orderBy: { category_final_assigned_at: 'asc' },
  })
  console.log('total posts with category_final set:', assignments.length)

  const byAccount = new Map<string, { email: string; role: string; count: number; first: Date | null; last: Date | null }>()
  let noAssignedBy = 0
  for (const p of assignments) {
    if (!p.category_final_assigned_by) { noAssignedBy++; continue }
    const key = p.category_final_assigned_by.email
    const entry = byAccount.get(key) ?? {
      email: p.category_final_assigned_by.email,
      role: p.category_final_assigned_by.role,
      count: 0,
      first: null,
      last: null,
    }
    entry.count++
    const at = p.category_final_assigned_at
    if (at) {
      if (!entry.first || at < entry.first) entry.first = at
      if (!entry.last || at > entry.last) entry.last = at
    }
    byAccount.set(key, entry)
  }
  console.log('posts with category_final set but no assigned_by (legacy/ground-truth import):', noAssignedBy)
  console.log('breakdown by account:')
  for (const [, entry] of byAccount) {
    console.log(`  ${entry.email} (${entry.role}): ${entry.count} posts, first=${entry.first?.toISOString()}, last=${entry.last?.toISOString()}`)
  }

  // Flag any assignment with an unusual local hour (23:00-06:00), since
  // that's the concrete pattern both memos flagged (2:54 AM, 3:43 AM, 3:51 AM).
  console.log('\n=== ASSIGNMENTS BETWEEN 23:00 AND 06:00 (server-local) ===')
  const oddHours = assignments.filter((p) => {
    const at = p.category_final_assigned_at
    if (!at) return false
    const h = at.getHours()
    return h >= 23 || h < 6
  })
  for (const p of oddHours) {
    console.log(`  post_id=${p.post_id} at=${p.category_final_assigned_at?.toISOString()} by=${p.category_final_assigned_by?.email ?? 'NULL'} source=${p.category_final_source}`)
  }
  console.log('count:', oddHours.length)

  // --- (2) LLM run history: which model produced the live category_llm values ---
  console.log('\n=== LLM CLASSIFICATION RUN HISTORY ===')
  const runs = await prisma.llmClassificationRun.findMany({
    orderBy: { run_at: 'asc' },
    select: { id: true, model_name: true, run_at: true, succeeded: true, post_ids: true },
  })
  console.log('total runs:', runs.length)
  const byModel = new Map<string, { count: number; succeeded: number; first: Date; last: Date; totalPosts: number }>()
  for (const r of runs) {
    const entry = byModel.get(r.model_name) ?? { count: 0, succeeded: 0, first: r.run_at, last: r.run_at, totalPosts: 0 }
    entry.count++
    if (r.succeeded) entry.succeeded++
    if (r.run_at < entry.first) entry.first = r.run_at
    if (r.run_at > entry.last) entry.last = r.run_at
    entry.totalPosts += r.post_ids.length
    byModel.set(r.model_name, entry)
  }
  for (const [model, entry] of byModel) {
    console.log(`  ${model}: ${entry.count} runs (${entry.succeeded} succeeded), ${entry.totalPosts} post_ids covered, first=${entry.first.toISOString()}, last=${entry.last.toISOString()}`)
  }
  if (runs.length > 0) {
    console.log(`most recent run: model=${runs[runs.length - 1].model_name} at=${runs[runs.length - 1].run_at.toISOString()}`)
  }

  // --- (3) true row counts behind the four Content-screen filters ---
  console.log('\n=== CONTENT FILTER ROW COUNTS ===')
  const [total, finalNotNull, finalNull, unassigned, groundTruth, categorisedExclUnassigned] = await Promise.all([
    prisma.facebookPost.count(),
    prisma.facebookPost.count({ where: { category_final: { not: null } } }),
    prisma.facebookPost.count({ where: { category_final: null } }),
    prisma.facebookPost.count({ where: { category_final: 'UNCLASSIFIED' } }),
    prisma.facebookPost.count({ where: { category_final_source: 'MANUAL_GROUND_TRUTH' } }),
    prisma.facebookPost.count({ where: { category_final: { not: null, notIn: ['UNCLASSIFIED'] } } }),
  ])
  console.log({
    all: total,
    'needs-review (category_final IS NULL)': finalNull,
    'categorised (category_final NOT NULL, excl. UNCLASSIFIED)': categorisedExclUnassigned,
    'unassigned (category_final = UNCLASSIFIED)': unassigned,
    'category_final IS NOT NULL (raw)': finalNotNull,
    'ground truth (MANUAL_GROUND_TRUTH)': groundTruth,
  })
  console.log('sanity check: needs-review + categorised + unassigned should equal all:', finalNull + categorisedExclUnassigned + unassigned, '==', total)

  // --- provenance-source breakdown, to size the "legacy null" backfill ---
  console.log('\n=== CATEGORY_FINAL_SOURCE BREAKDOWN ===')
  const bySource = await prisma.facebookPost.groupBy({ by: ['category_final_source'], _count: true })
  console.log(bySource)

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
