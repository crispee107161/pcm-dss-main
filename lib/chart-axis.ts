/**
 * Shared Recharts axis/grid/series styling, theme-aware via CSS variables.
 * Mirrors `chart-tooltip.ts` — centralizes the values so every chart stays
 * in sync instead of hardcoding hex per chart function. Resolved by the
 * browser from the active `:root`/`.dark` block in globals.css, so charts
 * repaint automatically when the theme toggles.
 */

// Same hairline used by `.border-hairline` — barely-visible against the chart background.
export const CHART_GRID_STROKE = 'var(--border)'

// Matches --muted-foreground — legible but muted axis labels.
export const CHART_TICK_FILL = 'var(--muted-foreground)'
export const chartTick = (fontSize: number) => ({ fontSize, fill: CHART_TICK_FILL })

// Matches --chart-1 through --chart-5 in globals.css.
export const CHART_COLORS = {
  green:  'var(--chart-1)',
  blue:   'var(--chart-2)',
  red:    'var(--chart-3)',
  violet: 'var(--chart-4)',
  orange: 'var(--chart-5)',
} as const
