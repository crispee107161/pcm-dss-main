// One-off: adds the "Entertainment" content category (plus starter keywords
// for auto-categorization) to an already-seeded database. Safe to re-run —
// category name and keyword word are both unique columns, so this upserts
// rather than duplicating rows. Mirrors the category/keyword additions in
// prisma/seed.ts so a fresh `prisma db seed` and this script stay in sync.
//
// Usage: npx tsx scripts/add-entertainment-category.ts

import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const KEYWORDS = [
  'meme', 'funny', 'giveaway', 'contest', 'raffle', 'trivia', 'quiz',
  'fun fact', 'behind the scenes', 'vlog',
]

async function main() {
  const category = await prisma.category.upsert({
    where: { name: 'Entertainment' },
    create: { name: 'Entertainment' },
    update: {},
  })
  console.log(`Category: ${category.name} (id: ${category.id})`)

  for (const word of KEYWORDS) {
    await prisma.keyword.upsert({
      where: { word },
      create: { word, category_id: category.id },
      update: { category_id: category.id },
    })
    console.log(`Keyword: "${word}" -> Entertainment`)
  }

  console.log('Done.')
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
