# PCM-DSS UI/UX Static Code Review — 2026-08-16

Scope: full static, read-only code review of the Next.js App Router dashboard (owner + marketing role pairs, login, print/report routes, component gallery, and the shared design system). No files were edited, no dev server or browser automation was run. Findings are cited by `file:line` against the tree at `D:\My Projects\pcm-dss-main\pcm-dss-main-main`.

## 1. Executive summary

**Findings by severity: 0 CRITICAL, 7 HIGH, 10 MEDIUM, 6 LOW — 23 total.**

The design system's foundations are solid: the primary/destructive ("Fill-vs-Read Rule") color split is deliberate and documented, `DeltaBadge`/`KpiCard` accessibility is exemplary, `UploadForm.tsx` has textbook loading/success/error state coverage, and the shared `Table`/`ReportView` components already solve horizontal-overflow and print-vs-screen branching once, centrally. The problems are concentrated in two places: (1) owner/marketing page pairs that were hand-duplicated instead of extracted into one shared component, which has let several of them drift apart in ways that look like unintentional gaps rather than deliberate role scoping (`campaign-rankings`, `page-metrics`); and (2) a handful of files that reach for raw Tailwind palette classes (`red-400`, `violet-500`, `-950` shades) instead of the project's own themed tokens, which both violates the project's stated anti-generic-color rule and risks failing contrast in ways the token system was built to prevent. A secondary, lower-urgency issue is that four routes for a formally out-of-scope feature set (regression/simulation) are still fully built and reachable by direct URL with no deprecation signal. No CRITICAL-severity issues were found — nothing here blocks basic usability or exposes security-relevant gaps.

## 2. Findings

### HIGH

1. **`components/nav/TopBar.tsx:240,243`** — Password-change validation banners use `dark:bg-red-950` / `dark:bg-green-950` / `dark:border-red-900`. The project's `@theme` in `app/globals.css` only defines themed steps up to `-900` (see lines 80, 106), so the `-950` classes silently fall through to Tailwind's *stock* red/green swatches instead of the project's tuned palette — exactly the "never use default Tailwind palette" violation the project's own color system exists to prevent. **Fix:** change `-950` to the already-themed `-900` step, or add a themed `-950` token if the darker shade is genuinely needed.

2. **`components/marketing/ContentLibraryClient.tsx:39-58`** — `TypeBadge`/`CategoryBadge` hardcode 7 raw Tailwind colors (`violet-500`, `blue-500`, `red-500`, `yellow-500`, `green-500`, `orange-500`, `purple-500`) instead of the project's semantic/brand tokens. These won't move if the palette or dark-mode tuning changes later, unlike every other status color in the app. **Fix:** map each category/type to the existing `--status-*`/`--primary` tokens, or add dedicated category tokens to `globals.css` and reference those instead of literal Tailwind swatches.

3. **`app/dashboard/marketing/page-metrics/page.tsx:196`** — Empty-data state renders a literal emoji as the functional icon: `<div className="text-4xl mb-4">📊</div>`. Emoji render inconsistently across OS/browser and aren't handled by screen readers the way an `aria-hidden` SVG is — every other icon in the app (login, TopBar, upload) uses inline SVG or Lucide. **Fix:** replace with the app's existing SVG icon system, `aria-hidden="true"`.

4. **`app/ui/page.tsx:99-116`** — The "Icon Buttons" section of the component gallery — the canonical reference other developers copy from — has zero `aria-label` occurrences file-wide (grep-confirmed). Because this page is the copy-paste source of truth, the omission propagates the accessibility gap into new code. WCAG 2.2 SC 4.1.2. **Fix:** add `aria-label` to each demo `Button`, following the correct pattern already used in `components/upload/UploadForm.tsx:176,187,193`.

5. **`app/ui/page.tsx:27-39`** — The gallery demos only 11 of the 31 primitives in `components/ui/*.tsx`. Missing from the gallery but actually used in production: `Tabs` (used at `app/dashboard/owner/ad-set-ranking/page.tsx:8,41-64`), `DateRangeFilter`, `Attachment`, `Spinner`, plus `Tooltip`, `Checkbox`, `Switch`, `Progress`, `Avatar`, `Textarea`, `Collapsible`, `ScrollArea`, `Sonner`, `Chart`, `Slider`, `StatStrip`, and `Field` are never demoed anywhere. The gallery is stale relative to the real component inventory. **Fix:** add the missing primitives, especially `Tabs`/`DateRangeFilter`/`StatStrip` which already have real production usage to model the demo on.

6. **`app/dashboard/marketing/campaign-rankings/page.tsx` vs `app/dashboard/owner/campaign-rankings/page.tsx`** — Two real divergences, not cosmetic: (a) marketing computes date-range filters with raw `new Date(from/to)` (lines 93-99) instead of the shared `manilaDayRange()` helper the owner version uses (owner line 93) — same `DateRangeFilter` control, silently different filtering semantics depending on role, a correctness risk rather than a purely visual one; (b) marketing has no "By Efficiency" section at all — owner shows CTR/CPC/Cost-per-Conversation rankings (owner lines 239-311) with nothing equivalent in marketing. **Fix:** unify the date-range computation immediately (this is a data-correctness bug, not a style choice); get a product decision on whether the efficiency section is intentionally owner-only or a gap, and document it either way.

7. **`components/admin/UserManagement.tsx:47`** and **`components/upload/UploadForm.tsx:255,259`** — Status banners use `text-red-400`/`text-green-400` on `bg-*-500/10` in the light-theme default, estimated ~3:1 contrast — below WCAG AA's 4.5:1 body-text minimum. The app already has `status-positive`/`status-negative` tokens tuned for this exact use, applied correctly elsewhere (`app/dashboard/owner/campaign-rankings/page.tsx:175,203,222`). **Fix:** swap these two files to the existing status tokens.

### MEDIUM

8. **`components/nav/TopBar.tsx`** (e.g. lines 126, 135, 144, 154, 162, 177, 197, 213, 221) — Uses raw `text-gray-400`/`hover:text-gray-700`/`bg-gray-100` instead of the semantic tokens (`text-muted-foreground`, `text-foreground`, `bg-muted`) the rest of the shell (KpiCard, StatStrip, PageHeader) uses. Functionally safe since `gray-*` is theme-indirected, but it's a second, parallel naming convention for the same concept. **Fix:** normalize to the semantic token classes for consistency.

9. **`components/ui/chart.tsx`** — The shared `ChartContainer`/`ChartTooltipContent` wrapper provides no built-in empty/loading/error state, no `role="img"`/text-alternative for chart content, and leaves colorblind-safe palette selection entirely to each page's `ChartConfig` (the `--chart-1..10` tokens in `globals.css:301-306` were never contrast/CVD-validated per the file's own comment). Since every chart-heavy page composes this one wrapper, fixing state-handling and accessible-alternative text here would resolve the recurring per-page "missing state" bug class system-wide instead of piecemeal. **Fix:** add an empty/loading/error slot API and an optional SR-only data-summary prop to the shared wrapper.

10. **`components/ui/table.tsx:73,86`** — `TableHead`/`TableCell` hardcode `whitespace-nowrap` unconditionally, paired with the `.table-scroll` horizontal-scroll pattern (`app/globals.css:624-636`). This is a reasonable deliberate choice, but any cell with long free-text (post captions, category labels) cannot wrap — worth confirming per-page that such content is truncated rather than overflowing badly.

11. **`app/dashboard/owner/page-metrics/page.tsx:45-51`** vs **`app/dashboard/marketing/page-metrics/page.tsx:46-55,194-223`** — Marketing's empty state has an "Upload data →" CTA and a full onboarding banner; owner's is plain text only. Owner genuinely can't upload (role-gated), but is left with no explanation of *why* the page is empty or *who* to ask — reads as an unfinished screen rather than deliberate role design. **Fix:** give owner's empty state role-appropriate copy, e.g. "No data yet — ask your Marketing Manager to upload."

12. **`app/login/page.tsx:15,43`** — Login manages its own local dark/light toggle defaulting to `darkMode = true`, independent of the app-wide `next-themes` toggle which defaults to light per prior work. A user who set the app to light will still land on a dark login screen every time. Not documented anywhere as an intentional product decision. **Fix:** either explicitly confirm and document this as intentional, or default the login toggle to match `next-themes`'s resolved preference.

13. **`app/dashboard/{owner,marketing}/regression/page.tsx`, `.../simulation/page.tsx`** (4 files) — Fully built, styled routes with real charts for a feature set the project's own MVP v2 respec documents as cut/out-of-scope, and confirmed unlinked from `components/nav`. Reachable by direct URL with no deprecation banner — a capstone evaluator or new teammate navigating directly hits fully-styled "features" that aren't actually in scope. **Fix:** gate with `notFound()`/redirect now that they're out of scope, or add a visible "deprecated / out of scope" banner.

14. **`app/dashboard/marketing/campaign-rankings/page.tsx:184,197,209`** — Emoji used as functional icons (💸💬📡) where the owner version of the same page uses proper SVG icons at the equivalent spots (owner lines 186-187, 203-204, 222-223). Direct rule violation plus another unexplained owner/marketing divergence on an otherwise-mirrored page.

15. **`app/dashboard/{owner,marketing}/campaign-rankings/page.tsx` (both, ~line 171/193)** — Owner's version includes a per-panel `MethodologyNote` explaining how each ranking is computed (lines 193-199, 210-218, 229-235); marketing's version has none. Same underlying data, unequal transparency between roles with no stated rationale.

16. **`app/dashboard/owner/administration/page.tsx` + `components/admin/UserManagement.tsx`** — Heavy use of raw `text-gray-*`/`bg-gray-50` instead of the `foreground`/`muted-foreground`/`card` tokens that the Audit Log page uses correctly (`app/dashboard/owner/audit-log/page.tsx:24-30`) for the same kind of table-heavy admin UI. Means Administration won't track future theme remapping the way Audit Log does.

17. **`app/dashboard/owner/page-metrics/page.tsx`** vs **marketing pair, `page.tsx:327`** — The Holt-Winters explainer copy differs subtly between the mirrored pages (owner omits the `α=0.3, β=0.1, γ=0.3` parameter detail marketing includes). Minor content drift, but symptomatic of the pair being hand-maintained rather than sharing one parameterized component (as `TrendAnalysisView`/`CorrelationView`/`AnalysisView` already correctly do).

### LOW

18. **`components/nav/Sidebar.tsx:203`** — Logo uses a plain `<img>` tag rather than `next/image`; low-impact for a small static asset, but inconsistent with Next.js conventions used elsewhere.

19. **`components/kpi/KpiCard.tsx:81`** — `Sparkline` SVG is correctly `aria-hidden`, but there is no textual trend summary for screen-reader users; low priority since `DeltaBadge` already carries the numeric delta via `sr-only` text.

20. **`app/login/page.tsx:82`** — "Contact your administrator" in the error state is styled with an underline (looks clickable) but has no `href`/`mailto`. Per project memory this is an already-known, deliberately deferred gap — noted here for completeness, not new.

21. **`app/dashboard/{owner,marketing}/campaign-rankings/page.tsx` (RankBadge, ~line 26-31)** — Medal colors are hardcoded rather than tokenized. Low priority since numeral text is always shown as a fallback, so it isn't a colorblind-access issue, just a token-discipline one.

22. **`RankBadge`/`RankingTable`** — Defined twice, nearly identically, once in each role's `campaign-rankings/page.tsx` instead of shared. This duplication is the root cause of findings #6, #14, and #15 (date-filter drift, emoji drift, methodology-note drift) — extracting one shared component would prevent this entire class of future drift.

23. **`components/nav/TopBar.tsx:126,135`** — Icon-only buttons rely on `hover:text-gray-700 hover:bg-gray-100` without an explicit `dark:` override; looks at first glance like a light-mode-only hardcode but is a non-issue since `gray-*` is already theme-indirected via `--g-*` tokens. Documented here only so it isn't re-flagged in a future pass.

## 3. Systemic patterns

- **Raw Tailwind palette classes bypassing the token system (6 files).** `components/nav/TopBar.tsx` (`-950` fallback), `components/marketing/ContentLibraryClient.tsx` (badge colors), `components/admin/UserManagement.tsx` + `components/upload/UploadForm.tsx` (status contrast), `app/dashboard/{owner,marketing}/campaign-rankings/page.tsx` (ad-spend color, `RankBadge` medals), `app/dashboard/owner/administration/page.tsx` (gray-scale). This is the single biggest recurring issue — the project has a well-designed token system (`app/globals.css`) that these files simply don't use.
- **Hand-duplicated owner/marketing page pairs drifting apart (3+ files).** `campaign-rankings` (date-filter logic, efficiency section, methodology notes, emoji vs SVG), `page-metrics` (empty-state UX, copy), and `RankBadge`/`RankingTable` themselves being redefined per role. Contrast with `TrendAnalysisView`/`CorrelationView`/`AnalysisView`/`MethodEvaluationView`, which correctly share one component parameterized by role and show no drift — that's the pattern to replicate.
- **Emoji-as-functional-icon (2 files).** `app/dashboard/marketing/page-metrics/page.tsx:196` and `app/dashboard/marketing/campaign-rankings/page.tsx:184,197,209`. Small in count but notable because the rest of the codebase (`components/nav/icons.tsx`, login, TopBar) consistently uses SVG/Lucide — these look like copy-paste from a different source rather than the established pattern.
- **Stale/out-of-scope surfaces left fully reachable (4 route files + 1 gallery page).** The regression/simulation routes and the under-populated `app/ui/page.tsx` gallery share the same root problem: nothing marks them as not-current, so they read as live functionality/reference to anyone who lands on them directly.

## 4. What's already good (do not regress)

- `app/globals.css:37-95,325-334,392-399` — The primary/destructive (crimson) vs. decline-data (rust `red-*`) split is deliberate and documented (the "Fill-vs-Read Rule"), preventing brand color from being misread as a bad-number signal.
- `app/globals.css:325-328,393-395` — `--red-400` is intentionally re-indirected per theme specifically to clear WCAG AA contrast on both light and dark canvases.
- `components/kpi/KpiCard.tsx:37-58` — `DeltaBadge` is an exemplary accessibility pattern: `aria-hidden` on the decorative arrow, full `sr-only` text for direction/magnitude/sentiment, plus a `title` tooltip.
- `components/nav/TopBar.tsx:120-138,172-176,192-196` — Icon-only buttons already carry `aria-label` (mostly also `title`); the sidebar toggle correctly sets `aria-expanded`.
- `app/globals.css:808-819` + `components/nav/Sidebar.tsx:36,49,76` — `prefers-reduced-motion` is handled globally and explicitly wired into Framer Motion transitions, not left purely to CSS.
- `app/globals.css:472-526` (`.print-report-light`) — A well-commented, deliberate fix for dark-theme bleeding into PDF export (matches the previously-fixed PDF export issue in project history).
- `components/upload/UploadForm.tsx` — Textbook state coverage: per-file pending/uploading/success/failed states, `aria-live="polite"` region (line 125), correct `aria-label`s on all icon actions, batch summary, retry affordance.
- `components/reports/ReportView.tsx` — One shared component correctly branches screen vs. print variant, used consistently by all four report/print routes. No findings there.
- `components/ui/table.tsx:7-19` — The shared `Table` primitive self-wraps every table in `.table-scroll` (`app/globals.css:624-636`), a fade + shadow-cued overflow-x affordance that resolves horizontal-overflow risk globally rather than per-page.
- `components/admin/UserManagement.tsx:239-263` — Delete-user has a proper inline confirmation step with explicit warning copy before the destructive action fires — don't regress to a bare `confirm()` or no confirmation.
- Audit-log pages (both roles) and the report/print pages are clean — consistent tokens, no findings.
- No emoji-as-icon usage was found anywhere in the shared `components/` tree — the icon set is consistently inline SVG (`components/nav/icons.tsx`) or Lucide. The two emoji instances found (#3, #14) are both page-level, not in shared components.

## 5. Coverage checklist (all 39 routes from `app/**/page.tsx`)

| Route | Status |
|---|---|
| `app/login/page.tsx` | Reviewed — 2 findings (#12, #20) |
| `app/page.tsx` | Reviewed — no findings |
| `app/dashboard/owner/page.tsx` | Reviewed — no findings |
| `app/dashboard/marketing/page.tsx` | Reviewed — no findings |
| `app/dashboard/owner/trend-analysis/page.tsx` | Reviewed — no findings |
| `app/dashboard/marketing/trend-analysis/page.tsx` | Reviewed — no findings |
| `app/dashboard/owner/correlation/page.tsx` | Reviewed — no findings |
| `app/dashboard/marketing/correlation/page.tsx` | Reviewed — no findings |
| `app/dashboard/owner/page-metrics/page.tsx` | Reviewed — 1 finding (#11, shared with marketing) |
| `app/dashboard/marketing/page-metrics/page.tsx` | Reviewed — 3 findings (#3, #11, #17) |
| `app/dashboard/owner/category-performance/page.tsx` | Reviewed — no findings (owner-only; asymmetry judged justified — reporting rollup naturally owner-scoped) |
| `app/dashboard/owner/post-type-performance/page.tsx` | Reviewed — no findings |
| `app/dashboard/marketing/post-type-performance/page.tsx` | Reviewed — no findings |
| `app/dashboard/owner/method-evaluation/page.tsx` | Reviewed — no findings |
| `app/dashboard/marketing/method-evaluation/page.tsx` | Reviewed — no findings |
| `app/dashboard/owner/analysis/page.tsx` | Reviewed — no findings |
| `app/dashboard/marketing/analysis/page.tsx` | Reviewed — no findings |
| `app/dashboard/owner/content/page.tsx` | Reviewed — no findings at route level (finding #2 is in shared `ContentLibraryClient.tsx`) |
| `app/dashboard/marketing/content/page.tsx` | Reviewed — no findings at route level |
| `app/dashboard/owner/regression/page.tsx` | Reviewed — 1 finding (#13, shared across 4 files) |
| `app/dashboard/marketing/regression/page.tsx` | Reviewed — finding #13 |
| `app/dashboard/owner/simulation/page.tsx` | Reviewed — finding #13 |
| `app/dashboard/marketing/simulation/page.tsx` | Reviewed — finding #13 |
| `app/dashboard/owner/campaign-rankings/page.tsx` | Reviewed — reference point for findings #6, #14, #15, #21, #22 |
| `app/dashboard/marketing/campaign-rankings/page.tsx` | Reviewed — 4 findings (#6, #14, #15, #21) |
| `app/dashboard/owner/ad-set-ranking/page.tsx` | Reviewed — no findings |
| `app/dashboard/owner/budget-reallocation/page.tsx` | Reviewed — no findings |
| `app/dashboard/owner/audit-log/page.tsx` | Reviewed — no findings |
| `app/dashboard/marketing/audit-log/page.tsx` | Reviewed — no findings |
| `app/dashboard/marketing/upload/page.tsx` | Reviewed — no findings (`UploadForm.tsx` praised, see §4) |
| `app/dashboard/owner/categorize/page.tsx` | Reviewed — no findings |
| `app/dashboard/marketing/categorize/page.tsx` | Reviewed — no findings |
| `app/dashboard/marketing/keywords/page.tsx` | Reviewed (thin wrapper only) — no findings; `components/marketing/KeywordsClient.tsx` was **not** deep-audited — flagged as a follow-up gap |
| `app/dashboard/owner/administration/page.tsx` | Reviewed — 1 finding (#16; related finding #7 in `UserManagement.tsx`) |
| `app/dashboard/owner/report/page.tsx` | Reviewed — no findings |
| `app/dashboard/marketing/report/page.tsx` | Reviewed — no findings |
| `app/print/owner/report/page.tsx` | Reviewed — no findings |
| `app/print/marketing/report/page.tsx` | Reviewed — no findings |
| `app/ui/page.tsx` | Reviewed — 2 findings (#4, #5) |

**Shared components reviewed (not routes, but in scope):** `app/globals.css`, `app/layout.tsx`, `app/dashboard/owner/layout.tsx`, `components/nav/TopBar.tsx`, `components/nav/Sidebar.tsx`, `components/kpi/KpiCard.tsx`, `components/ui/chart.tsx`, `components/ui/table.tsx`, `components/reports/ReportView.tsx`, `components/admin/UserManagement.tsx`, `components/upload/UploadForm.tsx`, `components/marketing/ContentLibraryClient.tsx` — findings #1, #7-10, #16, plus the "what's good" items in §4.

**Known gap:** `components/marketing/KeywordsClient.tsx` was not opened in this pass (only its thin route wrapper was reviewed). Recommend a follow-up pass on that file specifically.
