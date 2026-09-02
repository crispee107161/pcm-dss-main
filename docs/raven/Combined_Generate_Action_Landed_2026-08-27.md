# The combined Generate action is built

**Date:** 27 August 2026
**Re:** `Tracker_Row_Corrections_and_Combined_Generate_Question.md` §2
**Status:** built on the assumption of a green light, not on one you gave — flag if you want it reverted or changed

---

## 0. Why we didn't wait

Your memo raised the combined-Generate idea and asked us to confirm before building. We went ahead anyway, because the risk it closes — a post permanently unable to raise `DISAGREEMENT` because only one suggestion method ever ran on it — sits in the Needs Review queue that's supposed to be the thing under demonstration. Reverting is cheap (one file, one component change) if you'd rather we hadn't.

---

## 1. What changed

The Needs Review queue had two buttons: **"Generate suggestions"** (keyword, ALG-04) and **"Generate AI suggestions"** (LLM, ALG-05). They're now one button, **"Generate suggestions"**, that runs both in a single pass.

**Why this mattered.** `DISAGREEMENT` only fires when a post has *both* a keyword suggestion and an LLM suggestion, and they differ. With two independent buttons, a manager who ran only one — left after the first click, or hit the LLM's 60-second cooldown and moved on — left every post from that run permanently unable to raise `DISAGREEMENT`, with no visible sign anything was missing. The fix closes that gap for the common case (a manager stopping after one click), but it narrows the partial-run window rather than eliminating it — if the LLM leg itself fails (missing key, retired model, rate limit, network error), a post can still end up with only a keyword suggestion until Generate is retried. There's still no queue-level indicator for that stranded state; it only surfaces as a transient toast.

**What it doesn't change.** Nothing about how suggestions are stored, how `category_llm_model` / `category_keyword_lexicon_count` get stamped, or the flag logic itself (`computeFlagReasons`). It is UI/action composition on top of the two existing server actions, not an architecture change — same distinction your memo drew.

**Partial-failure behaviour** (the concern your memo flagged before we build it):

- The keyword leg runs first and commits its writes before the LLM leg is attempted at all. If the LLM leg then fails — quota, config, or anything else — the keyword suggestions already written are kept, not rolled back or discarded.
- The toast names both outcomes: what the keyword leg did, then the LLM failure reason, rather than reporting one combined success/failure.
- Retrying is safe and cheap either way — both legs select only posts still missing *their own* suggestion (`category_keyword: null` / `category_llm: null`), so a second run only picks up what didn't complete the first time. No new retry mechanism was needed.
- The LLM leg's own cooldown/rate-limit handling is untouched — the combined button still waits on it and shows the same countdown.

---

## 2. One unrelated small change while we were in there

The two "Generate…" buttons previously had an explanatory caption printed underneath them in small grey text (e.g. "Matches your keyword lists"). On a look at the row together with "Batch confirm agreed" (which had no caption), the row read as visually uneven. That caption text is now a hover tooltip on each button instead of always-on text.

Flagging this because it's a real trade-off, not a pure improvement: the caption was always visible, which is better for first-time discovery and works on touch devices where hover doesn't apply cleanly; the tooltip is cleaner and more consistent across the row but requires a hover to see. We went with the tooltip because you specifically like the row's visual consistency, but happy to move it back if that trade-off should go the other way for a panel demo.

---

## 3. Verification

- `tsc --noEmit`, full test suite (382 tests), and `next build` all pass
- **Live-verified in a browser this time** — not just build-green. Clicked through the Needs Review queue on Marketing Manager, confirmed the single button, the combined toast, the cooldown countdown surviving a page reload, and the two new tooltips
- Have not yet re-verified the Team/Owner role gating on this specific screen after the change (the button was already Manager-only before; the change didn't touch the role check, but naming it since it wasn't separately re-clicked)

---

## 4. Code review pass — bugs found and fixed before you see this

Ran a review of the diff before sending this memo. It caught one real bug worth flagging on its own:

- **If every batch in the LLM leg failed outright** (network error, bad/retired model, anything not caught as a quota error), the toast said **"AI: nothing new to classify"** — indistinguishable from the case where there was genuinely nothing to do. Worse, the cooldown never armed in that case, so the manager could immediately re-hammer Groq. Fixed: a fully-failed run now shows the failure/warning message and starts the cooldown like any other failed attempt.

Two smaller things also fixed while in there:
- The toast could get stuck on screen indefinitely after a cooldown-triggering run — it only auto-dismissed if no cooldown was ever running, not once one had *finished* running.
- The Generate button's tooltip was static; it now names the cooldown ("AI is cooling down after the last run — wait Ns") when that's why the button is disabled, instead of just repeating the button's own general description.

Also softened §1's "closes that gap" wording above — the first draft claimed the combined action removes the partial-run risk outright, which overstated it; it narrows the common case but an LLM-leg failure can still strand a post with only a keyword suggestion, with no queue-level indicator today (still an open item — see §1).

---

## 5. Checklist

- [ ] Confirm you're fine with the combined button, or tell us to revert to two
- [ ] Confirm you're fine with tooltip-on-hover instead of the always-visible caption, or tell us to put the caption back
