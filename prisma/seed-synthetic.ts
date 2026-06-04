/**
 * Bulk-seeds synthetic CSV data into the database using the same
 * parse/validate/upsert pipeline as the web upload interface.
 *
 * Usage (requires .env with DATABASE_URL):
 *   npx tsx prisma/seed-synthetic.ts
 *
 * Run ONCE after generate_synthetic_data.py has been executed.
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { parseCsvBuffer, parsePageMetricBuffer } from '../lib/csv/parse'
import { validateAdsRows } from '../lib/csv/validate-ads'
import { validatePageMetricResult } from '../lib/csv/validate-page-metric'
import { upsertAds } from '../lib/db/upsert-ads'
import { upsertPageMetric } from '../lib/db/upsert-page-metric'
import { maybeRetrainRegression } from '../lib/stats/regression'
import { prisma } from '../lib/prisma'

const ROOT = path.resolve(__dirname, '..')
const ADS_DIR = path.join(ROOT, 'data', 'Ads', 'synthetic')
const METRICS_DIR = path.join(ROOT, 'data', 'Page-Level Metrics', 'synthetic')

function log(msg: string) { process.stdout.write(msg + '\n') }

async function seedAds() {
  if (!fs.existsSync(ADS_DIR)) {
    log(`  ⚠  Ads dir not found: ${ADS_DIR}`)
    log('  Run generate_synthetic_data.py first.')
    return
  }

  const files = fs.readdirSync(ADS_DIR).filter(f => f.endsWith('.csv')).sort()
  log(`\nAds CSVs (${files.length} files)\n` + '-'.repeat(50))

  let totalInserted = 0, totalUpdated = 0

  for (const file of files) {
    const buffer = fs.readFileSync(path.join(ADS_DIR, file))
    try {
      const { rows } = parseCsvBuffer(buffer)
      const records = validateAdsRows(rows)
      const { inserted, updated } = await upsertAds(records)
      totalInserted += inserted
      totalUpdated += updated
      log(`  ✓ ${file}  (+${inserted} new, ~${updated} updated)`)
    } catch (err) {
      log(`  ✗ ${file}  ERROR: ${(err as Error).message}`)
    }
  }

  log(`\n  Total: +${totalInserted} inserted, ~${totalUpdated} updated`)
}

async function seedPageMetrics() {
  if (!fs.existsSync(METRICS_DIR)) {
    log(`\n  ⚠  Metrics dir not found: ${METRICS_DIR}`)
    return
  }

  const files = fs.readdirSync(METRICS_DIR).filter(f => f.endsWith('.csv')).sort()
  log(`\nPage Metric CSVs (${files.length} files)\n` + '-'.repeat(50))

  let totalInserted = 0, totalUpdated = 0

  for (const file of files) {
    const buffer = fs.readFileSync(path.join(METRICS_DIR, file))
    try {
      const parsed = parsePageMetricBuffer(buffer)
      const validated = validatePageMetricResult(parsed)
      const { inserted, updated } = await upsertPageMetric(validated)
      totalInserted += inserted
      totalUpdated += updated
      log(`  ✓ ${file}  (${parsed.column}: +${inserted} new, ~${updated} updated)`)
    } catch (err) {
      log(`  ✗ ${file}  ERROR: ${(err as Error).message}`)
    }
  }

  log(`\n  Total: +${totalInserted} inserted, ~${totalUpdated} updated`)
}

async function main() {
  log('\nPCM-DSS Synthetic Data Seeder\n' + '='.repeat(50))

  await seedAds()
  await seedPageMetrics()

  log('\nRetraining regression model on combined dataset...')
  const retrained = await maybeRetrainRegression()

  if (retrained) {
    log('  ✓ Model retrained')
    const model = await prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } })
    if (model) {
      log(`  Type   : ${model.model_type ?? 'unknown'}`)
      log(`  R²     : ${(model.r_squared * 100).toFixed(2)}%`)
      log(`  Adj R² : ${model.adj_r_squared != null ? (model.adj_r_squared * 100).toFixed(2) + '%' : 'n/a'}`)
      log(`  RSE    : ${model.residual_std_error?.toFixed(3) ?? 'n/a'}`)
      log(`  n      : ${model.n} purchase records`)
    }
  } else {
    log('  ⚠  Not enough purchase records (need ≥ 10)')
  }

  log('\nDone.\n')
  await prisma.$disconnect()
}

main().catch(async err => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
