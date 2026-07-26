---
name: PC Merchandise DSS
description: A dark, flat, data-dense decision support dashboard for Facebook Ads/Page analytics, ported from Sure's design system.
colors:
  background: "#0B0B0B"
  card: "#171717"
  primary-gain: "#12B76A"
  destructive-red: "#ED4E4E"
  identity-accent-red: "#F13636"
  foreground: "#FAFAFA"
  muted-foreground: "#9E9E9E"
  chart-blue: "#53B1FD"
  chart-violet: "#A48AFB"
  chart-amber: "#FDB022"
  border-hairline: "rgba(255,255,255,0.10)"
typography:
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.05em"
  mono:
    fontFamily: "Geist Mono, ui-monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  button-primary:
    backgroundColor: "{colors.primary-gain}"
    textColor: "#0B0B0B"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.destructive-red}"
    textColor: "#FAFAFA"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  nav-item-active:
    backgroundColor: "#27272A"
    textColor: "#FAFAFA"
    rounded: "{rounded.md}"
    padding: "6px 12px"
---

# Design System: PC Merchandise DSS

## 1. Overview

**Creative North Star: "The Trading Terminal"**

This is a near-black canvas built for someone reading numbers all day, not a first-touch marketing surface. Every screen exists to answer one question fast: what's driving ad and page performance, and what should a Marketing Manager, Sales Director, or Business Owner do next. Green (`#12B76A`) reads as gain, red (`#ED4E4E`) as loss or danger, exactly like a terminal's up/down semantics, with the flat `#0B0B0B` canvas and `#171717` card layer doing all the depth work instead of shadows.

This system explicitly rejects the generic SaaS/AI-slop dashboard playbook: no purple/indigo gradients, no default Tailwind blue as a primary, no hero-metric stat-card clichés, no side-stripe colored borders, no gradient text, no glassmorphism. It is a direct, hand-ported adaptation of Sure's (`app.sure.am`) production design system, not a fresh invention — consistency with that source wins over novelty.

**Key Characteristics:**
- Dark-only canvas (`#0B0B0B`), no light mode exists or is planned.
- Green (`#12B76A`) is the only "positive/primary action" color; red is reserved for destructive actions and one deliberate identity-accent use (avatars, active-nav indicator).
- Flat by default: cards separate from the canvas via a lighter fill (`#171717`), not shadows or borders.
- Single typeface (Geist + Geist Mono) throughout; no display/body pairing.
- Hairline borders (`rgba(255,255,255,0.10)`) instead of visible strokes for structural separation.

## 2. Colors

A near-monochrome dark palette with two semantic accents and a small chart palette; the palette's job is legibility and status signaling, not decoration.

### Primary
- **Gain Green** (`#12B76A`): the primary action color and the "positive" signal across the app — primary buttons, positive KPI deltas, the active brand mark. Sure's own logo/gain color, ported directly.

### Secondary
- **Destructive / Identity Red** (`#ED4E4E` family, e.g. `#F13636`): carries two deliberate jobs. (1) Semantic destructive/negative — delete actions, negative KPI deltas, error states. (2) A separate identity-accent role confined to the sidebar: user avatar fills, the active-nav-item left indicator, and focus rings on sidebar controls. These two uses are intentional, not drift — red is never used as a second "primary" action color outside the sidebar's own chrome.

### Neutral
- **Canvas Black** (`#0B0B0B`): page background (`--background`, `--sidebar`).
- **Card Charcoal** (`#171717`): the one step up from canvas — cards, popovers, dropdown surfaces (`--card`, `--popover`).
- **Foreground White** (`#FAFAFA`): primary text.
- **Muted Gray** (`#9E9E9E`): secondary text, timestamps, helper copy (`--muted-foreground`).
- **Hairline White** (`rgba(255,255,255,0.10)`): all structural borders/dividers (`--border`, `--sidebar-border`).

### Named Rules
**The Terminal Semantics Rule.** Green means gain/go/primary. Red means loss/destructive, with the one confined exception of sidebar identity chrome (avatars, active indicator). Never introduce a third color as a competing "primary."

**The No-Blue-No-Purple Rule.** Tailwind's default `blue-*`/`indigo-*`/`violet-*` scale is never used as a primary or accent. `chart-2` (`#53B1FD` blue) and `chart-4` (`#A48AFB` violet) exist only inside multi-series chart legends, never as UI chrome.

## 3. Typography

**Body Font:** Geist (with `ui-sans-serif, system-ui` fallback)
**Label/Mono Font:** Geist Mono (with `ui-monospace` fallback)

**Character:** One typeface family used at multiple weights instead of a display/body pairing — this is a data tool, not an editorial surface, so hierarchy comes from weight and size steps, not typeface contrast.

### Hierarchy
- **Title** (700, 14–16px, 1.2 line-height): panel headers, card titles.
- **Body** (400, 14px, 1.5 line-height): default UI text, table cells, form labels.
- **Label** (600, 12px, 1.2 line-height, `0.05em` tracking, uppercase for section headers only): sidebar section headers, role badges, chip text.
- **Mono** (400, 13px, Geist Mono): numeric/data values where alignment matters (KPI figures, table numbers).

### Named Rules
**The One Typeface Rule.** Geist for everything, including headings (`--font-heading` resolves to `--font-sans`). Do not introduce a second sans-serif for "hierarchy" — use weight/size instead.

## 4. Elevation

Flat by default. Sure's actual dashboard widgets carry no border or shadow at rest — grouping comes purely from the card surface (`#171717`) sitting one notch lighter than the canvas (`#0B0B0B`). Shadows are reserved for surfaces that are genuinely floating above the layout: dropdowns, popovers, the mobile drawer.

### Shadow Vocabulary
- **`card-shadow`** (`box-shadow: none`): resting cards. Intentionally a no-op — grouping comes from fill color, not shadow.
- **`card-shadow-floating`** (`0 0 0 1px rgba(255,255,255,0.05), 0px 20px 24px -4px rgba(11,11,11,0.06)`): dropdowns, popovers, the sidebar's user-menu card — anything that visually floats above its neighbors.
- **`shadow-border-{xs..xl}`**: a hairline ring (`0 0 0 1px`) composed with Sure's soft, low-opacity drop-shadow scale, for elements that need a defined edge without looking "designed with a shadow."

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow only appears as a response to the surface floating above the page (dropdown, popover, modal, drawer) — never as ambient decoration on a resting card.

## 5. Components

Flat and functional: no shadow at rest, minimal ornament, every interactive element carries explicit hover/focus/active treatment because this is a mouse-and-keyboard workday tool, not a touch-first marketing surface.

### Buttons
- **Shape:** 8px radius (`--radius-md`).
- **Primary:** `background: #12B76A`, text `#0B0B0B`, `padding: 8px 16px`.
- **Destructive:** `background: #ED4E4E` family (e.g. sign-out/delete), text `#FAFAFA`.
- **Hover / Focus:** background-color transition only (never `transition-all`); `focus-visible` ring in the accent color, offset from the surface.
- **Ghost / Secondary:** `background: #242424` (`--secondary`), same radius, used for lower-emphasis actions inside dropdowns and toolbars.

### Cards / Containers
- **Corner Style:** 10px radius (`--radius-lg`).
- **Background:** `#171717` (`--card`) against the `#0B0B0B` canvas.
- **Shadow Strategy:** none at rest (see Elevation); `card-shadow-floating` only for popped-up surfaces.
- **Border:** none by default; hairline (`rgba(255,255,255,0.10)`) only where a floating surface needs a defined edge.
- **Internal Padding:** 16px (`spacing.lg`).

### Inputs / Fields
- **Style:** `background: #242424` (`--secondary`/zinc-800 equivalent), `border: zinc-700`, 8px radius.
- **Focus:** ring shifts to the contextual accent color (green for standard forms, red for the sidebar's password-change form) with a background-matched ring offset.
- **Placeholder:** `#71717a`-range gray, kept at reading contrast rather than default light-gray.

### Navigation (Sidebar)
- **Style:** fixed-position icon rail, `#0B0B0B` background, `border-r: rgba(255,255,255,0.10)`, sitting flush against the TopBar's `border-b` of the same color so the two hairlines cross at the shared corner (Sure's own corner treatment).
- **Default/Hover/Active states:** default nav items are muted gray text; hover fills `zinc-900`/lightens text; active items get a `#171717`-toned fill plus a 2px red left-indicator bar (the confined identity-red use).
- **Collapse behavior:** hover-to-expand rail (80px collapsed → 240px expanded), animated via Framer Motion; text labels fade via opacity rather than snap via `display: none`, so width and label opacity move in lockstep.
- **Mobile treatment:** full-width slide-in drawer (not a rail), triggered by a TopBar hamburger; a `bg-black/60` backdrop dismisses on click-outside.

### User Menu (Sidebar footer)
- **Trigger:** avatar (red fill) + truncated email/role, expands a floating card (`card-shadow-floating`) above the trigger, positioned to the side when the rail is collapsed.
- **Contents:** identity block, inline "Change Password" accordion (`expand-grid` height transition), Sign Out — grouped in a single dropdown rather than separate menus.

## 6. Do's and Don'ts

### Do:
- **Do** use `#12B76A` green as the only primary/positive action color.
- **Do** keep cards flat (`box-shadow: none`) at rest; reserve shadow for genuinely floating surfaces (dropdowns, popovers, the mobile drawer).
- **Do** use hairline borders (`rgba(255,255,255,0.10)`) for structural separation instead of visible strokes.
- **Do** give every interactive element explicit hover, focus-visible, and active states.
- **Do** animate state changes (sidebar width, text opacity, dropdown open) together, not independently — a width change without a matching text-opacity change reads as broken, not fast.
- **Do** keep red confined to destructive actions plus the sidebar's identity chrome (avatars, active indicator) — its two roles, and no more.

### Don't:
- **Don't** use Tailwind's default `blue-*`/`indigo-*`/`violet-*` as a primary or accent color — reserve them strictly for multi-series chart legends.
- **Don't** use a colored `border-left`/`border-right` greater than 1px as a decorative accent stripe on cards or list items.
- **Don't** use gradient text (`background-clip: text` + gradient).
- **Don't** use flat `shadow-md` as ambient decoration on a resting card — Sure's cards separate by fill color, not shadow.
- **Don't** use `transition-all` — animate only the specific properties that change (`background-color`, `opacity`, `transform`, `width`).
- **Don't** introduce a second sans-serif "for hierarchy" — Geist at different weights carries the whole type scale.
- **Don't** ship generic SaaS/AI-slop patterns: hero-metric stat-card templates, identical repeated card grids, glassmorphism as decoration, tiny uppercase tracked eyebrows above every section.
