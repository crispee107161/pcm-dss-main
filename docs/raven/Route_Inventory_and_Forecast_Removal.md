# Route inventory, forecast removal, and one more scope leak found

**Date:** 22 August 2026
**Re:** your decisions on the forecast section, upload, and the sidebar consolidations

---

## 1. Forecast — removed

- Pulled the "Page Views — Next 7 Days" section from **both** `app/dashboard/owner/page-metrics/page.tsx` and `app/dashboard/marketing/page-metrics/page.tsx` (it was on both, not just the Owner's screen — the Marketing Manager had the identical section).
- Removed the now-dead `MovingAverageForecastChart` component and `FORECAST_CONFIG` from `components/marketing/PageMetricsCharts.tsx`, and the now-unused `ComposedChart`/`Area` recharts imports.
- Left `lib/stats/forecast.ts` and `lib/insights/forecast-insight.ts` on disk, untouched — nothing imports either anymore.
- `npx tsc --noEmit` is clean after the removal.

## 2. Wording grep — one more leak found and fixed

Ran the full grep you asked for (`forecast`, `projected`, `predicted`, `will generate`, `projection`, `simulation`, `ROI`, `return on investment`) across `app/` and `components/`.

**Found:** `/dashboard/owner/correlation` and `/dashboard/marketing/correlation` were both live, reachable routes — properly role-gated (Owner/Marketing Manager respectively, redirect-to-login otherwise), but **not** feature-gated. They rendered `CorrelationView`, which imports `lib/stats/laggedCorrelation.ts` and displayed: *"checks whether today's metrics predict future messaging conversations."*

`laggedCorrelation.ts` is on CLAUDE.md's own cut-feature list, alongside `regression.ts`, `simulation.ts`, and `forecast.ts`. The other three were already gated with a `notFound()` stub — direct navigation 404s, the real view stays on disk. Correlation was the one that got missed when that convention was established. Same shape of problem as the forecast section, just older and on a route nobody was reviewing either.

**Fixed:** both `correlation/page.tsx` files now `notFound()`, matching the existing `regression`/`simulation` pattern exactly. `CorrelationView.tsx`, `laggedCorrelation.ts`, `CorrelationTable.tsx`, and `LaggedCorrelationPanel.tsx` are untouched on disk. Type-check clean.

**Everything else the grep found** is either already-correct disclaimer copy (the "not a forecast," "not a predictor," "retrospective comparison, not a simulation" lines that are supposed to be there) or inert Prisma-generated code (`SimulationResult` model/types — schema-level, never rendered).

## 3. Full route inventory

All 33 dashboard routes, plus the ones outside `/dashboard`. "Cut, gated" = `notFound()` stub, unreachable regardless of URL. "Live" = renders real content to an authenticated, correctly-scoped session.

| Route | Renders | Reachable by | Status |
|---|---|---|---|
| `/` | Landing/redirect | Anyone | Live |
| `/login` | Login form | Anyone | Live |
| `/ui` | shadcn component showcase (buttons, cards, tables, dialogs — no app data) | **Anyone, no auth check** | Live — see note below |
| `/dashboard/owner` | Executive Dashboard | Owner | Live |
| `/dashboard/owner/content` | Content Library | Owner | Live |
| `/dashboard/owner/categorize` | Categorization Review (view-only) | Owner | Live |
| `/dashboard/owner/analysis` | FR-19–22 Analysis | Owner | Live |
| `/dashboard/owner/method-evaluation` | FR-15 method evaluation | Owner | Live |
| `/dashboard/owner/budget-reallocation` | FR-25 budget reallocation | Owner | Live |
| `/dashboard/owner/ad-set-ranking` | FR-26 rankings (ad-set level) | Owner | Live |
| `/dashboard/owner/campaign-rankings` | FR-26 rankings ("Top Ads," individual-ad level) | Owner | Live |
| `/dashboard/owner/trend-analysis` | Trend analysis | Owner | Live |
| `/dashboard/owner/page-metrics` | FR-30 page growth + demographics | Owner | Live — forecast section just removed |
| `/dashboard/owner/category-performance` | Content category performance | Owner | Live |
| `/dashboard/owner/post-type-performance` | Post-type performance | Owner | Live |
| `/dashboard/owner/report` | Generate Report | Owner | Live |
| `/dashboard/owner/administration` | User Management | Owner | Live |
| `/dashboard/owner/audit-log` | Audit Log | Owner | Live |
| `/dashboard/owner/regression` | — | Owner | **Cut, gated** |
| `/dashboard/owner/simulation` | — | Owner | **Cut, gated** |
| `/dashboard/owner/correlation` | — | Owner | **Cut, gated** *(fixed today — was live)* |
| `/dashboard/marketing` | Marketing dashboard | Manager, Team | Live |
| `/dashboard/marketing/content` | Content Library | Manager, Team | Live |
| `/dashboard/marketing/categorize` | Categorization Review (full for Manager, propose-only for Team) | Manager, Team | Live |
| `/dashboard/marketing/keywords` | Manage Keywords (ALG-04) | Manager | Live |
| `/dashboard/marketing/upload` | Upload Data | Manager | Live |
| `/dashboard/marketing/analysis` | FR-19–22 Analysis | Manager, Team | Live |
| `/dashboard/marketing/method-evaluation` | FR-15 method evaluation | Manager | Live |
| `/dashboard/marketing/campaign-rankings` | FR-26 rankings ("Top Ads") | Manager | Live |
| `/dashboard/marketing/trend-analysis` | Trend analysis | Manager | Live |
| `/dashboard/marketing/page-metrics` | FR-30 page growth + demographics | Manager | Live — forecast section just removed |
| `/dashboard/marketing/post-type-performance` | Post-type performance | Manager, Team | Live |
| `/dashboard/marketing/report` | Generate Report | Manager, Team | Live |
| `/dashboard/marketing/audit-log` | Audit Log | Manager | Live |
| `/dashboard/marketing/regression` | — | Manager | **Cut, gated** |
| `/dashboard/marketing/simulation` | — | Manager | **Cut, gated** |
| `/dashboard/marketing/correlation` | — | Manager | **Cut, gated** *(fixed today — was live)* |
| `/print/owner/report` | Print-formatted report | Owner | Live |
| `/print/marketing/report` | Print-formatted report | Manager | Live |
| `/api/reports/[role]/csv` | CSV export | Role-matched session | Live |
| `/api/reports/[role]/pdf` | PDF export | Role-matched session | Live |
| `/api/auth/[...nextauth]` | NextAuth handler | — | Framework |

**One more thing worth your call, not fixed:** `/ui` has no `auth()` check at all — it's a raw shadcn kitchen-sink page (buttons, tables, dialogs, no app data), reachable by anyone with the URL, logged in or not. It doesn't leak any business data, but it's visibly a dev scaffolding page, not part of the product — if a panelist stumbled onto it during the demo it would look like an unfinished corner of the app. Low risk, but I didn't touch it since it's plausibly a deliberate dev-only page you rely on; let me know if you want it gated, deleted, or left alone.

Nothing else in the inventory renders cut-feature content or banned wording. Regression, Simulation, and now Correlation are consistently `notFound()`-gated across both role trees.

## 4. Not yet started

Upload Data build (§2 of your memo) and the four sidebar consolidations (§4) haven't been started — flagging so it's clear this document only covers priorities 1–2 from your list.
