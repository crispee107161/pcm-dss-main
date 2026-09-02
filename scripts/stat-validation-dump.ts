// Cross-validation dump for docs/FR16_Rewording_and_NFR_Questions.md §3.1 —
// exports the raw inputs AND this app's own computed outputs for the six
// hand-written statistical procedures (Spearman, Pearson, OLS, Shapiro-Wilk,
// Breusch-Pagan, Jarque-Bera), so a separate Python script can recompute the
// same six procedures with scipy/statsmodels on the identical numbers and
// diff against what the TypeScript modules actually produced.
//
// Usage: npx tsx scripts/stat-validation-dump.ts

import 'dotenv/config'
import { prisma } from '../lib/prisma'
import fs from 'fs'
import path from 'path'
import { STUDY_PERIOD_POST_WHERE, STUDY_PERIOD_AD_WHERE } from '../lib/data/study-period'
import { computeRankingComparison } from '../lib/stats/ranking-comparison'
import { selectCorrelation } from '../lib/stats/correlation-selection'
import { fitFr31BothSpecifications, FR31_RESULT_TYPE } from '../lib/stats/fr31-regression'

const OUTPUT_DIR = path.resolve(__dirname, 'output', 'stat-validation')

function writeCsv(file: string, header: string[], rows: (string | number)[][]) {
  const lines = [header.join(','), ...rows.map(r => r.join(','))]
  fs.writeFileSync(path.join(OUTPUT_DIR, file), lines.join('\n'))
  console.log(`Wrote ${file} (${rows.length} rows)`)
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // ── 1. FR-19/21 ranking comparison — Spearman(views, engagement_rate), n=729 ──
  const posts = await prisma.facebookPost.findMany({
    where: STUDY_PERIOD_POST_WHERE,
    select: { views: true, engagement_rate: true, category_final: true, reach: true },
  })
  const ranking = computeRankingComparison(
    posts.map(p => ({ views: p.views, organic_engagement_rate: p.engagement_rate, reach: p.reach }))
  )
  const eligiblePosts = posts.filter(p => p.views !== null)
  writeCsv(
    'ranking-comparison.csv',
    ['views', 'engagement_rate', 'reach'],
    eligiblePosts.map(p => [p.views as number, p.engagement_rate, p.reach])
  )

  // ── 2. FR-21 correlation-with-method-selection — Pearson/Spearman + Shapiro-Wilk x2, n=187 ──
  const adsForCorrelation = await prisma.ad.findMany({
    where: STUDY_PERIOD_AD_WHERE,
    select: { ad_id: true, amount_spent: true, total_messaging_contacts: true, reach: true, post_engagements: true },
  })
  const correlation = selectCorrelation(adsForCorrelation)
  const perAd = new Map<string, { spend: number; messaging: number; reach: number; engagements: number }>()
  for (const ad of adsForCorrelation) {
    const existing = perAd.get(ad.ad_id) ?? { spend: 0, messaging: 0, reach: 0, engagements: 0 }
    perAd.set(ad.ad_id, {
      spend: existing.spend + ad.amount_spent,
      messaging: existing.messaging + (ad.total_messaging_contacts ?? 0),
      reach: existing.reach + (ad.reach ?? 0),
      engagements: existing.engagements + (ad.post_engagements ?? 0),
    })
  }
  const corrRows: [number, number][] = []
  for (const t of perAd.values()) {
    if (t.messaging <= 0 || t.reach <= 0) continue
    corrRows.push([t.engagements / t.reach, t.spend / t.messaging])
  }
  writeCsv('correlation-selection.csv', ['engagement_rate', 'cost_per_inquiry'], corrRows)

  // ── 3. FR-31 regression — OLS + VIF + Breusch-Pagan + Jarque-Bera + Shapiro-Wilk, n=108 ──
  const adsForRegression = await prisma.ad.findMany({
    where: { result_type: FR31_RESULT_TYPE },
    select: {
      ad_id: true,
      ad_name: true,
      amount_spent: true,
      results: true,
      result_type: true,
      reach: true,
      impressions: true,
      link_clicks: true,
      post_engagements: true,
    },
  })
  const { primary } = fitFr31BothSpecifications(adsForRegression)
  if (primary.status !== 'ok') throw new Error('FR-31 primary spec returned insufficient_data')

  writeCsv(
    'fr31-regression.csv',
    ['engagement_rate', 'frequency', 'ctr', 'cpm', 'ln_cpi'],
    primary.observations.map(o => [o.engagement_rate, o.frequency, o.ctr, o.cpm, o.lnCpi])
  )

  // ── This app's own computed outputs, for the Python script to diff against ──
  const tsOutputs = {
    ranking: { n: ranking.n, rho: ranking.rho, p: ranking.p },
    correlation: {
      n: correlation.n,
      method: correlation.method,
      coefficient: correlation.coefficient,
      p: correlation.p,
      shapiroX: correlation.shapiroX,
      shapiroY: correlation.shapiroY,
    },
    fr31: {
      n: primary.fit.n,
      rSquared: primary.fit.rSquared,
      adjRSquared: primary.fit.adjRSquared,
      fStatistic: primary.fit.fStatistic,
      fPValue: primary.fit.fPValue,
      coefficients: primary.coefficients,
      breuschPagan: primary.breuschPagan,
      jarqueBera: primary.normality.jarqueBera,
      shapiroWilk: primary.normality.shapiroWilk,
    },
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ts-outputs.json'), JSON.stringify(tsOutputs, null, 2))
  console.log('Wrote ts-outputs.json')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
