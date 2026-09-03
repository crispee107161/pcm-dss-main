# Reply: account ownership and remaining items

**Date:** 4 September 2026
**Re:** `Groq_Account_Ownership_and_Remaining_Items.md`

---

## Verified from code (closed)

**§3 — exactly one prompt snapshot.** Confirmed: `docs/raven/classification-prompt-snapshot.txt` is the only file matching a prompt-snapshot pattern anywhere in the repo. No older copy exists to delete or supersede.

**§4.1 — the two-model description, one correction.** Confirmed against the code:
- `actions/classify-posts.ts` — `CLASSIFICATION_MODEL = 'openai/gpt-oss-20b'`, `CLASSIFICATION_TEMPERATURE = 0`, pinned as a constant, deliberately bypassing `resolveGroqModel()`.
- `actions/chat.ts` via `lib/groq-model.ts` — `resolveGroqModel()` picks the first live entry from the allowlist `['openai/gpt-oss-20b', 'openai/gpt-oss-120b']`.

One thing to correct in your framing: it's **the assistant only**, not "the assistant and keyword paths." `actions/keywords.ts` doesn't call Groq at all — the lexicon is frozen (`docs/raven/FR08_Seed_Lexicon_Rerun_Results.md`) and every export there is a hard stop that returns a "frozen" message without touching the network. The only two Groq callers in the codebase are `chat.ts` and `classify-posts.ts`. This traced back to a stale comment in `lib/groq-model.ts` (and a matching one in `classify-posts.ts`) that still named `keywords.ts` as a caller — both fixed. Chapter 3 should say the assistant selects from the allowlist, singular.

**§5 — the Chapter 3 paragraph.** Two of its four claims are code-checkable, and both hold: the transmission circumstances (caption text for classification, aggregate performance figures for the assistant) and the pinned-vs-allowlist model split. The other two — that Groq's terms don't permit training on inputs by default, and that the client was informed in writing and acknowledged it — aren't things I can verify by reading this repo; they need a dated citation to the terms and confirmation of the document exchange, respectively.

On "no customer-identifying information": reading `classify-posts.ts` confirms only that nothing beyond caption text is transmitted — it doesn't confirm what's *inside* the captions. One of the four classification categories is `TESTIMONIAL` ("a customer testimonial, thank-you, or delivered-transaction post"), which is exactly the kind of caption most likely to name a customer. I haven't sampled the actual testimonial captions in the DB to check. Suggest either sampling them before asserting this to the client, or narrowing the sentence to what the code actually guarantees — something like "no data beyond the text the business itself published publicly on its Facebook page."

Also, `chat.ts` sends more than aggregate spend/reach/CPI: it also sends `ad_name` for the top 5 ads by messaging conversations and per-day views/visits/follows for the last 7 days. Neither is customer-identifying, and FR-21 already permits this explicitly ("aggregate measures and advertisement names") — the paragraph should match that wording rather than "aggregate ... figures only," so it doesn't read as narrower than what the code does.

Code change needed for the stale-comment fix above; the two wording items are yours to weigh in on.

---

## §1 — ZDR: done

Global ZDR is enabled in the Groq Console (Data Controls → Global ZDR toggle on, reading "Enabled — API specific settings are overriden"). Screenshot: `docs/raven/zdr-ss.jpg`.

Scope: **org-wide**. Global ZDR overrides the per-API toggles — the "Inference APIs ZDR" sub-setting shows greyed out underneath it rather than independently on, because the global setting already covers it.

One gap: the screenshot doesn't show a date/timestamp — the Groq Console page itself doesn't surface one. Let me know if you need this corroborated another way (e.g. a support/account export) or if the screenshot as-is is sufficient for the appendix.

The Chapter 3 paragraph's third sentence is now true — the ZDR clause can drop its conditional framing.

---

## Still open — needs my input, not yet answered

These are account-side or decision items outside the codebase; I haven't completed them yet:

- [ ] **§1.1** — Confirm I'm one of the five named signatories on the NDA.
- [ ] **§1.2** — Decide and state the post-defense account arrangement (transfer, client's own account, or discontinued), and confirm current tier/billing.
- [ ] **§2** — Confirm key scoping (project-only vs. shared), and pull current rate limits to check whether a full 731-post run (~49 calls) is safe to demo live or should be a small run instead.

Two things that affect that §2 planning, found while checking the code: `runLlmClassification` only selects posts with `category_llm: null`, and per `docs/raven/LLM_Prompt_Model_Provenance.md` that's already populated across the whole corpus — so a live run today classifies zero posts unless it's nulled first. The "731 posts, ~49 calls" figure is a from-scratch estimate, not something clickable right now. Also, 49 is a floor: `classifyBatch` retries a failed batch once, so worst case is closer to 98 calls. Both matter for the live-vs-small-run decision.

**§4.2 — non-determinism at temperature 0.4.** Confirmed: `CHAT_TEMPERATURE = 0.4` in `chat.ts`, correct as-is. One flag on the FR-21 citation, though — `docs/mvp.md` (the requirements source of truth per this project's CLAUDE.md) uses FR-21 for a different requirement, Shapiro-Wilk correlation method selection. The FR-21 you mean is the one in `docs/raven/Final_FR_Table_Objectives_and_Reverse_Traceability.md` — worth a parenthetical pointing at that doc so a reader holding `mvp.md` doesn't resolve it to the wrong clause.

Will follow up once the open items above are done — §1 first since it's the blocker.
