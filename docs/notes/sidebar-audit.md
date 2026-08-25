# Sidebar UI/UX Audit — Tracking

Source: Impeccable critique of `components/nav/Sidebar.tsx` + `components/nav/TopBar.tsx`, 2026-07-26.
Snapshot: `.impeccable/critique/2026-07-25T16-26-06Z__components-nav-sidebar-tsx.md`

**Score at last critique: 24/40 (Acceptable)** — re-run `/impeccable critique components/nav/Sidebar.tsx` after fixes to update this.

## Issues

- [x] **[P1] Hover-only expand has no keyboard or persistent-pin equivalent**
  Tabbing into the nav gets a permanent icon-only rail — no `:focus`/`focus-within` expand path, and the only pin-open control was removed this session. Violates PRODUCT.md's "full keyboard operability" commitment.
  Fix: `focused` state driven by `onFocus`/`onBlur` (with `relatedTarget` containment check) now expands the rail alongside hover; an explicit pin toggle button (`pinned` state) was reintroduced in the logo row.

- [x] **[P1] Sidebar.tsx and TopBar.tsx are on two different neutral color scales**
  Sidebar uses raw Tailwind `zinc-*` (13 call sites: `zinc-300/500/700/800/900`). TopBar correctly uses the project's remapped `gray-*` scale (8 call sites). Two unrelated ramps that happen to look similar today; will drift independently. Direct DESIGN.md violation.
  Fix: every `zinc-*` class replaced with its nearest-hex `gray-*` equivalent per the remapped scale in `globals.css` (zinc-300→gray-500, zinc-500→gray-300, zinc-700→gray-100, zinc-800→gray-50, zinc-900→gray-25).

- [x] **[P1] Dropdown and mobile drawer missing standard disclosure affordances**
  No `aria-expanded`/`aria-haspopup` on the user-menu trigger button. Neither the dropdown nor the mobile drawer closes on Escape.
  Fix: added `aria-expanded={dropdownOpen}` + `aria-haspopup="menu"` to the trigger; added a global Escape `keydown` handler that closes the dropdown, change-password panel, and mobile drawer.

- [x] **[P2] No `prefers-reduced-motion` handling**
  None of the sidebar's width, marginLeft, or text-opacity Framer Motion animations check for reduced motion, despite PRODUCT.md committing to WCAG AA reduced-motion support.
  Fix: `useReducedMotion()` now swaps in a near-instant transition for the rail width, main-content margin, and `FadeText` opacity animations.

- [x] **[P2] No dwell delay on hover-expand/collapse**
  `onMouseEnter`/`onMouseLeave` fire instantly with no debounce — a cursor passing near the 80px rail causes a visible flicker.
  Fix: added a 150ms open / 300ms close dwell delay via timeout refs, canceled on re-entry.

## Minor observations (not tracked as issues)

- Breadcrumb collapses nested routes straight to "Home › leaf," losing the middle segment on deep routes.
- Password-change success message auto-dismisses after 1.8s — tight for some readers.
- Focus-visible styling is explicit on TopBar's buttons, only implicit (browser default) on Sidebar's nav links — inconsistent authoring, not broken.

## Persona red flags (context, not separately tracked)

- **Alex (Power User)**: no way to pin the sidebar open; no keyboard shortcut; Escape doesn't close the dropdown.
- **Sam (Accessibility-Dependent)**: can't expand the rail via keyboard; `title`-only label fallback never shows on focus; dropdown lacks `aria-expanded`; motion isn't reduced; nav items aren't `<ul>/<li>` so no "N items" announcement.

## What's working (keep doing this)

- Crossing-hairline corner between sidebar `border-r` and TopBar `border-b` — deliberate, structural.
- `FadeText`'s lockstep opacity-fade-with-width animation.
- Flat-by-default cards; shadow reserved only for genuinely floating surfaces.
