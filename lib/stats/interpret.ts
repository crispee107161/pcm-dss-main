// FR-22 — every analytical result on S7 shows coefficient + n + significance
// together, worded by magnitude rather than reported as p-value alone.
// Bands per mvp.md §4.4: |rho|<0.2 negligible, 0.2-0.4 weak, 0.4-0.6
// moderate, >0.6 strong.

export type CorrelationMagnitude = 'negligible' | 'weak' | 'moderate' | 'strong'

export function magnitudeLabel(coefficient: number): CorrelationMagnitude {
  const abs = Math.abs(coefficient)
  if (abs < 0.2) return 'negligible'
  if (abs < 0.4) return 'weak'
  if (abs < 0.6) return 'moderate'
  return 'strong'
}

export interface CorrelationInterpretation {
  magnitude: CorrelationMagnitude
  direction: 'positive' | 'negative' | 'none'
  isSignificant: boolean // p < 0.05
  summary: string
}

// Renders the full FR-22 sentence: coefficient + n + significance +
// magnitude wording together, so a reader never sees a bare p-value or a
// bare coefficient without the others.
export function interpretCorrelation(coefficient: number, n: number, p: number): CorrelationInterpretation {
  const magnitude = magnitudeLabel(coefficient)
  const direction = coefficient > 0 ? 'positive' : coefficient < 0 ? 'negative' : 'none'
  const isSignificant = p < 0.05

  const directionPhrase = direction === 'none' ? 'no' : direction
  const significancePhrase = isSignificant
    ? `statistically significant (p ${p < 0.001 ? '< 0.001' : `= ${p.toFixed(3)}`})`
    : `not statistically significant (p = ${p.toFixed(3)})`

  const summary =
    magnitude === 'negligible'
      ? `Negligible relationship (r = ${coefficient.toFixed(3)}, n = ${n}), ${significancePhrase}.`
      : `${capitalize(magnitude)} ${directionPhrase} relationship (r = ${coefficient.toFixed(3)}, n = ${n}), ${significancePhrase}.`

  return { magnitude, direction, isSignificant, summary }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
