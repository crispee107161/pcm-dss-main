import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { withStudyPeriod } from '../lib/data/study-period'
import type { CategoryFlagReason } from '../app/generated/prisma/client'

const SINGLE: CategoryFlagReason[][] = [
  ['DISAGREEMENT'],
  ['UNCLASSIFIED'],
  ['ENTERTAINMENT_SUGGESTED'],
  ['SHORT_CAPTION'],
]

async function main() {
  const queue = await prisma.facebookPost.findMany({
    where: withStudyPeriod({ category_final: null }),
    select: { id: true, post_id: true, category_flag_reasons: true, category_keyword: true, category_llm: true, title: true, description: true },
    orderBy: { id: 'asc' },
  })

  for (const target of SINGLE) {
    const pure = queue.filter(p =>
      p.category_flag_reasons.length === target.length &&
      target.every(r => p.category_flag_reasons.includes(r))
    )
    console.log(`\nPURE ${target.join('+')}: ${pure.length} candidates`)
    for (const p of pure.slice(0, 4)) {
      const caption = (p.title ?? '').length >= (p.description ?? '').length ? p.title : p.description
      console.log(`  id=${p.id} post_id=${p.post_id} kw=${p.category_keyword} llm=${p.category_llm} caption="${(caption ?? '').slice(0, 50)}"`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
