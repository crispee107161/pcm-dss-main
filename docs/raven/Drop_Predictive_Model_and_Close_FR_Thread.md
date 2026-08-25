# Drop the Predictive Model section. That closes the table.

**Date:** 25 August 2026
**Re:** `Ad_Scope_And_Chat_Conditions_Landed_2026-08-25.md`
**Status:** one decision, three things noted for later, and the requirements thread closes

---

## 1. The decision: remove it, do not swap it

The chat assistant's "Predictive Model" section reads `prisma.regressionModel`, which is the cut simple and multiple linear regression, not FR-31's live explanatory regression in `RegressionRun`.

**Remove the section entirely.** Do not repoint it at FR-31.

Three reasons, and the second is the one that matters most.

**It reports numbers that exist nowhere else.** Coefficients, R-squared, and n from a model that appears in no requirement, on no screen, and in no chapter. If the owner asks the assistant about the regression during the demonstration, he gets figures that will not match anything in Chapter 4, and there is no good way to explain that in the room.

**Repointing it at FR-31 would change what the assistant is.** FR-21 works because the assistant is an access layer over analyses the system already performs and already interprets. The moment it reports regression coefficients in its own voice, it is doing analysis, and it inherits every validation question our categorisation methods had to answer with a kappa and a human ceiling. FR-31 already has its own screen, its own diagnostics, its own plain-language interpretation, and its own role gate. It does not need a second, less careful presentation of itself.

**It makes the role gate coherent.** Right now §1's gate is hiding cut-model coefficients from the Marketing Team, which is effort spent protecting something that should not be there. With the section gone, the assistant carries only aggregates.

- [ ] Remove the `prisma.regressionModel` query and the "Predictive Model" section from `actions/chat.ts` and the widget

### 1.1 A consequence worth raising, though I am not asking for it

Once the assistant carries only aggregate figures, nothing in it is restricted, and the argument for excluding the Marketing Team weakens considerably.

I am leaving the gate in place for now. It is defensible either way and changing it again this week costs more than it gains. But if you think the widget is genuinely useful to the content team, say so and we can revisit, since the reason it was gated was the regression and the regression is going away.

---

## 2. The call-site list is the strongest artefact from this whole review

Nine scoped, and three groups deliberately left unscoped with a stated reason for each. Two of the three reasons I would have got wrong on my own.

The coverage widget and the upload dedup check both need the true ingested range rather than the study window, because one answers "what do we already hold" and the other catches duplicate imports regardless of period. Scoping either would have broken it quietly.

And confirming that the unreferenced `lib/stats/` modules are unreachable from any route, per the repository's own cut-feature convention, is exactly the distinction that makes "every analytical output is scoped" a true statement rather than a hopeful one.

That list is going into Chapter 3 more or less as you wrote it.

---

## 3. Three things noted for later, no action now

**The migration workflow.** Neon's pooled connection cannot hold the advisory lock, so the last three migrations were applied by hand and marked resolved. That has worked three times and the provenance note documents it. Flagging it only because it is worth knowing before anyone runs a migration under time pressure in October rather than discovering it then.

**The session check cost.** A database query per authenticated request is nothing at ten accounts. Worth remembering if the client ever adds staff, though it will be a long time before it matters.

**The lexicon term count as a version stamp.** It works and it would have caught our actual drift, since 50 to 93 is visible in a count. Its limit is that two lexicons of the same size with different terms look identical. Not worth changing. I am recording it so that if a panelist asks how lexicon change is detected, the answer is the term count per suggestion plus the full snapshot in the appendix, which together cover it.

---

## 4. The requirements table is closed

Twenty-one requirements. Every screen in the system maps to one. Every clause describes behaviour that exists in the code today rather than behaviour we intend.

FR-04, FR-07, and FR-09 stand with their restored clauses, since per-row validation across all seven paths, the model and lexicon stamps, and the views-to-reach correlation have all landed. FR-12 remains narrowed to the high side, and if the 0.667 low-side threshold ever gets built, tell me and I will widen it back.

Once the Predictive Model section is out, FR-21 is accurate as written and there is nothing further I need from you on the requirements.

---

## 5. What this review actually found

Worth writing down, because the list is longer than either of us expected when it started.

Five features running with no requirement behind them: Top Ads, Category Performance, the demographic charts, the study-period control, and the chat assistant. Two requirements promising something the data cannot support, since no key links an organic post to the advertisement it became. Four clauses I wrote that described intent rather than behaviour. A role gate with a back door through the chat widget. Sixteen months of posts inside a twelve-month study. A validation path that discarded an entire file on one bad row, which was the exact opposite of what the requirement stated. A delete button that had never worked for any account with activity. Five hundred and seventy-four labels of unknown origin, traced to a bulk keyword pass. And a keyword lexicon that had drifted by forty-three undated terms.

None of that surfaces from a summary-level pass. It surfaced because you read the code each time instead of answering from memory, corrected my premises when they were wrong, and repeatedly flagged things I had not asked about, including the two in the last round I had wrong and this one, which you could have left alone entirely.

The system is defensible now in a way it was not on Saturday. Thank you.
