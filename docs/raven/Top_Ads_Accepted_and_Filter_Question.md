# Top Ads accepted, and your filter question is not immaterial

**Date:** 4 September 2026
**Re:** `Top_Ads_Review_Fix_and_Corrections_2026-09-04.md`
**Status:** three corrections accepted, one question that reaches beyond this screen

---

## 1. Your three corrections are right and I accept all of them

**The "roughly four distinct advertisements" line was overstated.** You are right that the R5 5600G entries with different suffixes are different advertisement identifiers, and my visual count conflated similar names with genuine duplicates. Seven and eight distinct identifiers rather than four.

The §1.3 table was the exact evidence and it carried the argument regardless, so the conclusion stands on the part that was computed rather than the part that was read off a screenshot. Your suggestion to lead with that table if this goes anywhere client-facing is the right one.

**The ₱18.48 in my §5 example is not from this screen.** It appeared in the dashboard's efficiency list and I pulled it into the wrong memo while drafting. Not reproducible from Top Ads data, and you were right to flag it before it went further.

**My §4 premise was wrong.** The dashboard's "All time" does not render resolved dates either, so this was new work in two places rather than a copy of existing behaviour. You built it in both, which is more than was asked for.

Checking my figures against the source rather than accepting them is the right instinct, and I would rather be corrected here than have a wrong number reach the manuscript. Two of the three would have.

---

## 2. ⚠ The result-type filter is not immaterial, and the question is bigger than Top Ads

You flagged this as pre-existing and asked whether it is worth closing. I computed it against the client's exports.

**24 of 187 messaging advertisements have a mix of messaging and non-messaging months.** Without the filter, their non-messaging spend counts toward the cost per inquiry numerator.

| Measure | Value |
|---|---|
| Affected advertisements | 24 |
| Median inflation of cost per inquiry | 8.3% |
| Worst case | 98.9%, an advertisement whose true CPI of ₱23.04 shows as ₱45.83 |
| Affected advertisements above the ₱1,000 threshold | **6** |

That last row is the one that matters.

### 2.1 The real question is whether FR-11 and FR-12 apply the filter

Six affected advertisements sit inside the n = 108 population that the regression and the residual diagnostic run on.

**If the regression computes cost per inquiry from total spend rather than messaging spend, then six of its 108 outcome values are inflated by up to 99 per cent, and every coefficient in Chapter 4 shifts.**

- [ ] **Does `fr31-regression.ts` filter to messaging rows before computing cost per inquiry, or does it sum all of an advertisement's spend?**
- [ ] Same question for the residual diagnostic
- [ ] Same question for Budget Reallocation's quartiles, which also use the ₱1,000 threshold

`ad-set-ranking.ts` applies the filter, so the convention exists in the codebase. What I need to know is which paths follow it.

If they all filter correctly, this closes as a Top Ads fix and nothing in Chapter 4 moves. If any of them do not, it is a correctness issue in a published figure and it takes priority over everything else on either of our lists.

### 2.2 And yes, fix it on Top Ads

Regardless of the above.

- [ ] **Apply the result-type filter to the CPI panel**, matching `data_catalog.md` §4.3 and `ad-set-ranking.ts`

---

## 3. The fix itself is accepted

`aggregateAdsById` running underneath every ranking function and both KPI cards is the right shape, and moving the volume panels from a database `orderBy` with `take: 10` to fetching and ranking after aggregation was necessary rather than optional. Ranking before grouping cannot produce a correct answer.

**Two things caught in your own review are worth naming.**

Deriving "Months Active" from distinct Manila calendar months rather than row counts. Harmless today because the table is monthly-only, and it would have silently reported 17 months on a daily-grain upload. That is a fix to a bug that does not exist yet, which is the right time to make it.

Catching that all six methodology notes still described the old per-row computation after the numbers changed. A numbers-versus-description mismatch on the exact screen this thread was about would have been an unfortunate thing to demonstrate.

**On reach being summed rather than deduplicated.** Your reasoning is right for monthly rows and the caption now says so explicitly, that an account reached in two different months is counted twice. That is the honest statement and it matches the equivalent caption on Trend Analysis. No change wanted.

---

## 4. §5 deferred is the right call

Landing the correctness fix before writing narrative text on top of numbers that were about to change was correct sequencing. Building the sentences first would have meant rewriting them.

Scope it separately when convenient. It is not urgent relative to §2.

---

## 5. The traceability note

You are right that `Priority_List_Complete_Response_2026-08-25.md` confirmed FR-15a matched Top Ads before the bug was known, and that the confirmation is true again now.

No note needed in the FR table. The requirement always described ranking individual advertisements, the implementation did not, and now it does. The requirement text never changed and does not need to.

Worth recording in your tracker that the confirmation was made against an implementation that has since been corrected, so nobody later reads it as evidence the code was always right.

---

## 6. A note on what comes next, no action for you

Once the backlog coding is imported, three surfaces change substantially rather than incrementally: Performance by Content Category on the dashboard, the distribution table on Analysis, and the Category Performance screen. All three currently run on roughly 212 categorised posts with an Unclassified row of 516.

FR-08's validation also moves from 200 posts to 719, so every kappa figure is recomputed.

We will re-walk the analytics screens after the import rather than treating today's review as final for those. Screenshots for the appendix come after that.

---

## 7. Priority

1. **§2.1**, whether FR-11, FR-12 and Budget Reallocation apply the result-type filter. This is the only item that could move a Chapter 4 figure, and it is a code read rather than a change.
2. **§2.2**, the Top Ads CPI filter.
3. **§5** and **§0.1** whenever convenient.

§2.1 today if you can. Everything else can wait.
