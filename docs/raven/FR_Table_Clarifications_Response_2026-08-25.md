# Response to `FR_Table_Clarifications_and_Traceability.md`

**Date:** 25 August 2026
**Method:** direct code/route reading (`layout.tsx` for both roles, every page/action file named below, `lib/stats/*`). No DB queries needed for this one — everything here is answerable from source. No writes made.

---

## 0. Before anything else: your FR numbers and the codebase's FR numbers are two different schemes

This has to be flagged before the matrix, because it changes what "closing the FR table" means.

`docs/mvp.md` (rewritten 2026-08-12, the file `CLAUDE.md` calls the requirements source of truth) and every in-code comment (`// FR-19`, `// FR-21/ALG-08`, `// FR-31`, etc.) use a numbering where:

- FR-15 = method evaluation (kappa/confusion matrix)
- FR-19 = the ranking-comparison/promotion-criterion finding (views vs. engagement rate, Spearman, top-decile overlap)
- FR-21 = the ads correlation with Shapiro-Wilk method selection
- FR-27 = ad lifecycle
- FR-31 = the regression

Your memo's numbers — FR-08 (method eval), FR-09 (promotion criterion), FR-10 (correlation), FR-11 (regression), FR-12 (residual diagnostic), FR-13 (dashboard), FR-15 (efficiency ranking), FR-17 (content comparison) — don't match those at any point. They're not close/off-by-one either; FR-15 means two completely different things in the two schemes (method eval vs. efficiency ranking), and FR-13 means two completely different things (final category assignment vs. dashboard).

I've been answering your last two memos in your numbers already (the 25 Aug response used "FR-07" for the caption-length flag and "FR-08" for method evaluation, matching your usage, not mvp.md's), so this isn't a new problem I'm introducing — it's one that's been latent for a few exchanges. It matters now specifically because §5 asks for a traceability matrix with FR numbers in it, and I can't put a defensible number in that column without knowing which scheme the panel will see. If your numbers are the current, renumbered Chapter 3 draft and mvp.md is simply stale, say so and I'll treat yours as authoritative going forward and flag mvp.md for a matching update. If mvp.md is supposed to stay authoritative, the matrix needs mvp.md's numbers and your memo's FR-08–FR-17 references need remapping before Chapter 3 cites them. Either is a small fix; not knowing which is not.

**§5's matrix below uses mvp.md's numbers** (FR-15, FR-19, FR-20, FR-21, FR-27, FR-31, etc.) since that's what's actually in the code and what I can verify against something concrete, with your equivalent number noted in parentheses on first mention of each.

---

## 1. Sidebar corrections

Read directly from `app/dashboard/owner/layout.tsx` and `app/dashboard/marketing/layout.tsx` (the only two files that define nav items — there's no third file for Marketing Team; it filters the Manager's list, see §2.5/2.6 below).

| Screen | Owner | Marketing Manager | Marketing Team |
|---|---|---|---|
| Dashboard | Yes | Yes | Yes |
| Content | Yes | Yes | Yes |
| Upload Data | Yes | Yes | No |
| Keyword Lexicon | **No** | Yes | No |
| Analysis | Yes | Yes | Yes |
| Method Evaluation | No | Yes | No |
| Budget Reallocation | Yes | No | No |
| Rankings | Yes | No | No |
| Top Ads | Yes | Yes | No |
| Trend Analysis | Yes | Yes | No |
| Page Metrics | Yes | Yes | No |
| Category Performance | Yes | No | No |
| Post Type Performance | Yes | Yes | Yes |
| Generate Report | Yes | Yes | **Yes** |
| Audit Log | Yes | Yes | No |

Two corrections to your table:
- **Keyword Lexicon is not on the Owner's nav at all** — it doesn't appear in `owner/layout.tsx`'s `navItems` array. Your "?" was the right instinct to flag it rather than guess.
- **Generate Report is visible to Marketing Team**, not just Owner/Manager — `MarketingLayout`'s `TEAM_VISIBLE_HREFS` explicitly includes `/dashboard/marketing/report`, with a comment citing "S9 Reports — mvp.md §3 access matrix lists MARKETING_TEAM as View."

Everything else in your table matches what's in code exactly, including your inferred Owner rows for Upload Data, Generate Report, and Audit Log (all present) — Category Performance is confirmed Owner-only, which is the subject of §2.1 below.

One structural fact worth knowing for the matrix: Marketing Team doesn't have its own layout file. `marketing/layout.tsx` builds the Manager's full `navItems` list, then for Team filters it down to a hardcoded `TEAM_VISIBLE_HREFS` set: `/dashboard/marketing`, `/dashboard/marketing/categorize`, `/dashboard/marketing/post-type-performance`, `/dashboard/marketing/analysis`, `/dashboard/marketing/report`. Any screen you want added to or removed from Team's sidebar is a one-line change to that set — not a new route, not a new layout.

---

## 2. The six clarifications

### 2.1 Category Performance access

Confirmed as you read it: `owner/layout.tsx` line 46 is the only place `/dashboard/owner/category-performance` is linked from any nav. It is not in `marketing/layout.tsx` at all, so neither the Manager nor the Team can reach it from navigation. I didn't check whether the route itself has a role guard that would 404/redirect a Manager who typed the URL directly — that's a five-minute check if you want it confirmed, but it doesn't change the nav-visibility answer.

I'm not picking one of your three checkboxes for you — that's a scope decision, not a code fact — but flagging one implementation note for whichever way it goes: if it's added to the Manager and/or Team nav, the natural route is reusing `/dashboard/owner/category-performance`'s existing page and just adding the nav entry + a role check, not building a second screen. The Marketing layout already has the `analysis`/`categorize`/`post-type-performance` pattern of one shared component reused across roles (see §2.5), so this would follow existing precedent, not invent a new one.

### 2.2 Where FR-09 (promotion criterion) actually lives

It exists — it's not missing, it's undernamed. In mvp.md's numbering this is **FR-19**, and it's the first section on the **Analysis** screen (`components/analytics/pages/AnalysisView.tsx`, lines 131–156), titled "Ranking Comparison — Views vs. Engagement Rate," visible to all three roles since Analysis is on all three sidebars.

What it computes, confirmed from `lib/stats/ranking-comparison.ts`:
- Spearman rank correlation (via `rankArray` + `pearsonCorrelation` on the ranks) between `Views` and `organic_engagement_rate`, organic posts only
- Top-**10%** and top-**20%** overlap between the two independently-sorted lists (`overlaps: [10, 20].map(...)`) — both cuts are computed and both render, not just one
- The 1 post with null `Views` is excluded explicitly (`eligible.filter(p => p.views !== null)`), not treated as 0

**The views-vs-reach correlation (your ρ = 0.954 figure) is not computed anywhere in `lib/stats/`.** I grepped the whole stats layer for a reach↔views correlation and found nothing — the only reach-vs-something correlation in the app is FR-31's reach-vs-spend collinearity check (r = 0.984, a different pair, used to justify excluding reach/spend as regression predictors, not a views finding). If ρ = 0.954 is a real result you want on-screen, it isn't built; it would need to be added to this section or a new one, not confused with the FR-31 collinearity number that already exists.

So: it's real, it's live, it's on Analysis for every role — but it's genuinely buried under a screen named "Analysis" rather than a name that signals "this is the promotion-criterion finding." If you want it surfaced as its own labelled entry point (even just a `#ranking-comparison` anchor + nav mention, short of a whole new screen), that's a small change; the computation itself needs nothing.

### 2.3 What Budget Reallocation computes

`app/dashboard/owner/budget-reallocation/page.tsx` + `lib/stats/budget-reallocation.ts`. It **reports figures only — it does not recommend actions** in the sense of "move $X from ad Y to ad Z." What it does:

- Restricts to messaging-optimised ads (`Result type = "Messaging conversations started"`) with spend ≥ a minimum threshold (user-adjustable via `MinSpendSelect`, defaulting to `MIN_SPEND_THRESHOLD_PHP = 1000`)
- Ranks them by cost per messaging conversation (spend ÷ inquiries, summed per Ad ID across months, then divided) and splits into four equal-size quartiles
- Shows "what a portion of Q4's (worst) spend would have generated at Q1's (best) rate, based on recorded results" — a retrospective counterfactual computed from actual historical numbers, explicitly captioned on-screen as "not a forecast or simulation of future performance"

This maps cleanly to your guess: it is **FR-25 in mvp.md's numbering** (the quartile-comparison requirement), just under a friendlier screen name. Nothing here computes a forward-looking recommendation or an allocation the owner hasn't already effectively made by the historical split — it's a retrospective comparison table, not a decision engine. No requirement gap; it's FR-25 wearing a different label.

### 2.4 Rankings vs. Top Ads — confirmed different, not redundant

Both real, both distinct, per the code:

- **Rankings** (`/dashboard/owner/ad-set-ranking`, `lib/stats/ad-set-ranking.ts`) — groups messaging ads **by Ad Set ID and by Campaign ID** (two tabs), each group's total spend ÷ total inquiries. Groups under `MIN_ADS_FOR_CONFIDENCE = 3` ads are flagged "low confidence" rather than hidden. This is the requirement your memo describes for FR-15(your)/**FR-26(mvp.md)** — "ranking advertisements, ad sets, and campaigns by cost per inquiry," specifically the ad-set/campaign grouping half of it.
- **Top Ads** (`/dashboard/owner/campaign-rankings` — also on the Marketing Manager's nav under the same "Top Ads" label, `lib/stats/campaign-rankings.ts`) — ranks **individual ads**, six top-10 panels: by volume (spend, messaging conversations, reach) and by efficiency (cost/messaging-conversation, CTR, cost/click), with a date-range filter. This is the individual-ad half — closer to the FR-15(your)/**quartile-adjacent but not identical** ranking the owner's layout comment (already in the repo, `owner/layout.tsx` lines 33–41) explicitly discusses: it's a richer screen than Rankings, not a subset, because of the volume panels and the CTR/cost-per-click metrics that have no ad-set-level equivalent.

So: **Rankings = grouped efficiency table (ad set/campaign level). Top Ads = individual-ad table (six panels, volume + efficiency, with a date filter).** Not redundant — different grouping level and different metric set. The owner-side code comment already flags that merging them (per an earlier version of your ask) would mean dropping panels or building a bigger unified component, and asks you directly which you'd rather have — that question is still open on my end regardless of this memo.

### 2.5 What's on Analysis, and why every role sees it — confirmed, and this raises a real access question

Read `app/dashboard/owner/analysis/page.tsx`, `app/dashboard/marketing/analysis/page.tsx`, and the shared `AnalysisView` component both routes render.

**It's one component, same content for all three roles, with one addition for Owner only.** Both routes call `loadAnalysisScreenData()` + `loadRegressionAnalysis()`; only the Owner route additionally calls `loadAdLifecycleData()`. The Marketing route has **no role branching inside it at all** — Manager and Team hit the exact same page, same query, same rendered sections.

**What's on it, every role sees identically (except Lifecycle):**
- FR-19 (your FR-09) ranking comparison — §2.2 above
- FR-20 category distribution (median Views / median engagement rate per category)
- **FR-21 (your FR-10) correlation — ad engagement rate vs. cost per inquiry, Shapiro-Wilk-gated Pearson/Spearman**
- FR-27 lifecycle — **Owner only**, passed as an optional prop; absent from the Marketing route entirely
- **FR-31 (your FR-11) regression** — `RegressionSection`, unconditionally rendered on both routes, all three roles

This is exactly the tension you flagged: **the Marketing Team sees FR-21 (ads correlation) and FR-31 (the full regression: coefficients, HC3 SEs, VIF, Breusch-Pagan, Jarque-Bera, cross-validation, residual diagnostic) with no role gate at all.** There's no code reason for this — it's not "Team sees a limited view of Analysis," it's "Team and Manager render the identical component." If Chapter 1's condition five is meant to exclude the content team from advertising-efficiency modelling, this screen currently doesn't do that for two of the four analyses on it (FR-21, FR-31 — FR-19/FR-20 are organic-content findings, which condition five's own logic would put in Team's favour, not against it).

Fix, if you want one, is small: `marketing/analysis/page.tsx` already has the `session.user.role` value in scope (it's checked at line 8 for the redirect); gating FR-21's correlation section and `RegressionSection` behind `role === 'MARKETING_MANAGER'` inside `AnalysisView` (passing an `isTeam` or `role` prop, same pattern the layout already uses for nav filtering) is the shape of the fix. Not implemented — flagging per your "don't guess, tell me" instruction on scope questions.

### 2.6 Content is view-only for Marketing Team — confirmed, server-side

Read `actions/categorize.ts` directly. All three write paths — `updatePostCategory`, `autoCategorizeAll`, `batchConfirmAgreed` — open with the identical guard:

```ts
if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
```

Not `!== 'MARKETING_TEAM'` and not a UI-only hide — every write to `category_final` (including the bulk auto-categorise and batch-confirm paths, not just the row-level Change action) is refused server-side for any role other than Manager, Team included. This is enforced independently of whatever the Content screen renders; a Team user hitting these Server Actions directly (not through the UI) gets the same refusal. Confirmed, matches your expectation, no gap found.

---

## 3. Correction to the previous memo — acknowledged

Noted: "no caption text" goes back into the reason-capture options, per the caption-only ground-truth coding procedure. This is already tracked as an open item in §15 of the 25 Aug Content Review response (which also surfaced that `Note 2.txt` and `Unassigned_Labels_and_Coding_Procedure.md` currently disagree on this exact point) — treating your instruction here as the resolution: **put it back, `Note 2.txt` is stale.**

---

## 4. Roles table — one correction from what's actually built

Your anchor table, checked against the routes above:

| Requirement (mvp.md #) | Owner | Marketing Manager | Marketing Team |
|---|---|---|---|
| FR-15 method evaluation | No | Yes | No |
| FR-19 promotion criterion | Yes | Yes | **Yes** |
| FR-21 correlation | Yes | Yes | **Yes** |
| FR-31 regression | Yes | Yes | **Yes** |
| FR-13/S4 categorisation | Yes (view) | Yes (full) | Yes (view) |
| FR-25 budget reallocation | Yes | No | No |
| FR-26 ad set/campaign ranking | Yes | No | No |
| FR-17/S6 content comparison | Yes (view) | Yes | Yes |

The difference from your starting position: your table has FR-09/10/11 (promotion/correlation/regression, your numbers) as **Manager: No, Team: No** for correlation and regression specifically. The build has all three (FR-19, FR-21, FR-31) visible to **both** Manager and Team, because they all live on the one shared Analysis screen (§2.5). Your reasoning — "FR-10 through FR-12 concern advertising efficiency, and advertising decisions are made by the owner" — is a real argument for narrowing this, but it argues against what's currently built, not for it. This is the same gap as §2.5, restated as a table row rather than prose.

---

## 5. Traceability matrix — what's confirmed so far

Not the full inventory yet (every sidebar entry across all three accounts is a bigger pass than this response covers), but every item this memo's §2 touched, with mvp.md's FR numbers and your equivalent noted:

**Forward:**

| FR (mvp.md) | Your # | Screen | Route | Roles | Implemented | Notes |
|---|---|---|---|---|---|---|
| FR-15 | FR-08 | Method Evaluation | `/dashboard/marketing/method-evaluation` | Manager | Yes | |
| FR-19 | FR-09 | Analysis (Ranking Comparison section) | `/dashboard/{owner,marketing}/analysis` | Owner, Manager, Team | Yes | Buried under "Analysis," not its own entry — see §2.2 |
| FR-20 | — | Analysis (Distribution section) | same | Owner, Manager, Team | Yes | |
| FR-21 | FR-10 | Analysis (Correlation section) | same | Owner, Manager, Team | Yes | No spend filter — see §6; Team access unintended per §2.5 |
| FR-25 | — (your "Budget Reallocation") | Budget Reallocation | `/dashboard/owner/budget-reallocation` | Owner | Yes | Reports only, no recommendation engine — §2.3 |
| FR-26 | — (part of your "Rankings/Top Ads") | Rankings | `/dashboard/owner/ad-set-ranking` | Owner | Yes | Ad-set/campaign grouping — §2.4 |
| FR-27 | — | Analysis (Lifecycle section) | `/dashboard/owner/analysis` only | Owner | Yes | |
| FR-31 | FR-11/FR-12 | Analysis (Regression section) | `/dashboard/{owner,marketing}/analysis` | Owner, Manager, Team | Yes | Residual flag is one-directional — §6; Team access unintended per §2.5 |
| — | — | Top Ads (individual-ad rankings) | `/dashboard/{owner,marketing}/campaign-rankings` | Owner, Manager | Yes | No dedicated FR — reads as a presentation layer over spend/inquiry/reach/CTR/CPC data already covered by FR-11/FR-17, not a separate requirement; flag if you want one written |

**Reverse (screens touched by this memo):**

| Screen | Route | Roles | Implements | Notes |
|---|---|---|---|---|
| Category Performance | `/dashboard/owner/category-performance` | Owner only | FR-?? (not identified in mvp.md by name) | §2.1 — access decision pending |
| Budget Reallocation | `/dashboard/owner/budget-reallocation` | Owner | FR-25 | §2.3 |
| Rankings | `/dashboard/owner/ad-set-ranking` | Owner | FR-26 (ad-set/campaign half) | §2.4 |
| Top Ads | `/dashboard/{owner,marketing}/campaign-rankings` | Owner, Manager | NONE / adjacent to FR-11, FR-17 | §2.4 |
| Analysis | `/dashboard/{owner,marketing}/analysis` | Owner, Manager, Team | FR-19, FR-20, FR-21, FR-27 (Owner only), FR-31 | §2.2, §2.5 |
| Keyword Lexicon | `/dashboard/marketing/keywords` | Manager only | (read-only lexicon display, no dedicated FR) | §1 — not on Owner nav, contra your assumption |

The rest of §5's ask (every remaining sidebar entry: Dashboard, Content, Upload Data, Method Evaluation, Trend Analysis, Page Metrics, Post Type Performance, Generate Report, Audit Log, User Management — full forward and reverse) is a bigger pass I haven't done in this response. Tell me if you want that as a dedicated follow-up before or after §0's numbering question is settled — doing it twice under two different FR schemes would be wasted work.

---

## 6. Parameter values

**Shared threshold (FR-25/FR-31):** confirmed **one shared constant**, not drifted literals. `lib/stats/budget-reallocation.ts` defines `export const MIN_SPEND_THRESHOLD_PHP = 1000`; `lib/stats/fr31-regression.ts` imports it directly (`import { MIN_SPEND_THRESHOLD_PHP } from './budget-reallocation'`) and re-exports it as `FR31_MIN_SPEND_PHP = MIN_SPEND_THRESHOLD_PHP`. Both analyses run on the same ₱1,000 threshold and the same n=108 filtered population — no drift.

**Your FR-09 (mvp.md FR-19):**
- Overlap cuts: **top 10% and top 20%**, both computed and both displayed (`lib/stats/ranking-comparison.ts`, `[10, 20].map(...)`)
- Views-vs-reach correlation: **not computed anywhere in the app** — see §2.2

**Your FR-10 (mvp.md FR-21):**
- Normality test: **Shapiro-Wilk**, on both variables (`lib/stats/shapiro-wilk.ts`, called from `correlation-selection.ts`)
- Selection rule: **decided at runtime**, not fixed in code — Pearson only if both variables pass `p > 0.05`; Spearman otherwise. Both are never computed and compared; the branch genuinely short-circuits.
- Population: **messaging ads, unfiltered by spend** — n=187, `spend > 0 && messaging contacts > 0`. This is a different population than FR-25/FR-31's ₱1,000-filtered n=108 — the two analyses are deliberately not run on the same slice, unlike the shared-constant question above which was about FR-25 vs. FR-31 specifically, not FR-21.

**Your FR-11 (mvp.md FR-31):**
- Predictor list, exact: **`engagement_rate`, `frequency`, `ctr`, `cpm`** (`FR31_PREDICTORS` in `lib/stats/fr31-regression.ts`) — four ratio predictors on ln(cost per inquiry). Reach and spend are deliberately excluded (r = 0.984 collinearity with the others, computed live, not hardcoded).
- Heteroscedasticity test: **Breusch-Pagan**
- Residual normality test: **Jarque-Bera**
- Cross-validation: **10-fold, seed 42, against a median-CPI baseline** (per the on-screen methodology note and `seeded-random.ts`)

**Your FR-12 (residual diagnostic, part of FR-31's `ResidualDiagnostic`):**
- Cutoff, as a number: **1.5** (`FR31_RESIDUAL_RATIO_THRESHOLD = 1.5`), applied to `ratio = actualCpi / predictedCpi`
- Direction: **one-directional only, confirmed a real gap.** The code filters `ratio > 1.5` — only ads costing 50%+ more than their predicted CPI are flagged. Ads performing *better* than predicted (e.g. ratio < 0.67) are computed (they're in `residualRows`, sorted and available) but never separately surfaced or flagged. This is exactly the gap your memo names: "the revised requirement needs both, since advertisements performing better than predicted are what the business should learn from." Not built yet — small fix (a second filter + threshold, symmetric to the existing one) once you confirm the exact cutoff for the low side (1/1.5 ≈ 0.67, or a different number).

**Your FR-07 (caption-length threshold):** already answered in the 25 Aug Content Review response — `FLAG_SHORT_CAPTION_WORDS = 8`, **word count, not character count**, NFKC-normalised. Your character-based reference counts (5 null, 13 under 10 chars, 25 under 20 chars) use a different unit than the live threshold and aren't directly comparable to it.

---

## 7. Page views vs. post views — noted, not yet audited

Flagging that I haven't done a full pass checking every screen for this specific co-display error yet — the Dashboard's page-metrics chart (`components/dashboard/DashboardCharts.tsx`) has an adjacent comment about visits/follows being independently-tracked daily metrics with no per-user link (the FR-30 funnel disclaimer), which is the same *category* of time-basis caution but not necessarily the same page-views-vs-post-views pairing you're describing. I'd want to check `page-metrics/page.tsx` and the Trend Analysis screen specifically before answering this one for real rather than guessing from an adjacent comment — can turn that around quickly as a follow-up if you want it before the rest of §5's full matrix, since it's a correctness question rather than a scope question.

---

## 8. §8's still-open items — already answered, pointer only

All six of these were answered directly in the two 25 Aug response docs already in `docs/raven/`, before this memo arrived:

- **574 LEGACY_IMPORT origin** → `Content_Review_Response_2026-08-25.md` §3 (traced to the 12 Aug migration copying old `category_id`; 96% cross-tab match with current keyword suggestions points to a single bulk `autoCategorizeAll()` pass, not manual triage)
- **716 vs. 530** → same doc, §1 (730 was already stale; live corpus is 916, 716 = 916 − 200 ground-truth, exact)
- **Keyword re-run on 50-term seed lexicon** → same doc, §12 (κ = 0.1360 raw / 0.2115 with UNCLASSIFIED→UNCLEAR mapping, full confusion matrix included)
- **Five null-caption posts** → same doc, §7 (root-caused: `resolveCaption` returns `null`, keyword method abstains correctly, LLM has no abstention option and force-picks — real bug, fix proposed)
- **Model selection** → same doc, §5 (only `gpt-oss-20b` was ever tried; the earlier `llama-3.1-8b-instant` was retired by Groq, not chosen against a field of candidates)
- **14 August prompt commit** → same doc, §6 (the commit is the prompt's first appearance, not an edit — there's no prior version to diff against)
- **Lexicon read-only + committed snapshots** → same doc, §11 (confirmed still in place, both snapshot files exist)

The in-period total also got a fresh check in `Study_Period_Scope_Response_2026-08-25.md`: 731 in-period posts (not 730, not a mystery — zero ground-truth posts are out of period, but there's a genuine unexplained 1-post gap against your 730 figure, flagged there and still open pending the source of that number).

---

## 9. Your "if you send one thing today" items

**§2.1 (Category Performance access):** confirmed Owner-only in code, exactly as you read the screenshots. Decision on where it should live is yours — see §2.1 above for the implementation note either way.

**§2.2 (where FR-09/FR-19 lives):** it's real, live, and correctly computed (Spearman + both 10%/20% overlaps) on the Analysis screen, visible to all three roles — it's just not named for what it is. The views-vs-reach number in your memo isn't in the app at all, so if that's meant to ship, it needs building, not just relabelling.
