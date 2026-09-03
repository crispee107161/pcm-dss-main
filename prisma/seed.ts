import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'
import bcryptjs from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Seed categories
  const categories = ['Product Showcase', 'Testimonial', 'Promotional Offer', 'Entertainment']
  const categoryRecords: Record<string, { id: number; name: string }> = {}

  for (const name of categories) {
    const cat = await prisma.category.upsert({
      where: { name },
      create: { name },
      update: {},
    })
    categoryRecords[name] = cat
    console.log(`Category: ${cat.name} (id: ${cat.id})`)
  }

  // Seed keywords
  const keywordMappings: Record<string, string[]> = {
    'Product Showcase': [
      'available', 'new arrival', 'introducing', 'now available', 'check out',
      'shop now', 'pc set', 'ryzen', 'gaming', 'laptop', 'cctv', 'camera',
      'comshop', 'computer shop', 'monitor', 'keyboard', 'mouse',
    ],
    'Testimonial': [
      'testimonial', 'customer', 'review', 'feedback', 'satisfied',
      'happy', 'client', 'legit', 'legit seller', 'trusted',
    ],
    'Promotional Offer': [
      'sale', 'promo', 'discount', 'off', 'deal', 'offer', 'free',
      'limited', 'bundle', 'package', 'savings', 'special', 'treat',
    ],
    'Entertainment': [
      'meme', 'funny', 'giveaway', 'contest', 'raffle', 'trivia', 'quiz',
      'fun fact', 'behind the scenes', 'vlog',
    ],
  }

  for (const [categoryName, keywords] of Object.entries(keywordMappings)) {
    const category = categoryRecords[categoryName]
    if (!category) continue
    for (const word of keywords) {
      await prisma.keyword.upsert({
        where: { word },
        create: { word, category_id: category.id },
        update: { category_id: category.id },
      })
      console.log(`Keyword: "${word}" -> ${categoryName}`)
    }
  }

  // Seed users — passwords must be provided via env vars
  const marketingPw = process.env.SEED_MARKETING_PASSWORD
  const teamPw      = process.env.SEED_MARKETING_TEAM_PASSWORD
  const ownerPw     = process.env.SEED_OWNER_PASSWORD
  // Second BUSINESS_OWNER account (docs/raven/Two_Engagement_Rates_and_Owner_Deadlock.md
  // §2): with only one Owner, a self-lockout is unrecoverable without direct
  // DB access, since unlocking requires an Owner. A second Owner lets either
  // unlock the other through the UI.
  const owner2Pw    = process.env.SEED_OWNER2_PASSWORD

  if (!marketingPw || !teamPw || !ownerPw || !owner2Pw) {
    throw new Error(
      'Seed requires SEED_MARKETING_PASSWORD, SEED_MARKETING_TEAM_PASSWORD, SEED_OWNER_PASSWORD, and SEED_OWNER2_PASSWORD env vars. ' +
      'Set them in .env before running the seed.'
    )
  }
  for (const [label, pw] of [['SEED_MARKETING_PASSWORD', marketingPw], ['SEED_MARKETING_TEAM_PASSWORD', teamPw], ['SEED_OWNER_PASSWORD', ownerPw], ['SEED_OWNER2_PASSWORD', owner2Pw]]) {
    if (pw.length < 12) throw new Error(`${label} must be at least 12 characters.`)
  }

  // The MVP v2 role migration renamed SALES_DIRECTOR -> MARKETING_TEAM on the
  // *role* column of any pre-existing user, but never touched that user's
  // email. On a DB seeded before this rework, that leaves a legacy
  // sales@pcmerchandise.com row already holding MARKETING_TEAM — without this
  // rename, the loop below would create a second, unrelated
  // team@pcmerchandise.com and leave two MARKETING_TEAM accounts behind.
  const legacySalesUser = await prisma.user.findUnique({ where: { email: 'sales@pcmerchandise.com' } })
  if (legacySalesUser && legacySalesUser.role === 'MARKETING_TEAM') {
    await prisma.user.update({
      where: { id: legacySalesUser.id },
      data: { email: 'team@pcmerchandise.com' },
    })
    console.log('Migrated legacy sales@pcmerchandise.com -> team@pcmerchandise.com (id preserved)')
  }

  // docs/raven/Account_Display_Names.md §4 — the two individual accounts
  // carry the name of the person who holds them; team@ is genuinely shared
  // by more than one person, so it carries its role instead of naming one of
  // them. owner2@ is the second BUSINESS_OWNER seat added for the FR-06
  // last-active-owner lockout guard.
  // team@'s name is the single word "Team", not "Marketing Team" — the
  // greeting shortens any stored name to its first token
  // (lib/greeting.ts's greetingName), and a two-word role label would
  // otherwise greet a shared account as "Good afternoon, Marketing".
  const users = [
    { email: 'marketing@pcmerchandise.com', password: marketingPw, role: 'MARKETING_MANAGER' as const, name: 'Dan Mintong Carullo' },
    { email: 'team@pcmerchandise.com',      password: teamPw,      role: 'MARKETING_TEAM' as const,     name: 'Team' },
    { email: 'owner@pcmerchandise.com',     password: ownerPw,     role: 'BUSINESS_OWNER' as const,     name: 'John Bernard Olermo' },
    { email: 'owner2@pcmerchandise.com',    password: owner2Pw,    role: 'BUSINESS_OWNER' as const,     name: 'John Bernard Olermo 2' },
  ]

  for (const user of users) {
    const password_hash = await bcryptjs.hash(user.password, 12)
    const existing = await prisma.user.findUnique({ where: { email: user.email } })
    // Idempotent on `name` specifically — a fresh clone's first seed run
    // creates the row, but a pre-existing row (this shared dev/prod DB
    // included) never picked up the field when it was added, and re-running
    // seed is also how a future name correction should land, so `existing`
    // is updated in place rather than left untouched.
    const created = existing
      ? await prisma.user.update({ where: { email: user.email }, data: { name: user.name } })
      : await prisma.user.create({
          data: { email: user.email, password_hash, role: user.role, name: user.name },
        })
    console.log(`User: ${created.email} (${created.role})`)
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
