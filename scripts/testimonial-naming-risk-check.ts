// docs/raven/Account_Items_Reply_2026-09-04.md — flags the TESTIMONIAL
// category as a possible customer-naming risk, never sampled. Read-only:
// pulls every post whose live final category is TESTIMONIAL and prints its
// resolved caption for manual review before the panel sees this claim.
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { resolveCaption } from '../lib/keywords/caption'

async function main() {
  const posts = await prisma.facebookPost.findMany({
    where: { category_final: 'TESTIMONIAL' },
    select: { id: true, post_id: true, title: true, description: true, category_final_source: true },
    orderBy: { id: 'asc' },
  })

  console.log(`=== TESTIMONIAL captions (n=${posts.length}) ===\n`)

  // Heuristic flags only — not a substitute for eyeballing every row below.
  // Two consecutive capitalized words (possible First Last name), or a
  // common Filipino honorific immediately preceding a capitalized word.
  const namePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/
  const honorificPattern = /\b(Mr|Mrs|Ms|Miss|Dr|Sir|Ma'?am|Ate|Kuya|Tita|Tito)\.?\s+[A-Z][a-z]+/i

  let flagged = 0
  for (const p of posts) {
    const caption = resolveCaption(p.title, p.description) ?? '(no caption)'
    const hit = namePattern.test(caption) || honorificPattern.test(caption)
    if (hit) flagged++
    console.log(`--- post_id=${p.post_id} (id=${p.id}, source=${p.category_final_source}) ${hit ? '[POSSIBLE NAME]' : ''}`)
    console.log(caption)
    console.log('')
  }

  console.log(`=== ${flagged} of ${posts.length} heuristically flagged for manual confirmation ===`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
