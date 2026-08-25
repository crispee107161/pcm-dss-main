---
target: FilterTabs (components/marketing/ContentClient.tsx)
total_score: 18
max_score: 28
na_heuristics: 5,9,10
p0_count: 2
p1_count: 2
timestamp: 2026-08-23T13-54-43Z
slug: components-marketing-contentclient-tsx-filtertabs
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Click triggers a real `router.push` navigation with no optimistic/pending state — no feedback during the round-trip |
| 2 | Match System / Real World | 4 | Labels ("Needs Review", "All", "Categorised", "Unassigned") are plain and unambiguous |
| 3 | User Control and Freedom | 3 | `router.push` (not `replace`) correctly preserves Back-button stepping through filter history |
| 4 | Consistency and Standards | 1 | Contradicts the sibling `ChartViewToggle` (same `SlidingTabs` primitive, `TrendCharts.tsx:170-187`), which uses neutral `--foreground` text + opaque shadowed indicator instead of crimson text + translucent tint |
| 5 | Error Prevention | n/a | Filter switching is non-destructive |
| 6 | Recognition Rather Than Recall | 4 | Active filter is always visibly marked |
| 7 | Flexibility and Efficiency | 2 | Plain `<button>`s in a `role="group"` force sequential Tab-through instead of roving arrow-key nav expected of a segmented control |
| 8 | Aesthetic and Minimalist Design | 2 | Active segment stacks three simultaneous crimson cues (fill + border + text) where one would do |
| 9 | Error Recovery | n/a | No error states in this control |
| 10 | Help and Documentation | n/a | Not applicable to a filter control |
| **Total** | | **18/28** | **Acceptable (64%)** |

## Design Specificity Verdict

**LLM assessment:** The track/pill shape (`p-1 rounded-xl bg-secondary/60` + `rounded-lg px-3 py-1.5`) is a stock Tailwind/shadcn segmented control — nothing ties it to the product's stated "trading-terminal" identity. More importantly, it isn't even consistent with itself: the sibling `ChartViewToggle`, built on the identical `SlidingTabs` primitive, expresses "active" as neutral foreground text on an opaque shadowed surface — the documented, working answer to "how does this system show selection." `FilterTabs` invented a second, incompatible answer (crimson text + crimson-tinted translucent fill + crimson border) rather than reusing it.

**Deterministic scan:** The Impeccable detector ran clean against both files (exit 2 overall, but all 4 findings are `design-system-font-size` hits at `ContentClient.tsx:234/244/850/912` — unrelated code elsewhere in the file, not inside `FilterTabs` at lines 1050–1078, and not in `sliding-tabs.tsx`). No rule-based findings apply to this target; the real issue here is a hand-verified violation of the project's own documented Fill-vs-Read Rule, which the automated scanner doesn't check for.

**Visual overlays:** Not available — no browser automation tool was exposed in this session, and the target page sits behind auth middleware with no credentials supplied. Assessment B fell back to static code/token-based contrast computation instead.

## Overall Impression

The mechanics are sound — shared primitive, URL-driven filter state, correct Back-button behavior — but the active-tab color choice breaks the design system's own explicit rule and, as a direct consequence, fails contrast in the app's primary (dark) theme. This is fixable with a one-line class swap, and the fix is already sitting in the codebase as a working pattern (`ChartViewToggle`) nobody reused.

## What's Working

1. **Shared `SlidingTabs` primitive** — consolidating onto it eliminated duplicated `layoutId`/`useReducedMotion` boilerplate and picked up `aria-pressed`/`role="group"` for free versus the prior hand-rolled version.
2. **URL-driven filter state** — lives in the query string rather than component state, keeping the view bookmarkable and deep-linkable; correct architectural call for a dashboard.
3. **Flat indicator, no stray shadow** — the active pill correctly has no `box-shadow`, honoring the system's "shadow only for floating surfaces" rule even while it breaks the Fill-vs-Read rule elsewhere.

## Priority Issues

**[P0] Active-label text (`text-primary`) violates the project's own Fill-vs-Read Rule**
- Why it matters: DESIGN.md reserves crimson for fills/chrome, never text or a "read" — specifically because it sits in the same hue family as `--destructive`. A user scanning the filter row sees red text exactly where an error or a negative KPI reading would also appear red.
- Fix: `active ? 'text-primary' : ...` → `active ? 'text-foreground' : ...` at `ContentClient.tsx:1068`, matching the working convention already in `TrendCharts.tsx`'s `ChartViewToggle`.
- Suggested command: /impeccable polish

**[P0] Dark-theme contrast failure on the active label (~2.85–2.98:1, computed two ways)**
- Why it matters: Fails WCAG AA (needs 4.5:1) in the app's primary/default theme. Light theme clears by only ~5% margin (~4.6–4.73:1) — no real safety cushion either.
- Fix: Resolves automatically once the P0 above lands — full-opacity foreground text against either theme's card/secondary surface has ample contrast. Verify with a contrast checker post-fix.
- Suggested command: /impeccable audit

**[P1] Same primitive, two incompatible "active" visual languages**
- Why it matters: `FilterTabs` and `ChartViewToggle` both use `SlidingTabs`, but show selection completely differently (crimson wash+border+text vs. neutral text + opaque shadowed pill). Two toggles in the same feature area looking like different design systems undercuts the "one system" premise.
- Fix: Adopt the `.segmented-control` active-state classes from `TrendCharts.tsx`/globals.css wholesale for `FilterTabs`, or extract one shared "active segment" contract both consume.
- Suggested command: /impeccable polish

**[P1] No roving keyboard navigation; ambiguous toggle-group vs. tablist semantics**
- Why it matters: `role="group"` + `aria-pressed` on plain `<button>`s forces sequential Tab-through instead of the arrow-key switching users expect from a 4-way segmented filter.
- Fix: If this is meant to behave like a tab strip, switch to `role="tablist"`/`role="tab"`/`aria-selected` with roving `tabindex`.
- Suggested command: /impeccable audit

**[P2] No optimistic/pending feedback on click**
- Why it matters: `onChange` triggers a real `router.push`; nothing signals the click registered during the server round-trip before `posts` updates.
- Fix: Wrap in `useTransition`, apply `aria-busy`/reduced-opacity to the clicked segment while pending.
- Suggested command: /impeccable polish

## Persona Red Flags

**Alex (Power User):** Triages content by switching this filter repeatedly through a session. No arrow-key nav and no optimistic feedback mean every switch costs a full click-plus-unsignaled-network-wait — friction that compounds with frequency of use.

**Sam (Accessibility-Dependent User):** The crimson-on-crimson-wash active state is the lowest-contrast state in the entire control and fails AA outright in dark theme. It also relies on a destructive-adjacent hue to mean "selected" — for anyone with red-green color vision deficiency, or simply low vision in the dominant dark theme, "selected filter" risks reading as "warning" or not registering at all.

## Minor Observations

- `transition-colors` (not `transition-all`) on the segment is correctly scoped.
- The two rounds of live-feedback tuning on this indicator (border-only → solid fill → tinted+border) were purely aesthetic ("too weak" vs. "too loud") and never checked against the documented Fill-vs-Read Rule.
- `focus-visible:ring-ring` uses the crimson `--ring` token — on an already crimson-tinted active pill, the focus ring may have low self-contrast against the indicator's own wash; not independently verified, flagged as a likely compounding issue from the same root cause.
- `border-primary/50` on the indicator is a colored border, but as a selection-state border (not a decorative accent stripe) it's likely exempt from the "no colored border as accent" rule — worth a quick re-check once the text-color fix lands.

## Questions to Consider

1. If crimson text is banned from KPI/data reads because it's confusable with the negative/destructive reading color, why is it acceptable as the "currently active view" marker — isn't a state indicator just as read-critical as a number?
2. `ChartViewToggle` already has a working, documented answer for showing an active segment. What made `FilterTabs` reach for a different one on the same primitive?
