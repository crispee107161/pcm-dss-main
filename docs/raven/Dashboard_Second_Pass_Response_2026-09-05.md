# Executive Dashboard, second-pass fixes landed

**Date:** 5 September 2026
**Re:** `Dashboard_Second_Pass.md`
**Status:** all five priority items fixed, code-reviewed, tests and build green. Two items turned up more than the memo asked for — flagged below rather than left implicit.

---

## 1. §2, the zero-conversation tooltip

**§2.1, the identifier.** "(FR-06)" is gone from the tooltip.

**§2.2, are they ads, ad sets, or campaigns?** We checked directly against the database rather than guessing. All five (LOOKING COMSHOP PACKAGE G MID G, PC SET APRIL 2026, PC SET MARCH 2026, COMPSHOP MARCH 2026, COMPSHOP APRIL 2026) are genuine `Ad name` values — confirmed by pulling each one's row and comparing it against its own `Ad set name` and `Campaign name`. For example, "PC SET APRIL 2026" is the ad's own name; its ad set is "PC SET AND COMSHOP IMAGE MARCH 2026" and its campaign is "LIST ALL IMG APRIL 2026" — three different strings, three different fields. The client names some ads after the product line and month rather than the individual product, which is why they read like campaign names. The chip was counting the right thing; nothing to correct in the data.

**§2.3, the wording.** Landed close to your suggestion:

> "5 advertisements spent ₱50,805 without recording any messaging conversations. This is expected when an advertisement is run for reach or video views rather than for messages."

One addition you didn't ask for: the tooltip's total count and total spend are now computed over the *full* population of qualifying ads, not just the five listed by name. Today those are the same five, so nothing visibly changes. But the list has always been capped at the five largest by spend, and the total previously would have silently undercounted the moment a sixth ad qualified. Now the total stays honest and the tooltip adds "The N largest:" before the list whenever the full count exceeds five.

---

## 2. §3, "All time" resolved dates

Fixed in two places, because the gap showed up in two places:

- The period selector's own dropdown now shows the resolved range under "All time" (Aug 1, 2025 – Jul 31, 2026), the same treatment every other option already had. This reuses the `allTimeRange` prop Top Ads already uses — not a new mechanism.
- The two KPI cards that said bare "All time" with nothing beneath now show "All time (Aug 1, 2025 – Jul 31, 2026)".

One deliberate scope decision: we did **not** propagate the resolved range into the plain-language captions elsewhere on the screen (the CPI distribution sentence, the category-performance sentence, the Most/Least Efficient Ads table subtitles) — those still say "ran in All time" rather than "ran in All time (Aug 1, 2025 – Jul 31, 2026)". Our first attempt did exactly that, and it degraded four sentences you singled out for praise in §6 into ones carrying an awkward 30-character parenthetical mid-sentence. Since the selector above already states the range, we judged that repeating it inside every sentence traded a real gap (nothing shown) for a worse one (shown everywhere, badly). Say if you'd rather have it both places.

---

## 3. §4.1, the duplicate sentence

Dropped. The Median Cost/Inquiry card now states the IQR once, not twice.

---

## 4. §4.2, the result-type filter

Landed, verified against your figure exactly: **median ₱21.385, displays as ₱21.39**, n = 187, matching what you expected once the filter applies.

Worth being direct about one thing: our first implementation of this filter had a real bug that our own code review caught before it reached you. The first version zeroed an ad's *spend* on any non-messaging-result-type row while still summing that row's *messaging contacts* — so an ad could enter the CPI population with contacts counted but not all of its spend, biasing its cost-per-inquiry low, and in the worst case (an ad with contacts recorded but zero messaging-result-type spend at all) landing it at CPI ₱0 at the top of Most Efficient Ads. We checked: nothing in today's data actually hit that worst case, so the number you're seeing was never wrong. But the mechanism was capable of being wrong, and we're telling you rather than letting it stand as a near-miss. Fixed version filters the row set to messaging-result-type rows *before* summing anything, so spend and messaging conversations always come from the same rows — matching `ad-set-ranking.ts`'s actual pattern, not just its comment.

**Something you should know that follows from this fix and wasn't previously true:** the Spend column in both the Most Efficient Ads and Least Efficient Ads tables on this same screen is now messaging-result-type spend only, same population as the CPI figure beside it — not the ad's total spend. For an ad that ran under more than one result type across its uploaded months (22 such ads exist in the current data), that column's number is now lower than what the ad actually spent overall. The Total Ad Spend KPI card at the top of the screen is unaffected and still shows true total spend (₱901,197, which you already verified) — so the two "spend" figures on this screen are answering different questions on purpose (total spend vs. messaging-attributed spend), but nothing on screen currently says so. A second consequence: the "dimmed below ₱1,000" threshold on the Least Efficient Ads table compares against this same now-filtered spend, so an ad with ₱1,200 total spend but only ₱400 of it messaging-result-type could newly show up dimmed. We think this is the more defensible number to dim against (it matches the FR-25 population the threshold itself comes from), but it's a behavior change riding on this fix, on exactly the table you reviewed and approved before. Flag if you want either number relabeled or a note added.

---

## 5. §5, the gridlines

Fixed, and fixed more carefully than the first pass. The chart no longer lets Recharts auto-pick tick spacing at all — the axis bounds and all five tick positions are computed together as equal integer steps. Our first version computed the bounds correctly but still divided them into steps without snapping, which meant most spans still weren't quite spaced evenly (a $50 range would have shown 0/13/25/38/50 — better than before, but still unequal by your same test). Second version guarantees the gap is identical between every tick, for any data the chart can produce.

---

## Process note

All five items above were code-reviewed before landing (528 → 532 tests passing, `tsc` clean, production build succeeds). The review is what caught the §4.2 numerator/denominator mismatch and the §5 residual unevenness described above — both were in our first pass, not this final one. Two small regression tests were added (`lib/data/dashboard.test.ts`) covering the aggregation fix and the "All time" label split, so both stay locked in.

Nothing here is committed yet, pending your read, per our usual process.
