'use server'

import { autoCategorizeAll, type AutoCategorizeResult } from '@/actions/categorize'
import { runLlmClassification, type ClassifyPostsResult } from '@/actions/classify-posts'

// docs/raven/Tracker_Row_Corrections_and_Combined_Generate_Question.md §2 —
// DISAGREEMENT (lib/categorize/flag-reasons.ts) can only fire once a post
// carries both a keyword and an LLM suggestion. Two independent buttons let a
// manager run only one leg (leave after the first click, or hit the LLM
// cooldown) and silently strand posts that can never be flagged. This wrapper
// runs both legs in one pass so a single click no longer requires the
// manager to remember to come back for the second leg.
//
// docs/raven/Decouple_Both_Legs_and_Exercise_the_Merge.md — both legs are
// attempted independently and reported independently. A first version aborted
// the LLM leg whenever the keyword leg failed, which recreated the exact
// stranded state (a post with neither suggestion) the combined action exists
// to eliminate: a transient keyword-leg failure doesn't establish the
// database is unhealthy, and if it genuinely were, the LLM leg would fail on
// its own at no cost to Groq. Composes the two existing actions rather than
// merging them — each already carries its own auth guard, study-period
// scoping, version stamping, and revalidation, and both are
// idempotent-by-selection (`category_keyword: null` / `category_llm: null`),
// so retrying after either leg's failure only picks up what didn't complete.
export type LlmLegOutcome = ClassifyPostsResult | { ok: false; reason: string; retryable: false; skipped: true }

export interface GenerateSuggestionsResult {
  keyword: AutoCategorizeResult
  llm: LlmLegOutcome
}

// attemptLlm lets the caller skip the LLM leg outright (e.g. it's still
// pacing an earlier run's client-side cooldown) without that skip reading as
// a failure — the keyword leg still runs and reports normally either way, per
// the memo's "have it do what it can rather than nothing."
export async function generateAllSuggestions(attemptLlm: boolean = true): Promise<GenerateSuggestionsResult> {
  const [keyword, llm] = await Promise.all([
    autoCategorizeAll(),
    attemptLlm
      ? runLlmClassification()
      : Promise.resolve<LlmLegOutcome>({ ok: false, reason: 'AI step skipped — still cooling down from the last run.', retryable: false, skipped: true }),
  ])

  return { keyword, llm }
}
