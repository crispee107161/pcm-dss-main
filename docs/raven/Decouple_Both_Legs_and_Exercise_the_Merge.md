# Both: decouple. Plus one deliberate exercise of the merged action.

**Date:** 27 August 2026
**Re:** your two questions on the combined Generate action
**Status:** two answers, one connection you may not have drawn, one small ask

---

## 1. Restore keyword independence during the cooldown

**Decouple it.** The keyword pass should run whether or not the LLM is cooling down.

Keyword matching is free, instant, and has no rate limit. A Groq cooldown is not a reason to withhold it, and the case you describe is exactly the one that would show up badly in a demonstration: upload a file, press Generate, wait sixty seconds, and be unable to do the half of the work that costs nothing.

**Keep one button.** Have it do what it can rather than nothing:

- Press Generate during a cooldown: the keyword leg runs, the LLM leg is skipped with the reason stated
- The button stays available so the LLM leg can be completed once the timer clears
- Disable it only when neither leg has anything it can do

The retry logic already supports this, since both legs select only posts still missing their own suggestion. A second press picks up exactly what the first could not finish.

**The toast wording carries the weight here.** Something like:

> "Keyword suggestions generated for 34 posts. AI suggestions still cooling down, 41 seconds remaining."

That says what happened, what remains, and when it can be finished, without requiring the manager to know there are two methods underneath.

---

## 2. Attempt both legs independently

**Do not abort on the first failure.** Run both, catch independently, report both outcomes.

The token-conservation argument does not hold up on inspection. A transient failure in `autoCategorizeAll` does not establish that the database is unhealthy, and if it genuinely were, the LLM leg writes to the same database and would fail on its own at no cost to Groq. So the abort is not protecting anything, it is skipping work that might have succeeded.

You already built the symmetric behaviour in the other direction: a failed LLM leg keeps the keyword writes rather than rolling them back. Make the keyword leg behave the same way.

The toast should name both outcomes in either case, which is what it already does for an LLM failure.

---

## 3. The connection worth drawing, and it is the reason both of these matter

Both defects create the exact stranded state the combined button was built to eliminate.

**A keyword failure that aborts the LLM leg** leaves a post with **neither** suggestion.

**A cooldown that blocks the keyword leg** leaves posts with neither until someone comes back and presses again.

In both cases `DISAGREEMENT` can never fire, nothing on the queue indicates anything is missing, and the post looks identical to one where both methods ran and agreed.

That is the same state the count I asked for in the previous memo is meant to expose. Fixing these two is what lets that count trend to zero on its own rather than needing periodic rescue, and it is why I would not leave either as intended behaviour.

---

## 4. One deliberate exercise once these land

This is the second round of defects surfacing from the merge, after the fully-failed-run toast reporting "nothing new to classify" and the cooldown not arming.

The merge was still the right call and you are finding these yourself, which is the process working rather than failing. But I would like to close the category rather than wait for a third round.

- [ ] **Run it clean.** Posts missing both suggestions, both legs succeed.
- [ ] **Run it during a cooldown.** Confirm the keyword leg completes and the toast names what remains.
- [ ] **Run it with the LLM deliberately broken.** Bad key or a bogus model name. Confirm the keyword writes survive, the failure is named, and the cooldown arms.

Three minutes in a browser, and between them they exercise every path through the combined action.

---

## 5. Still outstanding from the previous memo

Not urgent against these two, but listing so nothing gets lost:

- [ ] Predictive Model section removed from the assistant, which is the last item blocking a final FR-21
- [ ] The stranded-post count, run once as a query even before the indicator is built
- [ ] Full browser pass across all three accounts, before the backlog import rather than after
- [ ] Always-visible caption restored under Generate
- [ ] `PROGRESS.md` corrections, including the 730 and 916 row
