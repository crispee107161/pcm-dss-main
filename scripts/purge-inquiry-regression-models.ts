// One-off cleanup for the messaging-conversations DV pivot (DV-PIVOT-PLAN.md,
// Phase 1). `RegressionModel` rows are append-only, so models trained under
// the old 4-predictor "Inquiries = ... + Msgs + ..." formula remain in the
// table after lib/stats/regression.ts switched to the 3-predictor
// "MessagingConversations = ... + Spend" formula. Left in place, a stale row
// could be loaded by predictFromModel() and silently mispredict.
//
// Deletes RegressionModel rows where EITHER:
//   - coef_messaging is not null (trained under the old 4-predictor formula), OR
//   - model_type is not 'plain_mlr' (the only type the current fitPlainMLR()
//     produces — covers null model_type and any other pre-pivot SLR/MLR
//     variant, including one that predates coef_messaging existing at all)
//
// Usage: npx tsx scripts/purge-inquiry-regression-models.ts
//   Add --dry-run to only report what would be deleted.
//
// IMPORTANT: run this against a DEV database only. Do not run it against a
// production/Neon DATABASE_URL — check `.env` first. If DATABASE_URL points
// at a Neon/production instance, do not run this script; ask the project
// owner to run it manually against the correct environment instead.

import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'
import { buildEquation } from '../lib/insights/regression-equation'
import { CURRENT_MODEL_TYPE } from '../lib/stats/regression'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const all = await prisma.regressionModel.findMany({
    orderBy: { id: 'asc' },
  })

  const stale = all.filter(row => row.coef_messaging !== null || row.model_type !== CURRENT_MODEL_TYPE)

  console.log(`Found ${stale.length} stale inquiry-era RegressionModel row(s) out of ${all.length} total.`)
  for (const row of stale) {
    console.log(`  #${row.id} [${row.model_type ?? 'unknown'}] trained ${row.trained_at.toISOString()} — ${buildEquation(row)}`)
  }

  if (stale.length === 0) {
    console.log('Nothing to purge.')
    return
  }

  if (dryRun) {
    console.log('Dry run — no rows deleted. Re-run without --dry-run to delete.')
    return
  }

  const result = await prisma.regressionModel.deleteMany({
    where: { id: { in: stale.map(r => r.id) } },
  })
  console.log(`Deleted ${result.count} stale RegressionModel row(s).`)
}

main()
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
