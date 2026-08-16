import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { computeAgreement, kappaMagnitude, AGREEMENT_LABELS } from '../lib/stats/agreement'
import { CATEGORY_NAME_TO_LABEL } from '../lib/category-label'
import type { CategoryLabel } from '../app/generated/prisma/client'
import fs from 'fs'

async function main() {
  // --- A1: keyword lexicon ---
  const keywords = await prisma.keyword.findMany({ include: { category: true }, orderBy: [{ category: { name: 'asc' } }, { word: 'asc' } ] })
  console.log('=== LEXICON ===')
  console.log('total terms:', keywords.length)
  const byCat = new Map<string, string[]>()
  for (const k of keywords) {
    const label = CATEGORY_NAME_TO_LABEL[k.category.name] ?? k.category.name
    if (!byCat.has(label)) byCat.set(label, [])
    byCat.get(label)!.push(k.word)
  }
  for (const [cat, words] of byCat) {
    console.log(`\n-- ${cat} (${words.length}) --`)
    console.log(words.join(', '))
  }

  // --- category_final source counts (C2) ---
  console.log('\n=== PROVENANCE (category_final_source) ===')
  const provenance = await prisma.facebookPost.groupBy({
    by: ['category_final_source'],
    _count: true,
  })
  console.log(provenance)

  // --- total posts, category_pending count (C3 partial) ---
  const totalPosts = await prisma.facebookPost.count()
  const pendingCount = await prisma.facebookPost.count({ where: { category_pending: { not: null } } })
  const finalSetCount = await prisma.facebookPost.count({ where: { category_final: { not: null } } })
  const keywordSetCount = await prisma.facebookPost.count({ where: { category_keyword: { not: null } } })
  const llmSetCount = await prisma.facebookPost.count({ where: { category_llm: { not: null } } })
  console.log('\n=== COUNTS ===')
  console.log({ totalPosts, pendingCount, finalSetCount, keywordSetCount, llmSetCount })

  // --- C1: final category distribution across all posts ---
  console.log('\n=== FINAL CATEGORY DISTRIBUTION (all posts) ===')
  const finalDist = await prisma.facebookPost.groupBy({ by: ['category_final'], _count: true })
  console.log(finalDist)

  // --- ground truth import: category_final_source = MANUAL_GROUND_TRUTH ---
  const groundTruthPosts = await prisma.facebookPost.findMany({
    where: { category_final_source: 'MANUAL_GROUND_TRUTH' },
    select: { id: true, post_id: true, category_final: true, category_keyword: true, category_llm: true, title: true, description: true },
  })
  console.log('\n=== GROUND TRUTH SET ===')
  console.log('n =', groundTruthPosts.length)

  // Distribution of ground truth category_final
  const gtDist = new Map<string, number>()
  for (const p of groundTruthPosts) {
    const k = p.category_final ?? 'NULL'
    gtDist.set(k, (gtDist.get(k) ?? 0) + 1)
  }
  console.log('ground truth category_final distribution:', Object.fromEntries(gtDist))

  // --- B1/B2: FR-15 agreement for keyword and llm methods ---
  function buildRows(method: 'category_keyword' | 'category_llm') {
    return groundTruthPosts
      .filter((p) => p.category_final !== null && p[method] !== null)
      .map((p) => ({ predicted: p[method] as CategoryLabel, actual: p.category_final as CategoryLabel }))
  }

  for (const method of ['category_keyword', 'category_llm'] as const) {
    const rows = buildRows(method)
    const result = computeAgreement(rows)
    console.log(`\n=== AGREEMENT: ${method} vs category_final (full ground truth, n=${result.n}) ===`)
    console.log('percentAgreement (p_o):', result.percentAgreement)
    console.log('kappa:', result.kappa, kappaMagnitude(result.kappa))
    // recompute p_e manually for reporting
    const n = result.n
    const predictedCounts = new Map<string, number>()
    const actualCounts = new Map<string, number>()
    for (const r of rows) {
      predictedCounts.set(r.predicted, (predictedCounts.get(r.predicted) ?? 0) + 1)
      actualCounts.set(r.actual, (actualCounts.get(r.actual) ?? 0) + 1)
    }
    let pe = 0
    for (const label of AGREEMENT_LABELS) {
      pe += ((predictedCounts.get(label) ?? 0) / n) * ((actualCounts.get(label) ?? 0) / n)
    }
    console.log('expected agreement (p_e):', pe)
    console.log('confusion matrix (predicted|actual: count), zero cells omitted:')
    for (const cell of result.confusionMatrix) {
      if (cell.count > 0) console.log(`  ${cell.predicted} | ${cell.actual}: ${cell.count}`)
    }
    // per-category recall (actual = X, predicted = X / total actual = X)
    console.log('per-category recall:')
    for (const label of AGREEMENT_LABELS) {
      const totalActual = actualCounts.get(label) ?? 0
      if (totalActual === 0) continue
      const correct = result.confusionMatrix.find((c) => c.predicted === label && c.actual === label)?.count ?? 0
      console.log(`  ${label}: ${correct}/${totalActual} = ${(correct / totalActual).toFixed(4)}`)
    }
  }

  // --- B2: sensitivity check, non-UNCLEAR only ---
  const nonUnclear = groundTruthPosts.filter((p) => p.category_final !== 'UNCLEAR')
  console.log('\n=== SENSITIVITY CHECK (non-UNCLEAR only, n=', nonUnclear.length, ') ===')
  for (const method of ['category_keyword', 'category_llm'] as const) {
    const rows = nonUnclear
      .filter((p) => p.category_final !== null && p[method] !== null)
      .map((p) => ({ predicted: p[method] as CategoryLabel, actual: p.category_final as CategoryLabel }))
    const result = computeAgreement(rows)
    console.log(`${method}: n=${result.n} p_o=${result.percentAgreement.toFixed(4)} kappa=${result.kappa.toFixed(4)} (${kappaMagnitude(result.kappa)})`)
  }

  // --- B4: per-post CSV ---
  const csvLines = ['post_id,category_final,category_keyword,category_llm']
  for (const p of groundTruthPosts) {
    csvLines.push(`${p.post_id},${p.category_final ?? ''},${p.category_keyword ?? ''},${p.category_llm ?? ''}`)
  }
  fs.writeFileSync('scripts/output/fr15-per-post.csv', csvLines.join('\n'))
  console.log('\nWrote scripts/output/fr15-per-post.csv')

  // --- C3: triage / pending breakdown (no formal flag system found in code) ---
  const pendingPosts = await prisma.facebookPost.findMany({
    where: { category_pending: { not: null } },
    select: { id: true, category_final: true },
  })
  console.log('\n=== PENDING (proposed, not yet accepted) ===', pendingPosts.length)

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
