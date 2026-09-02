# Two follow-ups on `Tracker_Corrections_and_Browser_Pass.md`

**Date:** 26 August 2026
**Re:** Your tracker-corrections memo, plus one design question it raised

---

## 1. Can the `PROGRESS.md` rows actually be corrected?

Your memo's §1–§2 point out that our tracker's "not started" rows sometimes read as an open gap when the real state is half-done and half-deliberately-dropped. Two rows in `docs/raven-review/PROGRESS.md` are like that right now:

- **`FR07_Review_Row_Compliance.md` row — "Suggestions generated once at ingestion, method version recorded"** is marked ⬜ Not started. It should split: the version stamps (`category_llm_model`, `category_keyword_lexicon_count`) are done, and the ingestion-trigger half was dropped from FR-07 scope on your recommendation — it isn't outstanding, it's gone.
- **`Unassigned_Labels_and_Coding_Procedure.md` rows 2.3** ("revised 4-option reason-capture list" and "reason displayed as column/export") are marked ⬜. Per your memo §4, these are closing as **not building** — the reason moves into the researchers' coding sheet instead of a UI feature — which is a different status than "still to do."

Confirm we're clear to edit `PROGRESS.md` to reflect both corrections, and we'll make the tracker match the actual state rather than leaving it as an apparent gap for whoever reads it next.

---

## 2. Could one "Generate" action replace the two buttons?

Separate from the tracker: your memo's §0 flags the risk we've been sitting on since the Needs-Review UI work — `DISAGREEMENT` can only fire once both a keyword suggestion and an LLM suggestion exist on a post. Right now that depends on someone clicking both "Generate suggestions" and "Generate AI suggestions." If only one gets run — someone leaves after the first, or the LLM call is still cooling down — the post sits with one method's answer and no way for the disagreement flag to ever fire, silently, until someone happens to run the other button later.

We'd like to replace the two buttons with a single **Generate** action that runs both methods in one pass. That's a UI/action change, not an architecture change — it doesn't touch how suggestions are stored, how `category_llm_model`/`category_keyword_lexicon_count` get stamped, or the flag logic itself. It just removes the possibility of a partial run.

Two things worth flagging before we build it, so you can weigh in:

- The LLM leg still needs its own cooldown/rate-limit handling; a combined action means the button would wait on whichever leg is slower, not fire independently.
- If a batch is in progress and only the keyword leg finishes before a failure on the LLM leg, we'd need a defined partial-failure state (e.g., keyword suggestion saved, LLM suggestion absent, retry available) rather than losing the keyword result to a failed combined call.

- [ ] Confirm the tracker-row corrections in §1
- [ ] Green-light (or redirect) the combined Generate action in §2
