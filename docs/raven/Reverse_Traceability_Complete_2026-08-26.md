# Reverse traceability: every screen mapped, §4 flag-check clear

**Date:** 26 August 2026
**Re:** `Final_FR_Table_Objectives_and_Reverse_Traceability.md` §5, and the one open item in §4
**Method:** direct code reading — every route file under `app/dashboard/**`, `app/login`, `app/ui`, `app/print/**`, `app/api/**`, plus `middleware.ts`, `Sidebar.tsx`, both dashboard `layout.tsx` files, and `AnalysisView.tsx`'s section markup. Re-verified against the live tree rather than trusting `Response_Full_App_Inventory.md` (22 Aug, stale FR numbers) or the FR-numbering crosswalk memo (written before the table settled at 21 items) — both were used as a starting point, not as source of truth.

---

## 0. Two things worth knowing before the table

**The old code-side FR numbers (FR-01 through FR-31) that appear in comments throughout the codebase are a different numbering than Table 3's FR-01 through FR-21.** Every citation below is Table 3's numbering. Where a code comment or component cites the old number, I've noted the mismatch inline rather than silently translating, since you'll want to know which comments still need updating for Chapter 3 consistency.

**Two routes changed since the 22 Aug inventory, independent of anything in this pass:**
- `/dashboard/owner/content` is gone. The route file was deleted (the marketing `content/page.tsx` comment confirms: "already orphaned before this merge"). No longer a redundant-screen flag — resolved.
- `/dashboard/owner/method-evaluation` is gone. Only `/dashboard/marketing/method-evaluation` exists now. Owner's nav (`app/dashboard/owner/layout.tsx`) has no Method Evaluation entry at all. This is a real access change from the 22 Aug inventory (which had it Owner-View) — flagging in case Chapter 3 says the Owner can reach it.

---

## 1. The reverse-traceability table

| Screen or feature | Route | Roles | Requirement | Notes |
|---|---|---|---|---|
| Root redirect | `/` | Anyone | — | Redirects to `/login`, no content. |
| Login | `/login` | Anyone (unauthenticated) | FR-01 | Username/password form. |
| NextAuth handler | `/api/auth/[...nextauth]` | Framework | FR-01 | Session/credentials backend for the login form. |
| Route-level role gate | `middleware.ts` | All | FR-01 | Enforces the Owner-vs-Marketing top-level split from the JWT; per-page `auth()` checks (every route below) enforce the finer Manager-vs-Team grants. |
| Component showcase | `/ui` | **Anyone, no auth check** | — | Internal shadcn dev tool, no business data. Still unguarded as of this pass — not a requirement gap, but still worth a deliberate keep/gate/delete call since it's a live unauthenticated route. |
| Executive Dashboard | `/dashboard/owner` | Owner (Full) | FR-13 | `DashboardOverview` — period-selector KPI dashboard: spend vs. inquiries, CPI distribution, category performance, page reach/views trend, follows-per-100-visits. |
| Dashboard | `/dashboard/marketing` | Manager (Full), Team (View) | FR-13 | Same `DashboardOverview` component. |
| Upload Data | `/dashboard/owner/upload` | Owner (Full) | FR-03, FR-04, FR-05 | `UploadCoverageStatus` + `UploadForm` (per-row validation, rejected-row list, NEEDS_CONFIRMATION re-upload) + `UploadHistory` (records read/stored/updated/rejected/duplicate, last 30 uploads). |
| Upload Data | `/dashboard/marketing/upload` | Manager (Full) | FR-03, FR-04, FR-05 | Identical to Owner's. Not visible to Team. |
| Content | `/dashboard/owner/categorize` | Owner (View) | FR-07 | `ContentClient` — needs-review / all / unassigned filters, keyword+LLM suggestions, flag reasons, manual assignment history. View-only per code comment. |
| Content | `/dashboard/marketing/categorize` | Manager (Full — finalizes), Team (View) | FR-07 | Same `ContentClient`, role prop gates the write actions. |
| Content Library (legacy link) | `/dashboard/marketing/content` | Manager, Team | FR-07 | Pure redirect to `/dashboard/marketing/categorize?filter=all`, kept for old bookmarks. Not a second feature. |
| Keyword Lexicon | `/dashboard/marketing/keywords` | Manager (View only — no edit UI) | FR-07 | Displays the lexicon; page description states view-only, matching FR-07's "shall not permit its modification through any user interface" clause. |
| Analysis — ranking comparison | `/dashboard/owner/analysis`, `/dashboard/marketing/analysis` (section) | Owner (Full), Manager (Full), Team (View) | FR-09 | Spearman(Views, engagement rate), top-10%/20% overlap, plus the Views-vs-Reach correlation clause in the same card. |
| Analysis — category distribution | same routes (section) | Owner (Full), Manager (Full), Team (View) | FR-17 | Median Views/engagement rate by category, low-confidence flag under n=3, highest/lowest callout. Code comment on this section still says "FR-20" (old numbering) — worth updating if Chapter 3 screenshots the code. |
| Analysis — correlation with method selection | same routes (section) | Owner (Full), Manager (Full), **Team: hidden** (`hideAdEfficiency`) | FR-10 | Shapiro-Wilk on ad engagement rate/CPI, Pearson-or-Spearman selection. Team does not see this section at all — confirmed in `AnalysisView.tsx` and `marketing/analysis/page.tsx`. |
| Analysis — regression | same routes (section) | Owner (Full), Manager (Full), **Team: hidden** (`hideAdEfficiency`) | FR-11, FR-12 | `RegressionSection` — OLS on ln(CPI), VIF/BP/JB diagnostics, HC3 SEs, 10-fold CV, plus the residual (over-threshold) diagnostic. |
| Analysis — lifecycle | `/dashboard/owner/analysis` only (section, `lifecycle` prop) | **Owner only** | FR-16 | Month-of-life CPI cohort curves, single-month-vs-long-run comparison, and the frequency-vs-CPI Spearman correlation (code name "Frequency Diagnostic," n=482, fixed-method not Shapiro-gated — see `Closing_the_FR_Table.md` §3 for the method-consistency caveat, still open as of that memo). Not present on the Marketing route at all — `marketing/analysis/page.tsx` never loads `loadAdLifecycleData`. |
| Budget Reallocation | `/dashboard/owner/budget-reallocation` | Owner (Full) | FR-15 | Messaging ads in CPI quartiles, min-spend threshold, retrospective Q4→Q1 counterfactual. Owner-only, no Marketing route exists. |
| Rankings | `/dashboard/owner/ad-set-ranking` | Owner (Full) | FR-15 | Ad-set/campaign CPI ranking table. Owner-only, no Marketing route exists. |
| Top Ads | `/dashboard/owner/campaign-rankings` | Owner (Full) | FR-15 | Six top-10 panels (spend/messaging conversions/reach; CPI/CTR/cost-per-click), date-range filter. |
| Top Ads | `/dashboard/marketing/campaign-rankings` | Manager (Full) | FR-15 | Identical. Not visible to Team. |
| Trend Analysis | `/dashboard/owner/trend-analysis` | Owner (Full) | FR-14 | Month-over-month ad/post counts and efficiency measures, `TrendAnalysisView`. |
| Trend Analysis | `/dashboard/marketing/trend-analysis` | Manager (Full) | FR-14 | Same component. Not visible to Team. |
| Page Metrics | `/dashboard/owner/page-metrics` | Owner (View) | FR-13 | Page visits/follows/follows-per-100, gender/age/country/city demographics, each with an "as of {captured_at}" snapshot date per §3 of `Three_Fixes_Landed_2026-08-25.md`. |
| Page Metrics | `/dashboard/marketing/page-metrics` | Manager (Full) | FR-13 | Same sections plus an upload-guide empty state. Not visible to Team. |
| Category Performance | `/dashboard/owner/category-performance` | Owner (Full) | FR-17 | Organic-only, reach-weighted engagement rate by category (ALG-09 sum-then-divide), total reach, uncategorised-post banner. |
| Category Performance | `/dashboard/marketing/category-performance` | **Manager only** (not Team — see page-level comment citing `FR_Mapping_Complete_and_Category_CPI_Gap.md` §5) | FR-17 | Thin route wrapper around the same `loadCategoryPerformanceData`/`CategoryPerformanceView` Owner uses, per the extraction described in `FR_Numbering_Confirmation_and_Category_Performance_Response_2026-08-25.md` §2. |
| Post Type Performance | `/dashboard/owner/post-type-performance` | Owner (Full) | FR-17 | Median reach/engagement/views by post type + watch-through rate for video/reel. |
| Post Type Performance | `/dashboard/marketing/post-type-performance` | Manager (Full), Team (View) | FR-17 | Identical. |
| Method Evaluation | `/dashboard/marketing/method-evaluation` | **Manager only — no Owner route exists** | FR-08 | Keyword vs. LLM kappa, ground-truth comparison, human inter-coder ceiling. Owner's route was removed since the 22 Aug inventory; flagging since that inventory had it Owner-View. |
| Generate Report | `/dashboard/owner/report` | Owner (Full) | FR-19 | `ReportView` full performance report with export controls. |
| Generate Report | `/dashboard/marketing/report` | Manager (Full), Team (View, no export — `canExport` prop) | FR-19 | Same component. |
| Report (print) | `/print/owner/report`, `/print/marketing/report` | Owner, Manager | FR-19 | Print-styled `ReportView` variant feeding the PDF export, `noindex`, auth-checked. |
| Report CSV export | `/api/reports/[role]/csv` | Owner, Manager (Team: 403) | FR-19 | Rate-limited 10/min. |
| Report PDF export | `/api/reports/[role]/pdf` | Owner, Manager (Team: 403) | FR-19 | Headless-Chromium render, rate-limited 5/min. |
| User Management | `/dashboard/owner/administration` | Owner (Full — only role) | FR-02 | `UserManagement` — create/edit/deactivate/reactivate/reset-credentials, `is_active` soft-delete (per `Three_Fixes_Landed_2026-08-25.md` §2), last-10 upload activity. |
| Audit Log | `/dashboard/owner/audit-log` | Owner (Full) | FR-20 | `AuditLogTable` — every upload + manual category assignment, user + timestamp, last 200 events. |
| Audit Log | `/dashboard/marketing/audit-log` | **Manager only** — page redirects non-Manager to `/login`, and Team's href isn't in `TEAM_VISIBLE_HREFS` either, so Team can't reach it by nav or direct URL | FR-20 | Same `AuditLogTable`. |
| Chat widget | Rendered in `Sidebar.tsx`, reachable from every Owner/Manager page | Owner, Manager (**not Team** — `showChat={!isTeam}` in `marketing/layout.tsx`) | FR-21 | `ChatBot` — ad/post/page aggregate queries, both now study-period-scoped (`STUDY_PERIOD_AD_WHERE` + existing post filter, per `Ad_Scope_And_Chat_Conditions_Landed_2026-08-25.md` §2), visible confirm-against-reports caption. One open item this pass surfaced but didn't resolve: `Ad_Scope_And_Chat_Conditions_Landed_2026-08-25.md` §39 notes the chat's "Predictive Model" section still queries the **cut** `regressionModel` table, not FR-31's live regression — that's a separate, still-open decision, not a requirement-mapping gap. |
| Correlation (superseded) | `/dashboard/owner/correlation`, `/dashboard/marketing/correlation` | Unreachable (`notFound()`) | — | Old ad-metrics-vs-messaging Spearman matrix, superseded by the Analysis screen's FR-09/FR-10. Intentionally cut per `mvp.md` §5 — not a gap. |
| Regression (superseded) | `/dashboard/owner/regression`, `/dashboard/marketing/regression` | Unreachable (`notFound()`) | — | Old predictive regression (messaging conversations ~ reach + spend) — a different model from FR-11's live explanatory regression. Intentionally cut, not a gap. |
| Simulation (cut) | `/dashboard/owner/simulation`, `/dashboard/marketing/simulation` | Unreachable (`notFound()`) | — | What-if/Monte Carlo simulator, cut per `mvp.md` §5 (can't support a causal "what if" claim from observational data). Intentionally cut, not a gap. |

**Derived measures (FR-06) and result interpretation (FR-18) are not their own rows.** FR-06 (engagement rate + CPI computation) isn't a screen — it's computed at ingestion/query time and surfaces as a value on nearly every row above (Content, Trend Analysis, Post Type Performance, Rankings, Dashboard). FR-18 (n + plain-language statement on every analytical result) is the same kind of cross-cutting requirement — `FR16_Frequency_and_FR18_N_Pass_2026-08-25.md` already ran the per-screen n/plain-language check across all fourteen analytical screens and found it mostly satisfied with four named partials (category distribution, lifecycle cohort curves, Post Type Performance, and the Dashboard's missing narrative layer). I didn't re-run that pass here since it's already answered elsewhere and re-litigating it would just be restating that memo.

---

## 2. Does every requirement have a feature behind it?

Checked FR-01 through FR-21 against the table above:

| FR | Group | Has a feature? |
|---|---|---|
| FR-01 | Authentication and RBAC | Yes — Login, NextAuth handler, `middleware.ts`, every route's `auth()` check |
| FR-02 | Account management | Yes — User Management |
| FR-03 | Export file upload and identification | Yes — Upload Data (both roles) |
| FR-04 | Record validation and cleaning | Yes — Upload Data (rejected-row list, per-row validation) |
| FR-05 | Centralised repository and ingestion reporting | Yes — Upload Data (`UploadHistory`, upload result counts) |
| FR-06 | Derived measure computation | Yes, but no dedicated screen — see note above |
| FR-07 | Content categorisation and review | Yes — Content (both role trees), Keyword Lexicon |
| FR-08 | Categorisation method evaluation | Yes — Method Evaluation |
| FR-09 | Promotion criterion analysis | Yes — Analysis, ranking comparison section |
| FR-10 | Correlation with method selection | Yes — Analysis, correlation section |
| FR-11 | Advertising efficiency regression | Yes — Analysis, regression section |
| FR-12 | Residual diagnostic | Yes — Analysis, regression section (same card as FR-11) |
| FR-13 | Performance dashboard and page reporting | Yes — Dashboard, Page Metrics |
| FR-14 | Aggregated performance reporting | Yes — Trend Analysis |
| FR-15 | Efficiency ranking and quartile comparison | Yes — Rankings, Budget Reallocation, Top Ads |
| FR-16 | Advertisement lifecycle reporting | Yes — Analysis, lifecycle section (Owner-only) |
| FR-17 | Content comparison reporting | Yes — Analysis category-distribution section, Category Performance, Post Type Performance |
| FR-18 | Result interpretation | Yes, cross-cutting — see `FR16_Frequency_and_FR18_N_Pass_2026-08-25.md` for the per-screen pass |
| FR-19 | Report export | Yes — Generate Report, print routes, CSV/PDF API routes |
| FR-20 | Audit trail | Yes — Audit Log |
| FR-21 | Assistant and dataset query | Yes — Chat widget |

**No empty rows.** Every requirement has at least one live feature behind it.

**No orphaned features either**, with one caveat already on record: `/ui` maps to nothing, but it's a dev tool, not a product feature, so it isn't the kind of gap §5's second bullet is asking about. Every other reachable route in the table above has a requirement.

---

## 3. §4 flag-check: nothing found

Read §4's objective-mapping table and §4.1's condition-mapping table against live code, row by row. Both check out:

- **Objective 1 → FR-03/04/05/06, Upload Data.** All four requirements have working features per §2 above; the ingestion counts (read/stored/updated/rejected/duplicate) are all real fields, not aspirational.
- **Objective 2.1 → FR-07, Content/Needs Review.** Confirmed — suggestion generation, flag-reason prioritisation, batch confirm, and manual override all exist and are live.
- **Objective 2.2 → FR-08, Method Evaluation.** Confirmed — kappa, percentage agreement, confusion matrix, and the human inter-coder ceiling are all rendered.
- **Objective 3 → FR-06, FR-14, FR-15, FR-17, four screens.** This is the one place I checked hardest, since `Closing_the_FR_Table.md` §1 already caught a related overstatement (CPI by content category). The screens cited (Rankings, Top Ads, Trend Analysis, Category Performance, Post Type Performance) each report what they claim to and none of them claim CPI-by-content-category — that clause was already removed from FR-14/FR-17's text per `Category_CPI_Gap_Response_2026-08-25.md`. No residual mismatch.
- **Objective 4 → FR-09, ranking comparison.** Confirmed, including the Views-vs-Reach clause that's now built.
- **Objective 5 → FR-11, FR-12, regression section.** Confirmed — assumption tests (VIF/BP/JB), explanatory power (R², adjusted R²), and cross-validated error against the median-CPI baseline are all present, matching the objective's own wording almost verbatim.
- **§4.1's condition table** (FR-01/02, FR-10, FR-13, FR-16, FR-18, FR-19, FR-20, FR-21) — none of these assert a system output; they're each a one-line "what this serves" gloss on a requirement already verified above. Nothing here promises a capability the code lacks.

**Nothing to flag.** I did not find a row in either table that assumes an output the system does not produce.

---

## 4. Where this leaves the table

Every screen maps to a requirement, every requirement has a screen, and the §4 check came back clean. The two structural corrections in §0 (Owner Content and Owner Method Evaluation both removed since the last inventory) are the only surprises — worth a quick check that Chapter 3's screen list doesn't still describe either as Owner-reachable.
