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

// Axis tick formatter for large counts (reach, views, visits). A flat
// `/1000` + "k" breaks past a million (1600000 -> "1600k" instead of
// "1.6M"), so this steps up the unit instead of just growing the digit count.
export function formatCompactCount(v: number): string {
  const abs = Math.abs(v)
  // Round-trip through the same precision the formatter below will render,
  // so a value like 999,500 that rounds up to "1000k" gets bumped into the
  // "M" branch instead of printing a fourth digit in front of "k".
  if (abs >= 999_500) {
    const millions = v / 1_000_000
    const rounded = millions.toFixed(1)
    return `${rounded.endsWith('.0') ? millions.toFixed(0) : rounded}M`
  }
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

// Same compact k/M stepping as formatCompactCount, prefixed for PHP currency
// axes (spend, budget). Kept separate rather than parameterizing the prefix
// into formatCompactCount so plain-count call sites don't need to pass '' .
export function formatCompactPhp(v: number): string {
  return `₱${formatCompactCount(v)}`
}
