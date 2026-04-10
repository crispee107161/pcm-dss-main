# System Design — PC Merchandise DSS
# React / Next.js / TypeScript / Tailwind CSS / Vercel Analytics

**Date:** 2026-04-08  
**Stack:** Next.js 15 (App Router) · React 19 · React Compiler · TypeScript · Prisma · NextAuth.js v5 · Tailwind CSS v4 · Vercel Analytics  
**Scope:** Full MVP as defined in `docs/mvp.md`

---

## 1. Architecture Overview

```
Browser
  │
  ├─ Next.js App Router (Server Components default)
  │    ├─ /login                  → Auth page
  │    ├─ /dashboard/marketing    → Marketing Manager
  │    ├─ /dashboard/sales        → Sales Director
  │    └─ /dashboard/owner        → Business Owner
  │
  ├─ Server Actions (inline mutations — upload, simulate, retrain)
  │
  ├─ Prisma ORM  →  SQLite (dev) / PostgreSQL (prod on Vercel)
  │
  └─ Vercel Analytics (edge-injected, zero config)
```

**Rendering strategy:**
- All dashboard pages: **Server Components** (data fetched server-side, no loading spinners for static content)
- Upload form, What-If simulation slider, chart interactivity: **Client Components** (`'use client'`)
- Mutations: **Server Actions** (no separate API routes needed for MVP)
- Route protection: **Next.js Middleware** (`middleware.ts`) — checks session role before rendering any dashboard

---

## 2. Project Directory Structure

```
pc-merchandise-dss/
├── app/
│   ├── layout.tsx                    # Root layout — Vercel Analytics injected here
│   ├── page.tsx                      # Redirect → /login
│   ├── login/
│   │   └── page.tsx                  # Login form (Client Component)
│   ├── dashboard/
│   │   ├── layout.tsx                # Shared nav/header (Server Component)
│   │   ├── marketing/
│   │   │   └── page.tsx              # Marketing Manager dashboard
│   │   ├── sales/
│   │   │   └── page.tsx              # Sales Director dashboard
│   │   └── owner/
│   │       └── page.tsx              # Business Owner dashboard
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts          # NextAuth.js handler
│
├── actions/
│   ├── auth.ts                       # login / logout Server Actions
│   ├── upload.ts                     # CSV upload + parse + UPSERT Server Action
│   ├── analytics.ts                  # runSpearman, runRegression, runSimulation
│   └── simulate.ts                   # What-If simulation Server Action
│
├── lib/
│   ├── prisma.ts                     # Prisma client singleton
│   ├── auth.ts                       # NextAuth.js config (authOptions)
│   ├── csv/
│   │   ├── detect.ts                 # File type detector (by column headers)
│   │   ├── parse.ts                  # papaparse wrapper + encoding handler
│   │   ├── validate-ads.ts           # Ads CSV field validation
│   │   └── validate-posts.ts         # Posts CSV field validation
│   └── stats/
│       ├── spearman.ts               # Spearman rank correlation
│       ├── regression.ts             # Simple Linear Regression
│       └── simulation.ts             # What-If projection
│
├── components/
│   ├── ui/                           # Reusable primitives (button, input, card, badge)
│   ├── upload/
│   │   ├── UploadForm.tsx            # Client Component — file input + submit
│   │   └── UploadHistory.tsx         # Server Component — upload_logs table
│   ├── analytics/
│   │   ├── CorrelationTable.tsx      # Spearman coefficient table
│   │   ├── CorrelationHeatmap.tsx    # Recharts heatmap (Client Component)
│   │   ├── RegressionSummary.tsx     # Equation + R² display
│   │   ├── ResidualPlot.tsx          # Recharts scatter (Client Component)
│   │   └── WhatIfSimulator.tsx       # Client Component — input + result
│   ├── kpi/
│   │   └── MonthlyKpiCards.tsx       # Monthly totals per reporting period
│   └── charts/
│       └── SpendPurchaseLine.tsx     # Spend vs Purchases line chart (Client Component)
│
├── prisma/
│   ├── schema.prisma                 # Full schema (T1–T8, T5/T6 seeded, T9/T10 skipped)
│   ├── migrations/                   # Auto-generated
│   └── seed.ts                       # Seeds 3 users + T5/T6 initial data
│
├── types/
│   └── index.ts                      # All shared TypeScript types and enums
│
├── middleware.ts                     # Route protection by role
├── next.config.ts                    # React Compiler enabled
├── tailwind.config.ts
├── tsconfig.json
└── .env.local                        # Secrets (never committed)
```

---

## 3. Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"   // sqlite for local dev: change provider + url
  url      = env("DATABASE_URL")
}

enum Role {
  MARKETING_MANAGER
  SALES_DIRECTOR
  BUSINESS_OWNER
}

enum UploadType {
  ADS_CSV
  POSTS_CSV
}

enum UploadStatus {
  SUCCESS
  FAILED
}

// T1 — Users
model User {
  id               Int               @id @default(autoincrement())
  email            String            @unique
  password_hash    String
  role             Role
  created_at       DateTime          @default(now())
  upload_logs      UploadLog[]
  simulation_results SimulationResult[]
}

// T2 — Upload Logs
model UploadLog {
  id               Int          @id @default(autoincrement())
  user_id          Int
  user             User         @relation(fields: [user_id], references: [id])
  upload_type      UploadType
  filename         String
  status           UploadStatus
  records_inserted Int          @default(0)
  records_updated  Int          @default(0)
  error_message    String?
  uploaded_at      DateTime     @default(now())
}

// T3 — Facebook Posts (Organic)
model FacebookPost {
  id               Int       @id @default(autoincrement())
  post_id          String    @unique           // Facebook post ID
  publish_time     DateTime
  post_type        String                       // "Video", "Photo", "Reel"
  title            String?
  description      String?
  permalink        String
  reach            Int
  reactions        Int       @default(0)
  comments         Int       @default(0)
  shares           Int       @default(0)
  views            Int       @default(0)
  engagement_rate  Float                        // computed: (reactions+comments+shares)/reach*100
  category_id      Int?
  category         Category? @relation(fields: [category_id], references: [id])
  created_at       DateTime  @default(now())
}

// T4 — Ads (flat table — no Campaign model)
model Ad {
  id                          Int       @id @default(autoincrement())
  reporting_starts            DateTime
  reporting_ends              DateTime
  ad_name                     String
  ad_set_name                 String
  attribution_setting         String
  reach                       Int?                  // nullable — awareness-type ads in Jan CSV have no reach value
  impressions                 Int
  link_clicks                 Int?                  // 27% missing — nullable
  amount_spent                Float                 // PHP — primary regression predictor
  total_messaging_contacts    Int?                  // 43.5% missing — nullable; absent for awareness ads
  results                     Int?                  // 28.7% missing — nullable
  cost_per_result             Float?
  purchases                   Int?                  // 81.7% missing — nullable; regression outcome
  category_id                 Int?
  category                    Category? @relation(fields: [category_id], references: [id])
  created_at                  DateTime  @default(now())

  @@unique([ad_name, reporting_starts])             // UPSERT key
}

// T5 — Categories (seeded, no UI in MVP)
model Category {
  id          Int            @id @default(autoincrement())
  name        String         @unique
  posts       FacebookPost[]
  ads         Ad[]
  keywords    Keyword[]
}

// T6 — Keywords (seeded, no UI in MVP)
model Keyword {
  id          Int      @id @default(autoincrement())
  word        String   @unique
  category_id Int
  category    Category @relation(fields: [category_id], references: [id])
}

// T7 — Regression Model (SLR parameters)
model RegressionModel {
  id           Int      @id @default(autoincrement())
  intercept    Float                              // b0 — currently 1.8168
  coefficient  Float                              // b1 — currently 0.000705
  r_squared    Float                              // currently 0.2658
  n            Int                                // sample size — currently 42
  trained_at   DateTime @default(now())
  // Only one active model at a time — always query latest by trained_at desc
}

// T8 — Simulation Results
model SimulationResult {
  id                  Int      @id @default(autoincrement())
  user_id             Int
  user                User     @relation(fields: [user_id], references: [id])
  amount_spent_input  Float                       // hypothetical spend in PHP
  projected_purchases Float                       // regression output
  model_id            Int                         // which RegressionModel was used
  simulated_at        DateTime @default(now())
}
```

---

## 4. TypeScript Types

```typescript
// types/index.ts

export type Role = 'MARKETING_MANAGER' | 'SALES_DIRECTOR' | 'BUSINESS_OWNER'

export interface SessionUser {
  id: number
  email: string
  role: Role
}

// CSV parsing
export interface AdRecord {
  reporting_starts: string
  reporting_ends: string
  ad_name: string
  ad_set_name: string
  attribution_setting: string
  reach: number
  impressions: number
  link_clicks: number | null
  amount_spent: number
  total_messaging_contacts: number | null
  results: number | null
  cost_per_result: number | null
  purchases: number | null
}

export interface PostRecord {
  post_id: string
  publish_time: string
  post_type: string
  title: string | null
  description: string | null
  permalink: string
  reach: number
  reactions: number
  comments: number
  shares: number
  views: number
  engagement_rate: number  // computed
}

// Analytics
export interface SpearmanResult {
  variable: string
  correlation_with_purchases: number
  correlation_with_messaging: number
}

export interface RegressionResult {
  intercept: number
  coefficient: number
  r_squared: number
  n: number
  equation: string  // formatted: "Purchases = 1.8168 + 0.000705 × Amount Spent"
}

export interface SimulationOutput {
  amount_spent_input: number
  projected_purchases: number
  model: RegressionResult
}

// Upload
export type UploadType = 'ADS_CSV' | 'POSTS_CSV'
export type UploadStatus = 'SUCCESS' | 'FAILED'

export interface UploadResult {
  status: UploadStatus
  upload_type: UploadType
  records_inserted: number
  records_updated: number
  error_message?: string
  retrained: boolean  // true if regression was auto-retrained after this upload
}

// KPI
export interface MonthlyKpi {
  period: string       // "Sep 2025", "Dec 2025", "Jan 2026"
  total_spend: number
  total_purchases: number
  total_reach: number
  ad_count: number
}
```

---

## 5. Authentication Design

### NextAuth.js v5 Config (`lib/auth.ts`)

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async ({ email, password }) => {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null
        const valid = await bcrypt.compare(password, user.password_hash)
        if (!valid) return null
        return { id: String(user.id), email: user.email, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as any).role
      return token
    },
    session({ session, token }) {
      session.user.role = token.role as Role
      return session
    },
  },
  pages: { signIn: '/login' },
})
```

### Middleware (`middleware.ts`)

```typescript
import { auth } from './lib/auth'
import { NextResponse } from 'next/server'

const ROLE_ROUTES: Record<string, string> = {
  MARKETING_MANAGER: '/dashboard/marketing',
  SALES_DIRECTOR: '/dashboard/sales',
  BUSINESS_OWNER: '/dashboard/owner',
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Redirect unauthenticated users to login
  if (!session && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Prevent cross-role access
  if (session && pathname.startsWith('/dashboard')) {
    const allowed = ROLE_ROUTES[session.user.role]
    if (!pathname.startsWith(allowed)) {
      return NextResponse.redirect(new URL(allowed, req.url))
    }
  }

  // Redirect authenticated users away from login
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL(ROLE_ROUTES[session.user.role], req.url))
  }
})

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
```

---

## 6. CSV Upload Pipeline

### File Type Detection (`lib/csv/detect.ts`)

Auto-detect by column header presence:

```typescript
const ADS_REQUIRED_HEADERS = ['Ad name', 'Reporting starts', 'Amount spent (PHP)', 'Purchases']
const POSTS_REQUIRED_HEADERS = ['Post ID', 'Publish time', 'Post type', 'Reach']

export function detectUploadType(headers: string[]): UploadType {
  if (ADS_REQUIRED_HEADERS.every(h => headers.includes(h))) return 'ADS_CSV'
  if (POSTS_REQUIRED_HEADERS.every(h => headers.includes(h))) return 'POSTS_CSV'
  throw new Error('Unrecognized CSV format. Expected Facebook Ads Manager or Facebook Insights CSV.')
}
```

### Encoding Handler (`lib/csv/parse.ts`)

```typescript
import Papa from 'papaparse'

// Verified encodings from reading actual files:
// UTF-16 LE (0xFF 0xFE BOM):   Follows, Interactions, Link clicks, Views, Visits
//                               → these also have a "sep=," line + metric-name line before headers
// UTF-8 no BOM:                 Viewers.csv, FollowerHistory.csv, Demographics CSVs
// UTF-8 with BOM (0xEF BB BF):  Ads CSVs, Organic Posts CSV — papaparse strips automatically
//
// Special cases (deferred T9/T10 only — not needed for MVP):
// - Viewers.csv last row has "undefined" for Total Viewers → coerce to null on parse
// - FollowerHistory.csv dates are "August 18" not ISO → parse as new Date(`${val} 2025`)

export function decodeCSVBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  // UTF-16 LE BOM: 0xFF 0xFE
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buffer)
  }
  // UTF-8 BOM (0xEF 0xBB 0xBF) and plain UTF-8 — TextDecoder handles both
  return new TextDecoder('utf-8').decode(buffer)
}

export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
  }
}
```

### CSV Column → DB Field Mappings

#### Ads CSV (T4)

| CSV Column | DB Field | Transform |
|---|---|---|
| `Reporting starts` | `reporting_starts` | `new Date(value)` |
| `Reporting ends` | `reporting_ends` | `new Date(value)` |
| `Ad name` | `ad_name` | trim |
| `Ad set name` | `ad_set_name` | trim |
| `Attribution setting` | `attribution_setting` | trim |
| `Reach` | `reach` | `parseInt` or `null` if empty — awareness-type ads omit reach |
| `Impressions` | `impressions` | `parseInt` |
| `Link clicks` | `link_clicks` | `parseInt` or `null` if empty |
| `Amount spent (PHP)` | `amount_spent` | `parseFloat` |
| `Total messaging contacts` | `total_messaging_contacts` | `parseInt` or `null` — absent for awareness ads |
| `Results` | `results` | `parseInt` or `null` |
| `Cost per results` | `cost_per_result` | `parseFloat` or `null` |
| `Purchases` | `purchases` | `parseInt` or `null` |
| *(omit all others)* | — | — |

**UPSERT key:** `(ad_name, reporting_starts)`

**Two ad types observed in real data:**

| Ad set type | Example | `reach` | `total_messaging_contacts` | `Result indicator` |
|---|---|---|---|---|
| Conversion (reels/shop) | `"ALL REELS SHOP"`, `"ALL REELS PC SET"` | present | present | `actions:onsite_conversion.messaging_conversation_started_7d` |
| Awareness (video/vlog) | `"AWARENESS VIDEO - VLOG\|UPDATES\|COMSHOP"` | absent | absent | `reach` |

Both types are stored in the same `ads` table — nullable fields handle the difference. `amount_spent` is non-null for both, so regression and correlation are unaffected.

#### Posts CSV (T3)

| CSV Column | DB Field | Transform |
|---|---|---|
| `Post ID` | `post_id` | String |
| `Publish time` | `publish_time` | `new Date(value)` |
| `Post type` | `post_type` | trim |
| `Title` | `title` | trim or null |
| `Description` | `description` | trim or null |
| `Permalink` | `permalink` | trim |
| `Reach` | `reach` | `parseInt` |
| `Reactions` | `reactions` | `parseInt` |
| `Comments` | `comments` | `parseInt` |
| `Shares` | `shares` | `parseInt` |
| `Views` | `views` | `parseInt` |
| *(computed)* | `engagement_rate` | `(reactions + comments + shares) / reach * 100` |

**UPSERT key:** `post_id`

### Upload Server Action (`actions/upload.ts`)

```typescript
'use server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decodeCSVBuffer, parseCSV } from '@/lib/csv/parse'
import { detectUploadType } from '@/lib/csv/detect'
import { validateAdsRows } from '@/lib/csv/validate-ads'
import { validatePostsRows } from '@/lib/csv/validate-posts'
import { upsertAds } from '@/lib/db/upsert-ads'
import { upsertPosts } from '@/lib/db/upsert-posts'
import { maybeRetrainRegression } from '@/lib/stats/regression'

export async function uploadCSV(formData: FormData): Promise<UploadResult> {
  const session = await auth()
  if (!session || session.user.role !== 'MARKETING_MANAGER') {
    throw new Error('Unauthorized')
  }

  const file = formData.get('file') as File
  const buffer = await file.arrayBuffer()
  const text = decodeCSVBuffer(buffer)
  const { headers, rows } = parseCSV(text)

  let uploadType: UploadType
  let result: UploadResult

  try {
    uploadType = detectUploadType(headers)

    if (uploadType === 'ADS_CSV') {
      const validated = validateAdsRows(rows)            // throws on invalid
      const { inserted, updated } = await upsertAds(validated)
      const retrained = await maybeRetrainRegression()   // auto-retrain after upload
      result = { status: 'SUCCESS', upload_type: 'ADS_CSV', records_inserted: inserted, records_updated: updated, retrained }
    } else {
      const validated = validatePostsRows(rows)
      const { inserted, updated } = await upsertPosts(validated)
      result = { status: 'SUCCESS', upload_type: 'POSTS_CSV', records_inserted: inserted, records_updated: updated, retrained: false }
    }
  } catch (err: unknown) {
    result = {
      status: 'FAILED',
      upload_type: uploadType! ?? 'ADS_CSV',
      records_inserted: 0,
      records_updated: 0,
      error_message: err instanceof Error ? err.message : 'Unknown error',
      retrained: false,
    }
  }

  // Always log — success or fail
  await prisma.uploadLog.create({
    data: {
      user_id: Number(session.user.id),
      upload_type: result.upload_type,
      filename: file.name,
      status: result.status,
      records_inserted: result.records_inserted,
      records_updated: result.records_updated,
      error_message: result.error_message ?? null,
    },
  })

  return result
}
```

---

## 7. Analytics Pipeline

### Stage 1 — Spearman Rank Correlation (`lib/stats/spearman.ts`)

Spearman = Pearson correlation of the ranked values.

```typescript
function rankArray(arr: (number | null)[]): number[] {
  // Exclude nulls, rank non-null values, return rank array aligned to input
  // Ties: average rank
}

function pearsonOfRanks(rx: number[], ry: number[]): number {
  // Standard Pearson formula on paired (rx, ry) arrays after excluding pairs with nulls
}

export function spearmanCorrelation(x: (number | null)[], y: (number | null)[]): number {
  // Pair-wise drop nulls, rank both, compute Pearson
}

// Variables to correlate: reach, impressions, reactions, comments, shares,
// engagement_rate (posts), amount_spent, link_clicks (ads)
// Outcomes: purchases, total_messaging_contacts

export async function computeSpearmanMatrix(): Promise<SpearmanResult[]> {
  const ads = await prisma.ad.findMany()
  const posts = await prisma.facebookPost.findMany()
  // Build paired arrays from ads (all have amount_spent; purchases mostly null)
  // Return correlation of each predictor vs each outcome
}
```

**Validation target:** `amount_spent` vs `purchases` correlation should be consistent with the SLR R² = 0.2658 (Spearman ρ ≈ 0.52).

### Stage 2 — Simple Linear Regression (`lib/stats/regression.ts`)

```typescript
interface SLRInput { x: number; y: number }

export function fitLinearRegression(pairs: SLRInput[]): RegressionResult {
  const n = pairs.length
  const meanX = pairs.reduce((s, p) => s + p.x, 0) / n
  const meanY = pairs.reduce((s, p) => s + p.y, 0) / n

  let sxy = 0, sxx = 0, sst = 0
  for (const { x, y } of pairs) {
    sxy += (x - meanX) * (y - meanY)
    sxx += (x - meanX) ** 2
  }
  const coefficient = sxy / sxx                      // b1
  const intercept = meanY - coefficient * meanX      // b0

  for (const { y } of pairs) sst += (y - meanY) ** 2
  const sse = pairs.reduce((s, { x, y }) => {
    const yhat = intercept + coefficient * x
    return s + (y - yhat) ** 2
  }, 0)
  const r_squared = 1 - sse / sst

  return {
    intercept,
    coefficient,
    r_squared,
    n,
    equation: `Purchases = ${intercept.toFixed(4)} + ${coefficient.toFixed(6)} × Amount Spent`,
  }
}

export async function maybeRetrainRegression(): Promise<boolean> {
  // Pull all ads where purchases IS NOT NULL
  const pairs = await prisma.ad.findMany({
    where: { purchases: { not: null } },
    select: { amount_spent: true, purchases: true },
  })
  if (pairs.length < 10) return false  // minimum sample guard

  const result = fitLinearRegression(
    pairs.map(p => ({ x: p.amount_spent, y: p.purchases! }))
  )
  await prisma.regressionModel.create({ data: result })
  return true
}
```

**Validation target:** With all 3 CSV files loaded (n = 42 purchase records):
- Intercept ≈ 1.8168
- Coefficient ≈ 0.000705
- R² ≈ 0.2658

### Stage 3 — What-If Simulation (`lib/stats/simulation.ts`)

```typescript
export async function runSimulation(
  userId: number,
  amountSpent: number
): Promise<SimulationOutput> {
  const model = await prisma.regressionModel.findFirst({
    orderBy: { trained_at: 'desc' },
  })
  if (!model) throw new Error('No trained model available. Upload an Ads CSV first.')

  const projected = model.intercept + model.coefficient * amountSpent

  await prisma.simulationResult.create({
    data: {
      user_id: userId,
      amount_spent_input: amountSpent,
      projected_purchases: projected,
      model_id: model.id,
    },
  })

  return {
    amount_spent_input: amountSpent,
    projected_purchases: projected,
    model: {
      intercept: model.intercept,
      coefficient: model.coefficient,
      r_squared: model.r_squared,
      n: model.n,
      equation: `Purchases = ${model.intercept.toFixed(4)} + ${model.coefficient.toFixed(6)} × Amount Spent`,
    },
  }
}
```

---

## 8. Dashboard Designs

### Marketing Manager (`/dashboard/marketing`)

```
┌─────────────────────────────────────────────────────────┐
│  PC Merchandise DSS          [Marketing Manager] [Logout]│
├─────────────────────────────────────────────────────────┤
│  UPLOAD CSV                                              │
│  ┌───────────────────────────────────┐                  │
│  │  Drop file or click to upload     │  [Upload]        │
│  │  Accepts: Ads Manager / Insights  │                  │
│  └───────────────────────────────────┘                  │
│  ✓ 72 records inserted, 0 updated  [Retrained model]    │
├─────────────────────────────────────────────────────────┤
│  UPLOAD HISTORY                                          │
│  Date        File                  Type    Records  Status│
│  2026-01-28  John-Bernard-...-Jan  Ads     72 ins   ✓   │
│  2025-12-31  John-Bernard-...-Dec  Ads     93 ins   ✓   │
│  2025-09-30  Sep-01-...-posts.csv  Posts   81 ins   ✓   │
├─────────────────────────────────────────────────────────┤
│  ANALYTICS SUMMARY                                       │
│  Spearman: amount_spent ↔ purchases  ρ ≈ 0.52           │
│  Regression: n=42  R²=0.2658  [View full analytics →]  │
└─────────────────────────────────────────────────────────┘
```

**Data fetched server-side:**
- `prisma.uploadLog.findMany({ where: { user_id }, orderBy: { uploaded_at: 'desc' } })`
- Latest `RegressionModel` for summary

### Sales Director (`/dashboard/sales`)

```
┌─────────────────────────────────────────────────────────┐
│  PC Merchandise DSS           [Sales Director] [Logout] │
├─────────────────────────────────────────────────────────┤
│  MONTHLY KPI SUMMARY                                     │
│  ┌──────────┬──────────┬──────────┐                     │
│  │ Sep 2025 │ Dec 2025 │ Jan 2026 │                     │
│  │ ₱66,068  │ ₱77,679  │ ₱71,584  │  ← total spend     │
│  │ 40 purch │ 93 purch │ 47 purch │  ← total purchases │
│  └──────────┴──────────┴──────────┘                     │
├─────────────────────────────────────────────────────────┤
│  SPEARMAN CORRELATION                                    │
│  [Heatmap: 8 predictors × 2 outcomes]                   │
│  Variable                  vs Purchases  vs Messaging   │
│  amount_spent              0.52          0.68           │
│  reach                     0.41          0.59           │
│  impressions               0.38          0.56           │
│  ...                                                    │
├─────────────────────────────────────────────────────────┤
│  REGRESSION MODEL                                        │
│  Purchases = 1.8168 + 0.000705 × Amount Spent           │
│  R² = 0.2658   n = 42   Trained: 2026-01-28            │
│  [Regression line chart]  [Residual plot]               │
├─────────────────────────────────────────────────────────┤
│  WHAT-IF SIMULATION                                      │
│  If I spend: [₱ ___________]  [Simulate]               │
│  Projected purchases: 57                                 │
└─────────────────────────────────────────────────────────┘
```

**Data fetched server-side:**
- All ads → `computeSpearmanMatrix()` (or cached result from last computation)
- Latest `RegressionModel`
- Monthly KPI aggregation via `prisma.ad.groupBy`

### Business Owner (`/dashboard/owner`)

```
┌─────────────────────────────────────────────────────────┐
│  PC Merchandise DSS          [Business Owner] [Logout]  │
├─────────────────────────────────────────────────────────┤
│  AD SPEND OVERVIEW                                       │
│  Total spend across 3 months: ₱215,330.26               │
│  Total purchases recorded:    180                        │
│  Total ads tracked:           230                        │
├─────────────────────────────────────────────────────────┤
│  PREDICTIVE MODEL                                        │
│  Purchases = 1.8168 + 0.000705 × Amount Spent           │
│  Explained variance (R²): 26.58%                        │
│  Based on 42 purchase-bearing ad records                │
├─────────────────────────────────────────────────────────┤
│  WHAT-IF SIMULATION                                      │
│  If I spend: [₱ ___________]  [Simulate]               │
│  Projected purchases: —                                  │
│                                                          │
│  SIMULATION HISTORY                                      │
│  Date        Spend Input   Projected Purchases           │
│  2026-04-07  ₱80,000       58.3                         │
│  2026-04-06  ₱100,000      72.2                         │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Component Data Flow

```
Server Component (page.tsx)
  │
  ├─ Prisma query (direct DB call — no fetch, no API)
  │
  ├─ Passes serializable props to Server Components
  │   ├─ CorrelationTable (pure display — no interactivity)
  │   ├─ RegressionSummary (pure display)
  │   ├─ MonthlyKpiCards (pure display)
  │   └─ UploadHistory (pure display)
  │
  └─ Passes data to Client Components (must be serializable)
      ├─ CorrelationHeatmap   ← Recharts (needs browser)
      ├─ ResidualPlot         ← Recharts (needs browser)
      ├─ WhatIfSimulator      ← stateful input + Server Action call
      └─ UploadForm           ← File input + Server Action call
```

**Rule:** Client Components receive already-fetched data as props. No `useEffect` data fetching anywhere.

---

## 10. KPI Aggregation Query

```typescript
// Monthly totals — runs in Sales Director and Business Owner Server Components
async function getMonthlyKpis(): Promise<MonthlyKpi[]> {
  const ads = await prisma.ad.findMany({
    select: {
      reporting_starts: true,
      amount_spent: true,
      purchases: true,
      reach: true,
    },
  })

  const grouped = new Map<string, MonthlyKpi>()
  for (const ad of ads) {
    const period = ad.reporting_starts.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })
    const existing = grouped.get(period) ?? { period, total_spend: 0, total_purchases: 0, total_reach: 0, ad_count: 0 }
    grouped.set(period, {
      period,
      total_spend: existing.total_spend + ad.amount_spent,
      total_purchases: existing.total_purchases + (ad.purchases ?? 0),
      total_reach: existing.total_reach + ad.reach,
      ad_count: existing.ad_count + 1,
    })
  }
  return Array.from(grouped.values())
}
```

---

## 11. Seed Data (`prisma/seed.ts`)

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // T1 — Users (3 roles)
  await prisma.user.createMany({
    data: [
      { email: 'marketing@pcmerchandise.com', password_hash: await bcrypt.hash('password123', 10), role: 'MARKETING_MANAGER' },
      { email: 'sales@pcmerchandise.com',     password_hash: await bcrypt.hash('password123', 10), role: 'SALES_DIRECTOR' },
      { email: 'owner@pcmerchandise.com',     password_hash: await bcrypt.hash('password123', 10), role: 'BUSINESS_OWNER' },
    ],
    skipDuplicates: true,
  })

  // T5 — Categories (initial seed — no UI in MVP)
  const categoryNames = ['Computer Sets', 'CCTV Packages', 'Laptop Bundles', 'Computer Shop Packages', 'Uncategorized']
  await prisma.category.createMany({
    data: categoryNames.map(name => ({ name })),
    skipDuplicates: true,
  })

  // T6 — Keywords (initial seed)
  const kwMap: Record<string, string[]> = {
    'Computer Sets':            ['ryzen', 'pc set', '5600g', '5700g', '5700x', '4060', 'pink viral', 'gaming'],
    'CCTV Packages':            ['cctv', 'camera', 'surveillance'],
    'Laptop Bundles':           ['laptop'],
    'Computer Shop Packages':   ['comshop', 'computer shop'],
  }
  for (const [catName, words] of Object.entries(kwMap)) {
    const cat = await prisma.category.findUnique({ where: { name: catName } })
    if (!cat) continue
    await prisma.keyword.createMany({
      data: words.map(word => ({ word, category_id: cat.id })),
      skipDuplicates: true,
    })
  }
}

main().finally(() => prisma.$disconnect())
```

---

## 12. Vercel Analytics Integration

```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PC Merchandise DSS',
  description: 'Decision Support System — Facebook Ads Analytics',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

---

## 13. Next.js Config (React Compiler)

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
}

export default nextConfig
```

---

## 14. Environment Variables

```bash
# .env.local — never commit

# Database
DATABASE_URL="postgresql://user:pass@host:5432/pcmerchandise"
# For local dev with SQLite:
# DATABASE_URL="file:./dev.db"

# NextAuth.js
AUTH_SECRET="generate-with: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"
```

---

## 15. Tailwind Design Tokens

Consistent visual language across all three dashboards:

```typescript
// tailwind.config.ts
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          500: '#3b82f6',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
      },
    },
  },
}
```

**Component conventions:**
- Cards: `bg-white rounded-2xl shadow-sm border border-gray-100 p-6`
- Primary button: `bg-brand-700 text-white rounded-lg px-4 py-2 hover:bg-brand-900`
- Badge success: `bg-green-100 text-green-800 rounded-full px-2 py-0.5 text-xs`
- Badge error: `bg-red-100 text-red-800 rounded-full px-2 py-0.5 text-xs`
- Table: `w-full text-sm border-collapse` with `th: bg-gray-50 font-medium text-gray-600 px-4 py-2`

---

## 16. Package List

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next-auth": "^5.0.0",
    "@auth/prisma-adapter": "^2.0.0",
    "@prisma/client": "^6.0.0",
    "bcryptjs": "^2.4.3",
    "papaparse": "^5.4.1",
    "recharts": "^2.13.0",
    "@vercel/analytics": "^1.4.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0",
    "typescript": "^5.0.0",
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/papaparse": "^5.3.14",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0"
  }
}
```

---

## 17. Build Order (Development Sequence)

Execute strictly in order — each step depends on the previous being stable and tested with real CSV files.

| Step | What | Done when |
|---|---|---|
| 1 | `npx create-next-app@latest` with TS + Tailwind + App Router | App runs at localhost:3000 |
| 2 | Write `prisma/schema.prisma` → `prisma migrate dev` → `prisma db seed` | `prisma studio` shows 3 users, categories, keywords |
| 3 | NextAuth.js v5 setup → login page → middleware role guards | All 3 users can log in and are redirected correctly; cross-role access blocked |
| 4 | Upload Server Action → CSV parse → validate → UPSERT → upload log | Upload all 4 CSVs (3 Ads + 1 Posts); DB shows correct record counts |
| 5 | `computeSpearmanMatrix()` → validate output against known data | `amount_spent` vs `purchases` ρ consistent with R²=0.2658 |
| 6 | `fitLinearRegression()` + `maybeRetrainRegression()` + auto-retrain trigger | Intercept ≈ 1.8168, coefficient ≈ 0.000705, R² ≈ 0.2658 |
| 7 | `runSimulation()` + SimulationResult persistence | Simulation returns sensible values; logged to DB |
| 8 | Marketing Manager dashboard (upload form + history + summary) | Upload works end-to-end from UI |
| 9 | Sales Director dashboard (KPI cards + correlation table + heatmap + regression + simulation) | All analytics sections render with real data |
| 10 | Business Owner dashboard (overview + model summary + simulation + history) | Simulation works; history shows past runs |
| 11 | `<Analytics />` in root layout | Vercel dashboard shows page views after deploy |
| 12 | Deploy to Vercel + PostgreSQL | All three roles work in production |

---

## 18. Data File Reference (All 13 CSVs)

Verified by reading every file. Upload pipeline must handle exactly these files.

| File | Encoding | Rows | MVP? | Key parsing notes |
|---|---|---|---|---|
| `Ads/...-Sep-2025.csv` | UTF-8 BOM | 65 | **Yes** | Conversion-type ads only; `reach` present; `purchases` on 19/65 |
| `Ads/...-Dec-2025.csv` | UTF-8 BOM | 93 | **Yes** | Mostly conversion; some awareness ads appear; `purchases` on 14/93 |
| `Ads/...-Jan-2026.csv` | UTF-8 BOM | 72 | **Yes** | Mix of conversion + awareness; awareness ads have no `reach`; Unicode ad names (𝐑𝐘𝐙𝐄𝐍); `purchases` on 9/72 |
| `Organic Posts/Sep-2025.csv` | UTF-8 BOM | 81 | **Yes** | 35+ columns; keep 11; compute `engagement_rate`; 44.4% missing `description` |
| `Demographics/FollowerGender.csv` | UTF-8 | 3 | No | `Gender`, `Distribution` |
| `Demographics/FollowerTopTerritories.csv` | UTF-8 | 11 | No | `Top territories`, `Distribution` |
| `Page-Level Metrics/Follows.csv` | **UTF-16 LE** | 28 | No | Has `sep=,` + metric-name lines before headers; col: `Date`, `Primary` |
| `Page-Level Metrics/Interactions.csv` | **UTF-16 LE** | 28 | No | Same structure as Follows |
| `Page-Level Metrics/Link clicks.csv` | **UTF-16 LE** | 28 | No | Same structure |
| `Page-Level Metrics/Views.csv` | **UTF-16 LE** | 28 | No | Same structure |
| `Page-Level Metrics/Visits.csv` | **UTF-16 LE** | 28 | No | Same structure |
| `Page-Level Metrics/Viewers.csv` | **UTF-8** | 61 | No | 4 cols: `Date`, `Total Viewers`, `New Viewers`, `Returning Viewers`; last row = `"undefined"` → null; Aug 19–Oct 17 |
| `Page-Level Metrics/FollowerHistory.csv` | **UTF-8** | 60 | No | 3 cols: `Date`, `Followers`, `Difference in followers from previous day`; date format = `"August 18"` not ISO |

**MVP upload target:** 4 files — 3 Ads CSVs + 1 Organic Posts CSV = 302 total records to ingest.

---

## 20. Definition of Done (MVP)

Mirrors `docs/mvp.md` exactly — system is complete when:

- [ ] Marketing Manager can log in, upload a Facebook Insights CSV and an Ads Manager CSV, and see records stored
- [ ] Spearman correlation runs and shows a coefficient table with heatmap
- [ ] Regression trains on records with non-null purchases and shows the equation + R²
- [ ] Regression auto-retrains after a new upload adds purchase records
- [ ] Any user can run a What-If simulation and get a projected purchase estimate
- [ ] All three role dashboards load with relevant outputs
- [ ] Every upload is logged to `upload_logs` regardless of success or failure
- [ ] Invalid or malformed CSV files show specific error messages, not crashes
- [ ] Cross-role URL access is blocked by middleware
- [ ] Vercel Analytics is recording page views in production
