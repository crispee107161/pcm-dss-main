import 'dotenv/config'
import { readFileSync } from 'fs'
import { prisma } from '../lib/prisma'
import { parseCsvBuffer } from '../lib/csv/parse'
import { parseGroundTruthLabel } from '../lib/ground-truth/label-map'

// docs/raven-review/Content_Counts_and_Backlog.md §3.2 (A8) — imports the
// researchers' retrospective coding of the post-574-requeue backlog, using
// the same codebook and caption-only procedure as the 200-post
// MANUAL_GROUND_TRUTH sample (docs/notes/CODEBOOK_content_categories.md),
// but stamped MANUAL_CODEBOOK_ASSIGNMENT so Chapter 4 can tell the two
// apart and the locked benchmark is never confused with this backlog.
//
// Mirrors import-ground-truth.ts's CSV shape and all-or-nothing validation,
// with one addition: any row whose post already carries
// category_final_source = MANUAL_GROUND_TRUTH is refused outright, not
// merely counted as "overwritten" — that sample must never be touched by
// this path.
//
// USAGE
//   npx tsx scripts/import-codebook-assignment.ts <path-to-csv>

interface ParsedRow {
  rowNumber: number
  rawPostId: string
  label: import('../app/generated/prisma/client').CategoryLabel
}

// Same 32-bit Postgres integer guard as import-ground-truth.ts.
const POSTGRES_INT4_MAX = 2147483647

async function resolveFacebookPostId(rawPostId: string): Promise<number | null> {
  const asInt = parseInt(rawPostId, 10)
  if (Number.isInteger(asInt) && asInt <= POSTGRES_INT4_MAX && String(asInt) === rawPostId.trim()) {
    const byInternalId = await prisma.facebookPost.findUnique({ where: { id: asInt }, select: { id: true } })
    if (byInternalId) return byInternalId.id
  }
  const byExternalId = await prisma.facebookPost.findUnique({ where: { post_id: rawPostId.trim() }, select: { id: true } })
  return byExternalId?.id ?? null
}

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) {
    throw new Error('Usage: npx tsx scripts/import-codebook-assignment.ts <path-to-csv>')
  }

  const { rows } = parseCsvBuffer(readFileSync(csvPath))
  if (rows.length === 0) {
    throw new Error('CSV has no data rows')
  }

  const parseErrors: string[] = []
  const parsed: ParsedRow[] = []

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const rawPostId = row.post_id
    const rawCategory = row.category

    if (!rawPostId) {
      parseErrors.push(`Row ${rowNumber}: missing post_id`)
      return
    }
    if (!rawCategory) {
      parseErrors.push(`Row ${rowNumber}: missing category`)
      return
    }
    const label = parseGroundTruthLabel(rawCategory)
    if (!label) {
      parseErrors.push(`Row ${rowNumber}: invalid category "${rawCategory}" (post_id ${rawPostId})`)
      return
    }
    parsed.push({ rowNumber, rawPostId, label })
  })

  if (parseErrors.length > 0) {
    throw new Error(`Aborting — ${parseErrors.length} row(s) failed validation:\n${parseErrors.join('\n')}`)
  }

  const resolved = await Promise.all(
    parsed.map(async (row) => ({ ...row, facebookPostId: await resolveFacebookPostId(row.rawPostId) }))
  )
  const unresolved = resolved.filter((r) => r.facebookPostId === null)
  if (unresolved.length > 0) {
    throw new Error(
      `Aborting — ${unresolved.length} post_id(s) matched no FacebookPost (checked both internal id and post_id):\n` +
        unresolved.map((r) => `Row ${r.rowNumber}: post_id ${r.rawPostId}`).join('\n')
    )
  }

  const existingSources = await prisma.facebookPost.findMany({
    where: { id: { in: resolved.map((r) => r.facebookPostId!) } },
    select: { id: true, category_final_source: true },
  })
  const sourceById = new Map(existingSources.map((p) => [p.id, p.category_final_source]))

  const lockedGroundTruth = resolved.filter((r) => sourceById.get(r.facebookPostId!) === 'MANUAL_GROUND_TRUTH')
  if (lockedGroundTruth.length > 0) {
    throw new Error(
      `Aborting — ${lockedGroundTruth.length} row(s) target a post already locked as MANUAL_GROUND_TRUTH, which this script must never overwrite:\n` +
        lockedGroundTruth.map((r) => `Row ${r.rowNumber}: post_id ${r.rawPostId}`).join('\n')
    )
  }

  const assignedAt = new Date()
  let overwritten = 0
  for (const row of resolved) {
    if (sourceById.get(row.facebookPostId!)) overwritten++

    await prisma.facebookPost.update({
      where: { id: row.facebookPostId! },
      data: {
        category_final: row.label,
        category_final_source: 'MANUAL_CODEBOOK_ASSIGNMENT',
        category_final_assigned_by_id: null,
        category_final_assigned_at: assignedAt,
      },
    })
  }

  console.log(`Imported ${resolved.length} codebook assignment(s).`)
  if (overwritten > 0) {
    console.log(`${overwritten} of those already had a category_final_source set and were overwritten.`)
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
