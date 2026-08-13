---
target: Dark/light theme parity across 10 owner routes, /dashboard/sales, /login, /ui
p0_count: 0
p1_count: 1
timestamp: 2026-08-11T02-50-00Z
slug: dark-light-theme-qa
---
## Scope

Full visual QA of both themes, requested after the accessibility/token sweep landed on the uncommitted owner-dashboard diff. Captured every owner route (`/dashboard/owner` and its 9 sub-routes), `/dashboard/sales`, `/login`, and `/ui` in both light and dark via a scripted Playwright session (real login as the seeded owner/sales accounts, `localStorage.theme` forced per capture), then reviewed each pair side by side. Also expanded the Correlation page's two collapsible tables (`LaggedCorrelationPanel`, `CorrelationTable`) in both themes, since those don't render in the default collapsed state.

This follows up the same-session accessibility/token sweep (`bg-gray-50 → bg-secondary`, `border-gray-100 → border-border`, `DeltaBadge` screen-reader fix, indexed-chart base-period fix) — this pass verifies those changes hold up visually and looks for anything the static sweep couldn't catch.

## Priority Issues

**[P1 — FIXED] `--chart-5` ("orange" in the shared chart palette) is a near-black brown in light mode, not orange — only correct in dark mode**

> **Fixed.** `app/globals.css` `:root` and `.print-report-light` both changed `--chart-5` from `#262021` to `#946000` — same hue (38.9°) as the correct dark-mode value `#FDB022`, darkened for a light canvas, 5.34:1 contrast on white (in line with the other four chart tokens' 4.3–7.23 range). Verified via a fresh capture: the Trend Analysis "Avg Engagement Rate" bars now render genuine amber/gold in light mode; dark mode unchanged. `npm test` (149 passing) and `tsc --noEmit` both clean.

- **Why it matters**: `lib/chart-axis.ts:22` maps `CHART_COLORS.orange` to `var(--chart-5)`. In `app/globals.css`, `.dark { --chart-5: #FDB022; }` (line 361) is genuinely amber, but `:root { --chart-5: #262021; }` (line 299) and `.print-report-light { --chart-5: #262021; }` (line 434) are a near-black brown — barely distinguishable from body text on a white canvas. Every chart series that uses this color is silently broken in light mode:
  - `components/marketing/TrendCharts.tsx:109` — the "Avg Engagement Rate" bars on Trend Analysis / the Executive Dashboard's "Organic Post Engagement" chart render solid black instead of orange.
  - `components/marketing/TrendCharts.tsx:253` — the same series in the "Compare trend" indexed-comparison view.
  - `components/marketing/PageMetricsCharts.tsx:33` — the "Interactions" line on Page Metrics' "Follows, Interactions & Visits" chart renders black, nearly invisible against gridlines except where it spikes.
  - `components/marketing/PageMetricsCharts.tsx:181,184` — the "Projected" line + dots on the 7-Day Page Views Forecast chart (both the live dashboard and the Generate Report page) render black, directly contradicting the chart's own on-screen caption: *"Blue = actual daily views · Red = model fit · Orange dots = projected."*
  - `components/marketing/PageMetricsCharts.tsx:116` — third color in the `TERRITORY_COLORS` array for the Top Territories chart, if a page ever shows 3+ territories.
  - `components/reports/ReportPrimitives.tsx` / print output — same token, so the PDF export and `/print/*/report` routes inherit the same near-invisible-orange defect (the print variant deliberately mirrors light mode).
  - Verified directly: same route, same data, same chart — dark screenshot shows correct amber bars/dots, light screenshot shows solid black in the identical position. Confirmed at 4 independent call sites (Trend Analysis chart, Page Metrics activity chart, Page Metrics forecast chart, Generate Report's forecast chart), so this isn't a one-off.
- **Fix**: `--chart-5` in `:root` and `.print-report-light` needs a genuine light-mode amber (something in the `#F79009`–`#DC6803` range holds up on white; don't just copy the dark value `#FDB022`, which would be too washed out at AA contrast on a light canvas). Same fix in both blocks since `.print-report-light` currently duplicates the broken light value.
- **Suggested command**: `/impeccable colorize app/globals.css` scoped to the `--chart-5` token, or a direct one-line hex fix — this is a single wrong value, not a structural problem.

## What's Working

- **The full owner-dashboard sweep holds up visually in both themes.** Every KPI card, the Efficiency Summary, Wasted Spend card, table borders, and the `DeltaBadge` pills (recently changed from `bg-gray-50`/`border-gray-100` to `bg-secondary`/`border-border`) render cleanly in both light and dark — no washed-out or invisible text anywhere on the Executive Dashboard.
- **`CorrelationTable` and `LaggedCorrelationPanel`** (the two components fixed earlier this session to drop raw `gray-*` classes) look genuinely good expanded in both themes: the "Strong positive / Strong negative / Weak" legend dots, the green/rust correlation values, and the "1 day best" badge are all legible with correct contrast in both themes.
- **The `--status-positive` contrast fix from earlier this session** (`#078C52` → `#067347`) reads cleanly against white — no faded-green text anywhere in the light captures.
- **The indexed "Compare trend" chart fix** (base-period selection + caption) renders correctly in both themes on the Executive Dashboard — toggled and confirmed the caption names the right base period.
- **`gray-*` is genuinely theme-safe.** Confirmed via computed-style inspection (not just visual impression) that `text-gray-*` classes resolve through a dual-direction ramp (`--g-25`…`--g-900`) that inverts between light and dark, so the ~800 raw `gray-*` call sites across the codebase are not a theming risk — they were correctly left alone by the earlier semantic-cleanup sweep.
- **`/login`'s hardcoded dark hero is intentional, not a bug** — `app/login/layout.tsx` explicitly pins it to dark ("bespoke, art-directed dark hero... not designed to be re-themed"), matching `ReportView`'s always-dark banner pattern elsewhere in the app. Confirmed it renders identically regardless of the stored theme preference, as designed.
- **No fixed-dark-on-light or washed-out-badge issues found** in the routes audited, including `/dashboard/sales` (`SalesDashboardTabs`), `/ui`'s Button showcase, and `/dashboard/owner/administration`'s User Management table.

## Not Investigated / Out of Scope

- `/dashboard/marketing/*` and the rest of `/dashboard/sales/*` (correlation, regression, simulation, trend-analysis, page-metrics, report) were not captured — this pass scoped to the 10 owner routes plus the one sales screen (`SalesDashboardTabs`) that consumes the changed `TrendCharts` component, per the session's diff. The `--chart-5` bug above will reproduce on any of those routes too, since it's a global token, not owner-specific.
- `components/analytics/ChatBot.tsx`, `components/upload/UploadStatusBar.tsx`, and `components/ui/dialog.tsx` were flagged by an earlier static-code pass as possibly having fixed-dark elements, but none of those surfaces appeared in the routes captured this pass (ChatBot is a floating widget not triggered; no upload or dialog interactions were driven). Still open — worth a follow-up pass if those surfaces matter.
- `/dashboard/sales`'s "Inquiries: 0" reading across all three KPI cards is a pre-existing, already-flagged data/scope issue (see prior project notes — Sales dashboard role may be removed, fix deferred pending a decision), not something this pass investigated or should have fixed.

## Questions to Consider

- None — checked whether `chart-5` was part of a wider pattern before closing this out. Compared RGB values for all five chart tokens across both theme blocks: `chart-1` (green→green), `chart-2` (blue→blue), `chart-3` (orange-brown→orange), and `chart-4` (violet→violet) all keep the same hue identity between themes, just lighter/more saturated in dark mode — the normal light/dark relationship. `chart-5` is the only one where light and dark don't share a hue at all (light is achromatic near-black, R≈G≈B; dark is saturated amber). Confirmed this is an isolated wrong value, not a systemic gap — no further token audit needed.
