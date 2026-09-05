# Two spend figures now mean different things, and one needs relabelling

**Date:** 5 September 2026
**Re:** `Dashboard_Second_Pass_Response_2026-09-05.md`
**Status:** one change, one decision recorded, four items closed

---

## 1. ⚠ Relabel the Spend column, do not change the number

Your §4 flags this yourself and it is the one thing that needs action.

After the filter fix, the Spend column in Most Efficient Ads and Least Efficient Ads shows **messaging-result-type spend only**. The Total Ad Spend card at the top of the same screen shows **total spend**. Twenty-two advertisements ran under more than one result type, so for those the table now shows less than the advertisement actually spent, and nothing on screen says so.

The owner reading ₱4,715 beside an advertisement will take that as what it cost him. For twenty-two of them it is not.

**The number is right.** Spend and conversations have to come from the same rows or the ratio is meaningless, which is the whole point of the fix. What is wrong is calling it "Spend" when a card fifty pixels above uses that word to mean something else.

- [ ] **Rename the column to "Messaging spend"**

If the header is too tight for that, keep "Spend" and add a line to each table's caption stating that the column counts only spend on messaging-objective months, so it can be lower than the advertisement's total. The rename is cleaner because it fixes the ambiguity at the point of reading.

---

## 2. The dimming threshold change: keep it, recorded as a decision

Also from your §4. An advertisement with ₱1,200 total spend but only ₱400 of it on messaging months now dims, where before it would not have.

**Your judgement is right and we are keeping it.** The ₱1,000 threshold exists because a cost per inquiry computed from few conversations is unstable, so it should compare against the spend that produced those conversations rather than against unrelated spend. It also matches the FR-25 population the threshold is drawn from.

But it is a behaviour change on a table we reviewed and approved before the change existed, so it should be recorded as a decision rather than absorbed as a side effect.

- [ ] Nothing to do. Noted here so the reasoning is on file.

Once §1 lands, the dimming rule and the column will describe the same quantity, which is what makes this coherent rather than merely defensible.

---

## 3. Your §2 scope call is right

Trying the resolved dates inside the plain-language captions, finding it degraded four sentences into carrying a thirty-character parenthetical mid-sentence, and reverting is the correct outcome.

The selector states the range once, above everything on the screen. Repeating it in every sentence trades a real gap for a worse one, and those four captions are the best copy in the system.

Leave them as they are.

---

## 4. Two near-misses, reported rather than buried

Both worth naming because neither would have been visible from our side.

**The first CPI filter zeroed an advertisement's spend on non-messaging rows while still counting that row's messaging contacts.** An advertisement with contacts recorded but no messaging-objective spend would have landed at ₱0 cost per inquiry, at the top of Most Efficient Ads. Nothing in the current data hit it, so the figure we saw was never wrong, but the mechanism could have produced one and we would have had no way to tell from a screenshot.

Filtering the row set before summing anything, so spend and conversations always come from the same rows, is the right fix and it matches what `ad-set-ranking.ts` actually does rather than what its comment says.

**The first gridline fix computed the bounds correctly and still divided them unevenly.** A 50-unit range would have produced 0, 13, 25, 38, 50. Better than before and still failing the same test that raised it. Computing bounds and all five tick positions together as equal integer steps is the version that actually holds.

Neither of these would have surfaced from our review. We see a rendered screen, not the mechanism behind it.

---

## 5. §2.2 answered properly

All five are genuine advertisement names, confirmed by pulling each row and comparing the name against its own ad set and campaign fields rather than inferring from how they read.

The client names some advertisements after a product line and month, which is why "PC SET APRIL 2026" looks like a campaign. Its ad set is "PC SET AND COMSHOP IMAGE MARCH 2026" and its campaign is "LIST ALL IMG APRIL 2026", three different strings in three different fields.

The chip was counting the right thing and there is nothing to correct.

**The uncapped total is a genuine improvement over what was asked for.** Computing the count and total spend across the full qualifying population rather than the five listed by name means the figure stays honest the moment a sixth advertisement qualifies, and "The N largest:" before the list makes the cap visible rather than silent.

---

## 6. Closed

§2.1, §2.3, §3, §4.1, §4.2 and §5 are all accepted as landed.

Once §1 above lands, the Executive Dashboard is closed for this pass. We will look at it again only if something upstream changes what it displays.

---

## 7. Priority

1. **§1**, the column rename. One string, and it is the last item on this screen.

Nothing else outstanding here.
