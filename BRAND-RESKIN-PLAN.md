# Brand Re-skin: apply pcmerchandise.com.ph palette to the DSS

**Status (2026-08-04):** Phases 1–3, 5 shipped. Phase 4 partial (login page +
`FloatingStatCards.tsx` done; `KeywordsClient.tsx`/`CategorizeClient.tsx`/`lib/chart-tooltip.ts`/
`AIInsightCard.tsx` still carry hardcoded hex, not yet migrated to tokens). Phase 6 (mechanical
`red-N` rename) deferred, as planned. Also fixed during review: every `bg-primary` button across
the app still had a `hover:bg-green-*`/`disabled:bg-green-*` leftover from when `--primary` was
green (13 files) — not part of the original plan, but a direct consequence of Phase 1/2 that
needed the same pass. `--color-red-400` was also made theme-aware (`:root`/`.dark` no longer
share one value) since no single rust hex clears WCAG AA as text on both a near-black canvas and
white — see DESIGN.md §2.

## Context

`DESIGN.md` carries an appendix (lines 189–237) recording the real pcmerchandise.com.ph
brand tokens — crimson `#bb061e` on warm off-white neutrals — captured 2026-08-04 from the
live site's compiled CSS. It is marked **"Not applied."** The DSS currently ships Sure's
"trading terminal" palette instead: near-black canvas, `#12B76A` green as primary.

The goal is to make the DSS look like PC Merchandise's actual brand, without destroying the
one thing a decision-support dashboard cannot lose: an unambiguous read on whether a number
is good or bad. The brand site sets **both** `--primary` and `--destructive` to `#bb061e`,
which is fine for a marketing page with no up/down semantics and fatal for this app.

Outcome: crimson becomes the action/brand color, green stays "gain," and the decline signal
moves off red entirely so it can never be confused with a crimson button.

## Key findings from exploration

- **Tailwind v4, no config file.** All theming lives in `app/globals.css` (691 lines):
  `@theme` (static ramps, L64–158), `@theme inline` (semantic mapping, L160–232),
  `:root` light (L241–298), `.dark` (L300–354), and `.print-report-light` (L369–409).
- **`.print-report-light` is a duplicated copy of the light token block**, needed because
  headless Chromium in `lib/pdf/browser.ts` has no localStorage and `next-themes` falls back
  to `defaultTheme="dark"`. **Every `:root` edit must be mirrored there.**
- **The `@theme` ramps are already non-standard.** `--color-red-500` is `#F13636`, not
  Tailwind's red. So `red-N` utilities are already "slot names," not literal colors. The file
  sets this precedent explicitly with `--color-gray-* → var(--g-*)`, a ramp that *inverts*
  per theme to serve ~1,300 raw `gray-N` call sites.
- **Semantic tokens are unadopted.** `--status-warning`: zero uses outside `globals.css`.
  `--status-positive` / `--status-negative`: one file, `components/analytics/SalesDashboardTabs.tsx:109-110`.
- **Raw `red-N`/`green-N` classes carry the actual signal: 207 occurrences / 36 files.**
  Heaviest: `app/dashboard/marketing/page-metrics/page.tsx` (17), `components/marketing/CategorizeClient.tsx` (15),
  `app/dashboard/{sales,owner}/page-metrics/page.tsx` (13/12), `components/reports/ReportView.tsx` (12).
- **Charts are already clean.** `lib/chart-axis.ts` exposes `CHART_COLORS` as `var(--chart-N)`
  strings that Recharts consumes directly — they repaint on theme toggle with no JS. Reuse this;
  do not introduce a parallel color source.

## The semantic decision

Crimson `#BB061E` (hue ~350°) is too close to the existing red ramp (`#C91313`, `#ED4E4E`,
hue ~0–2°) for the two to coexist as "primary action" and "bad number." Orange-700 `#BC1B06`
= `rgb(188,27,6)` is likewise unusable — it is visually identical to `rgb(187,6,30)`.

**Resolution — split by role, not just hue:**

| Role | Meaning | Hue family | Rationale |
|---|---|---|---|
| `--primary` | brand action (buttons, links, focus rings, active nav) | **crimson** | The brand color. Only ever a *fill* behind white text, or a 1–2px indicator. |
| `--destructive` | delete / sign-out / irreversible action | **crimson, darker** | Destructive is an *action*, so it belongs to the action family. Distinguished from primary by depth, not hue. |
| `--status-positive` | gain, growth, improving KPI | **green** | Unchanged. |
| `--status-negative` | loss, decline, failing KPI | **rust/amber** | A *reading*, never an action. Moved off red so it can never be misread as a button. |
| `--status-warning` | caution | **yellow** | Currently unreferenced; kept defined for future use. |

This is the load-bearing rule and it should be written into `DESIGN.md`:

> **The Fill-vs-Read Rule.** Crimson appears only as a filled surface or a chrome indicator —
> never as colored text or a data mark. Decline signals appear only as colored text, icons, or
> chart marks on a neutral surface — never as a fill. Role separates them even where hue is close.

Because green-vs-rust is weaker than green-vs-red for red-green CVD (~8% of men), **KPI delta
components must keep a non-color cue** (▲/▼ glyph or +/− sign) alongside the color. Verify this
during Phase 5 rather than assuming it.

**Why redefine the `@theme` red ramp rather than migrate 207 call sites:** the ramp is already
a set of arbitrary slots, the gray ramp establishes the precedent, and one edit correctly
repaints all 207 sites. The cost is that `text-red-500` renders rust — mitigated by a comment
block in `globals.css` and an optional Phase 6 rename.

## Implementation

### Phase 1 — `@theme` ramp retune (`app/globals.css`, L64–158)

Repoint the `red-*` ramp to the rust/decline family and add a new `crimson-*` ramp for the brand.
Keep `green-*`, `blue-*`, `violet-*`, `yellow-*`, and both alpha ramps as-is.

```css
  /* DECLINE ramp. Named `red-*` for call-site compatibility (207 sites) but rendered
     rust — see the Fill-vs-Read Rule in DESIGN.md. Brand crimson is `crimson-*`. */
  --color-red-25:  #FFFAF5;  --color-red-50:  #FFF4ED;  --color-red-100: #FFE6D5;
  --color-red-200: #FFD6AE;  --color-red-300: #FF9C66;  --color-red-400: #FD853A;
  --color-red-500: #E04F16;  --color-red-600: #C4320A;  --color-red-700: #B54708;
  --color-red-800: #932F19;  --color-red-900: #772917;

  /* BRAND crimson — pcmerchandise.com.ph. Fills and chrome only, never data marks. */
  --color-crimson-50:  #FDF2F4;  --color-crimson-100: #FCE4E8;  --color-crimson-200: #F9C4CD;
  --color-crimson-300: #F28FA1;  --color-crimson-400: #E8536E;  --color-crimson-500: #D41135;
  --color-crimson-600: #BB061E;  --color-crimson-700: #9A0518;  --color-crimson-800: #7A0413;
  --color-crimson-900: #5C030E;
```

Also warm the light gray ramp so neutrals read as brand off-white rather than cool gray — this
is what actually sells the re-skin. Edit `:root` `--g-*` only; leave `.dark` `--g-*` neutral.

### Phase 2 — semantic token blocks

Apply to **`:root` (L241–298)** and mirror verbatim into **`.print-report-light` (L369–409)**,
which keeps `--background: #FFFFFF`.

```css
:root {
  --g-25:#FCFBFA; --g-50:#F9F8F7; --g-100:#F2F2EE; --g-200:#E5E5E1; --g-300:#D8D7D4;
  --g-400:#A8A5A3; --g-500:#7A7473; --g-600:#5A5355; --g-700:#3A3335; --g-800:#241F20; --g-900:#0F090B;

  --background: #F9F8F7;        --foreground: #0F090B;
  --card: #FFFFFF;              --card-foreground: #0F090B;
  --popover: #FFFFFF;           --popover-foreground: #0F090B;
  --primary: #BB061E;           --primary-foreground: #FFFFFF;
  --secondary: #F2F2EE;         --secondary-foreground: #0F090B;
  --muted: #ECEBE7;             --muted-foreground: #5A5355;
  --accent: #ECEBE7;            --accent-foreground: #0F090B;
  --destructive: #9A0518;
  --border: #D8D7D4;            --input: #E5E5E1;   --ring: #BB061E;
  --chart-1: #078C52; --chart-2: #175CD3; --chart-3: #B54708; --chart-4: #6927DA; --chart-5: #262021;
  --radius: 0.5rem;
  --status-positive: #078C52; --status-warning: #B54708; --status-negative: #C4320A;
  --sidebar: #FFFFFF;           --sidebar-foreground: #0F090B;
  --sidebar-primary: #BB061E;   --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #ECEBE7;    --sidebar-accent-foreground: #0F090B;
  --sidebar-border: #D8D7D4;    --sidebar-ring: #BB061E;
}
```

**`.dark` (L300–354)** — the brand palette is light-only, so the dark counterpart is derived,
not copied. **Rule: the dark theme keeps its near-black terminal canvas;** only the action
family changes, lightened for contrast on dark (raw `#BB061E` fails contrast on `#0B0B0B`).

**Confirmed 2026-08-04, live on `/login`:** the first pass used `crimson-400` (`#E8536E`) for
`--primary`, which read as pink rather than red against the near-black canvas. Deepened one
step to `crimson-500` (`#D41135`) — user-approved, keep this value. `--destructive` moved to
the vacated `crimson-400` slot so it stays visually distinct from `--primary` while still
reading red, not pink. `--sidebar-primary-foreground` corrected to `#FFFFFF` (was `#0B0B0B`
black-on-black against the now-dark-red fill).

```css
.dark {
  /* --g-* and --background/--card/--foreground unchanged: #0B0B0B / #171717 / #FAFAFA */
  --primary: #D41135;           --primary-foreground: #FFFFFF;
  --secondary: #242424;         --secondary-foreground: #FAFAFA;
  --muted-foreground: #9E9E9E;
  --destructive: #E8536E;
  --ring: #D41135;
  --chart-1: #12B76A; --chart-2: #53B1FD; --chart-3: #FD853A; --chart-4: #A48AFB; --chart-5: #FDB022;
  --status-positive: #32D583; --status-warning: #FDB022; --status-negative: #FD853A;
  --sidebar-primary: #D41135;   --sidebar-primary-foreground: #FFFFFF;
  --sidebar-ring: #D41135;
}
```

**Deliberately unchanged:** `--radius` in `.dark` (inherits), the `--color-alpha-*` ramps, the
`@theme inline` mapping block (its indirection already handles everything above), and
`lib/chart-axis.ts` (`CHART_COLORS.red` now resolves to rust automatically).

### Phase 3 — Typography and radius

- **Keep Geist.** The brand site uses Inter, but `CLAUDE.md` explicitly forbids Inter, and
  `DESIGN.md`'s One Typeface Rule is load-bearing. Geist is tonally adjacent to Inter and more
  distinctive. No change to `app/layout.tsx`.
- **Flag the standing conflict** in `DESIGN.md`: `CLAUDE.md` requires distinct heading/body
  fonts; `DESIGN.md` §3 forbids a second sans. Recommend resolving in favor of `DESIGN.md`
  (project-specific and already implemented) and adding a note to `CLAUDE.md` that the DSS is
  an intentional exception.
- **Adopt `--radius: 0.5rem`** from the brand (was `0.625rem`). One token, all `--radius-*`
  derive from it via `calc()`.

### Phase 4 — Retire hardcoded colors

- `app/login/page.tsx` — replace ~24 stock-Tailwind hex/rgba values (`#dc2626`, `#ef4444`,
  `#b91c1c`, `#080808`, `rgba(220,38,38,…)`, `rgba(63,63,70,…)`) with `var(--primary)`,
  `var(--background)`, `var(--card)`, `var(--border)`. Removes its theme-blindness.
- `components/login/FloatingStatCards.tsx` — 5 rgba + `bg-red-500`/`bg-green-500`/`bg-amber-400`
  → `var(--status-*)` and `color-mix()` for the tinted glows.
- `components/marketing/KeywordsClient.tsx:131` and `components/marketing/CategorizeClient.tsx:378`
  — `rgba(18,183,106,0.25)` → `color-mix(in srgb, var(--primary) 25%, transparent)`.
- `lib/chart-tooltip.ts:16` — the `rgba(11,11,11,…)` boxShadow never inverts; swap to the
  existing `--card-elevate-shadow-ring` token.
- `components/analytics/AIInsightCard.tsx:63` — `color="#9E9E9E"` → `var(--muted-foreground)`.
- `components/marketing/PageMetricsCharts.tsx:115-118` — `TERRITORY_COLORS` has 5 hardcoded
  overflow hexes past the `CHART_COLORS` five. Leave the hexes but add a comment, or extend
  `--chart-6..10`; low priority.

**Out of scope:** the ~77 `neutral-*` classes in `components/reports/*`. That is deliberate —
`globals.css:364` documents that report markup is pinned light for the PDF path. Touching it
risks the export.

### Phase 5 — `DESIGN.md` rewrite

- Frontmatter: replace the `colors:` block and the `components.*` color references.
- §1 Overview: the north star shifts from "Trading Terminal" to brand-led; keep the
  anti-AI-slop paragraph verbatim.
- §2 Colors: fold the appendix in as the live palette; replace "The Terminal Semantics Rule"
  with **The Fill-vs-Read Rule** above; keep "The No-Blue-No-Purple Rule."
- Delete the appendix's "Blocking conflict" section — replace with a short note recording how
  the conflict was resolved, so the reasoning survives.
- Keep the Provenance subsection (the content-hashed CSS URLs and the re-derivation recipe).

### Phase 6 — Optional follow-up

Mechanical rename of `red-N` → an explicitly-named decline slot across the 36 files, so the
class name stops lying. Defer until the palette is visually confirmed.

## Regression risk

| Risk | Why | Mitigation |
|---|---|---|
| **PDF report breaks** | `.print-report-light` is a hand-duplicated copy of `:root`; drift silently produces a wrong-colored or unreadable PDF | Diff the two blocks after editing; regenerate a report and open the PDF |
| **`@theme` red ramp blast radius** | One edit repaints 207 sites across 36 files, including success/error toasts and upload states | Walk the highest-density routes in Phase 7; watch for places `red-*` meant "brand," not "bad" |
| **Inverted gray ramp** | Warming `:root --g-*` touches ~1,300 call sites; a wrong step flattens text contrast | Change light `--g-*` only, leave `.dark` alone; spot-check muted/secondary text contrast |
| **Dark primary contrast** | `#BB061E` on `#0B0B0B` fails WCAG; lightened `#E8536E` is a derived value with no brand precedent | Eyeball dark-mode buttons and focus rings specifically |
| **CVD legibility** | Green-vs-rust is a weaker pair than green-vs-red | Confirm KPI deltas retain ▲/▼ or +/− glyphs |

## Verification

```bash
npm test          # lib/db + lib/stats — should stay at current pass count (95)
npx tsc --noEmit  # no type impact expected; catches the login refactor
npm run build     # must stay clean
npm run dev
```

In the browser, **both themes** via `components/nav/ThemeToggle.tsx`:

- `/login` — the fully-refactored surface; confirm it now responds to the theme toggle at all.
- `/dashboard/marketing/page-metrics` and `/dashboard/owner/page-metrics` — highest `red-N`
  density; confirm declining KPIs read as decline, not as buttons.
- `/dashboard/owner` and `/dashboard/marketing` — KPI cards, deltas, arrow glyphs.
- `/dashboard/*/campaign-rankings` — efficiency cards and `MethodologyNote` disclosures.
- `/dashboard/*/simulation` — `WhatIfSimulator`, `CostCuttingScenario`, `BudgetAllocator`.
- `/dashboard/marketing/upload` — upload status/history states lean on `red-*`/`green-*`.
- `/ui` — the component showcase route; fastest way to see the whole system at once.

Then **export a PDF report** from a `/dashboard/*/report` route and open it — this is the
single most likely thing to break, because it runs through `.print-report-light` and headless
Chromium rather than the live theme.

Finally, put a crimson primary button and a declining KPI on screen together and confirm at a
glance that they do not read as the same thing. If they do, the negative hue needs to move
further toward amber before Phase 6.
