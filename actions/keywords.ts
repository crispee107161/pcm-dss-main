'use server'

// docs/raven/Lexicon_Drift_Rerun_Spec.md §5 — the keyword lexicon is a fixed
// research artefact (FR-08's rule-based baseline), not an editable setting.
// The 2026-08-22/23 drift finding (43 undated additions, several
// miscategorised) is why every write path below refuses unconditionally,
// server-side, regardless of role or request origin — hiding the edit UI on
// the client isn't enough on its own. See
// docs/raven/FR08_Seed_Lexicon_Rerun_Results.md for the analysis this
// decision is based on.
const LEXICON_FROZEN_MESSAGE =
  'The keyword lexicon is frozen for the study — see docs/raven/FR08_Seed_Lexicon_Rerun_Results.md. It can no longer be edited from the UI.'

export async function addKeyword(
  _prev: { error?: string; success?: string } | null,
  _formData: FormData
): Promise<{ error?: string; success?: string }> {
  return { error: LEXICON_FROZEN_MESSAGE }
}

export interface KeywordSuggestion {
  categoryId: number
  categoryName: string
  keywords: string[]
}

export type SuggestKeywordsResult =
  | { ok: true; suggestions: KeywordSuggestion[] }
  | { ok: false; reason: string; retryable: boolean; retryAfterSeconds?: number }

export async function suggestKeywords(): Promise<SuggestKeywordsResult> {
  return { ok: false, reason: LEXICON_FROZEN_MESSAGE, retryable: false }
}

export async function addKeywordsBulk(_items: { word: string; categoryId: number }[]): Promise<{ error?: string }> {
  return { error: LEXICON_FROZEN_MESSAGE }
}

export async function deleteKeyword(
  _prev: { error?: string } | null,
  _formData: FormData
): Promise<{ error?: string }> {
  return { error: LEXICON_FROZEN_MESSAGE }
}
