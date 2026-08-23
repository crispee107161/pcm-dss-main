# Provenance audit results

**Date:** 23 August 2026
**Re:** `Provenance_Followup_and_Revised_Order.md` §2.1/§2.3 and `Content_Filters_Review.md` §1/§3/§9 Q4
**Method:** read-only queries, `scripts/category-final-audit.ts` (committed, does not write to any table). Raw output available on request.

---

## §2.1 — LLM prompt and model provenance

- **Prompt location:** `actions/classify-posts.ts`, function `buildPrompt()`, lines 62-83. Single template literal, in version control (no external prompt file/service).
- **Commit history:** the prompt first appeared 2026-08-14 (commit `5b852bd`), i.e. **after** the 13 August ground-truth import date. `git diff 5b852bd..HEAD -- actions/classify-posts.ts` shows zero lines touching the prompt body (category definitions, instruction, JSON output contract) — the prompt text itself has not changed since it was written.
- **Temperature:** pinned at `temperature: 0` in `callGroq()` (`actions/classify-posts.ts`), unchanged in every commit.
- **Model — not pinned, and this is a real finding.** Through commit `3171615` (22 Aug), the model was a hardcoded constant, `const MODEL_NAME = 'llama-3.1-8b-instant'` — matching your expectation exactly. Commit **`a308813` (23 Aug, "fix: auto-resolve Groq model to survive deprecations")** replaced that constant with a runtime resolver (`lib/groq-model.ts`) that queries Groq's `/models` endpoint and currently picks `openai/gpt-oss-20b` from a preference list. This was a defensive change (Groq periodically deprecates model IDs) but it means the model backing LLM classification is no longer reproducible from the codebase alone.
- **Was any classification actually run under the new resolver?** Queried `LlmClassificationRun` (persists `model_name` + `run_at` per batch): **all 63 runs on record used `llama-3.1-8b-instant`**, and the most recent run was 2026-08-13T05:05:18Z — ten days before the auto-resolve change landed. **The stored `category_llm` values behind κ=0.444 were produced entirely under the model you expected.** Nothing has drifted yet. The risk is forward-looking only: the next time anyone runs LLM classification, it will silently switch models with no forcing function to notice.
- **Action taken:** pinning the model back to a hardcoded, version-controlled value is Phase 3 of the attached plan (in progress), specifically so this stays reproducible rather than because anything is currently wrong.

## §2.3 / Content_Filters_Review §3 — who has been clearing the queue

Queried every post with `category_final` set, joined to the assigning account:

| Account | Role | Posts | First | Last |
|---|---|---|---|---|
| `marketing@pcmerchandise.com` | MARKETING_MANAGER | 12 | 2026-08-19 | 2026-08-22 |

**Every non-import, non-legacy assignment in the dataset was made under this one account.** There is no second Marketing Manager or Marketing Team account that has ever written `category_final`.

The three specific timestamps flagged in `Content_Filters_Review.md` (2:54 AM, 3:43 AM, 3:51 AM) are confirmed and account for 3 of the 12: converting their stored UTC values to PHT (UTC+8) gives exactly `2026-08-20 02:54:53`, `2026-08-23 03:43:19`, `2026-08-23 03:51:27`.

**What the audit trail can and can't answer, stated plainly (this is your own point in §2.3, and it's the honest answer):** it records which account was open, not who was physically at the keyboard. There is exactly one Marketing Manager account in this system, so "who set these labels" resolves to "whoever holds the Marketing Manager credentials at that hour" — the database cannot distinguish Sir Dan from a group member using his login. That's a question for the team, not a query. Recommend asking directly: confirm who holds Marketing Manager credentials, and whether Sir Dan was personally reviewing at ~3 AM on 20 and 23 August, or someone else was.

## Content_Filters_Review §1 — "All and Categorised return identical rows"

**Refuted by the actual counts.** Current corpus:

| Filter | Predicate | Count |
|---|---|---|
| All | (none) | 916 |
| Needs Review | `category_final IS NULL` | 130 |
| Categorised | `category_final NOT NULL AND != UNCLASSIFIED` | 786 |
| Unassigned | `category_final = UNCLASSIFIED` | 0 |

130 + 786 + 0 = 916 — the three tabs partition the corpus correctly and Categorised is 130 rows short of All, exactly matching the queue count. Code review confirmed `whereForFilter` in both `categorize/page.tsx` routes is correct (independently verified by reading the source, not just this count). The likely explanation for the screenshots looking identical: both views sort `publish_time desc`, and with 786/916 posts already finalised, page 1 of All and page 1 of Categorised show mostly the same recent rows — a visual coincidence, not a query bug.

One unrelated observation surfaced by this query: total corpus is 916, not the 730 cited in your memo. `FacebookPost` has no organic/paid split field to check against, so this is most likely corpus growth from CSV uploads between when you took those screenshots and now, not a missing filter — flagging in case it's unexpected on your end.

## Zero Unassigned posts (§5 of Content_Filters_Review)

Confirmed independently: 0 posts have `category_final = 'UNCLASSIFIED'` anywhere in the corpus. Not addressed by this audit — this is a UX/training question (whether the escape hatch is reachable and used), not a data-integrity one. Left for the Content-screen fix pass.
