import type { CategoryLabel } from '@/app/generated/prisma/client'

// FR-15/ALG-06 — Cohen's kappa + percentage agreement per suggestion method
// against category_final (the marketing manager's actual decision), on
// whatever posts currently carry a final label. mvp.md §4.3/§9 recommends a
// purpose-built 150-200 post random sample rather than the whole library —
// no such dedicated labelling workflow exists yet, so this uses the S4
// finalisation queue's output as a practical stand-in; the page surfaces
// n prominently so a small or non-random sample isn't mistaken for the
// recommended study design.
// UNCLEAR is included because the external ground-truth codebook allows
// coders to use it as `actual` (CODEBOOK_content_categories.md §5) — omitting
// it from this list would silently drop its marginal share out of the p_e
// sum, distorting kappa for every ground-truth comparison. No suggestion
// method (ALG-04/ALG-05) ever produces it as `predicted`.
export const AGREEMENT_LABELS: CategoryLabel[] = [
  'PRODUCT_SHOWCASE', 'PROMOTIONAL_OFFER', 'TESTIMONIAL', 'ENTERTAINMENT', 'UNCLASSIFIED', 'UNCLEAR',
]

export interface AgreementRow {
  predicted: CategoryLabel
  actual: CategoryLabel
}

export interface ConfusionCell {
  predicted: CategoryLabel
  actual: CategoryLabel
  count: number
}

export interface AgreementResult {
  n: number
  percentAgreement: number
  kappa: number
  confusionMatrix: ConfusionCell[]
}

const EMPTY_RESULT: AgreementResult = { n: 0, percentAgreement: 0, kappa: 0, confusionMatrix: [] }

// Landis & Koch (1977) conventional bands — the standard citation for
// interpreting kappa magnitude, same "coefficient + n + wording" pattern
// FR-22's interpret.ts uses for correlation coefficients.
export type KappaMagnitude = 'poor' | 'slight' | 'fair' | 'moderate' | 'substantial' | 'almost perfect'

export function kappaMagnitude(kappa: number): KappaMagnitude {
  if (kappa < 0) return 'poor'
  if (kappa < 0.2) return 'slight'
  if (kappa < 0.4) return 'fair'
  if (kappa < 0.6) return 'moderate'
  if (kappa < 0.8) return 'substantial'
  return 'almost perfect'
}

// Standard unweighted Cohen's kappa: kappa = (po - pe) / (1 - pe), where po
// is observed agreement and pe is agreement expected by chance given each
// label's marginal frequency under both raters.
export function computeAgreement(rows: AgreementRow[]): AgreementResult {
  const n = rows.length
  if (n === 0) return EMPTY_RESULT

  const cellCounts = new Map<string, number>()
  const predictedCounts = new Map<CategoryLabel, number>()
  const actualCounts = new Map<CategoryLabel, number>()
  let agree = 0

  for (const { predicted, actual } of rows) {
    const key = `${predicted}|${actual}`
    cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1)
    predictedCounts.set(predicted, (predictedCounts.get(predicted) ?? 0) + 1)
    actualCounts.set(actual, (actualCounts.get(actual) ?? 0) + 1)
    if (predicted === actual) agree++
  }

  const po = agree / n
  let pe = 0
  for (const label of AGREEMENT_LABELS) {
    const predictedShare = (predictedCounts.get(label) ?? 0) / n
    const actualShare = (actualCounts.get(label) ?? 0) / n
    pe += predictedShare * actualShare
  }
  // pe = 1 only when every row shares the same single label on both sides
  // (po is then also 1) — define kappa as 1 rather than 0/0 in that case.
  const kappa = pe >= 1 ? 1 : (po - pe) / (1 - pe)

  const confusionMatrix: ConfusionCell[] = []
  for (const predicted of AGREEMENT_LABELS) {
    for (const actual of AGREEMENT_LABELS) {
      confusionMatrix.push({ predicted, actual, count: cellCounts.get(`${predicted}|${actual}`) ?? 0 })
    }
  }

  return { n, percentAgreement: po, kappa, confusionMatrix }
}
