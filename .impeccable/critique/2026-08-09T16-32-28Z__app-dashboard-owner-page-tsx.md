---
target: Owner Dashboard (app/dashboard/owner/page.tsx)
total_score: 25
p0_count: 0
p1_count: 2
timestamp: 2026-08-09T16-32-28Z
slug: app-dashboard-owner-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Server-rendered page (no client loading states needed); delta badges and formatted currency give clear read-outs. Not live-verified for async states elsewhere in the app. |
| 2 | Match System / Real World | 3 | Plain-language labels ("Where to Invest Next" instead of "Regression Output"), PHP currency formatting, inline captions under most sections explain the metric before showing it. |
| 3 | User Control and Freedom | 3 (partial) | Sidebar collapse/expand persists via localStorage — real user control. Broader flows (logout, session recovery) not verifiable without an authenticated session. |
| 4 | Consistency and Standards | 2 | Confirmed color-token drift: KPI deltas and accent chips use raw Tailwind `red-*`/`green-*` instead of the project's own `--status-positive`/`--status-negative` tokens (see Priority Issues). Also a focus-state inconsistency between Sidebar and TopBar. |
| 5 | Error Prevention | n/a | Read-only dashboard, no destructive actions on this page. |
| 6 | Recognition Rather Than Recall | 2 | Collapsed sidebar rail drops nav-item text from the accessibility tree entirely (see P1 below); sighted users get a `title` tooltip, screen-reader users get nothing. |
| 7 | Flexibility and Efficiency | 3 | Sidebar collapse/expand, direct deep links to sub-pages. No keyboard shortcuts, but that's consistent with PRODUCT.md's stated scope (workday tool, not power-user surface). |
| 8 | Aesthetic and Minimalist Design | 4 | Disciplined execution of the DESIGN.md system: flat cards, hairline borders, no shadow-at-rest violations, no AI-slop patterns detected (deterministic scanner returned zero findings on this page). |
| 9 | Error Recovery | n/a | No error states present on this page to evaluate. |
| 10 | Help and Documentation | 2 | No dedicated help affordance, but several sections carry inline explanatory captions ("Bar length shows efficiency relative to the best ad in this list") that do real contextual-help work. |
| **Total** | | **~25/32 scored (2 n/a)** | **Acceptable-to-Good, pulled down by the color-token and focus-state consistency gaps** |

*Caveat: this review is source-code-based, not a live authenticated walkthrough (see below). Heuristics 1, 3, 5, 9 in particular would benefit from a live pass.*

## Anti-Patterns Verdict

**Does this look AI-generated? No.** This is a deliberately-designed system with a written creative rationale (DESIGN.md's "Trading Terminal" north star, the Fill-vs-Read Rule, the No-Blue-No-Purple Rule), and the owner dashboard executes it with real discipline: flat cards, hairline borders, no gradient text, no side-stripe accents, no hero-metric cliché despite this being exactly the kind of page ("4 KPIs at the top") that usually falls into that trap.

**Deterministic scan**: `detect.mjs` against `app/dashboard/owner/page.tsx`, `layout.tsx`, and `components/nav/Sidebar.tsx` returned zero findings (exit 0, clean).

**Live browser inspection was skipped.** The owner dashboard is role-gated behind NextAuth credentials seeded via `SEED_OWNER_PASSWORD`, which isn't available in this session, and I didn't want to spin up a dev server + guess/create credentials without checking with you first. Everything below is from reading `app/dashboard/owner/page.tsx`, `layout.tsx`, `components/nav/{Sidebar,TopBar}.tsx`, and `app/globals.css` directly, cross-referenced against DESIGN.md/PRODUCT.md's own stated rules. No overlay or screenshot exists for this pass.

## Overall Impression

The page is well-built and holds its own design system's line better than most "reskin" work does — the crimson/rust split, the flat elevation model, the tabular numeric formatting are all present and correct. The real gap isn't taste, it's **discipline drift at the edges**: the one place this page needs to use the project's carefully-designed status-color tokens (KPI deltas, the actual "gain/loss" reading the Fill-vs-Read Rule exists for) instead reaches for stock Tailwind red/green, and the sidebar — the one nav surface used on every page load — has a keyboard-accessibility gap that the adjacent TopBar already solved correctly.

## What's Working

- **Status-adaptive neutral scale**: `text-gray-900` etc. isn't literal Tailwind gray — it's remapped per-theme (`--g-900` is near-black in light mode, near-white in dark mode), so body text contrast holds in both themes without per-component overrides. This is a genuinely good token architecture decision.
- **Numeric formatting discipline**: `formatPhp`/`formatPhpPrecise`/`formatNumber` are applied consistently, tabular figures (`tabular` class) keep the campaign-ranking table's numbers aligned — exactly what DESIGN.md's "Numeric" type role calls for.
- **Contextual micro-copy**: nearly every card carries a one-line caption explaining what the number means and how it's computed ("Bar length shows efficiency relative to the best ad in this list") — this is doing real cognitive-load-reduction work without needing a help system.

## Priority Issues

**[P1] Sidebar nav links have no visible focus indicator**
- **Why it matters**: This is the primary navigation, present on every dashboard page. A keyboard-only user (Sam persona) tabbing through it gets zero visual feedback on where focus is — they're navigating blind. `components/nav/TopBar.tsx` gets this right everywhere (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1` on every interactive control), but `components/nav/Sidebar.tsx`'s `renderNavItem` Link has no focus-visible classes at all. This also directly contradicts DESIGN.md's own stated rule: "every interactive element needs explicit hover, focus-visible, and active states."
- **Fix**: Add the same `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1` pattern TopBar already uses to the nav-item `<Link>` className in Sidebar.tsx.
- **Suggested command**: `/impeccable audit components/nav/Sidebar.tsx`

**[P1] Collapsed sidebar removes nav-item labels from the accessibility tree**
- **Why it matters**: `FadeText` sets `display: none` on the label when the rail is collapsed, which removes the text from the accessibility tree entirely. The only remaining identifier is a `title` attribute (`title={!showText ? item.label : undefined}`), which is inconsistently or never announced by screen readers. A screen-reader user (Sam) using the collapsed rail — the default state persisted via localStorage after first collapse — gets unlabeled icon links for the entire primary nav.
- **Fix**: Add `aria-label={item.label}` directly on the `<Link>` in `renderNavItem`, independent of `showText`, so the accessible name survives regardless of collapse state.
- **Suggested command**: `/impeccable audit components/nav/Sidebar.tsx`

**[P2] KPI delta badges bypass the project's own status-color tokens**
- **Why it matters**: DESIGN.md deliberately retunes the "negative" reading color away from stock red to rust (`--status-negative`, `#FD853A`/`#C4320A`) specifically so it (a) can never be confused with the crimson brand/action color and (b) is more distinguishable from green for red-green color-vision deficiency than stock red is. `DeltaBadge` in `app/dashboard/owner/page.tsx` uses literal `bg-red-500/10 border-red-500/30 text-red-400` and `bg-green-500/10 border-green-500/30 text-green-400` instead — the exact "gain/loss reading" case the Fill-vs-Read Rule and the rust retune exist for, implemented with the untuned colors the retune was meant to replace.
- **Fix**: Swap `DeltaBadge` and the `accentStyles` map in `KpiCard` to reference the semantic status tokens (`--status-positive`/`--status-negative`) rather than raw Tailwind `red-*`/`green-*`/`yellow-*` utilities.
- **Suggested command**: `/impeccable colorize app/dashboard/owner/page.tsx`

**[P3] Minor decorative color drift**
- **Why it matters**: `SectionLabel`'s divider line (`bg-gradient-to-r from-red-100/70 to-transparent`) and the KPI icon chip backgrounds in `accentStyles` also use literal Tailwind color steps rather than the project's token set. Low stakes since these aren't data marks, but it's the same drift pattern as the P2 above, suggesting the token discipline is inconsistently enforced across this file rather than a one-off.
- **Fix**: Sweep `app/dashboard/owner/page.tsx` for any remaining literal Tailwind color utility (`red-`, `green-`, `yellow-`, `gray-` is fine since that's remapped) and replace with the corresponding DESIGN.md token.
- **Suggested command**: `/impeccable audit app/dashboard/owner/page.tsx`

## Persona Red Flags

**Sam (Accessibility-Dependent User)**: Tabbing into the sidebar produces no visible focus ring (P1). If the rail happens to be collapsed (the state persists across sessions via localStorage, and the toggle defaults could plausibly leave a returning user in collapsed state), every nav link announces as unlabeled to a screen reader (P1). This is the single biggest risk on this page for Sam specifically — everything else (contrast via the theme-adaptive gray scale, table structure, caption text) looks solid from source.

**Alex (Power User)**: No keyboard shortcuts, but that matches PRODUCT.md's stated scope for this tool (a workday dashboard for 3 fixed roles, not a power-user surface with heavy customization). Not a red flag given the product's own design principles — flagging only because Alex would ask, and the answer is "intentional."

## Minor Observations

- The mobile KPI grid is `grid-cols-2` (2 columns on small screens) — within the ≤4-visible-metrics cognitive-load guideline, no action needed.
- `wastedSpend` gracefully degrades to `null` on a thrown error inside `computeAdSetMetrics()` rather than breaking the whole page — good defensive pattern, worth confirming the swallowed error is at least logged somewhere upstream (not visible in this file).
- Empty states exist for both the trend chart ("Not enough monthly data yet") and wasted-spend card ("No wasted spend...") — this is exactly the kind of edge-case coverage that often gets skipped.

## Questions to Consider

- Is the sidebar's default-expanded-then-persisted-collapsed behavior intentional for first-time users, or should collapse state reset per session so new users always see full labels first?
- The rust/status-color retune is clearly a deliberate, documented design decision — was `DeltaBadge`'s use of stock red/green an oversight, or was there a reason to keep KPI deltas visually distinct from the rust ramp used elsewhere (e.g. Campaign Rankings)?
