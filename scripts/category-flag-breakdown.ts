// docs/raven/S4_Categorisation_Review_UI_Change.md §3.2 / §5 "Not done" —
// the manuscript's per-condition flag breakdown ("Of the posts reviewed, X
// were flagged for method disagreement, Y for automated non-determination,
// Z for an entertainment suggestion, and W for caption length").
// category_flag_reasons is frozen the moment category_final is set
// (lib/data/category-flags.ts only recomputes queue rows), and every
// condition is a pure function of one post's own fields, so this is a
// stable read — reported counts won't drift as later posts get reviewed.
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import type { CategoryFlagReason } from '../app/generated/prisma/client'

const REASON_ORDER: CategoryFlagReason[] = ['DISAGREEMENT', 'UNCLASSIFIED', 'ENTERTAINMENT_SUGGESTED', 'SHORT_CAPTION']

async function main() {
  // Excludes MANUAL_GROUND_TRUTH: those 200 posts were coded externally,
  // never entered the S4 queue, and never had flags computed (§3.1).
  const reviewed = await prisma.facebookPost.findMany({
    where: { category_final: { not: null }, category_final_source: { in: ['ACCEPTED_SUGGESTION', 'MANUAL_OVERRIDE'] } },
    select: { id: true, category_flag_reasons: true },
  })

  const n = reviewed.length
  const counts = new Map<CategoryFlagReason, number>(REASON_ORDER.map((r) => [r, 0]))
  let unflagged = 0

  for (const post of reviewed) {
    if (post.category_flag_reasons.length === 0) {
      unflagged++
      continue
    }
    for (const reason of post.category_flag_reasons) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1)
    }
  }

  console.log('=== S4 FLAG-CONDITION BREAKDOWN ===')
  console.log(`Posts reviewed (n)       : ${n}`)
  console.log(`Unflagged (batch-confirmed straight through) : ${unflagged}${n > 0 ? ` (${((unflagged / n) * 100).toFixed(1)}%)` : ''}`)
  console.log('')
  console.log('Flagged for (a post may count under more than one condition):')
  const widestReason = Math.max(...REASON_ORDER.map((r) => r.length))
  for (const reason of REASON_ORDER) {
    const count = counts.get(reason) ?? 0
    console.log(`  ${reason.padEnd(widestReason)} ${count}${n > 0 ? ` (${((count / n) * 100).toFixed(1)}%)` : ''}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
