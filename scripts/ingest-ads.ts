import 'dotenv/config'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'
import { parseCsvBuffer } from '../lib/csv/parse'
import { detectCsvType } from '../lib/csv/detect'
import { validateAdsRows } from '../lib/csv/validate-ads'
import { upsertAds, assertNoDuplicateKeys } from '../lib/db/upsert-ads'

const DATA_DIR = join(__dirname, '..', 'data', 'New_FB_Ads_Data')

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.csv')).sort()
  console.log(`Found ${files.length} files in ${DATA_DIR}`)

  let totalInserted = 0
  let totalUpdated = 0
  let totalUnchanged = 0

  for (const file of files) {
    const buffer = readFileSync(join(DATA_DIR, file))
    const { headers, rows } = parseCsvBuffer(buffer)
    const csvType = detectCsvType(headers)
    if (csvType !== 'ADS_CSV') {
      console.log(`SKIP ${file}: detected as ${csvType}`)
      continue
    }

    const records = validateAdsRows(rows)
    assertNoDuplicateKeys(records)

    const counts = await prisma.$transaction(
      (tx) => upsertAds(records, tx),
      { timeout: 120_000, maxWait: 15_000 }
    )
    totalInserted += counts.inserted
    totalUpdated += counts.updated
    totalUnchanged += counts.unchanged
    console.log(
      `${file}: ${rows.length} rows -> inserted=${counts.inserted} updated=${counts.updated} unchanged=${counts.unchanged}`
    )
  }

  console.log('---')
  console.log(`TOTAL: inserted=${totalInserted} updated=${totalUpdated} unchanged=${totalUnchanged}`)

  const adCount = await prisma.ad.count()
  const spendAgg = await prisma.ad.aggregate({ _sum: { amount_spent: true } })
  const messagingAgg = await prisma.ad.aggregate({
    _sum: { amount_spent: true },
    where: { result_type: 'Messaging conversations started' },
  })
  console.log(`Ad rows in DB: ${adCount}`)
  console.log(`Total spend (all ads): ${spendAgg._sum.amount_spent}`)
  console.log(`Total spend (messaging-optimised ads): ${messagingAgg._sum.amount_spent}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
