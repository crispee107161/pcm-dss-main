# Tech Stack Migration Analysis
# PC Merchandise DSS → React / Next.js / TypeScript / Tailwind / Vercel Analytics

**Date:** 2026-04-08  
**Analyst:** Claude Code  
**Source documents:** `docs/mvp.md`, `docs/data_catalog.md`, `data/` (13 CSV files)

---

## Verdict

**Yes — migration is feasible.** The DSS is a relatively contained application: role-based auth, CSV upload/parse, a statistical pipeline (Spearman + SLR), and dashboard display. All of these have direct equivalents in the Next.js ecosystem. The main cost is rewriting the statistical computations from Python (scipy/pandas) into TypeScript-native libraries or a thin Python API sidecar.

---

## Current Stack (Inferred)

Based on `mvp.md` references to `models.py`, Django admin, `utils/forecasting.py`, and `data_processor.py`:

| Layer | Current |
|---|---|
| Language | Python |
| Framework | Django |
| Templates | Django HTML templates |
| ORM | Django ORM |
| Stats | scipy / pandas / numpy (implied) |
| Auth | Django sessions / Django auth |
| Deployment | Local / Cloudflare Tunnel (deferred) |
| Styling | Presumed Bootstrap or raw CSS |

---

## Target Stack

| Layer | Target |
|---|---|
| Language | TypeScript |
| Framework | Next.js (App Router) |
| UI rendering | React 19 + React Compiler |
| Styling | Tailwind CSS |
| ORM | Prisma |
| Auth | NextAuth.js v5 |
| Stats | `simple-statistics` + `regression` (JS libs) |
| CSV parsing | `papaparse` |
| Analytics | Vercel Analytics |
| Deployment | Vercel |

---

## Component-by-Component Feasibility

### 1. Authentication + Role Routing (FR-01, FR-02)

**Feasibility: Easy**

NextAuth.js v5 handles credential-based login natively. Role routing is done through Next.js Middleware (`middleware.ts`) — inspect the session token and redirect based on role. This is a first-class pattern in the Next.js ecosystem.

```
Marketing Manager   → /dashboard/marketing
Sales Director      → /dashboard/sales
Business Owner      → /dashboard/owner
```

Three seeded users in the database. No email/SMTP required for MVP (matches the spec).

**What to use:**
- `next-auth` v5 with Credentials provider
- `middleware.ts` for server-side role guards
- Prisma `users` table as the auth store

---

### 2. CSV Upload + Preprocessing (FR-03 to FR-08)

**Feasibility: Moderate — one encoding gotcha**

The upload pipeline becomes a Next.js API Route (or Server Action) that:
1. Receives the file via `multipart/form-data`
2. Detects file type by column headers
3. Parses with `papaparse`
4. Validates required fields
5. Computes `engagement_rate`
6. UPSERTs to the database via Prisma

**The encoding issue is the only non-trivial part:**

| File group | Encoding | Parser config |
|---|---|---|
| Ads CSVs | UTF-8 with BOM (`utf-8-sig`) | `papaparse` handles BOM natively — no extra work |
| Organic Posts CSV | UTF-8 with BOM | Same as above |
| Page-Level Metrics CSVs | UTF-16 LE | `papaparse` does **not** auto-detect UTF-16 LE — must read with `TextDecoder('utf-16le')` before passing to papaparse |

This is manageable: detect encoding by sniffing the first 2 bytes for the UTF-16 LE BOM (`0xFF 0xFE`), then branch to `TextDecoder`.

**UPSERT logic in Prisma:**
```ts
// Ads: unique on (ad_name, reporting_starts)
await prisma.ads.upsert({
  where: { ad_name_reporting_starts: { ad_name, reporting_starts } },
  update: { ...fields },
  create: { ...fields },
})

// Posts: unique on post_id
await prisma.facebook_posts.upsert({
  where: { post_id },
  update: { ...fields },
  create: { ...fields },
})
```

---

### 3. Analytics Pipeline — Spearman + SLR + What-If (FR-12)

**Feasibility: Moderate — Python libs must be replaced or sidecar'd**

This is the most technically sensitive component. Two options:

#### Option A: Pure TypeScript (Recommended for Vercel deployment)

| Computation | Python (current) | TypeScript replacement |
|---|---|---|
| Spearman rank correlation | `scipy.stats.spearmanr` | `simple-statistics` — has `sampleCorrelation`; Spearman = Pearson of ranks (implement rank transform manually, ~15 lines) |
| Simple Linear Regression | `scipy.stats.linregress` or `sklearn` | `regression` npm package (supports linear, R² included) or `simple-statistics.linearRegression` |
| Heatmap visualization | matplotlib / seaborn | Recharts or D3 — both are React-native |
| Residual plot | matplotlib | Recharts scatter chart |

The math here is not complex. Spearman on 230 records (42 with purchases) is a small computation. A clean TypeScript implementation is ~100 lines and entirely testable.

**Known regression parameters (from Chapter 3):**
```
Purchases = 1.8168 + 0.000705 × Amount Spent   (R² = 0.2658, n = 42)
```
These can be validated against the existing implementation immediately after porting.

#### Option B: Python Microservice Sidecar

Keep a minimal FastAPI service (`/api/stats`) that accepts JSON, runs scipy, and returns results. Next.js API routes proxy to it. This adds infrastructure complexity and complicates Vercel deployment (would need Railway or Render for the Python sidecar). **Not recommended for MVP.**

**Auto-retrain trigger:**
After each Ads CSV upload that adds records with non-null `purchases`, call the regression computation function and persist the new coefficients to `regression_model` (T7). This is a post-upload async job — trivially implemented as an awaited function in the Server Action.

---

### 4. Role-Appropriate Dashboards (FR-14)

**Feasibility: Easy**

Next.js App Router + Tailwind CSS makes role-specific dashboard layouts straightforward. Each role gets a route segment:

```
app/
  dashboard/
    marketing/   → Upload interface, upload history, analytics summary
    sales/       → Correlation table/heatmap, regression outputs, simulation
    owner/       → Regression equation, R² summary, simulation
```

Charts (correlation heatmap, regression line, residual plot) are handled by **Recharts** — the most common React charting library, works natively with Tailwind layouts.

---

### 5. KPI Display (FR-11)

**Feasibility: Easy**

Simple GROUP BY aggregations run as Prisma queries in Server Components. No client-side state required. Example:

```ts
// Monthly totals from ads table
const kpis = await prisma.ads.groupBy({
  by: ['reporting_starts'],
  _sum: { amount_spent: true, purchases: true, reach: true },
})
```

These feed directly into dashboard Server Components — no API round-trip, no useEffect.

---

### 6. Vercel Analytics

**Feasibility: Trivial**

One import in the root layout:

```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

Tracks page views, navigation events, and custom events automatically. Zero configuration for MVP.

---

### 7. React Compiler

**Feasibility: Easy (additive, not blocking)**

React Compiler (stable as of React 19) auto-memoizes components and hooks — it replaces manual `useMemo`/`useCallback` calls. For this DSS, most UI is server-rendered (Server Components), so the compiler's impact is primarily on:

- The What-If simulation slider/input (client component with reactive state)
- The correlation heatmap and chart rendering
- Any data tables with sort/filter state

Enable it in `next.config.ts`:
```ts
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
}
```

No code changes required — the compiler is opt-in per component if needed via `'use memo'` directive, but works automatically across the app.

---

## Database Migration: Django ORM → Prisma

The MVP schema from `mvp.md` maps cleanly to a Prisma schema:

| ERD Table | Django model | Prisma model | Notes |
|---|---|---|---|
| T1 `users` | `User` | `User` | Role field: `MARKETING_MANAGER \| SALES_DIRECTOR \| BUSINESS_OWNER` |
| T2 `upload_logs` | `UploadLog` | `UploadLog` | Log every attempt, success or fail |
| T3 `facebook_posts` | `Post` / similar | `FacebookPost` | `post_id` as unique key |
| T4 `ads` | `Campaign` + `Ad` + `PostCampaign` (WRONG per mvp.md) | `Ad` | Flat table; `(ad_name, reporting_starts)` composite unique |
| T7 `regression_model` | Unknown | `RegressionModel` | Stores `intercept`, `coefficient`, `r_squared`, `n`, `trained_at` |
| T8 `simulation_results` | Unknown | `SimulationResult` | Logs each What-If run |

Note: `mvp.md` already flags that the current Django schema diverges from the spec (Campaign + Ad split instead of flat Ads table). A migration to Next.js/Prisma is an opportunity to implement the correct schema from the start, skipping the Django schema debt entirely.

---

## Data Handling Matrix

| Data source | Encoding | Rows | MVP? | Parser notes |
|---|---|---|---|---|
| Ads CSVs (3 files) | UTF-8 BOM | 230 total | **Yes** | 33 columns; map 14 to DB; papaparse handles BOM |
| Organic Posts CSV | UTF-8 BOM | 81 posts | **Yes** | 35+ columns; map ~11 to DB; compute `engagement_rate` |
| FollowerGender.csv | Unknown | 3 rows | No (deferred) | Simple 2-col CSV |
| FollowerTopTerritories.csv | Unknown | ~12 rows | No (deferred) | Simple 2-col CSV |
| Page-Level Metrics (7 files) | UTF-16 LE | 28–61 rows each | No (deferred) | Requires `TextDecoder('utf-16le')` pre-processing |

For MVP, only Ads and Organic Posts CSVs need upload support. Demographics and Page Metrics are deferred.

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Spearman implementation diverges from scipy | Medium | Validate against known output: n=42 records must yield ~0.515 correlation between `amount_spent` and `purchases` (implied by R²=0.2658 in SLR) |
| UTF-16 LE parsing (Page Metrics) | Low for MVP | Deferred; only needed when T9 support is added post-MVP |
| Prisma transaction handling for UPSERT + upload log atomicity | Low | Wrap in `prisma.$transaction([...])` |
| Vercel serverless cold start for large CSV processing | Low | 230-row files are tiny; no streaming needed |
| React Compiler breaks a component | Very Low | Opt specific components out with `"use no memo"` directive |
| Next.js App Router learning curve if team is Django-only | Medium | The routing model is different but well-documented; plan for ~1 sprint of ramp-up |

---

## What This Migration Unlocks

| Capability | Django templates | Next.js + React |
|---|---|---|
| Real-time What-If simulation (reactive slider) | Full page reload or AJAX | Client component with instant reactivity |
| Vercel deployment | Manual / Cloudflare Tunnel | `git push` → deployed |
| Vercel Analytics | Not available | Native, one-line integration |
| Type safety across DB → API → UI | None (Python dict passing) | Prisma types flow end-to-end through TypeScript |
| React Compiler auto-optimization | N/A | Automatic memoization for chart/table components |
| Incremental static regeneration for dashboards | Not available | ISR via `revalidate` on Server Components |

---

## Migration Build Order (Next.js)

Matches the same dependency order as `mvp.md` but for the new stack:

1. **Schema** — Write `prisma/schema.prisma` with the correct 6-table MVP schema (T1, T2, T3, T4, T7, T8). Run `prisma migrate dev`. Seed 3 test users.
2. **Auth** — NextAuth.js Credentials provider + `middleware.ts` role guards. Confirm all 3 role dashboards are accessible and protected.
3. **CSV Upload API** — Server Action or API route: receive file → detect encoding → papaparse → validate → UPSERT via Prisma → log to `upload_logs`. Test with real CSV files.
4. **Analytics pipeline** — Implement `computeSpearman()`, `computeLinearRegression()`, and `runSimulation()` as TypeScript utility functions. Wire auto-retrain trigger into the upload Server Action.
5. **Dashboards** — Server Components for each role, pulling from Prisma. Add Recharts for heatmap, regression line, and residual plots.
6. **KPIs** — Add monthly summary aggregations to dashboards via Prisma `groupBy`.
7. **Vercel Analytics** — Add `<Analytics />` to root layout. Done.

---

## Summary

| Dimension | Assessment |
|---|---|
| Overall feasibility | **Yes — fully feasible** |
| Hardest component | Statistical pipeline (Spearman + SLR) — ~100 lines of TypeScript to replace scipy |
| Biggest risk | Team unfamiliarity with Next.js App Router (if coming from Django) |
| Biggest win | Correct flat schema from day one, eliminating the Campaign/Ad debt flagged in `mvp.md` |
| Vercel deployment readiness | High — the app has no long-running processes; all computations are request-scoped |
| Data compatibility | All 13 CSV files are compatible with papaparse; UTF-16 LE (Page Metrics) needs one extra decode step |
| Deferred features (post-MVP) | Trend charts, campaign rankings, report downloads — all straightforward in Next.js when needed |
