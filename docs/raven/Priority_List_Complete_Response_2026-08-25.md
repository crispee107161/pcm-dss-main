# All five remaining items from your priority list — done

**Date:** 25 August 2026
**Re:** `FR_Mapping_Complete_and_Category_CPI_Gap.md` §7 (order of operations), plus §2.1 from `FR_Table_Clarifications_and_Traceability.md`
**Status:** §3 answered separately in `Category_CPI_Gap_Response_2026-08-25.md`; this covers items 2–6. Code changes made, `tsc`/371 tests/build all pass.

---

## 2. FR-21 and FR-31 gated away from Marketing Team — fixed

This was the live access-control gap flagged in `FR_Table_Clarifications_Response_2026-08-25.md` §2.5: `AnalysisView` rendered identically for Manager and Team, so Team could see the ads correlation (FR-21) and full regression (FR-31) with no role check at all.

Fix, matching the shape §2.5 proposed:
- `app/dashboard/marketing/analysis/page.tsx` now passes `hideAdEfficiency={session.user.role === 'MARKETING_TEAM'}` to `AnalysisView`.
- `components/analytics/pages/AnalysisView.tsx` accepts `hideAdEfficiency` (default `false`) and conditionally renders the FR-21 correlation card and the FR-31 `RegressionSection`, plus trims the matching paragraphs out of the methodology note so it doesn't reference sections that aren't on the page.
- Owner and Marketing Manager routes are unaffected — `hideAdEfficiency` isn't passed (Owner) or is `false` (Manager), so both keep seeing everything.
- Team keeps FR-19 (ranking comparison) and FR-20 (category distribution) — the organic-content findings condition five already puts in their favour.

## 5. Category Performance added to Marketing Manager's nav — done

Per your decision: reused the existing screen rather than building a second one. Since the Owner route lives under `/dashboard/owner/*` and `middleware.ts` hard-blocks any non-Owner role from that whole path (redirects them back to their own dashboard before the page ever runs), literally reusing the URL wasn't possible — so I followed the same pattern Analysis already uses (§2.5 of the prior memo: one shared component, two thin role-gated route wrappers):

- **`lib/data/category-performance.ts`** — extracted the Prisma query and the per-category aggregation (unchanged logic, still organic-post-only, still sum-then-divide per ALG-09) out of the page file into a `loadCategoryPerformanceData()` function.
- **`components/analytics/pages/CategoryPerformanceView.tsx`** — the presentational component, also unchanged markup/logic, now takes `data` as a prop instead of running its own query.
- **`app/dashboard/owner/category-performance/page.tsx`** — now just an auth check + `loadCategoryPerformanceData()` + `<CategoryPerformanceView data={data} />`. Behavior identical to before.
- **`app/dashboard/marketing/category-performance/page.tsx`** — new route, gated to `MARKETING_MANAGER` only (not Team, per your reasoning that Team's condition-five access is already served by Analysis's FR-20 section).
- **`app/dashboard/marketing/layout.tsx`** — added the nav entry. It's not in `TEAM_VISIBLE_HREFS`, so it's automatically Manager-only in the sidebar too, consistent with the route guard.

No duplicated logic, no second implementation — same query, same component, two callers.

## 4. Two engagement rates — labelled distinctly, FR-29 convention confirmed

- **Analysis** (`AnalysisView.tsx`, FR-20 table): column header changed from "Median Engagement Rate" to **"Median Post Engagement Rate"**, and the methodology note now says explicitly: *"the median of each post's own individually-computed engagement rate, not a reach-weighted aggregate... Category Performance reports a different, reach-weighted figure for the same categories; the two will not match, by design."*
- **Category Performance** (`CategoryPerformanceView.tsx`): column header changed to **"Aggregate Engagement Rate (reach-weighted)"**, and its methodology note now cross-references Analysis's figure by name and states plainly that the two are different quantities that won't match.
- **FR-29 (Post Type Performance)** — checked `lib/stats/post-type-performance.ts:50`: `median(group.map(p => p.engagement_rate))`. **It uses the same convention as Analysis/FR-20 — median of per-post rate — not Category Performance's reach-weighted convention.** So this isn't a third inconsistency; it's two screens on one convention (Analysis, Post Type Performance) and one screen on the other (Category Performance). The Post Type Performance UI already labels its column "Median Engagement Rate" and its methodology note already says "median, not mean, so a single viral post cannot pull the whole row upward" — no change needed there, it was already correctly labelled.

I haven't touched Chapter 1's Definition of Terms — that's yours to add per your §4 note, not a code change.

## 6. FR-15a and FR-17a — confirmed against the live screens

**FR-15a** ("shall rank individual advertisements by expenditure, inquiries generated, and reach, and by cost per inquiry, click-through rate, and cost per click, over a user-selected date range"): matches **Top Ads** (`/dashboard/{owner,marketing}/campaign-rankings`) exactly. Confirmed in code:
- `app/dashboard/owner/campaign-rankings/page.tsx`'s own header string: *"Top 10 ads by volume (spend, messaging conversations, reach) and by efficiency (cost per messaging conversation, click-through rate, cost per click)"*
- User-selected date range: `searchParams: { from?, to? }` → `manilaDayRange(from, to)` → applied as `reporting_starts` filter on every query, via a `DateRangeFilter` component on the page.

**FR-17a** ("shall report total reach and aggregate reach-weighted engagement rate by content category, stating the number of posts in each category and the number excluded as uncategorised"): matches **Category Performance** exactly — confirmed against the extracted `loadCategoryPerformanceData()`: total reach per category, reach-weighted engagement rate per category (sum-then-divide, ALG-09), `post_count` per category, and `uncategorized_posts` surfaced separately (rendered as the warning banner). Both descriptions are accurate as written — no wording changes needed.

---

## What's left on your list

- **§3** (CPI-by-category) — answered in `Category_CPI_Gap_Response_2026-08-25.md`, sent alongside this.
- **The full traceability matrix** — now unblocked by §3's answer and this memo's confirmations; that's your write, not a code task on my end unless you want the remaining sidebar entries (Dashboard, Content, Upload Data, Method Evaluation, Trend Analysis, Page Metrics, Generate Report, Audit Log, User Management) walked the same way §2 of the prior memo did. Say the word if you want that pass before Chapter 3.
- Definition of Terms addition (§4) and Chapter 3 numbering write-up (§8 of the prior memo) are yours, not code.

`tsc --noEmit`, `npm test` (371/371), and `npm run build` all pass clean with these changes.
