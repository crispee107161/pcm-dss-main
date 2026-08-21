# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server

# Build
npm run build        # Production build
npm run start        # Start production server

# Database
npx prisma generate          # Regenerate Prisma client (also runs on postinstall)
npx prisma migrate dev       # Apply migrations (dev)
npx prisma migrate deploy    # Apply migrations (prod)
npx prisma db seed           # Seed 3 users + initial data (requires SEED_*_PASSWORD env vars)
npx prisma studio            # Visual DB browser

# Tests
npm test                     # Run all tests (lib/db, lib/stats)
npm run test:watch           # Watch mode
```

## Architecture

**PC Merchandise Decision Support System** — a role-gated Next.js dashboard that analyzes Facebook ad and page performance data to support marketing decisions for a PC merchandise business.

### Stack
- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- Prisma ORM → Neon PostgreSQL (prod) / PostgreSQL (dev)
- NextAuth.js v5 (JWT sessions) · Recharts · Groq AI API

### Role System
Three fixed roles (`MARKETING_TEAM` was added, `SALES_DIRECTOR` was removed, in the MVP v2 rework — see `docs/PROGRESS.md` step 1). `MARKETING_MANAGER` and `MARKETING_TEAM` both land on `/dashboard/marketing` (no dedicated Team route tree — access within that tree is gated per-page, not by middleware); `BUSINESS_OWNER` gets `/dashboard/owner`. `middleware.ts` enforces the top-level route split from the JWT; per-page `auth()` checks enforce the finer Manager-vs-Team grants (see `mvp.md` §3's access matrix).

### Data Flow
1. **Upload** — CSV files (Ads, Posts, Page metrics, Followers, Demographics) are uploaded via `actions/upload.ts` Server Action, parsed with papaparse (`lib/csv/`), validated, and upserted into Prisma tables.
2. **Analysis** — Statistical computations run in `lib/stats/`, decoupled from UI. Live modules include Spearman/Pearson correlation with Shapiro-Wilk-driven method selection (`correlation-selection.ts`), Cohen's kappa method evaluation (`agreement.ts`), budget reallocation quartiles (`budget-reallocation.ts`), ad-set/lifecycle diagnostics (`ad-set-ranking.ts`, `ad-lifecycle.ts`), post-type/watch-through performance (`post-type-performance.ts`, `watch-through.ts`), and FR-31 explanatory regression (`fr31-regression.ts` + `ols-core.ts` + `seeded-random.ts` — ln(CPI) on four ratio predictors, VIF/Breusch-Pagan/Jarque-Bera diagnostics, HC3 robust SEs, 10-fold CV; see `docs/raven/FR31_Regression_Specification.md`). **`regression.ts`, `forecast.ts` (Holt-Winters), `simulation.ts`, and `laggedCorrelation.ts` are cut features** — a DIFFERENT, predictive model (messaging conversations ~ reach + spend) than FR-31's explanatory one; code is left on disk per `mvp.md` §5 but unwired from the current build; do not treat them as live, extend them, or confuse them with `fr31-regression.ts` without confirming scope first.
3. **Display** — Server Components fetch data at request time; Client Components (`'use client'`) handle charts (Recharts) and interactive views.
4. **AI features** — `actions/ai-insights.ts`, `actions/chat.ts`, and `actions/categorize.ts` (ALG-05 LLM categorisation) call the Groq API.

### Key Directories
- `app/dashboard/{marketing,owner}/` — Role dashboards. Live sub-routes include `upload/`, `content/`, `categorize/`, `keywords/`, `method-evaluation/`, `analysis/`, `post-type-performance/`, `budget-reallocation/` and `ad-set-ranking/` (owner-only), `campaign-rankings/`, `audit-log/`, `report/`. `correlation/`, `regression/`, `simulation/`, and `trend-analysis/` also exist on disk (cut-feature legacy, see above) — some are unlinked from the nav; check before assuming a route is reachable or current.
- `actions/` — All Server Actions (mutations). No separate API routes used for mutations (except `/api/reports/[role]/{csv,pdf}` exports).
- `lib/stats/` — Pure statistical logic decoupled from UI.
- `lib/csv/` — CSV parsing, column detection, and validation per file type.
- `components/` — Shared UI split by domain: `analytics/`, `charts/`, `kpi/`, `upload/`, `nav/`, `ui/`.
- `prisma/schema.prisma` — Source of truth for all models. Prisma client output is in `app/generated/prisma/`.
- `types/index.ts` — Shared TypeScript types and enums.
- `docs/PROGRESS.md` — Live build tracker against `mvp.md` §7; check here for current status before assuming a feature is unbuilt or unverified.

### mvp.md is the requirements source of truth
`mvp.md` and `data_catalog.md` were fully rewritten 2026-08-12 for the MVP v2 respec — always check them (and `docs/PROGRESS.md`) before assuming feature scope, rather than relying on older assumptions about the app.

### Environment Variables
See `.env.example`. Required: `DATABASE_URL`, `AUTH_SECRET`. Optional for AI features: `GROQ_API_KEY`.

## Frontend Rules

### Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Use the project's custom brand color system.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states.
- **Depth:** Surfaces have a layering system (base → elevated → floating).
- **Spacing:** Use intentional, consistent spacing tokens.

### Hard Rules
- Do not add sections, features, or content not in the reference design
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color
