# Reply: Groq configuration status, checked against code

**Date:** 4 September 2026
**Re:** `Groq_Configuration_Requirements.md`
**Order followed:** your priority list, §1 → §1.1 → §3 → §5 → §2 → §4 → §6

---

## 1. ⚠ Zero Data Retention — still open, needs you or whoever holds the Groq account

Nothing in the codebase or repo tracks console-level settings, so this can't be confirmed from code — it needs someone with Groq Console access to enable it under Data Controls and take the screenshot. Not done as far as I can tell from this end. Flagging rather than guessing: who has console access, you or the client-side contact?

Until that screenshot exists, agreeing the agreement's sentence is accurate would be premature — noted per your instruction not to send it until then.

## 1.1. Batch processing — confirmed not in use

Checked every Groq call site: `classify-posts.ts`, `categorize.ts`, `chat.ts`, `keywords.ts`. All four call `/openai/v1/chat/completions` directly, synchronously, per-batch. No batch endpoint reference anywhere in the repo. Your understanding was correct — the 731-post classification run chunks into ordinary synchronous calls (`BATCH_SIZE = 15` in `classify-posts.ts`), not the batch API.

## 3. API key handling — clean

- Every reference is `process.env.GROQ_API_KEY` (`chat.ts`, `classify-posts.ts`, `categorize.ts`, `keywords.ts`, `scripts/rerun-fr08-llm-model.ts`). No literal key anywhere in source.
- `.gitignore` has `.env*` — `.env` itself was never trackable.
- Searched the full git history for a committed key value (`git log --all -p -- '*.env'` grepped for the key prefix) — nothing. It was never committed and then removed either.
- Haven't confirmed scoping (project-only vs. shared) — that's account-side, same as ZDR.

## 5. What's actually transmitted — matches your permitted list

**`chat.ts` payload:** ad names, spend, messaging-contact counts, reach (ads); count/avg-engagement-rate/reach (organic posts, aggregated via `prisma.aggregate`, never row-level); views/visits/follows for the last 7 days (page metrics); current follower count. Nothing else reaches the prompt.

**`classify-posts.ts` payload:** caption text only (`post_id`, `post_type`, `caption`), matching your §5 categorisation-call line exactly.

**Predictive Model check:** confirmed absent from the assistant. `chat.ts` has no reference to regression coefficients, `fr31-regression.ts`, or anything from the cut predictive model — the system prompt explicitly tells the assistant it has no visibility into inventory/pricing/sales, and the LIVE DATA block only ever contains the aggregates listed above.

No customer names, message content, transaction/inventory/pricing data, or credentials anywhere in either payload. Both call sites match your list as written.

## 2. Model pinning — mostly done, one gap

- `openai/gpt-oss-20b` is pinned as a named constant (`CLASSIFICATION_MODEL` in `classify-posts.ts`) for the classification path — deliberately not run through `resolveGroqModel()`, because that path needs a fixed model for FR-08/FR-15 reproducibility, documented in a comment pointing at `LLM_Prompt_Model_Provenance.md`.
- `chat.ts`/`keywords.ts` go through `lib/groq-model.ts`'s `resolveGroqModel()` — a preference-ordered allowlist (`PREFERRED_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b']`), not an open query against whatever Groq has live. That's the deliberate trade-off from when `llama-3.1-8b-instant` got decommissioned mid-project: the assistant/keyword paths favor not going down when a model retires, the classification path favors reproducibility over uptime. Both are named constants, not literals.
- **Fixed.** Temperature is now a named constant at both call sites: `CLASSIFICATION_TEMPERATURE = 0` in `classify-posts.ts` (pinned for the FR-08/FR-15 reproducibility reason above), `CHAT_TEMPERATURE = 0.4` in `chat.ts` (not pinned to 0 — it's a conversational assistant, not an evaluation figure — but still a named constant, not a literal).
- Haven't independently verified with Groq that `openai/gpt-oss-20b` is a stable id rather than an alias — that's a Groq-docs check, not a code check, will do it alongside the deprecation-notice sweep.

## 4. Rate limiting and failure behaviour — confirmed

- Chat: 20 messages / 5 minutes per user (`CHAT_LIMIT`/`CHAT_WINDOW_MS`).
- Classification: 5 runs / 5 minutes (`CLASSIFY_LIMIT`), plus a real cooldown on top — a 429 from Groq raises `GroqRateLimitError`, which parses the `Retry-After` header (falls back to 60s) and returns a `retryable: true` result the UI can act on, instead of retrying blindly.
- **Your open question — what the assistant does if Groq is unreachable:** it degrades gracefully. `chat.ts`'s try/catch returns `'Network error — could not reach AI service. Please try again.'` as a plain string rendered in the chat, not a thrown error or a hang. Same shape for a Groq-side API error (`'API error: ...'`). Worth a quick demo-day check that the UI renders that string cleanly rather than looking broken, but the underlying behaviour is right.
- Haven't checked actual account-level rate limits against a 731-post run's call volume — that's a Groq dashboard number, will pull it this week.

## 6. Appendix items — one missing

- Data Controls screenshot: blocked on §1.
- Model/temperature/date note: can write this once §2's temperature constants land.
- **Fixed.** Extracted the static instruction text out of `buildPrompt()` into its own `PROMPT_TEMPLATE` constant in `classify-posts.ts`, and committed a snapshot at `docs/raven/classification-prompt-snapshot.txt` — same text, with `{{DATA}}` marking where each batch's posts get substituted in at runtime. The snapshot file is now the single source of truth alongside the code (both point at each other in comments), so it can't silently drift if the prompt changes later. If you already had a different copy floating around elsewhere, let me know so we don't end up with two.

## 7. Your Chapter 3 paragraph

Read it against the above — accurate except for tense: "The researchers enabled the provider's Zero Data Retention setting" isn't true yet. Once §1 actually happens, the rest of the paragraph holds against current code as written.

---

**Bottom line:** most of this was already true in code before your memo — §1.1, §3, §5, and §4's degrade-gracefully behaviour all checked out as-is, and I've now landed the two code fixes (§2 temperature constants, §6 prompt snapshot) rather than leaving them for later. What's still open: §1 ZDR (blocking, needs console access — the one thing that actually matters most on your list), and two account-side checks (key scoping, current rate limits) that neither of us can answer from source.

Who has Groq Console access for §1 — you, me, or the client?
