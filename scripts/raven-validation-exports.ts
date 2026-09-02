// Raven's independent statistical validation (NFR-02, see
// docs/Security_Pass_Response_and_Validation_Exports.md §5.1) — exports the
// exact rows and columns each in-app statistical procedure was run on, so
// she can reproduce the regression and the ranking correlation against
// scipy/statsmodels independently of this codebase's own TypeScript
// implementation.
//
// regression_inputs.csv: FR-31's PRIMARY specification population (spend >=
// FR31_MIN_SPEND_PHP), one row per ad, via the same buildRegressionDataset()
// the app itself fits on. Expected n = 108.
//
// ranking_inputs.csv: FR-19's eligible population (study-period posts with
// a non-null Views value), one row per post, via the same STUDY_PERIOD_POST_WHERE
// + null-views filter computeRankingComparison() applies. Expected n = 729.
//
// Usage: npx tsx scripts/raven-validation-exports.ts

import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { buildRegressionDataset, FR31_RESULT_TYPE, FR31_MIN_SPEND_PHP } from '../lib/stats/fr31-regression'
import { STUDY_PERIOD_POST_WHERE } from '../lib/data/study-period'
import fs from 'fs'
import path from 'path'

const OUTPUT_DIR = path.resolve(__dirname, 'output')

async function main() {
  try {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })

    // ── regression_inputs.csv ──────────────────────────────────────────
    const ads = await prisma.ad.findMany({
      where: { result_type: FR31_RESULT_TYPE },
      select: {
        ad_id: true, ad_name: true, amount_spent: true, results: true, result_type: true,
        reach: true, impressions: true, link_clicks: true, post_engagements: true,
      },
    })
    const { observations, exclusions } = buildRegressionDataset(ads, { minSpend: FR31_MIN_SPEND_PHP })

    const regressionLines = ['ad_id,cost_per_inquiry,engagement_rate,frequency,ctr,cpm']
    for (const o of observations) {
      regressionLines.push([o.ad_id, o.cpi, o.engagement_rate, o.frequency, o.ctr, o.cpm].join(','))
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, 'regression_inputs.csv'), regressionLines.join('\n'))
    console.log(`Wrote ${path.join(OUTPUT_DIR, 'regression_inputs.csv')} — ${observations.length} rows`)
    console.log('  exclusions:', exclusions)

    // ── ranking_inputs.csv ─────────────────────────────────────────────
    const posts = await prisma.facebookPost.findMany({
      where: STUDY_PERIOD_POST_WHERE,
      select: { post_id: true, views: true, reach: true, engagement_rate: true },
    })
    const eligible = posts.filter((p) => p.views !== null)

    const rankingLines = ['post_id,views,reach,engagement_rate']
    for (const p of eligible) {
      rankingLines.push([p.post_id, p.views, p.reach, p.engagement_rate].join(','))
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, 'ranking_inputs.csv'), rankingLines.join('\n'))
    console.log(`Wrote ${path.join(OUTPUT_DIR, 'ranking_inputs.csv')} — ${eligible.length} rows (${posts.length - eligible.length} excluded for null Views)`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
