// Read-only diagnostic for docs/raven/731st_Post_Reconciliation_and_574_Greenlight_v2.md
// §1 (table-basis reconciliation) and §2 (cross-month misfiling count).
//
// Ground truth here is the raw Facebook export CSVs still on disk under
// data/FB_OrganicPosts_Data and data/Organic Posts, NOT reconstructed
// FacebookPost.created_at timestamps — an earlier version of this script
// tried correlating via created_at and found the rows don't cluster by
// upload event at all (all early-month rows share nearly the same
// created_at, days apart from their declared uploaded_at), meaning the DB
// has no reliable per-row upload lineage. The raw CSVs are the only
// authoritative record of "which file did this post arrive in."
//
// "Publish time" in the raw export is already Manila local (no tz marker;
// lib/csv/validate-posts.ts's parsePublishTime treats it as such directly),
// so no UTC conversion is needed here — just parse the month straight out
// of the column.
//
// No Prisma write calls; no writes to the CSVs.
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function declaredMonthKeyFromFilename(filename: string): string | null {
  const match = filename.match(/^([A-Za-z]{3})-\d{1,2}-(\d{4})_/)
  if (!match) return null
  const monthIdx = MONTH_NAMES.indexOf(match[1])
  if (monthIdx === -1) return null
  return `${match[2]}-${String(monthIdx + 1).padStart(2, '0')}`
}

// "MM/DD/YYYY HH:MM" -> "YYYY-MM"
function publishMonthKey(publishRaw: string): string | null {
  const m = publishRaw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+\d{1,2}:\d{2}$/)
  if (!m) return null
  const [, mm, , yyyy] = m
  return `${yyyy}-${mm.padStart(2, '0')}`
}

const DIRS = [
  path.join('data', 'FB_OrganicPosts_Data'),
  path.join('data', 'Organic Posts'),
]

interface FileRow { post_id: string; publishRaw: string }

function readCsv(filePath: string): FileRow[] {
  const content = fs.readFileSync(filePath, 'utf8')
  const parsed = Papa.parse<Record<string, string>>(content, { header: true, skipEmptyLines: true })
  return parsed.data
    .filter((row) => row['Post ID'])
    .map((row) => ({ post_id: row['Post ID'].trim(), publishRaw: row['Publish time'] ?? '' }))
}

async function main() {
  const files: { filename: string; fullPath: string }[] = []
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue
    for (const filename of fs.readdirSync(dir)) {
      if (filename.endsWith('.csv')) files.push({ filename, fullPath: path.join(dir, filename) })
    }
  }
  files.sort((a, b) => a.filename.localeCompare(b.filename))

  console.log(`=== Raw export files found on disk: ${files.length} ===`)
  for (const f of files) console.log(`  ${f.fullPath}`)

  console.log('\n=== §1/§2: per-file row count, declared month, and Manila-publish-month mismatches ===')
  let totalRows = 0
  let totalMismatched = 0
  const allMismatches: { post_id: string; publishRaw: string; publishMonth: string; declaredMonth: string; filename: string }[] = []
  const seenPostIds = new Map<string, string>() // post_id -> filename, to flag the same post appearing in two on-disk exports

  for (const f of files) {
    const declaredMonth = declaredMonthKeyFromFilename(f.filename)
    const rows = readCsv(f.fullPath)
    let mismatched = 0
    for (const row of rows) {
      totalRows++
      const pubMonth = publishMonthKey(row.publishRaw)
      if (!pubMonth || !declaredMonth) continue
      if (pubMonth !== declaredMonth) {
        mismatched++
        totalMismatched++
        allMismatches.push({ post_id: row.post_id, publishRaw: row.publishRaw, publishMonth: pubMonth, declaredMonth, filename: f.filename })
      }
      const prevFile = seenPostIds.get(row.post_id)
      if (prevFile && prevFile !== f.filename) {
        console.log(`  NOTE: post_id ${row.post_id} appears in both ${prevFile} and ${f.filename}`)
      }
      seenPostIds.set(row.post_id, f.filename)
    }
    console.log(`  ${f.filename}: declaredMonth=${declaredMonth} rows=${rows.length} mismatched=${mismatched}`)
  }

  console.log(`\n=== TOTALS across ${files.length} on-disk raw export files ===`)
  console.log(`total rows parsed: ${totalRows}`)
  console.log(`rows whose Manila publish month != the file's declared month: ${totalMismatched}`)
  for (const m of allMismatches) console.log('  ', m)
}

main().catch((e) => { console.error(e); process.exit(1) })
