# UI Cleanup — Deferred Items

Small, low-risk, non-urgent design-consistency items found during the 2026-08-14 dark-mode fix pass (login page, `CategorizeClient.tsx`, marketing `page-metrics`). No functional impact — deferred by request, revisit whenever.

## 1. Green button fills violate the Fill-vs-Read Rule

`components/marketing/CategorizeClient.tsx` — the "Accept" (per-row) and "Accept all pending" buttons use a solid `bg-green-600 hover:bg-green-700 text-white` fill.

`DESIGN.md` documents that green/rust are meant to be **reading** colors only (text/icons on a neutral surface) — crimson (`--primary`) is the only color meant to be used as an actionable fill.

Options when addressing:
- Recolor these buttons to the crimson fill convention (`bg-primary` / `Button` default variant), or
- Get explicit sign-off to carve out an exception for "accept" semantics (green = positive action is a common enough pattern that it may be worth keeping — just make it a deliberate, documented exception rather than leftover drift).

## 2. `text-white` vs. `text-primary-foreground` naming inconsistency

Several buttons use the literal `text-white` instead of the semantic `text-primary-foreground` token:

- `components/marketing/CategorizeClient.tsx` — lines ~172, 190, 376, 386 (as of 2026-08-14)
- `app/dashboard/marketing/page-metrics/page.tsx` — line ~221

Both resolve to the same white in both themes today, so this is a naming/consistency nit, not a rendering bug. Fix is a straight find-and-replace to the semantic token.

Also minor: two "view post"-style links in `CategorizeClient.tsx` have slightly inconsistent hover styles (`hover:text-primary/80` on one vs. `hover:underline` on another) — worth reconciling in the same pass.
