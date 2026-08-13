import 'dotenv/config'
import { readFileSync } from 'fs'
import { prisma } from '../lib/prisma'
import { parseCsvBuffer } from '../lib/csv/parse'
import { parseGroundTruthLabel } from '../lib/ground-truth/label-map'

// Developer_Note_Ground_Truth_Labelling.md §5.1 — "We'll hand you a file
// with post_id, category. It sets category_final and stamps
// source = manual_ground_truth. A one-off admin import is fine; it doesn't
// need a polished UI."
//
// `post_id` in that handoff is assumed to be FacebookPost's internal `id`
// (the Int PK every other cross-reference in this app uses — CategoryAuditLog,
// the old ManualLabelSample — not the Facebook-assigned `post_id` string
// field). If the real CSV turns out to use the string post_id instead, this
// script falls back to matching on that column too, so a wrong assumption
// here doesn't hard-fail the import — it just gets reported per row.
//
// All-or-nothing: validates every row before writing anything, so a bad row
// can't partially contaminate the ground truth.
//
// USAGE
//   npx tsx scripts/import-ground-truth.ts <path-to-csv>

interface ParsedRow {
  rowNumber: number
  rawPostId: string
  label: import('../app/generated/prisma/client').CategoryLabel
}

// Postgres `integer` (FacebookPost.id's column type) is 32-bit, max 2147483647.
// Facebook's own post_id values are 16-digit and always overflow it, so only
// attempt the internal-id lookup when the value could plausibly fit.
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
    throw new Error('Usage: npx tsx scripts/import-ground-truth.ts <path-to-csv>')
  }

  const { rows } = parseCsvBuffer(readFileSync(csvPath))
  if (rows.length === 0) {
    throw new Error('CSV has no data rows')
  }

  const parseErrors: string[] = []
  const parsed: ParsedRow[] = []

  rows.forEach((row, index) => {
    const rowNumber = index + 2 // +1 for header, +1 for 1-indexing
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

  const assignedAt = new Date()
  let overwritten = 0
  for (const row of resolved) {
    const existing = await prisma.facebookPost.findUnique({
      where: { id: row.facebookPostId! },
      select: { category_final_source: true },
    })
    if (existing?.category_final_source) overwritten++

    await prisma.facebookPost.update({
      where: { id: row.facebookPostId! },
      data: {
        category_final: row.label,
        category_final_source: 'MANUAL_GROUND_TRUTH',
        category_final_assigned_by_id: null,
        category_final_assigned_at: assignedAt,
      },
    })
  }

  console.log(`Imported ${resolved.length} ground-truth labels.`)
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
