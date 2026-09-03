// docs/raven/Backlog_Coding_Export_Request.md §3 — before exporting the
// coding backlog CSV, pick 10-15 in-period, category_final:null posts to
// hold back from the export/import so the S4 demo queue isn't emptied by
// the coding pass. Read-only: reports candidates, does not export or write.
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { withStudyPeriod } from '../lib/data/study-period'
import type { CategoryFlagReason } from '../app/generated/prisma/client'

async function main() {
  const queue = await prisma.facebookPost.findMany({
    where: withStudyPeriod({ category_final: null }),
    select: {
      id: true,
      post_id: true,
      category_flag_reasons: true,
      category_keyword: true,
      category_llm: true,
      title: true,
      description: true,
    },
    orderBy: { id: 'asc' },
  })

  const byReason = new Map<CategoryFlagReason, typeof queue>([
    ['DISAGREEMENT', []],
    ['UNCLASSIFIED', []],
    ['ENTERTAINMENT_SUGGESTED', []],
    ['SHORT_CAPTION', []],
  ])
  for (const p of queue) {
    for (const r of p.category_flag_reasons) {
      byReason.get(r)!.push(p)
    }
  }

  console.log('Queue size (in-period, category_final null):', queue.length)
  for (const [reason, posts] of byReason) {
    console.log(`\n${reason}: ${posts.length} candidates`)
    for (const p of posts.slice(0, 5)) {
      const caption = (p.title ?? '').length >= (p.description ?? '').length ? p.title : p.description
      console.log(`  id=${p.id} post_id=${p.post_id} kw=${p.category_keyword} llm=${p.category_llm} caption="${(caption ?? '').slice(0, 60)}"`)
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
