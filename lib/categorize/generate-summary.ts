import type { GenerateSuggestionsResult } from '@/actions/generate-suggestions'

export type GenerateResultTone = 'positive' | 'warning' | 'negative'

export interface GenerateResultMessage {
  text: string
  tone: GenerateResultTone
}

function pluralize(count: number, singular: string, plural: string = `${singular}s`): string {
  return `${count} ${count !== 1 ? plural : singular}`
}

// Reason strings coming out of the two underlying actions are inconsistent
// about a trailing period (some end a full sentence, some are a bare label
// like "Unauthorized") — normalise once here instead of forcing every reason
// string at the source to agree, or double-stopping the ones that already do.
function sentenceEnd(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`
}

function describeKeyword(result: GenerateSuggestionsResult['keyword']): string {
  if (!result.ok) return `Keyword step failed: ${result.reason}`
  const phrase = result.posts === 0 ? 'Nothing new to categorise' : `Applied to ${pluralize(result.posts, 'post')}`
  return `Keyword: ${phrase}`
}

function isSkippedLlmLeg(llm: GenerateSuggestionsResult['llm']): llm is { ok: false; reason: string; retryable: false; skipped: true } {
  return !llm.ok && 'skipped' in llm && llm.skipped === true
}

function describeLlm(llm: GenerateSuggestionsResult['llm']): string {
  if (isSkippedLlmLeg(llm)) return 'AI step skipped — still cooling down'
  if (!llm.ok) return `AI step failed: ${llm.reason}`

  const { classified, unclassified, batchesRun, batchesFailed } = llm
  if (batchesRun === 0 && batchesFailed === 0) return 'AI: nothing new to classify'

  return (
    `AI: classified ${pluralize(classified, 'post')} (${unclassified} unclassified)` +
    (batchesFailed > 0 ? ` — ${pluralize(batchesFailed, 'batch', 'batches')} failed, retry to pick them up` : '')
  )
}

// docs/raven/Decouple_Both_Legs_and_Exercise_the_Merge.md — the two legs are
// attempted (or, for the AI leg, deliberately skipped while cooling down)
// independently, and this always names both outcomes rather than
// short-circuiting on whichever leg failed first. Kept out of the component
// so every combination — both ok, one failed while the other completed (the
// partial-progress state the combined action exists to preserve, not lose),
// and the AI leg skipped — is unit-testable without React.
export function formatGenerateResult(result: GenerateSuggestionsResult): GenerateResultMessage {
  const { keyword, llm } = result
  const text = `${sentenceEnd(describeKeyword(keyword))} ${sentenceEnd(describeLlm(llm))}`

  if (!keyword.ok && !llm.ok && !isSkippedLlmLeg(llm)) {
    // Both legs genuinely failed — nothing written this run.
    return { text, tone: 'negative' }
  }
  if (!keyword.ok || !llm.ok) {
    // One leg failed or was skipped while the other completed — partial
    // progress, not a clean run.
    return { text, tone: 'warning' }
  }
  return { text, tone: llm.batchesFailed > 0 ? 'warning' : 'positive' }
}
