# Scope call: both. Plus evidence the ad filter is probably a no-op today.

**Date:** 25 August 2026
**Re:** `Six_Edits_and_Chat_Feature_Reply_2026-08-25.md` and `Four_Gaps_Confirmed_2026-08-25.md`
**Status:** one decision, one verification request, three requirement clauses restored

---

## 1. You were right and I overstated it

My §2 said "every other screen in the system reports on the declared window." That is not true for advertising, and you were right to check rather than accept the premise.

`STUDY_PERIOD_POST_WHERE` only ever scoped `FacebookPost`, and `lib/data/dashboard.ts` runs its own unfiltered `prisma.ad.findMany`. So the chat widget was not introducing a second source of truth. It was joining one that already existed.

That reframes the fix from "correct the outlier" to "close a gap nobody had noticed," which is a different and more useful thing to have found.

---

## 2. The scope call: both

Your own framing decides it. Scoping chat alone moves the inconsistency rather than closing it, and leaves the assistant as the single ad-scoped surface in a system where nothing else is, which is a stranger position than the one we started in.

More directly: Chapter 3 will state that out-of-period records are excluded from all analytical outputs. That sentence is true or it is not. It cannot be true of organic posts while the dashboard's advertising totals run over the full ingested range.

- [ ] **`STUDY_PERIOD_AD_WHERE` on `reporting_starts`, applied in `actions/chat.ts` and `lib/data/dashboard.ts`**

### 2.1 One thing to add while you are in there

You found the dashboard's unfiltered ad query by looking rather than by being told, which suggests there may be others.

- [ ] **Grep for every `prisma.ad.findMany` and `prisma.ad.aggregate` in `lib/` and `actions/`**, and apply the filter to any that feeds an analytical output
- [ ] Send the list of call sites you touched, the same way you did for FR-04a

A partial fix here is exactly the problem you warned about in your two options. If three of five ad queries get scoped, we are back to two sources of truth with extra steps.

---

## 3. The filter is probably a no-op today, and I would like that confirmed

Two of your own figures suggest the advertising records are already exactly the study period, unlike the organic corpus.

Computed from the twelve raw advertising exports the client provided:

| Figure | Raw exports | Your system |
|---|---|---|
| Distinct ad IDs with messaging-conversation results | **187** | FR-21 correlation runs at n = 187 |
| Ads at or above the ₱1,000 threshold with results | **108** | FR-31 regression runs at n = 108 |
| Total expenditure across all advertisements | **PHP 901,196.96** | ? |
| Distinct months in `reporting_starts` | **12**, Aug 2025 to Jul 2026 | ? |

Both of your n values match the raw twelve-month exports exactly. If the database held sixteen months of advertising the way it holds sixteen months of posts, both would be larger. They are not.

So the likely picture is that the four extra months were organic-only uploads, and the advertising side never had the problem.

- [ ] **Send four figures to confirm:** minimum and maximum `reporting_starts`, the distinct month count, and the total `amount_spent` across all advertisements

If the total returns **PHP 901,196.96**, it matches the raw exports to the centavo and the question closes completely.

**This does not change the decision in §2.** Build the filter regardless. If it changes no number today, it makes the Chapter 3 claim structurally true rather than incidentally true, and it protects against the client uploading an older export at some point. But it is much better for me to write "the advertising records comprise exactly the twelve study-period months, and the study-period filter is applied to every ad query" than to write the second half alone.

---

## 4. The four gaps are closed, and item 4 is the best of them

**Item 4.** You checked before acting, found there was no checksum drift at all, correctly identified that the real problem was a stale comment citing the 704 figure from the 23 August audit, and documented rather than editing, because editing would have created the exact drift you were asked to resolve.

The `PROVENANCE_NOTE.md` is also useful to me directly. The 704 to 574 to 427 chain written down in one place, with the reasoning for keeping a one-shot data mutation out of a replayable migration, is a paragraph of Chapter 3 I would otherwise have had to reconstruct.

**Item 1.** "Date not recorded" was the right call over reopening the data-collection conversation this late. Noting the backfill timestamp as 2026-08-25 so I can state it precisely.

**Item 2.** All seven ingestion paths on per-row validation. See §5.

**Item 3.** Per-request `is_active` check in the session callback. At ten accounts the cost is nothing and FR-02 now reads cleanly.

---

## 5. Three clauses restored to the table

Your confirmations let me put back three clauses I had narrowed. Recording the exact wording so we are working from the same table.

**FR-04**, "of an advertising or organic post export" removed:

> ...shall report each row failing validation together with the reason for its rejection without discarding the remainder of the file...

**FR-07**, "version" restored:

> ...and shall record each suggestion together with an identifier of the method version that produced it.

**FR-09**, the views-to-reach clause restored:

> ...shall report the Spearman rank correlation between view count and reach...

**FR-12 stays narrowed** to the high side, since the 0.667 low-side threshold was not among the items you confirmed. If it gets built, tell me and I will widen it back.

These three are written to what you have confirmed you are building. Please tell me when each lands so the traceability matrix records implemented rather than partial. If any turns out harder than expected, say so and I will narrow it again rather than leave the table claiming something untrue.

---

## 6. Where the table stands

**Twenty-one requirements.** Every screen in the system maps to one, including the chat widget. Every clause is written to behaviour that either exists or is confirmed as being built.

Outstanding, and all of it is build work rather than open questions:

| Item | Status |
|---|---|
| Chat gated to Owner and Manager | Confirmed, building |
| Ad query scoped, chat and dashboard and any others | This memo's §2 |
| Chat caption on the widget | Confirmed, building |
| `category_llm_model` and lexicon version stamp | Confirmed, building |
| Views-to-reach correlation | Confirmed, building |
| Per-row validation, all seven paths | Done |

Once §2 and §3 come back, I write Chapter 3.

---

## 7. On the last three days

Five features were running with no requirement behind them. Two requirements promised something the data cannot support. Four clauses I wrote described intent rather than behaviour. A role gate had a back door. Sixteen months of posts were sitting inside a twelve-month study.

None of that would have surfaced from a summary-level pass. It surfaced because you read the code each time rather than answering from memory, and because you flagged the things I did not ask about, including the two in this last round that I had wrong.

The table is defensible now in a way it was not on Saturday. Thank you.
