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
  const salesPw     = process.env.SEED_SALES_PASSWORD
  const ownerPw     = process.env.SEED_OWNER_PASSWORD

  if (!marketingPw || !salesPw || !ownerPw) {
    throw new Error(
      'Seed requires SEED_MARKETING_PASSWORD, SEED_SALES_PASSWORD, and SEED_OWNER_PASSWORD env vars. ' +
      'Set them in .env before running the seed.'
    )
  }
  for (const [label, pw] of [['SEED_MARKETING_PASSWORD', marketingPw], ['SEED_SALES_PASSWORD', salesPw], ['SEED_OWNER_PASSWORD', ownerPw]]) {
    if (pw.length < 8) throw new Error(`${label} must be at least 8 characters.`)
  }

  const users = [
    { email: 'marketing@pcmerchandise.com', password: marketingPw, role: 'MARKETING_MANAGER' as const },
    { email: 'sales@pcmerchandise.com',     password: salesPw,     role: 'SALES_DIRECTOR' as const },
    { email: 'owner@pcmerchandise.com',     password: ownerPw,     role: 'BUSINESS_OWNER' as const },
  ]

  for (const user of users) {
    const password_hash = await bcryptjs.hash(user.password, 12)
    const existing = await prisma.user.findUnique({ where: { email: user.email } })
    const created = existing ?? await prisma.user.create({
      data: { email: user.email, password_hash, role: user.role },
    })
    console.log(`User: ${created.email} (${created.role})`)
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
