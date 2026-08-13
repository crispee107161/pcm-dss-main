import 'dotenv/config'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { prisma } from '../lib/prisma'
import { parseCsvBuffer } from '../lib/csv/parse'

// One-off backfill (run 2026-08-12): `views` was made nullable (migration
// 20260812161337_make_post_views_nullable) so FR-19/ALG-07 can exclude
// genuinely-blank Views cells instead of treating them as 0. Existing rows
// were ingested before this change, when validate-posts.ts coerced blank
// Views to 0 (parseIntOrZero) — that distinction is unrecoverable from the
// DB alone, so this re-reads the raw source files (data/FB_OrganicPosts_Data)
// to find which post_ids had a truly blank Views cell and nulls those rows.
//
// Known gap: the raw source files for Apr/May/Jun/Jul-2025 (186 of the
// dataset's 916 posts) no longer exist anywhere under data/ — they were
// superseded by later re-exports under different filenames/page IDs (see
// UploadLog). This script can only re-verify the 730 posts whose source
// files are still present. mvp.md's original reference figure ("1 post with
// blank Views" out of 730) matches exactly what this script finds against
// that same 730-post subset, which is reassuring but not proof the missing
// 186 contain zero blanks — flagged, not silently assumed away.
async function main() {
  const dir = join(__dirname, '..', 'data', 'FB_OrganicPosts_Data')
  const files = readdirSync(dir).filter(f => f.endsWith('.csv'))

  const blankViewsPostIds = new Set<string>()
  let totalRows = 0

  for (const file of files) {
    const buffer = readFileSync(join(dir, file))
    const { rows } = parseCsvBuffer(buffer)
    totalRows += rows.length
    for (const row of rows) {
      const postId = (row['Post ID'] ?? '').trim()
      const rawViews = row['Views'] ?? row['Video views'] ?? row['3-second video plays']
      if (postId && (!rawViews || rawViews.trim() === '')) {
        blankViewsPostIds.add(postId)
      }
    }
  }

  console.log(`Scanned ${files.length} files, ${totalRows} raw rows.`)
  console.log(`Found ${blankViewsPostIds.size} post_id(s) with a genuinely blank Views cell.`)

  if (blankViewsPostIds.size === 0) {
    console.log('Nothing to backfill.')
    return
  }

  const result = await prisma.facebookPost.updateMany({
    where: { post_id: { in: [...blankViewsPostIds] } },
    data: { views: null },
  })

  console.log(`Updated ${result.count} FacebookPost row(s) to views = NULL.`)
  console.log([...blankViewsPostIds])
}

main().finally(() => prisma.$disconnect())
