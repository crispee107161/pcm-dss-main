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

# Synthetic data
python generate_synthetic_data.py   # Regenerate all synthetic CSV files in data/
```

## Architecture

**PC Merchandise Decision Support System** — a role-gated Next.js dashboard that analyzes Facebook ad and page performance data to support marketing decisions for a PC merchandise business.

### Stack
- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- Prisma ORM → Neon PostgreSQL (prod) / PostgreSQL (dev)
- NextAuth.js v5 (JWT sessions) · Recharts · Groq AI API

### Role System
Three fixed roles, each locked to their own dashboard route enforced by `middleware.ts`:
- `MARKETING_MANAGER` → `/dashboard/marketing`
- `SALES_DIRECTOR` → `/dashboard/sales`
- `BUSINESS_OWNER` → `/dashboard/owner`

The middleware reads the JWT, checks `role`, and redirects if the user tries to access another role's path.

### Data Flow
1. **Upload** — CSV files (Ads, Posts, Page metrics, Followers, Demographics) are uploaded via `actions/upload.ts` Server Action, parsed with papaparse (`lib/csv/`), validated, and upserted into Prisma tables.
2. **Analysis** — Statistical computations run in `lib/stats/`: Spearman rank correlation (`spearman.ts`), multi-variable linear regression (`regression.ts`), Holt-Winters forecasting (`forecast.ts`), and What-If simulation (`simulation.ts`).
3. **Display** — Server Components fetch data at request time; Client Components (`'use client'`) handle charts (Recharts) and interactive simulators.
4. **AI features** — `actions/ai-insights.ts` and `actions/chat.ts` call Groq API for natural language insights and a chat interface.

### Key Directories
- `app/dashboard/{marketing,sales,owner}/` — Role dashboards. Each has sub-routes: `upload/`, `correlation/`, `regression/`, `simulation/`, `trend-analysis/`, `page-metrics/`, `report/`, `campaign-rankings/`.
- `actions/` — All Server Actions (mutations). No separate API routes used for mutations.
- `lib/stats/` — Pure statistical logic decoupled from UI.
- `lib/csv/` — CSV parsing, column detection, and validation per file type.
- `components/` — Shared UI split by domain: `analytics/`, `charts/`, `kpi/`, `upload/`, `nav/`, `ui/`.
- `prisma/schema.prisma` — Source of truth for all models. Prisma client output is in `app/generated/prisma/`.
- `types/index.ts` — Shared TypeScript types and enums.

### Forecasting
Holt-Winters Triple Exponential Smoothing (α=0.3, β=0.1, γ=0.3, weekly period=7) is used for page metric forecasts. Falls back to Holt Linear when fewer than 14 data points exist. Implemented in `lib/stats/forecast.ts`.

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
