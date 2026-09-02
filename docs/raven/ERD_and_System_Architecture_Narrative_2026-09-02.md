# ERD + System Architecture Narrative — para sa diagram

Para kay Raven. Dalawang bagay dito: (1) narrative ng ERD (entities, relationships,
cardinality) galing sa updated `docs/erd_schema.sql`, at (2) narrative ng system
architecture (layers, data flow) para magamit mo sa architecture diagram. Source of
truth: `prisma/schema.prisma` (live schema) at `CLAUDE.md` (architecture summary).

`docs/erd_schema.sql` sinync ko na — yung dati ay pang-old MVP pa (may `SALES_DIRECTOR`
role, wala pang FR-15/FR-24/FR-31 tables). Updated na ngayon, exact match sa
`prisma/schema.prisma` as of 2026-09-02.

---

## 1. System Architecture Narrative

### 1.1 Layer overview

Apat na layer, top to bottom:

1. **Browser (Client)** — role-based dashboard UI. Marketing Manager/Team share one
   route tree (`/dashboard/marketing`, access gated per-page not by role split);
   Business Owner has a separate tree (`/dashboard/owner`).
2. **Next.js App Router (server)** — Server Components fetch data directly at
   request time (walang separate REST layer); Client Components (`'use client'`)
   handle charts (Recharts) at interactive widgets (sliders, upload forms).
3. **Server Actions** (`actions/*.ts`) — lahat ng mutations (upload, categorize,
   simulate, generate suggestions, admin actions, keyword edits) dumadaan dito.
   Walang separate API routes para sa mutations — exception lang yung
   `/api/reports/[role]/{csv,pdf}` export endpoints.
4. **Data + external services:**
   - **Prisma ORM → PostgreSQL** (Neon sa prod, local Postgres sa dev) — single
     source of truth ng lahat ng data.
   - **Groq API** — tinatawag ng `actions/ai-insights.ts`, `actions/chat.ts`,
     `actions/classify-posts.ts`, `actions/generate-suggestions.ts` para sa
     LLM-based content categorisation (ALG-05) at AI-generated insights/suggestions.
     May model-resolver layer (`lib/groq-model.ts`) na nag-a-auto-detect ng
     deprecated models papuntang allowlisted replacement.

### 1.2 Request/response flow (typical read)

```
Browser (nag-navigate sa /dashboard/marketing/content)
  → middleware.ts checks JWT session (role) BEFORE render
  → Server Component (page.tsx) queries Prisma directly (walang fetch/API hop)
  → Server Component passes serialisable props pababa sa Client Components
      (charts, tables, interactive filters)
  → Browser renders; Client Components handle local interaction/state
```

### 1.3 Mutation flow (typical write — e.g. CSV upload)

```
Browser (UploadForm, Client Component)
  → Server Action (actions/upload.ts) — 'use server'
      1. auth() check (role gate)
      2. decode CSV buffer (encoding handling: UTF-8 BOM, UTF-16 LE per file type)
      3. detect upload type by header signature (lib/csv/detect.ts)
      4. per-row validation (lib/csv/validate-*.ts) — reject bad rows, don't abort whole file
      5. upsert into Prisma models (lib/db/*)
      6. write UploadLog row (always — success or fail)
  → revalidate / redirect
  → Browser re-renders from fresh Server Component fetch
```

### 1.4 AI-assisted flow (categorisation — ALG-04/ALG-05)

```
Browser (S4 Categorisation Review UI)
  → actions/classify-posts.ts
      - ALG-04: keyword-lexicon match (lib/categorize/, Category/Keyword tables)
      - ALG-05: Groq LLM classification call → LlmClassificationRun logged
  → both suggestions land on FacebookPost.category_keyword / category_llm
  → MARKETING_TEAM can propose (category_pending); MARKETING_MANAGER
    accepts/overrides → category_final (+ category_final_source, audit-logged
    to CategoryAuditLog)
```

### 1.5 Statistical/analytics pipeline (lib/stats/)

Pure functions, hiwalay sa UI — `lib/stats/*.ts`. Live modules (tingnan
`CLAUDE.md` para sa buong listahan): correlation method selection
(Shapiro-Wilk-driven Spearman/Pearson pick, logged to
`CorrelationAssumptionRun`), Cohen's kappa method-agreement evaluation,
budget-reallocation quartiles, ad-set/lifecycle diagnostics, post-type/
watch-through performance, at ang FR-31 explanatory regression (OLS core +
VIF/Breusch-Pagan/Jarque-Bera diagnostics + HC3 robust SEs + 10-fold CV,
logged to `RegressionRun`). May mga **cut-feature legacy modules**
(`regression.ts`, `forecast.ts`, `simulation.ts`, `laggedCorrelation.ts`) na
naka-disk pa rin pero hindi na wired sa kasalukuyang build — wag isama sa
diagram bilang live path, or kung isasama, markahan bilang "legacy/unused."

### 1.6 Stack summary (para sa labels sa diagram)

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- Prisma ORM → Neon PostgreSQL (prod) / PostgreSQL (dev)
- NextAuth.js v5 (JWT sessions, role claim) · `middleware.ts` route guard
- Recharts (client-side charts)
- Groq AI API (LLM categorisation + insights/chat/suggestions)

---

## 2. ERD Narrative

Base sa updated `docs/erd_schema.sql`. Grouped by purpose, hindi lang alphabetical,
para mas madali i-cluster sa diagram.

### 2.1 Core: identity, uploads, audit

- **User** (`id`, `email`, `role`, `is_active`) — root entity. `role` is one of
  `MARKETING_MANAGER` / `MARKETING_TEAM` / `BUSINESS_OWNER`. Soft-delete via
  `is_active` (hindi hard-delete — may RESTRICT FK sa UploadLog).
- **UploadLog** — 1 User → many UploadLog (`user_id` FK). Isang row per CSV
  upload attempt (success or fail), lahat ng 7 upload types (`ADS_CSV`,
  `POSTS_CSV`, `PAGE_METRIC_CSV`, `FOLLOWER_HISTORY_CSV`, `PAGE_VIEWERS_CSV`,
  `DEMOGRAPHICS_CSV`, `AUDIENCE_CSV`).
- **CategoryAuditLog** — 1 User → many CategoryAuditLog (`user_id` FK). Bawat
  human categorisation decision (`PROPOSE`/`ACCEPT`/`REJECT`/`OVERRIDE`/
  `BULK_ACCEPT`/`BATCH_CONFIRM`). `facebook_post_id` ay **hindi FK** — sadyang
  independent sa buhay ng FacebookPost row.
- **InterCoderReliability** — standalone, walang FK. Isang snapshot ng offline
  Cohen's kappa sa pagitan ng dalawang external ground-truth coders.

### 2.2 Content: organic posts + ads

- **FacebookPost** — pinaka-connected entity sa buong schema. Konektado sa
  User sa DALAWANG paraan:
  - `category_final_assigned_by_id` → User (sino ang huling nag-finalize)
  - `category_pending_by` → User (sino ang nag-propose, MARKETING_TEAM)
  Walang FK papuntang Category/Keyword — ang categorisation ay nasa 3
  enum columns (`category_keyword`, `category_llm`, `category_final`) hindi
  sa legacy lexicon tables.
- **Ad** — flat table, walang FK. Unique sa `(ad_id, reporting_starts)`.
  Walang category FK dahil categorisation ay para lang sa organic content,
  hindi sa paid ads.

### 2.3 ALG-04 keyword lexicon (legacy-adjacent, pero live)

- **Category** (1) → **Keyword** (many) via `category_id` FK. Simpleng
  lexicon lookup table na ginagamit ng ALG-04 keyword classifier lang —
  hiwalay sa `CategoryLabel` enum na siyang ginagamit ng FacebookPost.
- **LlmClassificationRun** — standalone, walang FK; `post_ids` ay isang
  integer array (batch reference, hindi relational).

### 2.4 Statistical audit trails

- **CorrelationAssumptionRun** — standalone, walang FK. Isang row per
  S7 Analysis page load.
- **RegressionRun** — standalone, walang FK. Isang row per FR-31
  specification (`PRIMARY`/`SECONDARY`) per page load. Pinaka-maraming
  columns sa buong schema (flat coefficient/diagnostic table).

### 2.5 Page-level daily metrics + demographic snapshots

Lahat ng ito ay independent, walang FK sa isa't isa — magkakahiwalay na CSV
source files na nagsu-share lang ng "daily snapshot" o "distribution
snapshot" shape:

- **PageMetricDaily** — 6 CSV files (Follows/Interactions/Link clicks/Views/
  Viewers/Visits) lahat nag-u-upsert dito by `date` (unique).
- **FollowerHistory** — daily follower count + delta, by `date` (unique).
- **PageViewers** — distinct source/values sa `PageMetricDaily.viewers`
  kahit magkatunog — huwag pagsamahin.
- **FollowerGender**, **FollowerTerritory** — distribution snapshots,
  unique by label (`gender`/`territory`).
- **FollowerAgeGender** — 6 fixed age brackets, unique by `age_bracket`.
- **FollowerAudienceRank** — top-10-of-many ranked snapshot (currently
  `category='city'` lang), unique by `(category, label)`, may pruning logic
  sa upsert (nawawala sa top 10 = tinatanggal).

### 2.6 Cut-feature legacy tables (isama pero markahan bilang legacy)

- **RegressionModel**, **SimulationResult** — dating predictive-model
  feature (messaging ~ reach + spend), hiwalay at HINDI dapat malito sa
  FR-31's `RegressionRun` (explanatory model). `SimulationResult.user_id`
  → User FK pa rin (live constraint), pero yung feature mismo ay naka-cut
  na sa current build. Kung isasama sa diagram, i-gray-out o markahan
  "legacy/unwired."

### 2.7 Cardinality cheat-sheet (para sa diagram arrows)

| From | To | Cardinality | FK column |
|---|---|---|---|
| User | UploadLog | 1 → many | `UploadLog.user_id` |
| User | CategoryAuditLog | 1 → many | `CategoryAuditLog.user_id` |
| User | FacebookPost (finalizer) | 1 → many | `FacebookPost.category_final_assigned_by_id` |
| User | FacebookPost (proposer) | 1 → many | `FacebookPost.category_pending_by` |
| User | SimulationResult | 1 → many | `SimulationResult.user_id` (legacy) |
| Category | Keyword | 1 → many | `Keyword.category_id` |

Lahat ng iba pang tables (Ad, LlmClassificationRun, CorrelationAssumptionRun,
RegressionRun, RegressionModel, InterCoderReliability, at lahat ng
page-metric/demographic snapshot tables) ay **standalone** — walang FK papasok
o palabas. Sa diagram, pwede silang i-cluster by purpose (hal. "daily metrics
cluster", "statistical audit cluster") kahit walang literal na relationship
line.

---

## 3. Suggested diagram split

Given kung gaano karaming tables (20) at kung gaano kaunti ang FK relationships
(6 lang), mas malinaw kung hihiwalayin mo:

1. **ERD proper** — ipakita lang yung 6 FK relationships sa itaas nang
   maliwanag, tapos i-group yung standalone tables into visual clusters
   (by purpose, gaya ng §2 headers dito) na walang connecting lines sa isa't
   isa, pero same color/region.
2. **System architecture diagram** — layered box diagram gamit §1.1-1.6:
   Browser → Middleware/App Router → Server Actions → (Prisma/Postgres +
   Groq API), na may 2-3 flow arrows na naka-label (read flow, upload/mutation
   flow, AI categorisation flow).
