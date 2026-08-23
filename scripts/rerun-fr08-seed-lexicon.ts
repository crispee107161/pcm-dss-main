import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { detectCategoryFromText, type CategorySuggestion } from '../lib/keywords/detect'
import { resolveCaption } from '../lib/keywords/caption'
import { computeAgreement, kappaMagnitude, AGREEMENT_LABELS, type AgreementRow, type AgreementResult } from '../lib/stats/agreement'
import { CATEGORY_NAME_TO_LABEL, CATEGORY_LABEL_DISPLAY } from '../lib/category-label'
import type { CategoryLabel } from '../app/generated/prisma/client'

// docs/raven/Lexicon_Drift_Rerun_Spec.md §3 — re-run ALG-04 (lib/keywords/detect.ts,
// unmodified) against the 200 MANUAL_GROUND_TRUTH posts using ONLY the 50-keyword
// prisma/seed.ts baseline (mirrored below, not read from the live Keyword table),
// because the live table now holds 43 undated additions that could postdate the
// ground-truth import — see docs/raven/Lexicon_Integrity_and_Ground_Truth_Answers.md.
// This script does not write anything; it only reports.
const SEED_KEYWORD_MAPPINGS: Record<string, string[]> = {
  'Product Showcase': [
    'available', 'new arrival', 'introducing', 'now available', 'check out',
    'shop now', 'pc set', 'ryzen', 'gaming', 'laptop', 'cctv', 'camera',
    'comshop', 'computer shop', 'monitor', 'keyboard', 'mouse',
  ],
  Testimonial: [
    'testimonial', 'customer', 'review', 'feedback', 'satisfied',
    'happy', 'client', 'legit', 'legit seller', 'trusted',
  ],
  'Promotional Offer': [
    'sale', 'promo', 'discount', 'off', 'deal', 'offer', 'free',
    'limited', 'bundle', 'package', 'savings', 'special', 'treat',
  ],
  Entertainment: [
    'meme', 'funny', 'giveaway', 'contest', 'raffle', 'trivia', 'quiz',
    'fun fact', 'behind the scenes', 'vlog',
  ],
}

function buildLexicon(mappings: Record<string, string[]>): Array<{ word: string; label: CategoryLabel }> {
  const out: Array<{ word: string; label: CategoryLabel }> = []
  for (const [categoryName, words] of Object.entries(mappings)) {
    const label = CATEGORY_NAME_TO_LABEL[categoryName]
    if (!label) continue
    for (const word of words) out.push({ word, label })
  }
  return out
}

const SEED_LEXICON = buildLexicon(SEED_KEYWORD_MAPPINGS)

// §3.2 — score UNCLASSIFIED-predicted rows as agreeing with actual UNCLEAR rows,
// as a *separate reported variant*, not a change to lib/stats/agreement.ts.
// Only relabels rows where the method abstained AND the human said "unclear" —
// every other UNCLASSIFIED row is left alone, so pe isn't distorted elsewhere.
function applyUnclassifiedUnclearMapping(rows: AgreementRow[]): AgreementRow[] {
  return rows.map((row) =>
    row.predicted === 'UNCLASSIFIED' && row.actual === 'UNCLEAR'
      ? { predicted: 'UNCLEAR' as CategoryLabel, actual: row.actual }
      : row
  )
}

function recallByCategory(result: AgreementResult): Array<{ label: CategoryLabel; recall: number | null; actualN: number }> {
  const actualCounts = new Map<CategoryLabel, number>()
  const correctCounts = new Map<CategoryLabel, number>()
  for (const cell of result.confusionMatrix) {
    actualCounts.set(cell.actual, (actualCounts.get(cell.actual) ?? 0) + cell.count)
    if (cell.predicted === cell.actual) correctCounts.set(cell.actual, (correctCounts.get(cell.actual) ?? 0) + cell.count)
  }
  return AGREEMENT_LABELS.filter((l) => l !== 'UNCLASSIFIED').map((label) => {
    const actualN = actualCounts.get(label) ?? 0
    const correct = correctCounts.get(label) ?? 0
    return { label, actualN, recall: actualN > 0 ? correct / actualN : null }
  })
}

function formatConfusionMatrix(result: AgreementResult): string {
  const used = AGREEMENT_LABELS.filter((l) => (result.confusionMatrix.some((c) => (c.predicted === l || c.actual === l) && c.count > 0)))
  const cell = (p: CategoryLabel, a: CategoryLabel) => result.confusionMatrix.find((c) => c.predicted === p && c.actual === a)?.count ?? 0
  const header = `${'predicted \\ actual'.padEnd(20)}${used.map((l) => l.padStart(12)).join('')}`
  const rows = used.map((p) => `${p.padEnd(20)}${used.map((a) => String(cell(p, a)).padStart(12)).join('')}`)
  return [header, ...rows].join('\n')
}

function report(title: string, n: number, keywordCount: number, result: AgreementResult): string {
  const lines: string[] = []
  lines.push(`## ${title}`)
  lines.push('')
  lines.push(`Lexicon size: ${keywordCount} keywords`)
  lines.push(`n = ${n}`)
  // lib/stats/agreement.ts doesn't expose p_e directly (it isn't needed by the
  // dashboard); back-derive it from the exact po/kappa it already computed —
  // kappa = (po - pe) / (1 - pe) => pe = (po - kappa) / (1 - kappa).
  const po = result.percentAgreement
  const kappa = result.kappa
  const pe = kappa === 1 ? NaN : (po - kappa) / (1 - kappa)
  lines.push(`Observed agreement p_o = ${po.toFixed(4)} (${Math.round(po * n)} of ${n})`)
  lines.push(`Expected agreement p_e = ${Number.isNaN(pe) ? 'undefined (kappa = 1)' : pe.toFixed(4)}`)
  lines.push(`Cohen's kappa = ${kappa.toFixed(4)} (${kappaMagnitude(kappa)}, Landis & Koch 1977)`)
  lines.push('')
  lines.push('Per-category recall:')
  for (const { label, recall, actualN } of recallByCategory(result)) {
    lines.push(`  ${CATEGORY_LABEL_DISPLAY[label].padEnd(18)} n=${String(actualN).padEnd(4)} recall=${recall === null ? 'n/a' : recall.toFixed(4)}`)
  }
  lines.push('')
  lines.push('Confusion matrix (rows = predicted, cols = actual):')
  lines.push(formatConfusionMatrix(result))
  lines.push('')
  return lines.join('\n')
}

async function main() {
  const posts = await prisma.facebookPost.findMany({
    where: { category_final_source: 'MANUAL_GROUND_TRUTH' },
    select: { title: true, description: true, category_final: true },
  })
  if (posts.length === 0) throw new Error('No MANUAL_GROUND_TRUTH posts found — is the ground-truth CSV imported?')

  const liveKeywordRows = await prisma.keyword.findMany({ include: { category: true } })
  const liveLexicon = liveKeywordRows
    .map((k) => {
      const label = CATEGORY_NAME_TO_LABEL[k.category.name]
      return label ? { word: k.word, label } : null
    })
    .filter((k): k is { word: string; label: CategoryLabel } => k !== null)

  function scoreAgainst(lexicon: Array<{ word: string; label: CategoryLabel }>): AgreementRow[] {
    return posts.map((post) => {
      const caption = resolveCaption(post.title, post.description)
      const { label }: CategorySuggestion = detectCategoryFromText(caption, lexicon)
      return { predicted: label, actual: post.category_final as CategoryLabel }
    })
  }

  const seedRows = scoreAgainst(SEED_LEXICON)
  const liveRows = scoreAgainst(liveLexicon)

  const seedResult = computeAgreement(seedRows)
  const seedMappedResult = computeAgreement(applyUnclassifiedUnclearMapping(seedRows))
  const liveResult = computeAgreement(liveRows)
  const liveMappedResult = computeAgreement(applyUnclassifiedUnclearMapping(liveRows))

  const out: string[] = []
  out.push('FR-08 re-run — seed lexicon vs live lexicon')
  out.push(`Generated: ${new Date().toISOString()}`)
  out.push(`Population: n=${posts.length} MANUAL_GROUND_TRUTH posts`)
  out.push(`Method: ALG-04 (lib/keywords/detect.ts), unmodified`)
  out.push('')
  out.push(report('A. Seed lexicon (50 keywords, prisma/seed.ts) — raw scoring', posts.length, SEED_LEXICON.length, seedResult))
  out.push(report('B. Seed lexicon (50 keywords) — with UNCLASSIFIED→UNCLEAR mapping', posts.length, SEED_LEXICON.length, seedMappedResult))
  out.push(report('C. Live lexicon (current Keyword table) — raw scoring', posts.length, liveLexicon.length, liveResult))
  out.push(report('D. Live lexicon (current Keyword table) — with UNCLASSIFIED→UNCLEAR mapping', posts.length, liveLexicon.length, liveMappedResult))

  console.log(out.join('\n'))
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
