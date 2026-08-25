import 'dotenv/config'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { prisma } from '../lib/prisma'
import { parseCsvBuffer } from '../lib/csv/parse'
import { validatePostsRows } from '../lib/csv/validate-posts'
import { upsertPosts } from '../lib/db/upsert-posts'

// One-off backfill (run 2026-08-12): FR-28 needs duration_sec/avg_seconds_viewed
// on FacebookPost. Those columns already existed in the schema but
// validate-posts.ts never parsed them until this session, so every
// already-ingested post has them null. Re-runs the real ingestion pipeline
// (validatePostsRows -> upsertPosts) against the raw source files still on
// disk, which updates existing rows in place via the normal upsert path.
//
// Same known gap as scripts/backfill-null-views.ts: source files for
// Apr-Jul 2025 (186 of 916 posts) no longer exist under data/, so those
// posts' watch-through fields stay null — they were never video/reel-heavy
// months in a way that's separately verifiable, so this is disclosed, not
// silently worked around.
const DATA_DIR = join(__dirname, '..', 'data', 'FB_OrganicPosts_Data')

async function main() {
  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.csv')).sort()
  console.log(`Found ${files.length} files in ${DATA_DIR}`)

  let totalInserted = 0
  let totalUpdated = 0
  let totalUnchanged = 0

  for (const file of files) {
    const buffer = readFileSync(join(DATA_DIR, file))
    const { rows } = parseCsvBuffer(buffer)
    const { valid: records, rejected } = validatePostsRows(rows)
    if (rejected.length > 0) {
      console.log(`${file}: ${rejected.length} row(s) rejected: ${rejected.map(r => `row ${r.row}: ${r.reason}`).join('; ')}`)
    }
    const counts = await upsertPosts(records)
    totalInserted += counts.inserted
    totalUpdated += counts.updated
    totalUnchanged += counts.unchanged
    console.log(`${file}: ${rows.length} rows -> inserted=${counts.inserted} updated=${counts.updated} unchanged=${counts.unchanged}`)
  }

  console.log('---')
  console.log(`TOTAL: inserted=${totalInserted} updated=${totalUpdated} unchanged=${totalUnchanged}`)

  const withBoth = await prisma.facebookPost.count({
    where: { duration_sec: { not: null }, avg_seconds_viewed: { not: null } },
  })
  console.log(`Posts with both duration_sec and avg_seconds_viewed: ${withBoth}`)
}

main().finally(() => prisma.$disconnect())
