# Response: FR table verification + chat feature mapping

**Date:** 25 August 2026
**Re:** `Final_FR_Table_Review_and_Chat_Feature.md`

---

## 1. Clauses that overstate the system

Three of the seven inline checks found real gaps between wording and code. All three are in analytical clauses, not the merges themselves — the merge wording is otherwise accurate.

### FR-07 — "generate, once for each organic post at the time of ingestion"

**Overstated.** Suggestion generation is still on-demand, not ingestion-triggered. `autoCategorizeAll()` (`actions/categorize.ts:98`) is the keyword suggestion pass, and it is only invoked from `ContentClient.tsx:535` behind the manual "Generate" button. Nothing calls it from the upload path (`actions/upload.ts`). Same for the LLM pass (`runLlmClassification`, referenced in `actions/classify-posts.ts`) — also button-triggered, not part of ingestion.

Suggested wording: *"shall generate, on request or at ingestion, a suggested content category..."* — or drop "at the time of ingestion" entirely and just say "for each organic post," since the table doesn't otherwise commit to a trigger mechanism elsewhere (FR-03/FR-05 don't either).

### FR-07 — "an identifier of the method version that produced it"

**Overstated.** There is no version identifier stored anywhere. The schema (`FacebookPost.category_keyword` / `category_llm`, schema.prisma:202-203) records **which method** produced a suggestion — the two are separate columns — but not **which version of that method**. No lexicon-version column, no LLM model-name column, nothing recorded per-suggestion. I grepped the whole repo for `llm_model`, `model_used`, `groq_model`, `classifier_version` — no matches.

Suggested wording: replace "an identifier of the method version that produced it" with "an identifier of the method that produced it" (drop "version"). If you want the stronger claim preserved, that's a small addition — a `category_llm_model` column recording `resolveGroqModel()`'s pick at suggestion time — but it doesn't exist today.

### FR-09 — "shall report the Spearman rank correlation between view count and reach"

**Overstated — this one hasn't landed.** I grepped `lib/data/analysis.ts` and the whole `lib/` tree for any views-to-reach correlation; the only "views ↔ reach" pairing that exists is the post-type-performance median comparison sentence (`lib/stats/post-type-performance.ts:75`), which is a plain-language observation, not a computed Spearman coefficient. `lib/stats/analysis.ts`'s only correlation is views-to-engagement-rate (FR-09's first clause). Drop this clause or mark it planned.

---

## 2. The other four inline checks — no overstatement found

**FR-02** — "shall refuse authentication to a deactivated account." Confirmed accurate. `lib/auth.ts:24` checks `user.is_active` inside the credentials authorize callback, so a deactivated account cannot obtain a new session regardless of the 8-hour JWT window. Your reading is correct: it describes authentication, not session lifetime, and the two don't conflict.

**FR-12** — "differs... by more than a stated proportion in either direction." **Still overstated, unchanged from last time you asked.** `lib/stats/fr31-regression.ts:40,629` — `FR31_RESIDUAL_RATIO_THRESHOLD = 1.5`, and the flag filter is `residualRows.filter(r => r.ratio > FR31_RESIDUAL_RATIO_THRESHOLD)` — one comparison, one direction. No 0.667 low-side threshold exists in code. Recommend narrowing this clause to the high side only until it's built, same as we discussed for FR-04's per-row scope.

**FR-13** — the audience clause. Confirmed accurate. All four dimensions are live: gender (`FollowerGender`/`GenderPieChart`), age bracket (`FollowerAgeGender`/`AgeGenderChart`), country (`FollowerTerritory`/`TerritoryChart`), city (`FollowerAudienceRank` where `category='city'`/`AudienceRankChart`). The snapshot-date clause matches `demographicSnapshotLabel()` (`lib/data/demographic-snapshot.ts`) exactly — it states the oldest `captured_at` among the displayed rows, or "date not recorded" when the row still carries the migration backfill timestamp. Worth knowing for Chapter 3: as of today every card still reads "date not recorded," since no demographic file has been re-uploaded since the `captured_at` column was added.

**FR-15** — confirmed the merged sentence loses nothing. Three distinct pieces of code map to the three clauses: `rankByCostPerInquiry` grouped by ad/ad-set/campaign (Rankings), the quartile grouping in `lib/stats/budget-reallocation.ts` (Budget Reallocation), and `rankByCostPerInquiry`/`rankByCtr`/`rankByCostPerClick` with `countEligibleFor*` (Top Ads) in `lib/stats/campaign-rankings.ts`. All three eligible-count trackers exist and feed the "number of advertisements eligible for it" clause.

---

## 3. FR-17 — the wording check on the two engagement-rate conventions

This one needs a bit more than yes/no. There are actually **three** conventions in play across FR-17's clauses, and only one of the three names itself in the current wording:

1. *"view count and engagement rate by content category"* (clause 1, `lib/stats/category-distribution.ts`) — median + Q1/Q3 distribution, unnamed in the clause.
2. *"median reach, engagement rate, and view count by post type"* (clause 2, `lib/stats/post-type-performance.ts`) — median, and the clause says so.
3. *"aggregate reach-weighted engagement rate by content category"* (clause 3, `lib/data/category-performance.ts`) — sum-then-divide (ALG-09), and the clause says so.

So the ambiguity isn't just "two conventions in one sentence" — it's that clause 1 is silent about being a distribution at all, which could misread as a single average. Recommend making clause 1 explicit too: *"shall report the distribution (median, first and third quartile) of view count and engagement rate by content category."* That closes the gap without adding a new subject.

---

## 4. §3 — the chat feature

**What is it?** A floating widget (`components/analytics/ChatBot.tsx`), a chat bubble icon fixed to the bottom-right corner of every dashboard screen. Backed by `actions/chat.ts` (`sendChatMessage`).

**Who can reach it?** All three roles. It's rendered once inside `components/nav/Sidebar.tsx:281`, and `Sidebar` is the shared shell used by both `app/dashboard/owner/layout.tsx` and `app/dashboard/marketing/layout.tsx` — no role check around it. Marketing Manager, Marketing Team, and Owner all get it.

**What data can it see?** It queries live, not a static aggregate — "dataset-summary aggregate" undersold it slightly. On every message it re-runs five queries (`actions/chat.ts:29-42`):
- All ads (`ad_name`, `amount_spent`, `total_messaging_contacts`, `reach`) — every row, not aggregated in the DB, then reduced in JS to totals + a top-5-by-messaging-conversations list with names attached.
- The latest trained regression model (coefficients, R², n).
- Organic post aggregates (count, avg engagement rate, total reach) — scoped by `STUDY_PERIOD_POST_WHERE`, so out-of-period posts are excluded here (unlike the ad query, which has no study-period filter — worth flagging, see below).
- Most recent follower count.
- Last 7 days of page metrics (views/visits/follows).

It does not query post captions, post categories, or individual post content — only the numeric aggregates and per-ad names/spend/reach listed above.

**What does it send outside the system?** Yes — it calls Groq (`api.groq.com`) on every turn. What leaves the database: **individual ad names and their spend/messaging/reach figures** (up to 5 named ads per message, potentially all of them depending on top-5 selection), aggregate spend/reach/CPI totals, the regression model's coefficients, aggregate post engagement stats, and recent page metrics. It does **not** send post captions, post content, or any personally identifying follower/customer data — there's no PII in what's assembled. The prompt is built server-side in `sendChatMessage`, so the client never sees the raw data, only Groq does.

One thing worth noting for Chapter 3 regardless of what you decide on requirement-vs-disable: ad names could plausibly be considered internal campaign-strategy information (e.g. "September Clearance — Casing Bundle") even though they're not customer PII. If that distinction matters for the defense, it's worth stating explicitly that no customer-identifying data leaves the system, separately from the campaign-metadata point.

**My read:** this is closer to Top Ads and Category Performance than a hidden feature — it's fully visible, role-unrestricted, and reads real data, so it's a strong candidate for a requirement (something like "FR-21 AI assistant and dataset query" covering scope, role access, and the external-call disclosure) rather than disabling it. But that's your call on the three options — I just didn't want to make it for you given the memo's own framing.

---

## Summary for your table

| Item | Verdict |
|---|---|
| FR-02 deactivated-account wording | Accurate, no change |
| FR-04 per-row scope | Unresolved from before — still narrow to ads/posts only unless extending |
| FR-07 "at time of ingestion" | Overstated — still on-demand |
| FR-07 "method version identifier" | Overstated — no version stored, only method name |
| FR-09 views↔reach correlation | Overstated — not built |
| FR-12 "in either direction" | Still overstated — one-directional, 1.5 only |
| FR-13 audience clause | Accurate, matches live cards |
| FR-15 three-screen merge | Accurate, nothing lost |
| FR-17 dual/triple convention wording | Needs clause 1 to name its statistic explicitly |
| §3 chat feature | Mapped — see above, recommend writing a requirement |
