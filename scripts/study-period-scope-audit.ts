// docs/raven/ Study_Period_Scope_Audit.md — read-only audit. Answers the
// priority question first (§9/§2.1): how many of the 200 MANUAL_GROUND_TRUTH
// posts fall outside the declared study period (2025-08-01 to 2026-07-31),
// then the full §2 cross-tab of category_final_source x publish period, then
// the UploadLog month listing.
//
// Read-only: no Prisma write calls anywhere in this file.
import 'dotenv/config'
import { prisma } from '../lib/prisma'

// publish_time is stored as UTC after being anchored to Asia/Manila (+08:00) at
// ingestion (lib/csv/timezone.ts) — the study period is defined in Manila local
// calendar dates, so these boundaries must be Manila midnight, not UTC midnight.
const STUDY_START = new Date('2025-08-01T00:00:00.000+08:00')
const STUDY_END = new Date('2026-08-01T00:00:00.000+08:00') // exclusive upper bound (i.e. through 2026-07-31 Manila time)

function period(publish_time: Date): 'in' | 'before' | 'after' {
  if (publish_time < STUDY_START) return 'before'
  if (publish_time >= STUDY_END) return 'after'
  return 'in'
}

async function main() {
  // --- §9: the ground-truth row, run first ---
  console.log('=== GROUND TRUTH (MANUAL_GROUND_TRUTH) x STUDY PERIOD ===')
  const groundTruth = await prisma.facebookPost.findMany({
    where: { category_final_source: 'MANUAL_GROUND_TRUTH' },
    select: { id: true, post_id: true, publish_time: true },
  })
  const gtCounts = { in: 0, before: 0, after: 0 }
  const gtOutOfPeriod: { post_id: string; publish_time: string; bucket: string }[] = []
  for (const p of groundTruth) {
    const b = period(p.publish_time)
    gtCounts[b]++
    if (b !== 'in') gtOutOfPeriod.push({ post_id: p.post_id, publish_time: p.publish_time.toISOString(), bucket: b })
  }
  console.log('total ground-truth rows:', groundTruth.length)
  console.log('in-period:', gtCounts.in, '| before study:', gtCounts.before, '| after study:', gtCounts.after)
  if (gtOutOfPeriod.length > 0) {
    console.log('out-of-period ground-truth rows:')
    for (const r of gtOutOfPeriod) console.log(' ', r)
  }

  // --- §2: full cross-tab, category_final_source x period ---
  console.log('\n=== §2 CROSS-TAB: category_final_source x publish period ===')
  const all = await prisma.facebookPost.findMany({
    select: { category_final_source: true, publish_time: true },
  })
  const table = new Map<string, { in: number; before: number; after: number; total: number }>()
  const totals = { in: 0, before: 0, after: 0 }
  for (const p of all) {
    const key = p.category_final_source ?? 'NULL (queue)'
    const entry = table.get(key) ?? { in: 0, before: 0, after: 0, total: 0 }
    const b = period(p.publish_time)
    entry[b]++
    entry.total++
    totals[b]++
    table.set(key, entry)
  }
  for (const [source, entry] of table) {
    console.log(`  ${source}: in=${entry.in} before=${entry.before} after=${entry.after} total=${entry.total}`)
  }
  console.log(`  TOTAL: in=${totals.in} before=${totals.before} after=${totals.after} total=${all.length}`)

  // --- confirm whether in-period total lands on 730 ---
  console.log('\nin-period total vs manuscript figure 730:', totals.in, totals.in === 730 ? '(MATCH)' : '(MISMATCH)')

  // --- UploadLog: the sixteen POSTS_CSV uploads and their coverage ---
  console.log('\n=== UploadLog: POSTS_CSV uploads ===')
  const uploads = await prisma.uploadLog.findMany({
    where: { upload_type: 'POSTS_CSV' },
    orderBy: { uploaded_at: 'asc' },
    select: { id: true, filename: true, status: true, records_inserted: true, records_updated: true, records_superseded: true, uploaded_at: true },
  })
  console.log('total POSTS_CSV upload rows:', uploads.length)
  for (const u of uploads) {
    console.log(`  [${u.id}] ${u.filename} status=${u.status} inserted=${u.records_inserted} updated=${u.records_updated} superseded=${u.records_superseded} uploaded_at=${u.uploaded_at.toISOString()}`)
  }

  // --- extra months (outside Aug 2025 - Jul 2026), and how many posts each contributed ---
  console.log('\n=== Posts grouped by publish month, flagging out-of-period months ===')
  const monthCounts = new Map<string, number>()
  for (const p of all) {
    // Manila-local month, matching the ingestion anchor (lib/csv/timezone.ts)
    const manila = new Date(p.publish_time.getTime() + 8 * 60 * 60 * 1000)
    const monthKey = `${manila.getUTCFullYear()}-${String(manila.getUTCMonth() + 1).padStart(2, '0')}`
    monthCounts.set(monthKey, (monthCounts.get(monthKey) ?? 0) + 1)
  }
  const sortedMonths = [...monthCounts.entries()].sort(([a], [b]) => a.localeCompare(b))
  for (const [month, count] of sortedMonths) {
    const inPeriod = month >= '2025-08' && month <= '2026-07'
    console.log(`  ${month}: ${count} posts${inPeriod ? '' : '  <-- OUT OF PERIOD'}`)
  }

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
