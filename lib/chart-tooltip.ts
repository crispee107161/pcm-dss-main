import type { CSSProperties } from 'react'

/**
 * Recharts `contentStyle` matching the `.chart-tooltip` CSS recipe
 * (hairline ring + soft shadow) in globals.css. Recharts renders its
 * tooltip box via inline styles, so the class can't be applied directly —
 * this keeps the two definitions visually in sync.
 */
export const chartTooltipStyle: CSSProperties = {
  background: 'var(--card)',
  border: 'none',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 12,
  color: 'var(--foreground)',
  boxShadow: '0 0 0 1px rgba(11,11,11,0.05), 0 8px 24px rgba(11,11,11,0.12)',
}

export const chartTooltipLabelStyle: CSSProperties = {
  color: 'var(--color-gray-400)',
  fontSize: 11,
  marginBottom: 2,
}
