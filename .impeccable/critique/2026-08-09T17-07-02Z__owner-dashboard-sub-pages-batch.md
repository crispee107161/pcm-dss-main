---
target: Owner dashboard sub-pages (campaign-rankings, page-metrics, administration, category-performance, correlation, regression, simulation, trend-analysis, report)
p0_count: 0
p1_count: 2
timestamp: 2026-08-09T17-07-02Z
slug: owner-dashboard-sub-pages-batch
---
## Scope

Source-code review of the 8 remaining owner-role surfaces: `campaign-rankings`, `page-metrics`, `administration`, `category-performance` (direct page files), plus the shared `CorrelationView`, `RegressionView`, `SimulationView`, `TrendAnalysisView`, `ReportView` components (used via thin `correlation`/`regression`/`simulation`/`trend-analysis`/`report` page wrappers). Deterministic scan run across all of them. No live browser session (same auth-gate limitation as the first pass).

## Anti-Patterns Verdict

**Deterministic scan**: one finding — `app/dashboard/owner/administration/page.tsx:59`, `text-violet-400 on heading`, flagged by the scanner's "AI color palette" rule (purple/violet as a recognizable AI-generated-UI tell).

That single scanner hit turned out to be one instance of a much larger pattern I found by grepping the rest of the tree: **DESIGN.md's No-Blue-No-Purple Rule and the Fill-vs-Read status-token system are the exception in this codebase, not the norm.** The main owner dashboard page (reviewed last time) mostly held the line; these secondary pages don't.

## Priority Issues

**[P1] Blue and violet used as UI chrome in 6 places, directly against a written hard rule**
- **Why it matters**: DESIGN.md is explicit: *"Tailwind's default `blue-*`/`indigo-*`/`violet-*` scale is never used as a primary or accent color... `chart-2` (blue) and `chart-4` (violet) exist only inside multi-series chart legends, never as UI chrome."* These are all UI chrome (KPI stat colors, icon chips, section marker bars), not chart legends:
  - `app/dashboard/owner/administration/page.tsx:59` — `text-violet-400` on the "Marketing Managers" KPI count
  - `app/dashboard/owner/campaign-rankings/page.tsx:252-253` — `bg-blue-500/10 text-blue-400` icon chip on "Best Cost per Messaging Conversation"
  - `app/dashboard/owner/campaign-rankings/page.tsx:271-272` — `bg-purple-500/10 text-purple-400` icon chip on "Best Click-Through Rate" (purple, same family, same rule)
  - `app/dashboard/owner/page-metrics/page.tsx:182-183, 230, 265, 328, 343` — `text-violet-400`/`text-blue-400` used repeatedly as `StatCard`'s `color` prop, plus `bg-blue-500`/`bg-violet-500` as section-header marker bars. This is the file where the pattern is most systemic — five separate spots.
- **Fix**: Replace with the documented palette — crimson for the single brand accent, the `--status-positive`/`--status-negative` pair for gain/loss readings, and gray-scale for neutral categories. If a page genuinely needs more than 2 semantic categories (page-metrics has ~8 stat cards), that's a real design gap worth raising rather than reaching for unaudited blue/violet — see the question at the end.
- **Suggested command**: `/impeccable colorize app/dashboard/owner/page-metrics/page.tsx` (highest concentration), then a follow-up sweep of `administration` and `campaign-rankings`.

**[P2] The `--status-positive`/`--status-negative` tokens are barely used anywhere outside the main dashboard**
- **Why it matters**: Every genuine gain/loss reading I found in this batch — regression R² quality (`RegressionView.tsx:97,103`), simulation projections (`SimulationView.tsx:73,75`), trend deltas (`TrendAnalysisView.tsx:43,141`), report tone (`ReportView.tsx:62,155,189,203,204`), follower growth (`page-metrics/page.tsx:303`) — uses raw Tailwind `red-*`/`green-*`/`yellow-*` instead of the tokens. This isn't an isolated slip in one file; it's the prevailing convention across ~6 components. The rust retune DESIGN.md documents (chosen specifically for brand-disambiguation and better red-green colorblind contrast than stock red) is effectively dead code outside the one page I already fixed.
- **Fix**: This is bigger than a quick polish pass — worth a deliberate sweep once, rather than fixing one file at a time and having the pattern creep back. A shared `<StatusText tone="positive|negative">` or similar component wrapping the CSS vars would prevent every future page from reaching for raw Tailwind again.
- **Suggested command**: `/impeccable audit components/analytics/pages` then `/impeccable colorize` per file, or treat as one dedicated pass across the whole `components/analytics` and `components/reports` trees.

**[P3] No accessibility regressions found in this batch**
- Unlike the Sidebar findings from the first pass, none of these 8 surfaces have their own interactive elements missing `focus-visible` — the shared `DateRangeFilter` and `UserManagement` components (which do carry the actual buttons/inputs) already have it. Nothing new to fix here.

**[P3] Undocumented ad-hoc colors**
- `campaign-rankings/page.tsx:296` uses `teal-500`/`teal-400` (not in DESIGN.md's palette at all) for the "Best Cost per Click" icon chip.
- `category-performance/page.tsx:242-246` uses literal `yellow-500`/`yellow-700`/`yellow-300` for an uncategorized-content warning banner. DESIGN.md defines positive/negative status colors but no "warning" tier, so this is filling a real gap in the token system rather than ignoring an existing token — lower stakes than the P1/P2 above, but worth deciding on a real `--status-warning` token if warning banners recur elsewhere.

## What's Working

- **Methodology transparency**: `campaign-rankings/page.tsx` pairs every ranked table with a plain-language `MethodologyNote` explaining exactly how the number was computed and what's filtered out — genuinely good "Match Between System and Real World" heuristic work, and rare to see this consistently across every metric on a page.
- **Empty/edge states**: category-performance handles zero-categories, zero-CPI, zero-engagement, and uncategorized-content all explicitly rather than showing broken math or blank tables.
- **RankBadge's gold/silver/bronze medal colors** (`campaign-rankings/page.tsx`) are a defensible, universally-understood exception to token discipline — podium colors are a stronger real-world match than forcing them into the brand palette.

## Questions to Consider

- `page-metrics` needs more than 2 semantic categories (spend/reach vs. views/reactions/comments vs. follows/visits) — is the real fix "stop using blue/violet" or "the design system needs 1-2 more sanctioned neutral-but-distinct accent colors for exactly this multi-metric-grid case"? Right now the page is solving a real design-system gap by breaking the rule, not just being sloppy.
- Given how widespread the raw-Tailwind-status-color pattern is, is it worth building the `StatusText`/token-wrapper component now, before more pages get added, rather than fixing files one at a time?
