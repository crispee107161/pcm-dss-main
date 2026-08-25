// Read-only. For every month boundary the corpus spans, list every
// FacebookPost whose Manila-local publish_time falls within 12 hours of
// that boundary — i.e. every candidate for the "Meta's export tool
// misfiled this post into the adjacent month's file" failure mode already
// confirmed once (post 1142974524519105, Jul-file/Aug-Manila).
//
// This cannot say which file a given post actually arrived in (no FK from
// FacebookPost to UploadLog, and created_at doesn't cluster by upload
// event — see raven-731-reconciliation.ts). It catalogs every plausible
// candidate so a human can decide which merit checking against the
// client's original exports.
import 'dotenv/config'
import { prisma } from '../lib/prisma'

const WINDOW_HOURS = 12
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000

function manilaMidnight(year: number, month1to12: number): Date {
  // month1to12 is 1-indexed; Date.UTC month is 0-indexed. This gives Manila
  // local midnight expressed as a UTC instant (Manila = UTC+8).
  return new Date(Date.UTC(year, month1to12 - 1, 1, -8, 0, 0))
}

async function main() {
  const all = await prisma.facebookPost.findMany({
    select: { post_id: true, publish_time: true, category_final_source: true },
    orderBy: { publish_time: 'asc' },
  })

  // Every first-of-month boundary from Apr 2025 through Aug 2026 (covers
  // all sixteen months' start and end boundaries).
  const boundaries: Date[] = []
  for (let y = 2025; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === 2025 && m < 4) continue
      if (y === 2026 && m > 8) continue
      boundaries.push(manilaMidnight(y, m))
    }
  }

  console.log(`=== Posts within ${WINDOW_HOURS}h of a Manila month-boundary ===`)
  let count = 0
  for (const p of all) {
    for (const b of boundaries) {
      const diff = Math.abs(p.publish_time.getTime() - b.getTime())
      if (diff <= WINDOW_MS) {
        const manila = new Date(p.publish_time.getTime() + 8 * 60 * 60 * 1000)
        count++
        console.log(`  ${p.post_id}  publish_time(UTC)=${p.publish_time.toISOString()}  manila=${manila.toISOString().slice(0, 16).replace('T', ' ')}  source=${p.category_final_source ?? 'NULL'}  boundary=${b.toISOString().slice(0, 10)}`)
        break
      }
    }
  }
  console.log(`\ntotal candidates within ${WINDOW_HOURS}h of any month boundary: ${count}`)

  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
