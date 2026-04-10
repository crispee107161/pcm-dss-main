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
  const categories = ['Product Showcase', 'Testimonial', 'Promotional Offer']
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

  // Seed users
  const users = [
    { email: 'marketing@pcmerchandise.com', password: 'password123', role: 'MARKETING_MANAGER' as const },
    { email: 'sales@pcmerchandise.com',     password: 'password123', role: 'SALES_DIRECTOR' as const },
    { email: 'owner@pcmerchandise.com',     password: 'password123', role: 'BUSINESS_OWNER' as const },
  ]

  for (const user of users) {
    const password_hash = await bcryptjs.hash(user.password, 12)
    const created = await prisma.user.upsert({
      where: { email: user.email },
      create: { email: user.email, password_hash, role: user.role },
      update: { password_hash, role: user.role },
    })
    console.log(`User: ${created.email} (${created.role})`)
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
