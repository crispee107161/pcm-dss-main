// Shared median/quantile helpers. Several call sites (regression-insight,
// health-score, simulation) each hand-rolled their own median before this —
// this is the one place going forward, and the basis for the dashboard's
// median-CPI KPI (mvp.md §4.1) and FR-25's spend quartiling.

export function median(values: number[]): number {
  return quantile(values, 0.5)
}

// Linear-interpolation ("R-7" / Excel PERCENTILE.INC) method — matches what
// spreadsheet tools produce, so figures reproduce against hand-checked
// reference numbers in mvp.md §8.
export function quantile(values: number[], q: number): number {
  if (values.length === 0) throw new Error('quantile: values must not be empty')
  if (q < 0 || q > 1) throw new Error('quantile: q must be between 0 and 1')

  const sorted = [...values].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const lower = Math.floor(pos)
  const upper = Math.ceil(pos)
  if (lower === upper) return sorted[lower]

  const frac = pos - lower
  return sorted[lower] + (sorted[upper] - sorted[lower]) * frac
}

export interface Iqr {
  q1: number
  q3: number
  iqr: number
}

export function iqr(values: number[]): Iqr {
  const q1 = quantile(values, 0.25)
  const q3 = quantile(values, 0.75)
  return { q1, q3, iqr: q3 - q1 }
}
