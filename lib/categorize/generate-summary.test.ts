import { describe, it, expect } from 'vitest'
import { formatGenerateResult } from './generate-summary'
import type { GenerateSuggestionsResult } from '@/actions/generate-suggestions'

describe('formatGenerateResult', () => {
  it('reports both legs with a positive tone when everything succeeds', () => {
    const result: GenerateSuggestionsResult = {
      keyword: { ok: true, posts: 12 },
      llm: { ok: true, classified: 12, unclassified: 3, batchesRun: 1, batchesRemaining: 0, batchesFailed: 0 },
    }
    expect(formatGenerateResult(result)).toEqual({
      text: 'Keyword: Applied to 12 posts. AI: classified 12 posts (3 unclassified).',
      tone: 'positive',
    })
  })

  it('uses singular wording for a single post', () => {
    const result: GenerateSuggestionsResult = {
      keyword: { ok: true, posts: 1 },
      llm: { ok: true, classified: 1, unclassified: 0, batchesRun: 1, batchesRemaining: 0, batchesFailed: 0 },
    }
    expect(formatGenerateResult(result)).toEqual({
      text: 'Keyword: Applied to 1 post. AI: classified 1 post (0 unclassified).',
      tone: 'positive',
    })
  })

  it('reports nothing-new wording for both legs when there is nothing to do', () => {
    const result: GenerateSuggestionsResult = {
      keyword: { ok: true, posts: 0 },
      llm: { ok: true, classified: 0, unclassified: 0, batchesRun: 0, batchesRemaining: 0, batchesFailed: 0 },
    }
    expect(formatGenerateResult(result)).toEqual({
      text: 'Keyword: Nothing new to categorise. AI: nothing new to classify.',
      tone: 'positive',
    })
  })

  it('appends a warning about failed batches without discarding the classified count', () => {
    const result: GenerateSuggestionsResult = {
      keyword: { ok: true, posts: 5 },
      llm: { ok: true, classified: 10, unclassified: 2, batchesRun: 3, batchesRemaining: 0, batchesFailed: 2 },
    }
    expect(formatGenerateResult(result)).toEqual({
      text: 'Keyword: Applied to 5 posts. AI: classified 10 posts (2 unclassified) — 2 batches failed, retry to pick them up.',
      tone: 'warning',
    })
  })

  it('reports a warning, not nothing-to-do, when every batch fails', () => {
    const result: GenerateSuggestionsResult = {
      keyword: { ok: true, posts: 5 },
      llm: { ok: true, classified: 0, unclassified: 0, batchesRun: 0, batchesRemaining: 0, batchesFailed: 3 },
    }
    expect(formatGenerateResult(result)).toEqual({
      text: 'Keyword: Applied to 5 posts. AI: classified 0 posts (0 unclassified) — 3 batches failed, retry to pick them up.',
      tone: 'warning',
    })
  })

  it('keeps the keyword result and surfaces the LLM failure reason as a warning, not a loss', () => {
    const result: GenerateSuggestionsResult = {
      keyword: { ok: true, posts: 12 },
      llm: { ok: false, reason: 'AI classification is not configured for this deployment.', retryable: false },
    }
    expect(formatGenerateResult(result)).toEqual({
      text: 'Keyword: Applied to 12 posts. AI step failed: AI classification is not configured for this deployment.',
      tone: 'warning',
    })
  })

  it('uses nothing-new-to-categorise wording when the keyword leg found nothing but the LLM leg still fails', () => {
    const result: GenerateSuggestionsResult = {
      keyword: { ok: true, posts: 0 },
      llm: { ok: false, reason: 'Too many requests.', retryable: true, retryAfterSeconds: 30 },
    }
    expect(formatGenerateResult(result)).toEqual({
      text: 'Keyword: Nothing new to categorise. AI step failed: Too many requests.',
      tone: 'warning',
    })
  })

  it('names the AI leg as skipped, not failed, when it was deliberately not attempted', () => {
    const result: GenerateSuggestionsResult = {
      keyword: { ok: true, posts: 34 },
      llm: { ok: false, reason: 'AI step skipped — still cooling down from the last run.', retryable: false, skipped: true },
    }
    expect(formatGenerateResult(result)).toEqual({
      text: 'Keyword: Applied to 34 posts. AI step skipped — still cooling down.',
      tone: 'warning',
    })
  })

  it('surfaces a keyword failure without losing an LLM leg that still succeeded', () => {
    const result: GenerateSuggestionsResult = {
      keyword: { ok: false, reason: 'Something went wrong. Please try again.' },
      llm: { ok: true, classified: 4, unclassified: 1, batchesRun: 1, batchesRemaining: 0, batchesFailed: 0 },
    }
    expect(formatGenerateResult(result)).toEqual({
      text: 'Keyword step failed: Something went wrong. Please try again. AI: classified 4 posts (1 unclassified).',
      tone: 'warning',
    })
  })

  it('reports a negative tone only when both legs genuinely fail', () => {
    const result: GenerateSuggestionsResult = {
      keyword: { ok: false, reason: 'Unauthorized' },
      llm: { ok: false, reason: 'Unauthorized', retryable: false },
    }
    expect(formatGenerateResult(result)).toEqual({
      text: 'Keyword step failed: Unauthorized. AI step failed: Unauthorized.',
      tone: 'negative',
    })
  })

  it('does not report a negative tone when the keyword leg fails but the AI leg was only skipped', () => {
    const result: GenerateSuggestionsResult = {
      keyword: { ok: false, reason: 'Unauthorized' },
      llm: { ok: false, reason: 'AI step skipped — still cooling down from the last run.', retryable: false, skipped: true },
    }
    expect(formatGenerateResult(result)).toEqual({
      text: 'Keyword step failed: Unauthorized. AI step skipped — still cooling down.',
      tone: 'warning',
    })
  })
})
