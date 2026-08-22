# Response: full application inventory

**Date:** 22 August 2026
**Re:** your request for a complete route inventory (`docs/raven/Request_Full_App_Inventory.md`)

Supersedes `docs/raven/Route_Inventory_and_Forecast_Removal.md` for inventory purposes — that memo's table is now stale (Upload Data has since been built, the sidebar was restructured, and FR-07's flag/triage system shipped). Its forecast-removal and correlation-gating history (§1–2 of that doc) is still accurate and not repeated here.

---

## 1. Full route table

"Full" = the role can create/edit/finalize/export on that screen. "View" = read-only. "—" = not reachable at all for that role.

| Route | Sidebar label | Section | Roles | What it displays | FR | Status |
|---|---|---|---|---|---|---|
| `/` | not in sidebar | n/a | Anyone | Redirects immediately to `/login`. No content. | — | Complete |
| `/login` | not in sidebar | n/a | Anyone (unauthenticated) | Email/password form, show/hide password, caps-lock warning, local theme toggle, session-expired notice banner. | FR-01 | Complete |
| `/ui` | not in sidebar | n/a | **Anyone, no auth check at all** | Internal shadcn component showcase — buttons, tables, dialogs, charts, toasts, etc. No app/business data rendered. | — | Complete (dev tool), see flag below |
| `/dashboard/owner` | Executive Dashboard | Overview | Owner (Full) | `DashboardOverview`: period-selector KPI dashboard — spend vs. inquiries (dual-axis), CPI distribution, category performance (n-labelled), page reach/views trend, follows-per-100-visits. | FR-16, FR-18, FR-30 | Complete |
| `/dashboard/marketing` | Dashboard | Overview | Manager (Full), Team (View) | Same `DashboardOverview` component as Owner. | FR-16, FR-18, FR-30 | Complete |
| `/dashboard/owner/upload` | Upload Data | Data | Owner (Full) | `UploadCoverageStatus` (what's already uploaded, so Owner/Manager don't duplicate work) + `UploadForm` (drag/drop CSV, NEEDS_CONFIRMATION re-upload flow with cancel) + `UploadHistory` (last 30 uploads). | FR-04–FR-09 | Complete |
| `/dashboard/marketing/upload` | Upload Data | Data | Manager (Full) | Identical to Owner's upload page. Not visible to Team (not in `TEAM_VISIBLE_HREFS`). | FR-04–FR-09 | Complete |
| `/dashboard/owner/categorize` | Categorization Review | Content | Owner (View) | `CategorizeClient`: queue of uncategorized posts, keyword/LLM suggestions, flag-reason column (FR-07), batch-confirm-agreed toolbar action. Owner sees it but per mvp.md S4 only the Manager can finalize — page description says "view only." | FR-12, FR-13, FR-14 | Complete |
| `/dashboard/marketing/categorize` | Categorization Review | (ungrouped) | Manager (Full — only role that finalizes), Team (Suggest only) | Same `CategorizeClient` component; role prop controls whether finalize/batch-confirm actions render. | FR-12, FR-13, FR-14 | Complete |
| `/dashboard/marketing/content` | Content Library | (ungrouped) | Manager (Full — can assign categories inline), Team (View) | `ContentLibraryClient`: all organic posts — title, permalink, type, publish date, views, engagement rate, assigned category. | FR-10, FR-13 | Complete |
| `/dashboard/owner/content` | not in sidebar (route exists, unlinked) | n/a | Owner (View) | Same `ContentLibraryClient`, `canEdit={false}`. **Not in the Owner sidebar** (removed in today's consolidation — mvp.md S3 makes this the Manager's screen) but the route file and its auth check are still live — reachable by direct URL for a logged-in Owner. | FR-10, FR-13 | Complete, unlinked |
| `/dashboard/marketing/keywords` | Manage Keywords | (ungrouped) | Manager (Full) | `KeywordsClient`: categories with their keyword lists (ALG-04 lexicon), add/edit/remove keywords. | ALG-04 | Complete |
| `/dashboard/owner/analysis` | Analysis | Analytics | Owner (Full) | `AnalysisView` with `lifecycle` + `regression` props: FR-19 ranking comparison, FR-20 category distribution, FR-21 correlation (Shapiro-Wilk-selected Pearson/Spearman), FR-22 interpretation, FR-27 ad lifecycle diagnostics, FR-31 explanatory regression (ln(CPI) OLS, VIF/BP/JB diagnostics, 10-fold CV). | FR-19–22, FR-27, FR-31 | Complete |
| `/dashboard/marketing/analysis` | Analysis | Analytics | Manager (Full), Team (View) | Same `AnalysisView`, no `lifecycle` prop (Owner-only per mvp.md S7 tab layout) — still gets `regression`. | FR-19–22, FR-31 | Complete |
| `/dashboard/owner/budget-reallocation` | Budget Reallocation | Analytics | Owner (Full) | Messaging ads ranked into CPI quartiles, min-spend threshold selector, retrospective Q4→Q1 reallocation counterfactual, mandatory non-prediction methodology note. | FR-25 | Complete |
| `/dashboard/owner/ad-set-ranking` | Rankings | Analytics | Owner (Full) | `AdSetRankingTable` in two tabs (By Ad Set / By Campaign) — spend, inquiries, CPI, grouped by ID not name, "low confidence" flag under n threshold. | FR-26 | Complete |
| `/dashboard/owner/campaign-rankings` | Top Ads | Analytics | Owner (Full) | Six top-10 panels: by spend, by messaging conversations, by reach (volume); by cost/conversation, CTR, cost/click (efficiency). Date-range filter, summary KPI row. | FR-26 | Complete |
| `/dashboard/marketing/campaign-rankings` | Top Ads | Analytics | Manager (Full) | Identical to Owner's Top Ads. Not visible to Team. | FR-26 | Complete |
| `/dashboard/owner/trend-analysis` | Trend Analysis | Analytics | Owner (Full) | `TrendAnalysisView`, shared with Marketing; owner-specific empty-state copy ("the Marketing Manager needs to upload…"). | Unsure — not explicitly in mvp.md's S1–S11 table | Complete |
| `/dashboard/marketing/trend-analysis` | Trend Analysis | Analytics | Manager (Full) | Same `TrendAnalysisView`. Not visible to Team. | Unsure | Complete |
| `/dashboard/owner/page-metrics` | Page Metrics | Analytics | Owner (View) | Page-level performance: organic post KPIs + by-post-type table, daily follows/interactions/visits charts, follower growth chart, new-vs-returning viewers chart, gender/territory demographics — each section has a computed plain-language insight header. Forecast section removed 2026-08-22. | FR-30 (page funnel) + general page metrics, not otherwise FR-numbered | Complete |
| `/dashboard/marketing/page-metrics` | Page Metrics | Analytics | Manager (Full) | Same sections as Owner's, plus an upload-guide empty state listing all 9 expected CSV files with direct link to Upload Data. Not visible to Team. | Same as above | Complete |
| `/dashboard/owner/category-performance` | Category Performance | Analytics | Owner (Full) | Organic-post-only category performance table (reach, engagement rate, sum-then-divide per ALG-09), summary KPIs, uncategorized-post warning. Ad-side category performance is explicitly out of scope (no join key). | Unsure — successor to a cut cross-source feature, no FR cited in code | Complete |
| `/dashboard/owner/post-type-performance` | Post Type Performance | Analytics | Owner (Full) | `PostTypePerformanceTable` (median reach/engagement/views by post type, "low confidence" under n=3) + `WatchThroughCard` (FR-28, video watch-through rate). Confounding caveat re: algorithmic distribution. | FR-28, FR-29 | Complete |
| `/dashboard/marketing/post-type-performance` | Post Type Performance | Analytics | Manager (Full), Team (View — "this is their screen" per mvp.md S6) | Identical to Owner's. | FR-28, FR-29 | Complete |
| `/dashboard/owner/method-evaluation` | Method Evaluation | Reports | Owner (View) | Keyword vs. LLM Cohen's kappa cards, sample-size/circularity warnings, ground-truth (external codebook) comparison section, human inter-coder kappa ceiling, methodology note on kappa bands. | FR-15 | Complete (ground-truth import pipeline built; external two-coder labelling pass itself still pending — see mvp.md DoD) |
| `/dashboard/marketing/method-evaluation` | Method Evaluation | Analytics | Manager (Full) | Same content as Owner's, second-person copy, includes script-run instructions for populating ground truth. Not visible to Team (mvp.md S8: "Marketing Team hidden"). | FR-15 | Complete, same caveat |
| `/dashboard/owner/report` | Generate Report | Reports | Owner (Full) | `ReportView` screen variant — full performance report, presumably with export controls (not read in detail this pass). | FR-23 | Complete |
| `/dashboard/marketing/report` | Generate Report | Reports | Manager (Full), Team (View, no export) | Same `ReportView`; `canExport` prop gates PDF/CSV buttons off for Team. | FR-23 | Complete |
| `/dashboard/owner/administration` | User Management | Administration | Owner (Full — only role) | KPI row (user counts by role) + `UserManagement` interactive table (create/edit/deactivate/reset) + last-10 upload activity table. | FR-03 | Complete |
| `/dashboard/owner/audit-log` | Audit Log | Administration | Owner (Full) | `AuditLogTable` — every upload + every manual category assignment, user + timestamp, last 200 events, upload/category-action totals. | FR-24 | Complete |
| `/dashboard/marketing/audit-log` | Audit Log | Reports | Manager (View) | Same `AuditLogTable`. Not visible to Team (mvp.md S11: "Marketing Team hidden entirely"). | FR-24 | Complete |
| `/print/owner/report` | not in sidebar | n/a | Owner | `ReportView` print variant — same `buildReportData`, styled for PDF/paper. `robots: noindex`. Auth-checked. | FR-23 | Complete |
| `/print/marketing/report` | not in sidebar | n/a | Manager | Same, marketing role only (not Team — matches export restriction). | FR-23 | Complete |
| `/api/reports/[role]/csv` | n/a (API) | n/a | Owner, Manager (session-role must match `[role]` param; Team gets 403) | CSV export of report data. Rate-limited (10/min per user). | FR-23 | Complete |
| `/api/reports/[role]/pdf` | n/a (API) | n/a | Owner, Manager (Team 403) | Headless-Chromium PDF render of the print route. Rate-limited (5/min — most expensive endpoint in the app). | FR-23 | Complete |
| `/api/auth/[...nextauth]` | n/a (API) | n/a | Framework | NextAuth.js session/credentials handler. | FR-01 | Complete (framework) |
| `/dashboard/owner/correlation` | not in sidebar | n/a | Owner (unreachable) | `notFound()` stub. Superseded by S7 Analysis; old Spearman/lagged-correlation matrix (`CorrelationView`, `laggedCorrelation.ts`) stays on disk, unimported. | — | **Cut, gated** |
| `/dashboard/marketing/correlation` | not in sidebar | n/a | Manager/Team (unreachable) | Same gate. | — | **Cut, gated** |
| `/dashboard/owner/regression` | not in sidebar | n/a | Owner (unreachable) | `notFound()` stub. Old predictive regression (`RegressionSection.tsx`, `lib/stats/regression.ts` — messaging conversations ~ reach + spend) — **not** the same as the live FR-31 explanatory regression on the Analysis screen. | — | **Cut, gated** |
| `/dashboard/marketing/regression` | not in sidebar | n/a | Manager/Team (unreachable) | Same gate. | — | **Cut, gated** |
| `/dashboard/owner/simulation` | not in sidebar | n/a | Owner (unreachable) | `notFound()` stub. Old what-if/Monte Carlo simulator (`WhatIfSimulator.tsx`, `lib/stats/simulation.ts`) — cut per mvp.md §5 (can't support causal "what if" claims from observational data). | — | **Cut, gated** |
| `/dashboard/marketing/simulation` | not in sidebar | n/a | Manager/Team (unreachable) | Same gate. | — | **Cut, gated** |

---

## 2. Not merged / open decisions carried over from the prior memo

Still unresolved, restating for completeness since this doc supersedes that one:

- **Rankings vs. Top Ads** (`/dashboard/owner/ad-set-ranking` + `/dashboard/owner/campaign-rankings`) — not merged into one "Efficiency Rankings" screen. Rankings is a simple ad-set/campaign efficiency table; Top Ads is six top-10 panels (volume + efficiency) with a date filter. Merging means either dropping panels or building a bigger unified component — still needs your call.
- **`/ui` has no auth check** — still true as of this pass. Reachable by anyone, logged in or not, no business data. Low risk, but it's a raw dev component showcase, not part of the product; flag if you want it gated, deleted, or left alone.

## 3. New since the prior memo (built today)

- **Upload Data** (`/dashboard/owner/upload`, `/dashboard/marketing/upload`) — both live now. Owner has full upload rights alongside the Manager per your §2.1 answer. Coverage-status panel prevents duplicate uploads between the two roles.
- **Sidebar restructure** — Owner nav: Content Library removed (Owner doesn't need it — the route/page still exists on disk, unlinked, see the table above), Method Evaluation moved under Reports, Upload Data added under a new "Data" section.
- **FR-07 flag/triage system** — Categorization Review now has a flag-reason column and a batch-confirm-agreed action on both role trees; `ENTERTAINMENT_SUGGESTED` renamed from `RARE_CATEGORY`.

## 4. Drill-downs / dynamic routes

None found. No `[id]`-style dynamic segments exist outside the framework/API routes (`/api/auth/[...nextauth]`, `/api/reports/[role]/...`). Every analytical screen is a flat, single-URL page — no modal-driven sub-routes, no per-ad or per-post detail pages. This is a genuinely flat route tree; nothing is hiding behind a click-through the way the forecast section was hiding behind a scroll.

## 5. Shared components (per your §3 ask)

- **`MethodologyNote`** (`components/analytics/MethodologyNote.tsx`) — the collapsible "see the numbers behind this" disclosure. Used on 8+ screens: Budget Reallocation, Rankings, Top Ads (both role trees), Category Performance, Post Type Performance (both), Method Evaluation (both).
- **`RankingTable`** (`components/analytics/RankingTable.tsx`) — powers all six top-10 panels on both Top Ads pages (owner + marketing), byte-identical page code otherwise.
- **`PostTypePerformanceTable`** + **`WatchThroughCard`** — shared verbatim between owner and marketing Post Type Performance pages.
- **`AnalysisView`** (`components/analytics/pages/AnalysisView.tsx`) — shared between owner/marketing Analysis pages; owner gets an extra `lifecycle` prop (FR-27), both get `regression` (FR-31).
- **`TrendAnalysisView`** — shared between owner/marketing Trend Analysis, differs only by empty-state copy.
- **`DashboardOverview`** — shared between the two dashboards (`/dashboard/owner`, `/dashboard/marketing`), role passed as a prop.
- **`ReportView`** — powers all four report surfaces (owner screen, marketing screen, owner print, marketing print) via a `variant`/`role` prop pair.
- **`CategorizeClient`** and **`ContentLibraryClient`** — shared between owner/marketing categorize and content pages respectively, `canEdit`/role props gate the write actions.

## 6. What I think is redundant

- **Owner Content Library** (`/dashboard/owner/content`) — route and full auth check still live, but the page is unlinked from the Owner sidebar and, per mvp.md's own S3 access matrix, isn't meant to be the Owner's screen. It's not costing anything (no broken links, no exposed data beyond what Owner already sees via Categorization Review), but it's dead weight worth a deliberate delete-or-keep call rather than leaving it as an accidental orphan.
- **Owner and Marketing Manager's parallel page trees are near-perfect mirrors** for the shared screens (Top Ads, Post Type Performance, Method Evaluation, Page Metrics, Reports) — same components, same queries, differing only in role gate and minor copy. Not a problem exactly (the access matrix genuinely requires per-role page files under this route-based middleware), but if Chapter 3's system design section needs a simpler mental model: think of it as one screen set with a role parameter, not 20-odd independently-designed screens.

## 7. Not built (spec vs. live, best effort — not an exhaustive mvp.md pass)

- ~~**FR-15 manual ground-truth labelling itself** — the import pipeline and comparison UI are built and live, but the actual two-coder, 150–200-post labelling pass (mvp.md §9 item 3) hasn't been run yet; `groundTruth.n === 0` is the current live state until that lands.~~ **Correction (2026-08-22, see `Lexicon_Integrity_and_Ground_Truth_Answers.md`):** this was stale. Live DB confirms `category_final_source = MANUAL_GROUND_TRUTH` count = 200, matching `InterCoderReliability` (n=200, κ=0.6505). The labelling pass is done and imported.
- **FR-26 "groups by Ad set ID/Campaign ID, not by name"** — mvp.md's own DoD checklist (docs/mvp.md line ~304) has this unchecked, though the current `ad-set-ranking.ts` code does appear to group by `ad_set_id`/`campaign_id`. Worth a direct verification pass if this matters for Chapter 3's claims — I did not independently re-derive it this round.
- **Holt-Winters forecasting, What-if/Monte Carlo simulation, predictive regression (messaging ~ reach + spend), campaign health score** — all explicitly cut per mvp.md §5's defensibility rationale (forecast needs ≥2 seasonal cycles and only has one; simulation implies a causal claim the observational data can't support; health score would need arbitrary weights). Code remains on disk, unwired, per the project's stated convention — this is intentional, not an oversight.
- **mvp.md's "not yet in the Objectives of the Study" flag on FR-25–FR-30** (docs/mvp.md line ~319) — a Chapter 1/Chapter 3 alignment question, not a code gap; flagging since it's exactly the kind of documentation-vs-build mismatch your Chapter 3 pass is trying to catch.

---

*Scope note: item 7's "not built" list is best-effort — I skimmed `docs/mvp.md`'s FR table and DoD checklist rather than doing an exhaustive line-by-line spec audit. If Chapter 3 needs certainty on any specific FR's build status, worth a targeted follow-up on that FR alone.*
