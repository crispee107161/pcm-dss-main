# Three confirmations to lock the table

**Date:** 27 August 2026
**Re:** closing the requirements thread
**Status:** the table is written. These three decide whether it can be printed as final.

---

## 0. Why this is short

Table 3 is finalised at twenty-one requirements, closed in both directions, every clause verified against the code. I am about to write Chapter 3 against it.

Three things could still move a mark in the traceability matrix, and I would rather chase them now than reprint. All three are confirmations rather than new work, and two of them are already on your list.

---

## 1. Has the Predictive Model section come out of the assistant?

From `Drop_Predictive_Model_and_Close_FR_Thread.md`. The decision was to remove the `prisma.regressionModel` query and its section from `actions/chat.ts` and the widget, not to repoint it at FR-31.

**This is the one that blocks printing.** FR-21 reads:

> The system shall provide an assistant that answers questions about the consolidated dataset from aggregate advertising, organic, and page-level figures scoped to the declared study period...

While the assistant still reports coefficients, R-squared, and n from the cut predictive model, that clause is not accurate. Those are neither aggregate figures nor drawn from any model the manuscript describes, and they would not match anything in Chapter 4 if the owner asked for them during the demonstration.

- [ ] Removed, or still pending?

If it has landed, say so and FR-21 is confirmed. If not, it is the last code item standing between us and a final table.

---

## 2. The stranded-post count: what number does it return?

From `Combined_Button_Confirmed_and_Stranded_Post_Indicator.md` §3.

No requirement wording depends on this. FR-08 already requires the suggestion produced by each method to be recorded for every organic post, and that clause stands either way.

What depends on it is the **mark in the traceability matrix.** If some in-period posts carry only one method's suggestion, FR-08 is partially unmet and the matrix has to say so.

- [ ] Even before the indicator is built, can you run the count once and tell me the number?

A single query: in-period posts where `category_keyword` is null or `category_llm` is null. If it returns zero, FR-08 records as implemented and I stop thinking about it. If it returns something, I need the figure, because Chapter 4's provenance counts have to account for it.

The indicator itself is still worth building, since it keeps the state visible after the corpus grows. But the number today is what I need for the table.

---

## 3. The browser pass

From `Tracker_Corrections_and_Browser_Pass.md` §6, and you have already started this by live-verifying the Needs Review queue on Marketing Manager.

What I need before printing is the full sweep: every screen, all three accounts.

The risk is not a broken build, since the build has been green throughout. It is a render-time error on a screen nobody has opened since a change, or a role gate that does not hold on a route nobody has tried under the wrong account. Either would move a requirement from implemented to partial, and either would be considerably worse discovered in October.

- [ ] Full click-through, Owner, Marketing Manager, and Marketing Team
- [ ] Anything that errors, renders empty, or is reachable by a role that should not reach it

**Do this before the backlog import**, so the Needs Review queue still has content to click through. Once 519 posts are assigned, the queue drops to the ten or fifteen we are holding back, and several states become harder to exercise.

---

## 4. What happens after these three

The table is printed and Chapter 3 is written. Nothing further is needed from you on requirements.

Still on your side but not blocking: the always-visible caption, the stranded-post indicator, the `PROGRESS.md` corrections, and the role gate re-check on the Needs Review screen. All confirmed and none of them changes a requirement.

Still on ours: the corpus figure moving to 731, the two engagement rate definitions, the objective 3 and Scope rewording, the study-period and boundary notes, the numbering mapping, and the 519-post coding backlog.

---

## 5. If you answer one thing today

**§2's count.** It is one query and it is the only one of the three that could tell me something I have no other way to learn.
