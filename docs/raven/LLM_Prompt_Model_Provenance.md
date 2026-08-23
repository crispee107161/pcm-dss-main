# LLM prompt and model provenance

**Date:** 23 August 2026
**Re:** `Provenance_Followup_and_Revised_Order.md` §2.1
**Scripts:** `scripts/category-final-audit.ts` (LLM run history, read-only), `scripts/rerun-fr08-llm-model.ts` (live Groq re-run, read-only — does not write `category_llm`)

## §2.1 checklist, answered

- **Where does the categorisation prompt live? File path, and is it in version control?**
  `actions/classify-posts.ts`, function `buildPrompt()`, lines 62-83 (line numbers shifted slightly after this session's edit — see below). Single template literal, committed, no external prompt file or service.

- **Commit history showing its state on or before 13 August 2026:**
  The prompt did not exist before 13 August — it was introduced 2026-08-14 in commit `5b852bd`, the day after the ground-truth import. `git diff 5b852bd..HEAD -- actions/classify-posts.ts` shows zero lines touching the prompt body since it was written.

- **Confirmation of whether it has been edited since, and if so, what changed and when:**
  Not edited. Only the *model selection* around the prompt changed (see below); the definitions, instruction, and JSON output contract are unchanged since 2026-08-14.

- **Confirmation that the model and temperature are pinned and unchanged:**
  **Temperature: yes**, `0` in every commit. **Model: no, and this was the real finding.** Through commit `3171615` (22 Aug), `MODEL_NAME` was a hardcoded constant, `'llama-3.1-8b-instant'`. Commit `a308813` (23 Aug, same day as the memo) replaced it with `resolveGroqModel()`, a runtime resolver that queries Groq's live `/models` list — because Groq had deprecated `llama-3.1-8b-instant` outright (confirmed in that commit's own message: "Groq deprecated llama-3.1-8b-instant, breaking AI Keyword Suggestions, classification, insights, and chat"). The old model cannot be pinned back to; it no longer exists on Groq.

  Queried `LlmClassificationRun` (persists `model_name` per batch): **all 63 historical runs used `llama-3.1-8b-instant`**, last run 2026-08-13T05:05Z, ten days before the auto-resolve change. **The stored `category_llm` values behind κ=0.444 are unaffected by the later change** — nothing has drifted retroactively. The risk was forward-looking: the next classification run would have silently picked whatever model `resolveGroqModel()` currently resolves to (`openai/gpt-oss-20b` as of this session), with no version-controlled record of which model produced which result.

- **Snapshot the prompt to a committed file for the manuscript appendix:** the prompt is already a plain string in a committed file (`actions/classify-posts.ts`); no separate snapshot file was created, matching how the lexicon snapshots exist because the lexicon lives in a database table rather than a source file.

## Fix applied

`actions/classify-posts.ts` now pins a dedicated constant, `CLASSIFICATION_MODEL = 'openai/gpt-oss-20b'`, for this action only, instead of calling `resolveGroqModel()`. The shared auto-resolver stays in place for `chat.ts`/`ai-insights.ts`/`keywords.ts`, where deprecation-resilience matters more than reproducibility and there is no evaluation figure riding on a specific model. A future Groq deprecation of `gpt-oss-20b` will now surface as a loud, fixable error on the classification path specifically, rather than a silent model swap — the intended trade for a methodology that has to name its model.

## Reproduction run

Ran `scripts/rerun-fr08-llm-model.ts`: re-classified all 200 `MANUAL_GROUND_TRUTH` posts live against Groq under the newly-pinned `openai/gpt-oss-20b`, using the identical prompt template, same temperature (0), same batching. Did not overwrite `category_llm` — this is a comparison figure only.

| | Stored (llama-3.1-8b-instant, historical) | Fresh (openai/gpt-oss-20b, this run) |
|---|---|---|
| n | 200 | 200 |
| p_o | 0.6450 (129/200) | 0.6700 (134/200) |
| κ | **0.4443** (moderate) | **0.4645** (moderate) |

Per-category recall shifted (Promotional Offer and Product Showcase up, Testimonial down) but the headline κ is not meaningfully different — both land in the same Landis & Koch "moderate" band, and the new model is if anything slightly better on this sample. 64/200 individual predictions changed, but they largely cancel in aggregate.

**Recommendation for Chapter 3:** report κ=0.444 as the original figure (it's what the deployed system used through the evaluation period) and note in a footnote or methods appendix that the underlying model was later pinned from an auto-resolving reference to a fixed `openai/gpt-oss-20b` after Groq deprecated the original model, with a reproduction run confirming no material change (κ=0.465, same agreement band). This is the LLM-side equivalent of the lexicon's "drift didn't inflate the score" finding — a second documented control, not a second problem.
