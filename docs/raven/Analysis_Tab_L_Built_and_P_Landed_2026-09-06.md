# Analysis tab — Finding L built, Finding P's two items landed

**Date:** 6 September 2026
**Re:** `analysis-tab-finding-l-memo.md`
**Status:** L built and verified against the live 691, §3.1/§3.2 landed, the tab is closed

---

## Finding P — apology accepted, both items landed

No further discussion needed on the wording mismatch. Landed both remaining items:

- **Coverage strip (§3.1).** One line above every panel: study period, advertisement count, post count, last upload date. Built at your "your discretion on timing" call, since the estimate was small.
- **Capitalized labels (§3.2).** Removed the uppercase panel-title row (`REGRESSION`, `ACCURACY`, `RESIDUAL DIAGNOSTIC`, `RANKING COMPARISON`, `VIEWS VS. REACH`, `DISTRIBUTION BY CATEGORY`, `CORRELATION WITH METHOD SELECTION`, `FREQUENCY DIAGNOSTIC`, `HOW THESE ARE CALCULATED`) everywhere the bold headline sentence beneath it already said what the panel was. Kept `MONTH-OF-LIFE`, per your call that the term itself needs introducing.
- **§3.3 (visual hierarchy)** stays exactly where you left it: Chapter 5, untouched.

## Finding L — built, not just decided

Built the test you specified in §1: Kruskal-Wallis across every category with 3+ posts, Mann-Whitney pairwise follow-up with Holm-Bonferroni correction, run on exactly the population the panel displays (`STUDY_PERIOD_POST_WHERE`, real categories only — not 707, not any smaller subset).

**New:** `lib/stats/category-significance.ts` (Kruskal-Wallis H/df/p, pairwise Mann-Whitney with Holm step-down) and a general chi-square upper-tail function in `normal-dist.ts` (the existing one only handled even df; Kruskal-Wallis's df = groups − 1 is odd for a 4-category comparison, so it needed the general incomplete-gamma version — Numerical Recipes' gammp/gammq split, the same family of port as the rest of that file).

**Verified against your own reference number**, not just internally: `chiSquareUpperTail(16.8145, 3)` reproduces your H=16.8145, p=0.000772 to 5 decimal places — that's in `normal-dist.test.ts` directly, quoting your memo's own figure as the test's comment. Also checked against three published chi-square table critical values (df=1, df=3 at α=0.05 and α=0.01) and against `chiSquareUpperTailEvenDf`'s existing closed form on the df values where both apply. The Holm step-down is tested against its own monotonicity property directly (a later, larger raw p can never produce a smaller adjusted one than an earlier, smaller raw p already did) — the same mechanism behind your §1's cosmetic note about 0.922 getting raised to 1.000.

**The headline is generated, per §1.3**, not hardcoded for either outcome:

- No significant pair: "Median engagement rate differs across categories, but not by enough to be distinguishable at this sample size."
- One or more significant pairs: "Median engagement rate by content category. [Lower] posts earn a significantly lower rate than [Higher] posts. The other categories are not distinguishable from one another at this sample size." — the last clause only appears when at least one category isn't covered by a significant pair, matching your instruction that it "survive editing."

The procedure is named on screen, not just in the disclosure: "Kruskal-Wallis test... Pairwise follow-up uses Mann-Whitney U with Holm-Bonferroni correction across all pairs," with H/df/p and a per-pair adjusted-p table behind "See the numbers behind this," per rule 0.2.

**Run against the live 691, not just tested against known values.** `scripts/verify-finding-l.ts` (first pass at this was missing `import 'dotenv/config'`, so it read no `DATABASE_URL` and failed against a local default — fixed, matches every other script in `scripts/`) pulled the real study-period posts and ran the actual test:

| | n | |
|---|---|---|
| Testimonial | 212 | |
| Product Showcase | 349 | |
| Entertainment | 88 | |
| Promotional Offer | 42 | |

Kruskal-Wallis: H = 31.5948, df = 3, p = 6.37e-7 (691 posts total, matching the panel's own population exactly).

| Pair | Raw p | Adjusted p | Significant |
|---|---|---|---|
| Testimonial vs Product Showcase | <0.0001 | <0.0001 | yes |
| Testimonial vs Entertainment | 0.0002 | 0.0009 | yes |
| Testimonial vs Promotional Offer | 0.0270 | 0.1080 | no |
| Product Showcase vs Entertainment | 0.1734 | 0.5201 | no |
| Product Showcase vs Promotional Offer | 0.9505 | 0.9561 | no |
| Promotional Offer vs Entertainment | 0.4781 | 0.9561 | no |

This is exactly the case your §1.3 flagged as possible: at full corpus, Entertainment (65→88 posts) and Testimonial (156→212 posts) crossed into significance — at the 488/backlog scale that pair sat at 0.054/raw, not significant. Product Showcase against Entertainment stays non-significant either way, as you predicted. The generated headline on the real data reads:

> Median engagement rate by content category. Testimonial posts earn a significantly lower rate than Product Showcase and Entertainment posts. Promotional Offer is not distinguishable from the others at this sample size. Across 691 categorised posts.

§1 is closed on our side — this ran against your reconciled labels' population, not a synthetic check.

Also carried forward from §1.2/§1.4/§1.5, already satisfied by this implementation rather than left open:
- Runs on 691 (the panel's population), not 707 or 488.
- Names the procedure (Kruskal-Wallis + Mann-Whitney, Holm-adjusted), so Chapter 3 states which test was used, not just that "a test" was used.
- Does not put the reach-adjusted robustness check on the panel — only the plain unadjusted test ships, per your explicit instruction.

---

## Ran our own code review before sending this; it found two real bugs in the above

Both are fixed and re-verified against the live 691, not just in tests.

**Coverage strip was labeling the wrong number "advertisements."** `Ad` is one row per advertisement *per month*, not one row per advertisement — the raw row count is ~700+. The strip would have shown "706 advertisements" directly above panels correctly stating "187 advertisements." Fixed: the strip now counts distinct `ad_id`s.

**The CPI fix (₱21.50→₱21.39) was incomplete.** It correctly zeroed a non-messaging row's spend/results so they stop leaking into CPI, but the review caught that the zeroed row was still left in the ad's row list — so if that row happened to be an ad's *earliest* one, it silently became month-of-life index 0 (an always-empty point), shifting every real messaging month's index by one and inflating the Ad-Months count with a month that contributes nothing. Fixed properly this time: a non-messaging row is now dropped before month-of-life indexing, matching the filter-before-aggregate convention `ad-set-ranking.ts`/`budget-reallocation.ts`/`campaign-rankings.ts` already use, rather than zeroed-and-kept. New test pins an ad whose first row is non-messaging and confirms month-of-life index 0 anchors on its first *messaging* row instead. ₱21.39 still reproduces (the zeroed rows contributed nothing to CPI either way — only indexing and counts were wrong).

Smaller fixes from the same pass: the significance headline is now gated on the omnibus test rejecting (not just individual pairs, so it can't disagree with the p-value printed right below it), the tie-corrected math in both the Kruskal-Wallis and Mann-Whitney steps is now pinned against published scipy reference values rather than only the all-identical-groups edge case, the disclosure prints the test's own n, `scripts/verify-finding-l.ts` now calls the same grouping function `lib/data/analysis.ts` uses instead of a second hand-maintained copy, and removing the panel-title `<h2>`s was redone as `sr-only` so the heading hierarchy stays intact for screen readers instead of leaving the page without an `h2` anywhere.

562/562 tests pass, `tsc --noEmit` clean, `npm run build` succeeds. Nothing committed yet.

Nothing outstanding on this tab from our side.
