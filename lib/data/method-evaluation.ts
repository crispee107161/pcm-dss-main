import type { CategoryLabel } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { withStudyPeriod } from '@/lib/data/study-period'
import { computeAgreement, computeRecallByCategory, type AgreementResult, type CategoryRecall } from '@/lib/stats/agreement'

export interface GroundTruthMethodEvaluationData {
  n: number
  keywordAgreement: AgreementResult
  llmAgreement: AgreementResult
  keywordRecall: CategoryRecall[]
  llmRecall: CategoryRecall[]
}

export interface GroundTruthComparison {
  // Docs/raven/Backlog_Coding_Complete_v2.md §3 — the pre-specified figure:
  // MANUAL_GROUND_TRUTH only (the original 200-post reference sample), the
  // target committed to before any result was seen.
  referenceOnly: GroundTruthMethodEvaluationData
  // Same §3 — MANUAL_GROUND_TRUTH + MANUAL_CODEBOOK_ASSIGNMENT combined
  // (~707 posts, effectively the whole in-period corpus less the 12 posts
  // held back for the demonstration). Both sets were produced by the same
  // two coders under the same blind, caption-only, suggestion-blind
  // procedure, so scoring them together is not a change of methodology —
  // see the memo for the contamination argument. Reported alongside, never
  // instead of, referenceOnly.
  combined: GroundTruthMethodEvaluationData
}

const GROUND_TRUTH_SOURCES = ['MANUAL_GROUND_TRUTH', 'MANUAL_CODEBOOK_ASSIGNMENT'] as const

type GroundTruthPost = {
  category_keyword: CategoryLabel | null
  category_llm: CategoryLabel | null
  category_final: CategoryLabel | null
}

export function scoreGroundTruthPosts(posts: GroundTruthPost[]): GroundTruthMethodEvaluationData {
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
    keywordRecall: computeRecallByCategory(keywordRows),
    llmRecall: computeRecallByCategory(llmRows),
  }
}

// Developer_Note_Ground_Truth_Labelling.md §4/§5 — the authoritative FR-15
// comparison: each method against category_final restricted to rows labelled
// via the external two-coder codebook process (MANUAL_GROUND_TRUTH, and now
// MANUAL_CODEBOOK_ASSIGNMENT — see GroundTruthComparison above), never the S4
// finalisation queue's own accept/override output (see loadMethodEvaluation's
// circularity note below for why that distinction matters).
export async function loadGroundTruthMethodEvaluation(): Promise<GroundTruthComparison> {
  const posts = await prisma.facebookPost.findMany({
    where: withStudyPeriod({
      category_final_source: { in: [...GROUND_TRUTH_SOURCES] },
      category_final: { not: null },
    }),
    select: { category_keyword: true, category_llm: true, category_final: true, category_final_source: true },
  })

  const referenceOnly = posts.filter((p) => p.category_final_source === 'MANUAL_GROUND_TRUTH')

  return {
    referenceOnly: scoreGroundTruthPosts(referenceOnly),
    combined: scoreGroundTruthPosts(posts),
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
// between the two external coders, imported via
// scripts/import-inter-coder-reliability.ts after compute_kappa.py runs.
// FR08_707_Figures_to_Reconcile.md §3 — three sessions can now coexist here:
// the reference sample (n=200), the backlog session (n=507), and a pooled
// figure across both (n=707). Returning every row (not just the latest) lets
// the page match each section's ceiling banner to its own n rather than one
// row winning by recency and silently displacing the others.
export async function getInterCoderReliabilityRows(): Promise<InterCoderReliabilitySummary[]> {
  const rows = await prisma.interCoderReliability.findMany({ orderBy: { computed_at: 'desc' } })
  return rows.map((row) => ({ n: row.n, percentAgreement: row.percent_agreement, kappa: row.kappa, computedAt: row.computed_at, notes: row.notes }))
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
