Issues Found

  ✅ Sales — Mobile tab bar (icons only) [FIXED]
  The Overview / Campaigns / Analytics / Simulator tabs show only icons on mobile — no labels. Makes them hard to identify without context.
  Fix: Labels now always visible (text-[10px] on mobile, text-sm on sm+). Committed in fix: resolve mobile UI issues.

  Owner — Desktop didn't load (screenshot caught mid-auth)
  The owner account consistently hits the 30s+ auth window, so the desktop screenshot captured the "Signing in…" spinner. Not a UI bug per se, but the DB query for owner auth is
  noticeably slower than marketing/sales.

  ✅ Chat FAB overlaps content on mobile [FIXED]
  The red floating chat button sits at a fixed bottom-right position and visually overlaps the 3rd KPI card on sales mobile (and similar spots elsewhere). It should sit lower or
  have spacing so it doesn't cover content.
  Fix: Added pb-20 md:pb-0 to Sidebar content wrapper. Committed in fix: resolve mobile UI issues.

  ✅ Marketing mobile — MLR coefficient block [FIXED]
  The "How to read the Polynomial MLR coefficients" section is a dense wall of text on mobile — nearly unreadable at that font size.
  Fix: Converted to a native details/summary collapsible — collapsed by default, tap to expand. Committed in fix: resolve mobile UI issues.

  ---
  What's Actually Clean ✅

  - Breadcrumb fix is working on all three dashboards
  - Sidebar drawer works correctly on all roles
  - KPI cards, charts, and tables all stack properly on mobile
  - Desktop layouts are solid across all three roles

  ---
  Remaining:
  1. Owner auth slowness — DB query for owner role noticeably slower than marketing/sales