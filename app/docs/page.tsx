import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Documentation — PCM DSS',
  description:
    'Technical documentation for the PC Merchandise Decision Support System — architecture, server actions, database schema, and development guide.',
}

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'tech-stack', label: 'Tech Stack' },
  { id: 'user-roles', label: 'User Roles' },
  { id: 'features', label: 'Features' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'actions', label: 'Server Actions' },
  { id: 'database', label: 'Database Schema' },
  { id: 'env', label: 'Environment Variables' },
  { id: 'components', label: 'Components' },
  { id: 'dev', label: 'Dev Commands' },
]

export default function DocsPage() {
  return (
    <div className="bg-white text-neutral-900 min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/pcm-logo.png" alt="PCM" className="w-7 h-7 object-contain rounded-lg shrink-0" />
            <span className="font-bold text-sm tracking-tight text-neutral-900 truncate">PC Merchandise</span>
            <span className="hidden sm:block text-neutral-300 mx-1 shrink-0">·</span>
            <span className="hidden sm:block text-sm text-neutral-500 shrink-0">Docs</span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shrink-0"
          >
            Open App
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* Mobile section nav */}
        <div className="lg:hidden overflow-x-auto border-t border-neutral-100">
          <div className="flex gap-0.5 px-4 py-1.5 min-w-max">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-3 py-1 rounded-md text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors whitespace-nowrap"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12 flex gap-12">
        {/* Sidebar TOC */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">On this page</p>
            <nav className="flex flex-col gap-1">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-sm text-neutral-500 hover:text-red-600 py-1 transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 max-w-3xl">
          {/* Title */}
          <div className="mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              Technical Documentation
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4 leading-tight">
              PCM DSS — Developer Docs
            </h1>
            <p className="text-neutral-500 text-lg leading-relaxed">
              A role-based decision support system for PC Merchandise, a Filipino computer accessories
              business. Built with Next.js 15, Prisma, Neon PostgreSQL, Auth.js, and Groq AI.
            </p>
          </div>

          <Divider />

          {/* Overview */}
          <Section id="overview" title="Overview">
            <p className="text-neutral-600 leading-relaxed mb-4">
              PCM DSS (PC Merchandise Decision Support System) is an internal analytics platform
              that ingests Facebook Ads Manager and Organic Post CSV exports, runs statistical
              models (regression, correlation), and surfaces actionable insights — budget allocation
              recommendations, campaign health scoring, trend analysis, and purchase prediction — to
              three distinct user roles.
            </p>
            <p className="text-neutral-600 leading-relaxed mb-6">
              The system is built entirely on Next.js Server Actions with no separate API server.
              All data lives in a Neon PostgreSQL database managed through Prisma ORM.
            </p>
            <KVTable
              rows={[
                ['Product', 'PC Merchandise Decision Support System'],
                ['Business', 'Filipino computer accessories retailer'],
                ['Data source', 'Facebook Ads Manager + Organic Posts CSV'],
                ['Auth', 'Auth.js v5 (role-based, credential login)'],
                ['Deployment', 'Vercel + Neon PostgreSQL'],
              ]}
            />
          </Section>

          <Divider />

          {/* Tech Stack */}
          <Section id="tech-stack" title="Tech Stack">
            <Table
              headers={['Layer', 'Technology', 'Notes']}
              rows={[
                ['Framework', 'Next.js 15 (App Router)', 'Fullstack — no separate API server'],
                ['Language', 'TypeScript', 'Strict mode throughout'],
                ['Styling', 'Tailwind CSS v4', 'Custom CSS variables, oklch color space'],
                ['UI Components', 'shadcn/ui (Radix UI)', 'Button, Dialog, Select, Tabs, etc.'],
                ['ORM', 'Prisma', 'Schema-first, auto-generated client'],
                ['Database', 'PostgreSQL', 'Hosted on Neon (serverless)'],
                ['Auth', 'Auth.js v5 (NextAuth)', 'Credentials provider, role-based sessions'],
                ['AI — Keyword Suggestions', 'Groq API (Llama 3.1 8B Instant)', 'json_object response format'],
                ['AI — Chat / Insights', 'Groq API', 'Conversational analytics assistant'],
                ['Statistics', 'Custom JS (server-side)', 'Regression, correlation, Pearson r'],
                ['Charts', 'Recharts', 'Line, bar, scatter, radar charts'],
                ['Deployment', 'Vercel', 'Auto-deploy from main branch'],
                ['Fonts', 'Geist (Next.js default)', 'Variable, sans + mono'],
              ]}
            />
          </Section>

          <Divider />

          {/* User Roles */}
          <Section id="user-roles" title="User Roles">
            <p className="text-neutral-600 leading-relaxed mb-4">
              Every user is assigned exactly one role at account creation. Role is stored in the{' '}
              <Code>User</Code> table and enforced server-side on every Server Action and page.
              Unauthorized access redirects to <Code>/login</Code>.
            </p>
            <Table
              headers={['Role', 'Enum Value', 'Access']}
              rows={[
                ['Marketing Manager', 'MARKETING_MANAGER', 'Upload CSVs, categorize posts/ads, manage keywords, view marketing-specific analytics'],
                ['Sales Director', 'SALES_DIRECTOR', 'View sales KPIs, campaign health, run budget simulations, trend analysis'],
                ['Business Owner', 'BUSINESS_OWNER', 'Full read access across all dashboards, administration panel, category performance'],
              ]}
            />
            <p className="text-neutral-500 text-sm mt-4">
              Admin user management (create/delete accounts, change roles) is available to{' '}
              <Code>BUSINESS_OWNER</Code> only at <Code>/dashboard/owner/administration</Code>.
            </p>
          </Section>

          <Divider />

          {/* Features */}
          <Section id="features" title="Features">
            <ul className="space-y-3">
              {[
                ['CSV Upload & Parsing', 'Marketing Manager uploads Facebook Ads Manager and Organic Posts CSVs. Server-side parsing with upsert logic and per-upload audit logs.'],
                ['Content Categorization', 'Manually assign posts and ads to categories. Task-queue UX: defaults to uncategorized view, hides completed items, Show All toggle to review assigned content.'],
                ['Auto-Categorize', 'One-click keyword matching via detectCategoryFromText — scans uncategorized posts and ads against all saved keywords and applies the best match in bulk.'],
                ['AI Keyword Suggestions', 'Groq (Llama 3.1 8B Instant) analyzes up to 20 sample titles per category and suggests 5–8 new keywords, filtered against existing ones. Suggestions are dismissible chips with per-category and bulk-add actions.'],
                ['Keyword Management', 'Add, delete, and AI-suggest keywords per category. Keywords drive auto-categorize accuracy.'],
                ['Sales KPI Dashboard', 'Tabbed dashboard: Overview (KPI cards), Campaigns (health table + score), Analytics (trend lines), Simulator (purchase projection).'],
                ['Campaign Health Scoring', 'Composite score (A–F grade) from CTR, CPC, CPR, ROAS proxies. Expandable row shows per-metric breakdown and score bar.'],
                ['Regression Model', 'OLS regression trained on ad spend vs. purchases (with optional reach and messaging contacts). Stores intercept, coefficients, R², residual std error, best lag in DB.'],
                ['Budget Simulation', 'Input a budget (and optionally reach / messaging contacts) → get projected purchases with a 95% confidence interval. Results are saved per user.'],
                ['Correlation Analysis', 'Pearson r matrix across spend, reach, impressions, link clicks, purchases. Heatmap-style color-coded table.'],
                ['Trend Analysis', 'Time-series line charts for engagement rate, reach, and spend across configurable date ranges. Available per role.'],
                ['Category Performance', 'Business Owner view: revenue-equivalent and engagement metrics grouped by content category.'],
                ['Page Metrics', 'Daily follows, interactions, link clicks, views, and visits from Page Metric CSV uploads. Line charts per metric.'],
                ['Campaign Rankings', 'Sorted leaderboard of ads by ROAS, purchases, spend efficiency, and reach.'],
                ['AI Chat Assistant', 'Groq-powered conversational assistant with context awareness of uploaded data. Embedded in the analytics dashboard as a slide-up panel.'],
                ['AI Narrative Insights', 'Auto-generated plain-language summary of key metrics for each dashboard section.'],
                ['Exportable Reports', 'PDF/print export of analytics views per role.'],
                ['Role-Gated Navigation', 'Sidebar shows only routes relevant to the logged-in role. Active route highlighted in red.'],
                ['Collapsible Sidebar', 'Sidebar collapses to icon-only mode (64px) with smooth animation. State persisted in localStorage.'],
                ['Change Password', 'Animated expand panel in the sidebar footer. Old password verification enforced server-side.'],
                ['Upload Audit Log', 'Every CSV upload records filename, type, records inserted/updated, status, and timestamp.'],
              ].map(([feature, desc]) => (
                <li key={feature} className="flex gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-2" />
                  <span className="text-neutral-600 leading-relaxed">
                    <span className="font-semibold text-neutral-800">{feature}</span> — {desc}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Divider />

          {/* Architecture */}
          <Section id="architecture" title="Architecture">
            <p className="text-neutral-600 leading-relaxed mb-4">
              No separate Express or backend server. All server logic lives in Next.js Server Actions
              under <Code>actions/</Code> and server components under <Code>app/</Code>.
            </p>
            <CodeBlock>{`pcm-dss/
  app/
    login/page.tsx                  # Login page (split-panel, animated)
    dashboard/
      layout.tsx                    # Shared dashboard shell (sidebar + topbar)
      loading.tsx                   # Skeleton loader
      sales/
        layout.tsx                  # SALES_DIRECTOR guard
        page.tsx                    # Sales KPI dashboard
        campaign-rankings/page.tsx
        correlation/page.tsx
        regression/page.tsx
        simulation/page.tsx
        trend-analysis/page.tsx
        page-metrics/page.tsx
        report/page.tsx
      marketing/
        layout.tsx                  # MARKETING_MANAGER guard
        page.tsx                    # Marketing overview
        upload/page.tsx             # CSV upload
        categorize/page.tsx         # Content categorization
        keywords/page.tsx           # Keyword management
        campaign-rankings/page.tsx
        correlation/page.tsx
        regression/page.tsx
        simulation/page.tsx
        trend-analysis/page.tsx
        page-metrics/page.tsx
        report/page.tsx
      owner/
        layout.tsx                  # BUSINESS_OWNER guard
        page.tsx                    # Owner overview
        administration/page.tsx     # User management
        category-performance/page.tsx
        campaign-rankings/page.tsx
        correlation/page.tsx
        regression/page.tsx
        simulation/page.tsx
        trend-analysis/page.tsx
        page-metrics/page.tsx
        report/page.tsx
    docs/page.tsx                   # This page
  actions/
    auth.ts                         # loginAction, changePassword
    admin.ts                        # createUser, deleteUser, updateRole
    upload.ts                       # parseAndUpsertCSV, getUploadLogs
    categorize.ts                   # updatePostCategory, updateAdCategory, autoCategorizeAll
    keywords.ts                     # addKeyword, deleteKeyword, suggestKeywords, addKeywordsBulk
    simulate.ts                     # runSimulation, getSimulationHistory
    allocate.ts                     # getBudgetAllocation
    chat.ts                         # sendChatMessage
    ai-insights.ts                  # generateInsights
    profile.ts                      # updateProfile
  components/
    nav/
      Sidebar.tsx                   # Collapsible sidebar, nav items, change-pw panel
      TopBar.tsx                    # Breadcrumb bar, user avatar, notifications
      PageHeader.tsx                # Consistent page title + description
    analytics/
      SalesDashboardTabs.tsx        # 4-tab sales dashboard
      CampaignHealthTable.tsx       # Expandable health score table
      ChatBot.tsx                   # AI chat slide-up panel
    marketing/
      CategorizeClient.tsx          # Content categorization table (client)
      KeywordsClient.tsx            # AI keyword suggestions + management (client)
    kpi/
      MonthlyKpiCards.tsx           # KPI metric cards with trend indicators
    ui/                             # shadcn primitives
  lib/
    auth.ts                         # Auth.js config (credentials + session)
    prisma.ts                       # Prisma client singleton
    keywords/detect.ts              # detectCategoryFromText — keyword matching
  prisma/
    schema.prisma                   # Database schema`}</CodeBlock>

            <h3 className="text-base font-semibold text-neutral-800 mt-8 mb-3">Data flow</h3>
            <p className="text-neutral-600 leading-relaxed mb-4">
              CSV uploads → server action parses rows → Prisma upsert into <Code>Ad</Code> or{' '}
              <Code>FacebookPost</Code> tables → regression model re-trained on next analytics
              load → simulation uses stored model coefficients.
            </p>
            <p className="text-neutral-600 leading-relaxed">
              Categorization flows: manual select → <Code>updatePostCategoryForm</Code> →{' '}
              <Code>prisma.facebookPost.update</Code> → <Code>revalidatePath</Code>.
              Auto-categorize: <Code>autoCategorizeAll</Code> → fetch uncategorized + keywords →{' '}
              <Code>detectCategoryFromText</Code> → parallel Prisma updates.
            </p>
          </Section>

          <Divider />

          {/* Server Actions */}
          <Section id="actions" title="Server Actions">
            <p className="text-neutral-600 leading-relaxed mb-6">
              All mutations go through Next.js Server Actions in <Code>actions/</Code>. Every action
              calls <Code>auth()</Code> first and throws <Code>Unauthorized</Code> if the session is
              missing or the role doesn't match. Actions call <Code>revalidatePath</Code> to
              invalidate the Next.js cache after mutations.
            </p>

            <ActionBlock
              file="actions/auth.ts"
              actions={[
                ['loginAction(formData)', 'Validates email + bcrypt password, creates Auth.js session.'],
                ['changePassword(formData)', 'Verifies old password, hashes new one, updates User record.'],
              ]}
            />

            <ActionBlock
              file="actions/upload.ts"
              actions={[
                ['parseAndUpsertCSV(formData)', 'Parses uploaded CSV by type (ADS_CSV, POSTS_CSV, etc.), upserts rows into the correct table, writes an UploadLog record.'],
                ['getUploadLogs()', 'Returns the last 50 upload logs for the current user.'],
              ]}
            />

            <ActionBlock
              file="actions/categorize.ts"
              actions={[
                ['updatePostCategory(postId, categoryId)', 'Assigns a category to a FacebookPost.'],
                ['updateAdCategory(adId, categoryId)', 'Assigns a category to an Ad.'],
                ['autoCategorizeAll()', 'Fetches all uncategorized posts + ads and all keywords, runs detectCategoryFromText on each, bulk-updates matches. Returns { posts, ads } counts.'],
                ['updatePostCategoryForm(postId, formData)', 'FormData-compatible wrapper for updatePostCategory (used with form action + .bind()).'],
                ['updateAdCategoryForm(adId, formData)', 'FormData-compatible wrapper for updateAdCategory.'],
              ]}
            />

            <ActionBlock
              file="actions/keywords.ts"
              actions={[
                ['addKeyword(formData)', 'Creates a new Keyword record for a given category.'],
                ['deleteKeyword(formData)', 'Deletes a Keyword by ID.'],
                ['suggestKeywords()', 'Groups up to 20 categorized post/ad titles per category, sends them to Groq (Llama 3.1 8B), returns suggested keywords filtered against existing ones.'],
                ['addKeywordsBulk(items)', 'Bulk-inserts keywords via prisma.keyword.createMany with skipDuplicates.'],
              ]}
            />

            <ActionBlock
              file="actions/simulate.ts"
              actions={[
                ['runSimulation(input)', 'Loads the latest RegressionModel, applies coefficients to input values, computes projected purchases ± 95% CI, saves result to SimulationResult.'],
              ]}
            />

            <ActionBlock
              file="actions/allocate.ts"
              actions={[
                ['getBudgetAllocation(totalBudget)', 'Computes efficiency-weighted budget split across ad categories based on historical purchases-per-peso.'],
              ]}
            />

            <ActionBlock
              file="actions/admin.ts"
              actions={[
                ['createUser(formData)', 'Creates a new User (BUSINESS_OWNER only). Hashes password with bcrypt.'],
                ['deleteUser(userId)', 'Deletes a User by ID (cannot delete self).'],
                ['updateUserRole(userId, role)', 'Changes a user\'s role.'],
              ]}
            />
          </Section>

          <Divider />

          {/* Database */}
          <Section id="database" title="Database Schema">
            <p className="text-neutral-600 leading-relaxed mb-4">
              PostgreSQL managed via Prisma. The schema is defined in{' '}
              <Code>prisma/schema.prisma</Code>. Run <Code>npx prisma migrate dev</Code> to apply
              migrations or <Code>npx prisma db push</Code> for direct schema sync.
            </p>

            <h3 className="text-base font-semibold text-neutral-800 mt-6 mb-3">Enums</h3>
            <CodeBlock>{`enum Role          { MARKETING_MANAGER | SALES_DIRECTOR | BUSINESS_OWNER }
enum UploadType    { ADS_CSV | POSTS_CSV | PAGE_METRIC_CSV | FOLLOWER_HISTORY_CSV | PAGE_VIEWERS_CSV | DEMOGRAPHICS_CSV }
enum UploadStatus  { SUCCESS | FAILED }`}</CodeBlock>

            <h3 className="text-base font-semibold text-neutral-800 mt-6 mb-3">Models</h3>
            <CodeBlock>{`User
  id             Int      @id @default(autoincrement())
  email          String   @unique
  password_hash  String
  role           Role
  created_at     DateTime @default(now())
  upload_logs    UploadLog[]
  simulation_results SimulationResult[]

UploadLog
  id               Int          @id @default(autoincrement())
  user_id          Int          → User
  upload_type      UploadType
  filename         String
  status           UploadStatus
  records_inserted Int          @default(0)
  records_updated  Int          @default(0)
  error_message    String?
  uploaded_at      DateTime     @default(now())

FacebookPost
  id              Int       @id @default(autoincrement())
  post_id         String    @unique
  publish_time    DateTime
  post_type       String
  title           String?
  description     String?
  permalink       String
  reach           Int
  reactions       Int
  comments        Int
  shares          Int
  views           Int
  engagement_rate Float
  category_id     Int?      → Category
  created_at      DateTime  @default(now())

Ad
  id                       Int       @id @default(autoincrement())
  reporting_starts         DateTime
  reporting_ends           DateTime
  ad_name                  String
  ad_set_name              String
  attribution_setting      String
  reach                    Int?
  impressions              Int
  link_clicks              Int?
  amount_spent             Float
  total_messaging_contacts Int?
  results                  Int?
  cost_per_result          Float?
  purchases                Int?
  category_id              Int?      → Category
  created_at               DateTime  @default(now())
  @@unique([ad_name, reporting_starts])

Category
  id       Int     @id @default(autoincrement())
  name     String  @unique
  posts    FacebookPost[]
  ads      Ad[]
  keywords Keyword[]

Keyword
  id          Int      @id @default(autoincrement())
  word        String   @unique
  category_id Int      → Category

RegressionModel
  id                  Int      @id @default(autoincrement())
  intercept           Float
  coefficient         Float
  coef_reach          Float?
  coef_messaging      Float?
  coef_amount_spent   Float?
  residual_std_error  Float?
  best_lag            Int?
  r_squared           Float
  n                   Int
  trained_at          DateTime @default(now())

SimulationResult
  id                  Int      @id @default(autoincrement())
  user_id             Int      → User
  reach_input         Float?
  messaging_input     Float?
  amount_spent_input  Float
  projected_purchases Float
  interval_lower      Float?
  interval_upper      Float?
  model_id            Int
  simulated_at        DateTime @default(now())

PageMetricDaily
  id           Int      @id @default(autoincrement())
  date         DateTime @unique
  follows      Int?
  interactions Int?
  link_clicks  Int?
  views        Int?
  visits       Int?

FollowerHistory
  id           Int      @id @default(autoincrement())
  date         DateTime @unique
  followers    Int
  daily_change Int

PageViewers
  id                Int      @id @default(autoincrement())
  date              DateTime @unique
  total_viewers     Int?
  new_viewers       Int
  returning_viewers Int

FollowerGender
  id           Int    @id @default(autoincrement())
  gender       String @unique
  distribution Float

FollowerTerritory
  id           Int    @id @default(autoincrement())
  territory    String @unique
  distribution Float`}</CodeBlock>

            <h3 className="text-base font-semibold text-neutral-800 mt-8 mb-2">Key relationships</h3>
            <p className="text-neutral-600 leading-relaxed">
              <Code>FacebookPost</Code> and <Code>Ad</Code> both have a nullable <Code>category_id</Code>{' '}
              foreign key to <Code>Category</Code>. A <Code>Keyword</Code> belongs to exactly one{' '}
              <Code>Category</Code> and drives the keyword-matching auto-categorize logic. The{' '}
              <Code>word</Code> field on <Code>Keyword</Code> is globally unique — one keyword
              cannot span two categories.
            </p>
          </Section>

          <Divider />

          {/* Env vars */}
          <Section id="env" title="Environment Variables">
            <p className="text-neutral-600 leading-relaxed mb-4">
              Create a <Code>.env</Code> file in the project root with the following variables.
            </p>
            <Table
              headers={['Variable', 'Required', 'Description']}
              rows={[
                ['DATABASE_URL', 'Yes', 'PostgreSQL connection string (Neon pooled URL recommended)'],
                ['AUTH_SECRET', 'Yes', 'Random 32-byte base64 string — used to sign Auth.js sessions'],
                ['GROQ_API_KEY', 'Yes', 'Groq API key — used for AI keyword suggestions and chat assistant'],
              ]}
            />
            <p className="text-neutral-500 text-sm mt-4">
              Generate <Code>AUTH_SECRET</Code> with:{' '}
              <code className="bg-neutral-100 text-red-700 text-[0.8em] font-mono px-1.5 py-0.5 rounded">
                node -e &quot;require(&apos;crypto&apos;).randomBytes(32).toString(&apos;base64&apos;)&quot;
              </code>
            </p>
          </Section>

          <Divider />

          {/* Components */}
          <Section id="components" title="Components">
            <Table
              headers={['Component', 'Description']}
              rows={[
                ['Sidebar', 'Collapsible left nav (240px ↔ 64px). Role-filtered nav links, red active state, animated expand-grid change-password panel, localStorage collapse persistence.'],
                ['TopBar', 'Sticky topbar with breadcrumb path, user avatar, and role badge.'],
                ['PageHeader', 'Consistent section title + description used on all dashboard pages.'],
                ['SalesDashboardTabs', '4-tab tabbed layout: Overview (KPI cards + top campaigns), Campaigns (health table), Analytics (trend charts), Simulator (budget projection + history).'],
                ['CampaignHealthTable', 'Sortable ad table with composite A–F health grade. Expandable rows show per-metric score bars. Scroll-capped at 10 rows internally.'],
                ['ChatBot', 'Slide-up AI chat panel (FAB trigger). Groq-powered, context-aware of uploaded data. Suggestion chips on open.'],
                ['MonthlyKpiCards', 'KPI metric cards with period-over-period trend indicators, tabular numerals, and color-accented top gradient bars.'],
                ['CategorizeClient', 'Client component for content categorization. Tab-based (Posts / Ads), defaults to uncategorized-only view, Show All toggle, auto-categorize button with result pill.'],
                ['KeywordsClient', 'Client component for keyword management. AI Suggestions panel (Groq analyze → dismissible chips → bulk add), Keywords by Category section, manual Add Keyword form.'],
              ]}
            />
          </Section>

          <Divider />

          {/* Dev commands */}
          <Section id="dev" title="Dev Commands">
            <CodeBlock>{`# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Run production build locally
npm start

# Lint
npm run lint

# Prisma — sync schema to DB (dev)
npx prisma db push

# Prisma — create and apply a named migration
npx prisma migrate dev --name <migration-name>

# Prisma — open Prisma Studio (DB browser)
npx prisma studio

# Prisma — regenerate client after schema changes
npx prisma generate`}</CodeBlock>

            <h3 className="text-base font-semibold text-neutral-800 mt-8 mb-2">First-time setup</h3>
            <CodeBlock>{`# 1. Clone and install
git clone <repo-url>
cd pcm-dss
npm install

# 2. Set environment variables
cp .env.example .env
# Fill in DATABASE_URL, AUTH_SECRET, GROQ_API_KEY

# 3. Push schema to database
npx prisma db push

# 4. Seed an initial Business Owner account
# Run in prisma studio or via a seed script

# 5. Start dev server
npm run dev`}</CodeBlock>

            <h3 className="text-base font-semibold text-neutral-800 mt-8 mb-2">Deployment</h3>
            <p className="text-neutral-600 leading-relaxed">
              The app deploys to Vercel. Push to the <Code>main</Code> branch to trigger an
              automatic production build. Set <Code>DATABASE_URL</Code>, <Code>AUTH_SECRET</Code>,
              and <Code>GROQ_API_KEY</Code> in the Vercel project environment variables. The
              database is hosted on Neon — use the pooled connection URL for Vercel serverless
              functions.
            </p>
          </Section>

          <Divider />

          <div className="text-center py-8">
            <p className="text-sm text-neutral-400 mb-4">PC Merchandise · Confidential Internal Tool</p>
            <Link
              href="/login"
              className="text-sm text-red-600 hover:text-red-700 transition-colors"
            >
              ← Back to login
            </Link>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-neutral-900 border-t border-white/5 px-4 sm:px-6 py-10 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/pcm-logo.png" alt="PCM" className="w-7 h-7 object-contain rounded-md opacity-70" />
            <span className="text-sm font-semibold text-white/80">PC Merchandise DSS</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-white/40 hover:text-white/70 transition-colors">Dashboard</Link>
            <Link href="/docs" className="text-sm text-white/40 hover:text-white/70 transition-colors">Docs</Link>
          </div>
          <div className="w-full border-t border-white/10 my-2" />
          <p className="text-xs text-red-400/70">Developed by Jerome Policarpio</p>
          <p className="text-xs text-white/30 text-center">
            © {new Date().getFullYear()} PC Merchandise. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      <h2 className="text-xl font-bold text-neutral-900 mb-5">{title}</h2>
      {children}
    </section>
  )
}

function Divider() {
  return <hr className="border-neutral-100 my-10" />
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-neutral-100 text-red-700 text-[0.8em] font-mono px-1.5 py-0.5 rounded">
      {children}
    </code>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-neutral-950 text-neutral-200 text-sm font-mono rounded-xl p-5 overflow-x-auto leading-relaxed my-4 whitespace-pre">
      {children}
    </pre>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 my-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-neutral-700 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-neutral-600 align-top">
                  {j === 0 ? (
                    <code className="text-red-700 text-[0.85em] font-mono bg-red-50 px-1.5 py-0.5 rounded">
                      {cell}
                    </code>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function KVTable({ rows }: { rows: string[][] }) {
  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden my-4">
      {rows.map(([k, v], i) => (
        <div
          key={k}
          className={`flex gap-4 px-4 py-3 text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50/60'}`}
        >
          <span className="font-semibold text-neutral-700 w-24 sm:w-36 shrink-0">{k}</span>
          <span className="text-neutral-600">{v}</span>
        </div>
      ))}
    </div>
  )
}

function ActionBlock({ file, actions }: { file: string; actions: string[][] }) {
  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden mb-6">
      <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
        <code className="text-xs font-mono text-neutral-500">{file}</code>
      </div>
      <div className="divide-y divide-neutral-100">
        {actions.map(([sig, desc]) => (
          <div key={sig} className="px-4 py-3 flex flex-col sm:flex-row gap-1 sm:gap-4">
            <code className="text-red-700 text-xs font-mono shrink-0 sm:w-64">{sig}</code>
            <span className="text-sm text-neutral-600">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
