/**
 * Shared Recharts axis/grid/series styling for this app's dark-only canvas.
 * Mirrors `chart-tooltip.ts` — centralizes the values so every chart stays
 * in sync instead of hardcoding light-theme hex per chart function.
 */

// Matches `.border-hairline`'s dark-mode value (--color-alpha-white-200) —
// a barely-visible line against the near-black chart background.
export const CHART_GRID_STROKE = 'rgba(255,255,255,0.10)'

// Matches --color-gray-400 / --muted-foreground — legible but muted axis labels.
export const CHART_TICK_FILL = '#9E9E9E'
export const chartTick = (fontSize: number) => ({ fontSize, fill: CHART_TICK_FILL })

// Matches --chart-1 through --chart-5 in globals.css.
export const CHART_COLORS = {
  green:  '#12B76A',
  blue:   '#53B1FD',
  red:    '#ED4E4E',
  violet: '#A48AFB',
  orange: '#FDB022',
} as const
