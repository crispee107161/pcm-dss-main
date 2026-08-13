/**
 * Shared Recharts axis/grid/series styling, theme-aware via CSS variables.
 * Mirrors `chart-tooltip.ts` — centralizes the values so every chart stays
 * in sync instead of hardcoding hex per chart function. Resolved by the
 * browser from the active `:root`/`.dark` block in globals.css, so charts
 * repaint automatically when the theme toggles.
 */

// Matches --muted-foreground — used as a fallback Cell color for dynamic,
// data-driven categorical charts (GenderPieChart's "Other", TerritoryChart's
// overflow slots) that don't go through a static ChartConfig.
export const CHART_TICK_FILL = 'var(--muted-foreground)'

// Matches --chart-1 through --chart-5 in globals.css.
export const CHART_COLORS = {
  green:  'var(--chart-1)',
  blue:   'var(--chart-2)',
  red:    'var(--chart-3)',
  violet: 'var(--chart-4)',
  orange: 'var(--chart-5)',
} as const
