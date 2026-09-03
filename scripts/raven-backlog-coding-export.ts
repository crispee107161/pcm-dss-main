// docs/raven/Backlog_Coding_Export_Request.md §1 — exports the coding
// backlog CSV (post_id, caption only) for the in-period, category_final:null
// posts, EXCLUDING the §3 hold-back set (kept in the S4 queue for the
// defence demo, never sent for blind coding).
//
// Caption is resolveCaption(title, description) — the same "longer of Title
// or Description" rule the classifier reads (lib/keywords/caption.ts) — so
// the researchers code from exactly what the system saw. Empty-caption posts
// are included with an empty caption cell, per §1's explicit instruction not
// to filter them out.
import 'dotenv/config'
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma'
import { withStudyPeriod } from '../lib/data/study-period'
import { resolveCaption } from '../lib/keywords/caption'

// L-series fix (docs/raven/pr-review.md), same convention as fr31-dump.ts —
// resolved from this file's own location so the script writes to the same
// place regardless of the caller's cwd, rather than a 'scripts/output'
// relative path (correct only when run from the repo root, and ENOENT on a
// fresh clone since scripts/output/ is gitignored).
const OUTPUT_DIR = path.resolve(__dirname, 'output')

// §3 hold-back — 12 posts kept in the queue for the FR-07 defence demo,
// covering all four flag conditions (some posts satisfy more than one,
// which is realistic and not a problem): DISAGREEMENT, UNCLASSIFIED,
// ENTERTAINMENT_SUGGESTED, SHORT_CAPTION. Selected via
// scripts/raven-backlog-holdback-candidates{,2}.ts — proposal, not final;
// confirm before the CSV goes out.
const HOLD_BACK_IDS = new Set<number>([
  23713, 23715, 23717, // DISAGREEMENT
  23723, 23763, 23789, // UNCLASSIFIED
  23728, 23744, 23750, // ENTERTAINMENT_SUGGESTED
  23881, 24028, 24861, // SHORT_CAPTION
])

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

async function main() {
  const posts = await prisma.facebookPost.findMany({
    where: withStudyPeriod({ category_final: null }),
    select: { id: true, post_id: true, title: true, description: true },
    orderBy: { id: 'asc' },
  })

  const exportable = posts.filter((p) => !HOLD_BACK_IDS.has(p.id))
  const heldBackFound = posts.filter((p) => HOLD_BACK_IDS.has(p.id))

  const lines = ['post_id,caption']
  let emptyCaptionCount = 0
  for (const p of exportable) {
    const caption = resolveCaption(p.title, p.description) ?? ''
    if (caption === '') emptyCaptionCount++
    lines.push(`${csvEscape(p.post_id)},${csvEscape(caption)}`)
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })
  const outPath = path.join(OUTPUT_DIR, 'raven-backlog-coding-export.csv')
  writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8')

  console.log('Queue size (in-period, category_final null):', posts.length)
  console.log('Held back (found in queue):', heldBackFound.length, '/ requested', HOLD_BACK_IDS.size)
  if (heldBackFound.length !== HOLD_BACK_IDS.size) {
    const missing = [...HOLD_BACK_IDS].filter((id) => !heldBackFound.some((p) => p.id === id))
    console.log('  MISSING (not in queue — check IDs):', missing)
  }
  console.log('Exported rows:', exportable.length)
  console.log('Of those, empty caption:', emptyCaptionCount)
  console.log('Written to:', outPath)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
