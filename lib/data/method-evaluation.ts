import { prisma } from '@/lib/prisma'
import { withStudyPeriod } from '@/lib/data/study-period'
import { computeAgreement, type AgreementResult } from '@/lib/stats/agreement'

export interface GroundTruthMethodEvaluationData {
  n: number
  keywordAgreement: AgreementResult
  llmAgreement: AgreementResult
}

// Developer_Note_Ground_Truth_Labelling.md §4/§5 — the authoritative FR-15
// comparison: each method against category_final restricted to rows where
// category_final_source = MANUAL_GROUND_TRUTH, i.e. only posts labelled via
// the external two-coder codebook process, never the S4 finalisation queue's
// own accept/override output (see loadMethodEvaluation's circularity note
// below for why that distinction matters).
export async function loadGroundTruthMethodEvaluation(): Promise<GroundTruthMethodEvaluationData> {
  const posts = await prisma.facebookPost.findMany({
    where: withStudyPeriod({ category_final_source: 'MANUAL_GROUND_TRUTH' }),
    select: { category_keyword: true, category_llm: true, category_final: true },
  })

  const keywordRows = posts
    .filter((p) => p.category_keyword !== null)
    .map((p) => ({ predicted: p.category_keyword!, actual: p.category_final! }))
  const llmRows = posts
    .filter((p) => p.category_llm !== null)
    .map((p) => ({ predicted: p.category_llm!, actual: p.category_final! }))

  return {
    n: posts.length,
    keywordAgreement: computeAgreement(keywordRows),
    llmAgreement: computeAgreement(llmRows),
  }
}

export interface InterCoderReliabilitySummary {
  n: number
  percentAgreement: number
  kappa: number
  computedAt: Date
  notes: string | null
}

// Developer_Note_Ground_Truth_Labelling.md §6 — the human "ceiling" kappa
// between the two external coders, imported once via
// scripts/import-inter-coder-reliability.ts after compute_kappa.py runs.
export async function getInterCoderReliability(): Promise<InterCoderReliabilitySummary | null> {
  const row = await prisma.interCoderReliability.findFirst({ orderBy: { computed_at: 'desc' } })
  if (!row) return null
  return { n: row.n, percentAgreement: row.percent_agreement, kappa: row.kappa, computedAt: row.computed_at, notes: row.notes }
}

export interface AcceptanceRatePeriod {
  period: string // 'YYYY-MM'
  keywordTotal: number
  keywordAltered: number
  llmTotal: number
  llmAltered: number
}

export interface AcceptanceRateData {
  keywordAlteredRate: number | null
  llmAlteredRate: number | null
  keywordTotal: number
  llmTotal: number
  periods: AcceptanceRatePeriod[]
}

// docs/raven/Provenance_Followup_and_Revised_Order.md §3.2 — "the proportion
// of suggestions altered by the reviewer in each ingestion period." Deliber-
// ately not called accuracy and carries no kappa: this measures the
// manager's edit behaviour against a suggestion, not agreement with a
// blind reference standard, so it can't be read as a correctness figure —
// see MethodAgreementCard/loadGroundTruthMethodEvaluation above for that.
// Scoped to reviewer decisions only (ACCEPTED_SUGGESTION, MANUAL_OVERRIDE,
// MANUAL_CHANGE_AFTER_FINALISATION) — MANUAL_GROUND_TRUTH and LEGACY_IMPORT
// rows were never a reviewer accepting or altering a suggestion, so
// including them would understate the rate with unrelated denominators.
// "Ingestion period" has no dedicated field on FacebookPost (categorisation
// isn't tied 1:1 to an upload batch), so periods are bucketed by the month
// of category_final_assigned_at as the closest available proxy.
export async function getSuggestionAcceptanceRate(): Promise<AcceptanceRateData> {
  const posts = await prisma.facebookPost.findMany({
    where: withStudyPeriod({
      category_final_source: { in: ['ACCEPTED_SUGGESTION', 'MANUAL_OVERRIDE', 'MANUAL_CHANGE_AFTER_FINALISATION'] },
    }),
    select: { category_keyword: true, category_llm: true, category_final: true, category_final_assigned_at: true },
  })

  const byPeriod = new Map<string, AcceptanceRatePeriod>()
  let keywordTotal = 0, keywordAltered = 0, llmTotal = 0, llmAltered = 0

  for (const p of posts) {
    const period = p.category_final_assigned_at
      ? p.category_final_assigned_at.toISOString().slice(0, 7)
      : 'unknown'
    const entry = byPeriod.get(period) ?? { period, keywordTotal: 0, keywordAltered: 0, llmTotal: 0, llmAltered: 0 }

    if (p.category_keyword !== null) {
      keywordTotal++
      entry.keywordTotal++
      if (p.category_keyword !== p.category_final) { keywordAltered++; entry.keywordAltered++ }
    }
    if (p.category_llm !== null) {
      llmTotal++
      entry.llmTotal++
      if (p.category_llm !== p.category_final) { llmAltered++; entry.llmAltered++ }
    }
    byPeriod.set(period, entry)
  }

  return {
    keywordAlteredRate: keywordTotal > 0 ? keywordAltered / keywordTotal : null,
    llmAlteredRate: llmTotal > 0 ? llmAltered / llmTotal : null,
    keywordTotal,
    llmTotal,
    periods: [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period)),
  }
}

export interface MethodEvaluationData {
  sampleSize: number
  keywordCoverage: number
  llmCoverage: number
  keywordAgreement: AgreementResult
  llmAgreement: AgreementResult
  // Share of the sample where category_final is byte-identical to
  // category_keyword — high values (this dataset: ~96%) indicate
  // category_final was populated by bulk-accepting keyword suggestions
  // (the S4 "Auto-Categorize" + "Accept all pending" flow), not independent
  // human judgment. That structurally biases the keyword-vs-LLM comparison
  // in the keyword method's favor, undermining FR-15's "honest comparison"
  // requirement — surfaced on screen rather than silently reported. This is
  // exactly the problem loadGroundTruthMethodEvaluation above exists to
  // sidestep once the ground-truth CSV is imported.
  keywordFinalMatchShare: number
}

// The S4 finalisation queue's own output, kept as a secondary/diagnostic
// comparison distinct from the ground-truth one above — not the study
// mvp.md §9 item 3 actually calls for, but useful context on how much of the
// library the manager has finalised so far.
export async function loadMethodEvaluation(): Promise<MethodEvaluationData> {
  const posts = await prisma.facebookPost.findMany({
    where: withStudyPeriod({ category_final: { not: null } }),
    select: { category_keyword: true, category_llm: true, category_final: true },
  })

  const keywordRows = posts
    .filter((p) => p.category_keyword !== null)
    .map((p) => ({ predicted: p.category_keyword!, actual: p.category_final! }))
  const llmRows = posts
    .filter((p) => p.category_llm !== null)
    .map((p) => ({ predicted: p.category_llm!, actual: p.category_final! }))

  const keywordFinalMatches = posts.filter((p) => p.category_keyword !== null && p.category_keyword === p.category_final).length

  return {
    sampleSize: posts.length,
    keywordCoverage: keywordRows.length,
    llmCoverage: llmRows.length,
    keywordAgreement: computeAgreement(keywordRows),
    llmAgreement: computeAgreement(llmRows),
    keywordFinalMatchShare: posts.length > 0 ? keywordFinalMatches / posts.length : 0,
  }
}
