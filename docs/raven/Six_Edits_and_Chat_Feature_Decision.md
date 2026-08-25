# Six edits accepted, two build asks, and the chat feature defeats a gate we just built

**Date:** 25 August 2026
**Re:** `FR_Table_Verification_and_Chat_Feature_Response_2026-08-25.md`
**Status:** wording settled on six clauses, two things to build, one decision pending on FR-04

---

## 0. The verification pass did what it was meant to

Four of my clauses were written to intent rather than to what the system does, and you found all four. Two of them (FR-07's version identifier, FR-09's views-to-reach correlation) I would have carried into Chapter 3 believing they were true. That is exactly the failure this pass existed to prevent.

Your FR-17 observation is also better than my question. I asked about two conventions and you correctly identified three, with clause 1 being the silent one. That clause reading as a single average when it is a distribution is a real ambiguity and I had not seen it.

---

## 1. ⚠ The chat widget is a back door around the role gate we built yesterday

This is the most important thing in your response and I do not think you connected it to the other work.

Two days ago the Marketing Team could see FR-21's correlation and FR-31's regression on the Analysis screen. We agreed that was a live access-control gap, you built `hideAdEfficiency`, and it is now closed.

Your §4 says the chat assistant queries **the latest trained regression model, including coefficients, R-squared, and n**, and that it is rendered inside `Sidebar.tsx` with **no role check**, so all three roles including Marketing Team can reach it.

So a Marketing Team member cannot see the regression on Analysis, and can ask the chat bubble in the corner of that same page for the coefficients.

The gate is not closed. It is closed on one path and open on another.

- [ ] **Gate the chat widget to Owner and Marketing Manager**, matching the Analysis gate. If that is a role check around the `ChatBot` render in `Sidebar.tsx`, it should be small.
- [ ] Alternatively, strip the regression model from the assistant's context for Team users, but excluding the widget entirely is simpler and I would prefer it

---

## 2. ⚠ The chat's ad query is not scoped to the study period

From your §4: the organic post aggregate is scoped by `STUDY_PERIOD_POST_WHERE`, and the ad query is not.

So the assistant reports advertising figures computed across the full ingested range while every other screen in the system reports on the declared window. **Two sources of truth for the same measure.**

The practical risk is concrete. Someone asks the assistant for total spend during the demonstration, it returns a figure that does not match the dashboard, and the study-period control we spent two days building looks decorative rather than load-bearing.

- [ ] **Apply the study-period filter to the ad query in `actions/chat.ts`.** FR-04a's helper already exists, so this should be one line.

Please confirm when it lands, because until it does I cannot state in Chapter 3 that all analytical outputs are scoped to the declared period.

---

## 3. The six wording edits, settled

**FR-07, drop the ingestion trigger.** Taking your suggestion. The clause now reads "shall generate for each organic post a suggested content category from the post's caption text." No other requirement commits to a trigger and this one should not either.

**FR-07, the version identifier.** This is the one place I want to push back rather than narrow.

The entire lexicon-drift episode exists because nothing recorded which lexicon produced which suggestion. Three days of forensics, a re-run, a revert, and a new requirement all trace to a missing version stamp. Recording only which *method* produced a suggestion leaves us in exactly that position the next time either method changes.

- [ ] **Would you add it?** A `category_llm_model` column recording the model at suggestion time, and a lexicon version or term-count stamp for the keyword side. You described the first as a small addition.

If yes, the clause stays as written and I record it as implemented. If you would rather not, I narrow it to "an identifier of the method that produced it" and put the version stamp in Chapter 5 as a recommendation. Your call, and no is a fine answer, but it is worth asking because this is the specific control that would have saved the most time.

**FR-09, the views-to-reach correlation.** Same shape of question.

It is one function sitting next to an existing correlation, and it is the strongest evidence in objective 4. The Spearman result says view count and engagement rate rank posts differently. The reach correlation says *why*, which is that view count is very nearly a restatement of audience size.

- [ ] **Build it, or shall I drop the clause?**

If you build it, it goes on the Analysis ranking-comparison section beside the existing figures. If not, I drop the clause and compute the figure outside the system for Chapter 4, presenting it as analysis rather than as something the system produces. The finding survives either way, it is just weaker as a system capability.

**FR-12, narrowed to the high side.** You are right and I should not have left it. The clause now reads "exceeds the level associated with their characteristics under the estimated model by more than a stated proportion." If the 0.667 low side gets built later I will widen it back, but the table will not claim behaviour that does not exist.

**FR-17, clause 1 named explicitly.** Taking your wording. The clause now reads "shall report the distribution, comprising the median and the first and third quartiles, of view count and engagement rate by content category."

**FR-04, still pending.** This is item 2 in the gaps memo and it is the last unresolved one. Are you extending per-row validation to the five remaining validators, or shall I narrow the clause to name the record types it covers? Either answer works, I just need one.

---

## 4. The chat feature: keeping it, with three conditions

Your read that it is closer to Top Ads and Category Performance than to a hidden feature is right, and I am taking your recommendation to write a requirement rather than disable it.

But it only stays if all three of these hold:

1. **§1**, gated to Owner and Marketing Manager
2. **§2**, ad query scoped to the study period
3. **A visible caption** on the widget stating that figures are drawn from the consolidated dataset and should be confirmed against the reports before being acted on

The third is not cosmetic and it is worth explaining why I am asking for it.

This system exists because the owner estimated monthly spend from memory rather than from record. An assistant that paraphrases figures through a language model introduces a second path by which a number can be misstated, and the obvious panel question is why a study premised on the unreliability of recollection added a component that can also be unreliable.

The answer we can defend is that the assistant is an orientation layer rather than a source of record, that every figure it reports is also available on a report screen, and that the interface says so. That answer only works if the caption is actually there.

- [ ] Confirm all three, or tell me which is a problem

### Proposed requirement

> **FR-21 Assistant and dataset query.** The system shall provide an assistant that answers questions about the consolidated dataset from aggregate advertising, organic, and page-level figures scoped to the declared study period, shall restrict its access to aggregate measures and advertisement names, shall not transmit post content or customer-identifying information outside the system, and shall state that figures it reports are to be confirmed against the corresponding reports.

- [ ] Does that describe what it does, once §1 and §2 land?

### On what leaves the system

Your distinction between customer-identifying data and campaign metadata is the right one, and Chapter 3 will state both separately rather than only the reassuring half. Something like: no customer-identifying or post-content data is transmitted outside the system, while aggregate performance figures, regression coefficients, and advertisement names are included in requests to the language model provider.

Stating the second half plainly is better than being asked about it.

---

## 5. What I need back

| Item | Question |
|---|---|
| §1 | Chat gated to Owner and Manager? |
| §2 | Chat ad query scoped to study period? |
| §3 | FR-07 version identifier: building it or narrowing the clause? |
| §3 | FR-09 views-to-reach: building it or dropping the clause? |
| §3 | FR-04 per-row validation: extending or narrowing? |
| §4 | All three chat conditions confirmed, and does FR-21 describe it? |

Plus the four items in `Four_Remaining_Gaps_Please_Confirm.md`, of which the snapshot date now has a partial answer: every card reads "date not recorded" until a re-upload, which is the correct behaviour and better than the false date. I still need to know the backfill timestamp so I know which rows are affected.

---

## 6. Where this leaves the table

Twenty-one requirements once FR-21 is added. Six clauses corrected against your pass, five requirements absorbing new clauses from this review, twelve revised substantively.

Every screen in the system now maps to a requirement, including the chat widget, which was the last unmapped feature. That was the question I most wanted answered and it is now answered.
