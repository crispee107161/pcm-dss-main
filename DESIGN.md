---
name: PC Merchandise DSS
description: A dark, flat, data-dense decision support dashboard for Facebook Ads/Page analytics, ported from Sure's design system.
colors:
  background: "#0B0B0B"
  card: "#171717"
  primary-brand: "#D41135"
  destructive: "#E8536E"
  status-positive: "#32D583"
  status-negative: "#FD853A"
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
    backgroundColor: "{colors.primary-brand}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
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

**Creative North Star: "The Trading Terminal, in PC Merchandise's own colors"**

This is a canvas built for someone reading numbers all day, not a first-touch marketing surface. Every screen exists to answer one question fast: what's driving ad and page performance, and what should a Marketing Manager, Sales Director, or Business Owner do next. Crimson (`#D41135` dark / `#BB061E` light) — PC Merchandise's actual brand color — is the action/brand color: buttons, links, focus rings, active nav. Green still reads as gain and rust as loss, terminal-style, kept deliberately off the brand hue so a KPI reading can never be mistaken for a button (see the Fill-vs-Read Rule below). The flat canvas and one-step-up card layer do all the depth work instead of shadows. **Dark is the default and primary-designed theme** (near-black canvas `#0B0B0B`, card `#171717`); a light theme (canvas `#F9F8F7`, card `#FFFFFF`, matching PC Merchandise's own site) shipped 2026-07-26 via `next-themes`, re-skinned to the brand palette 2026-08-04, using the identical token names re-defined per theme (`:root` = light, `.dark` = dark) so every component and utility class works unchanged in both — see `app/globals.css`.

This system explicitly rejects the generic SaaS/AI-slop dashboard playbook: no purple/indigo gradients, no default Tailwind blue as a primary, no hero-metric stat-card clichés, no side-stripe colored borders, no gradient text, no glassmorphism. It is a direct, hand-ported adaptation of Sure's (`app.sure.am`) production design system, re-skinned to PC Merchandise's brand palette rather than a fresh invention — consistency with structure and behavior wins over novelty, even where the hue changed.

**Key Characteristics:**
- Dual-theme: dark (`#0B0B0B` canvas, the original/primary design target) and light (`#F9F8F7` canvas, matching pcmerchandise.com.ph), toggled via `next-themes`; both share the same semantic token names, so this doc's dark-mode hex values are the reference and the light-mode counterpart is always "the same token, re-defined" — never a separately designed surface.
- Crimson (`#D41135` dark / `#BB061E` light) is the only "primary action" color in both themes — fills and chrome only, never a data mark or "bad number." Green is the only "positive" reading; rust (a retuned `red-*` ramp) is the only "negative" reading. See the Fill-vs-Read Rule.
- Flat by default: cards separate from the canvas via a lighter (dark theme) or bordered (light theme) fill, not shadows.
- Single typeface (Geist + Geist Mono) throughout; no display/body pairing.
- Hairline borders (`rgba(255,255,255,0.10)` dark / `rgba(11,11,11,0.10)` light) instead of visible strokes for structural separation.

## 2. Colors

PC Merchandise's brand crimson as the action color, split from a separate green/rust gain-loss reading — the palette's job is legibility and status signaling, not decoration.

### Primary
- **Brand Crimson** `#D41135` (light: `#BB061E`, pcmerchandise.com.ph's own primary) — the action color: primary buttons, links, active nav indicator, focus rings. Fills and chrome only; see the Fill-vs-Read Rule below for why it never appears as data.

### Secondary
- **Destructive** `#E8536E` (light: `#9A0518`) — delete/sign-out/irreversible actions. Distinguished from Primary by depth within the same crimson family, not by hue: destructive is still an *action*, so it belongs to the action family rather than the decline-reading ramp.
- **Status Positive / Negative** — `--status-positive` (`#32D583` dark / `#078C52` light) and `--status-negative` (`#FD853A` dark / `#C4320A` light): the gain/loss *reading* colors, entirely separate from Primary/Destructive. See the Fill-vs-Read Rule.

### Neutral
Dark values first (the primary design target), light-theme counterpart in parentheses — same token, re-defined per theme in `app/globals.css`.
- **Canvas** `#0B0B0B` (light: `#F9F8F7`): page background (`--background`, `--sidebar`).
- **Card** `#171717` (light: `#FFFFFF`): the one step up from canvas — cards, popovers, dropdown surfaces (`--card`, `--popover`).
- **Foreground** `#FAFAFA` (light: `#0F090B`): primary text.
- **Muted Gray** `#9E9E9E` (light: `#5A5355`): secondary text, timestamps, helper copy (`--muted-foreground`).
- **Hairline** `rgba(255,255,255,0.10)` (light: `#D8D7D4`): all structural borders/dividers (`--border`, `--sidebar-border`).

### Named Rules
**The Fill-vs-Read Rule.** Crimson appears only as a filled surface or a chrome indicator — never as colored text or a data mark. Decline signals (the `red-*` ramp, retuned to rust — `#FD853A`/`#E04F16`/`#C4320A` etc.) appear only as colored text, icons, or chart marks on a neutral surface — never as a fill. Role separates the two families even where hue drifts close. Because green-vs-rust is a weaker pair than green-vs-red for red-green color-vision deficiency (~8% of men), KPI delta components must keep a non-color cue (▲/▼ glyph or +/− sign) alongside the color — never color alone.

**The No-Blue-No-Purple Rule.** Tailwind's default `blue-*`/`indigo-*`/`violet-*` scale is never used as a primary or accent. `chart-2` (`#53B1FD` blue) and `chart-4` (`#A48AFB` violet) exist only inside multi-series chart legends, never as UI chrome.

## 3. Typography

**Body Font:** Geist (with `ui-sans-serif, system-ui` fallback)
**Equation/Code Font:** Geist Mono (with `ui-monospace` fallback)

**Character:** One typeface family used at multiple weights instead of a display/body pairing — this is a data tool, not an editorial surface, so hierarchy comes from weight and size steps, not typeface contrast.

### Hierarchy
- **Title** (700, 14–16px, 1.2 line-height): panel headers, card titles.
- **Body** (400, 14px, 1.5 line-height): default UI text, table cells, form labels.
- **Label** (600, 12px, 1.2 line-height, `0.05em` tracking, uppercase for section headers only): sidebar section headers, role badges, chip text.
- **Numeric** (500, Geist Sans, tabular figures via `font-feature-settings: "tnum"`): numeric/data values where alignment matters (KPI figures, table numbers). Not Geist Mono — mono read too heavy/wide at the bold weights these values use; Geist Sans supports tabular figures natively, so columns still align under the One Typeface Rule. Geist Mono is reserved for genuinely code-like content: regression equations, filenames.

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
- **Primary:** `background: #D41135` (light: `#BB061E`), text `#FFFFFF`, `padding: 8px 16px`.
- **Destructive:** `background: #E8536E` family (e.g. sign-out/delete), text `#FAFAFA`.
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
- **Focus:** ring uses `--ring` (crimson) by default; the sidebar's password-change form keeps its own red-family ring for the error/change-password context.
- **Placeholder:** `#71717a`-range gray, kept at reading contrast rather than default light-gray.

### Navigation (Sidebar)
- **Style:** fixed-position icon rail, `#0B0B0B` background, `border-r: rgba(255,255,255,0.10)`, sitting flush against the TopBar's `border-b` of the same color so the two hairlines cross at the shared corner (Sure's own corner treatment).
- **Default/Hover/Active states:** default nav items are muted gray text; hover fills `zinc-900`/lightens text; active items get a `#171717`-toned fill plus a 2px crimson left-indicator bar.
- **Collapse behavior:** hover-to-expand rail (80px collapsed → 240px expanded), animated via Framer Motion; text labels fade via opacity rather than snap via `display: none`, so width and label opacity move in lockstep.
- **Mobile treatment:** full-width slide-in drawer (not a rail), triggered by a TopBar hamburger; a `bg-black/60` backdrop dismisses on click-outside.

### User Menu (Sidebar footer)
- **Trigger:** avatar (crimson fill) + truncated email/role, expands a floating card (`card-shadow-floating`) above the trigger, positioned to the side when the rail is collapsed.
- **Contents:** identity block, inline "Change Password" accordion (`expand-grid` height transition), Sign Out — grouped in a single dropdown rather than separate menus.

## 6. Do's and Don'ts

### Do:
- **Do** use crimson (`#D41135` dark / `#BB061E` light) as the only primary/brand action color — buttons, links, active nav, focus rings.
- **Do** keep crimson confined to fills and chrome; never use it for text or a data mark (the Fill-vs-Read Rule).
- **Do** keep cards flat (`box-shadow: none`) at rest; reserve shadow for genuinely floating surfaces (dropdowns, popovers, the mobile drawer).
- **Do** use hairline borders (`rgba(255,255,255,0.10)`) for structural separation instead of visible strokes.
- **Do** give every interactive element explicit hover, focus-visible, and active states.
- **Do** animate state changes (sidebar width, text opacity, dropdown open) together, not independently — a width change without a matching text-opacity change reads as broken, not fast.
- **Do** keep a non-color cue (▲/▼, +/−) on every KPI delta alongside its green/rust color.

### Don't:
- **Don't** use Tailwind's default `blue-*`/`indigo-*`/`violet-*` as a primary or accent color — reserve them strictly for multi-series chart legends.
- **Don't** use a colored `border-left`/`border-right` greater than 1px as a decorative accent stripe on cards or list items.
- **Don't** use gradient text (`background-clip: text` + gradient).
- **Don't** use flat `shadow-md` as ambient decoration on a resting card — Sure's cards separate by fill color, not shadow.
- **Don't** use `transition-all` — animate only the specific properties that change (`background-color`, `opacity`, `transform`, `width`).
- **Don't** introduce a second sans-serif "for hierarchy" — Geist at different weights carries the whole type scale.
- **Don't** ship generic SaaS/AI-slop patterns: hero-metric stat-card templates, identical repeated card grids, glassmorphism as decoration, tiny uppercase tracked eyebrows above every section.

## Appendix: pcmerchandise.com.ph Brand Reference

**Applied 2026-08-04.** This was originally a reference-only capture of the marketing site's
actual palette; §2 above now documents the palette live in `app/globals.css`. Kept here for
provenance and as the record of how the conflict below was resolved.

### Provenance

Extracted 2026-08-04 from the live site's compiled CSS, not from the CSS Peeper export in
`Downloads\colors` (that export was corrupt — the `.sketchpalette` had out-of-range channel values
and the `figma-colors.json` contained only black/white). The real tokens came from fetching the
site's two Next.js stylesheet chunks directly:

- `https://www.pcmerchandise.com.ph/_next/static/chunks/13rfms16juua~.css`
- `https://www.pcmerchandise.com.ph/_next/static/chunks/0fl-inrpwrob0.css`

These filenames are content-hashed and will change on the site's next deploy — re-derive by
fetching the page, reading the `<link rel="stylesheet">` hrefs, and grepping the CSS for `--primary`.

### Token values

```
--background: #f9f8f7    --foreground: #0f090b    --card: #ffffff
--card-foreground: #0f090b    --popover: #ffffff    --popover-foreground: #0f090b
--primary: #bb061e       --primary-foreground: #ffffff
--secondary: #f2f2ee     --secondary-foreground: #0f090b
--muted: #ecebe7         --muted-foreground: #5a5355
--accent: #0f090b        --accent-foreground: #ffffff
--destructive: #bb061e   --destructive-foreground: #ffffff
--border: #d8d7d4        --input: #e5e5e1         --ring: #bb061e
--chart-1: #bb061e  --chart-2: #262021  --chart-3: #ca5551  --chart-4: #4d4647  --chart-5: #d6857f
--radius: .5rem
--sidebar: #f9f8f7  --sidebar-foreground: #0f090b  --sidebar-primary: #bb061e
--sidebar-primary-foreground: #ffffff  --sidebar-accent: #ecebe7
--sidebar-accent-foreground: #0f090b   --sidebar-border: #d8d7d4  --sidebar-ring: #bb061e
Fonts: Inter (sans, via --font-inter), Geist Mono (mono)
```

Crimson red (`#bb061e`) on warm off-white neutrals — a light, editorial palette, the inverse of
the DSS's near-black terminal canvas.

### How the conflict was resolved

The site sets **both** `--primary` and `--destructive` to `#bb061e`. That's fine for a marketing
site with no up/down semantics to protect, but adopting it as-is would have made every crimson
KPI reading ambiguous with a crimson button. Resolution: split by role, not just hue — crimson
became `--primary`/`--destructive` (fills and chrome only), while the `red-*` ramp used for
declining KPI deltas was retuned to rust (`#FD853A`/`#E04F16`/`#C4320A`, etc.) and moved
semantically to `--status-negative`, so it can never be confused with the brand accent even
though both are technically warm hues. This is the Fill-vs-Read Rule in §2 above. See
`app/globals.css` lines ~64–92 for the ramp definitions and ~258–379 for the per-theme
`--primary`/`--status-negative` tokens.
