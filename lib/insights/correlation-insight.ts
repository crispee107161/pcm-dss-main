import type { SpearmanRow } from '@/types/index'

export type Confidence = 'high' | 'medium' | 'low'

export interface CorrelationInsight {
  confidence: Confidence
  headline: string
  detail: string
  ranked: { variable: string; r: number | null; strength: 'strong' | 'moderate' | 'weak' | 'none' }[]
}

function strengthOf(r: number | null): 'strong' | 'moderate' | 'weak' | 'none' {
  if (r === null) return 'none'
  const abs = Math.abs(r)
  if (abs >= 0.5) return 'strong'
  if (abs >= 0.3) return 'moderate'
  return 'weak'
}

export function computeCorrelationInsight(rows: SpearmanRow[]): CorrelationInsight | null {
  const withValues = rows.filter(r => r.vs_inquiries !== null)
  if (withValues.length === 0) return null

  const ranked = [...withValues]
    .map(r => ({ variable: r.variable, r: r.vs_inquiries, strength: strengthOf(r.vs_inquiries) }))
    .sort((a, b) => Math.abs(b.r ?? 0) - Math.abs(a.r ?? 0))

  const top = ranked[0]
  const weakest = ranked[ranked.length - 1]

  if (top.strength === 'none' || top.strength === 'weak') {
    return {
      confidence: 'low',
      headline: 'No metric stands out as a strong inquiry driver yet',
      detail: 'Every ad metric tested has only a weak relationship with inquiries so far. More data may reveal a clearer pattern.',
      ranked,
    }
  }

  const direction = (top.r ?? 0) > 0 ? 'more' : 'fewer'
  const confidence: Confidence = top.strength === 'strong' ? 'high' : 'medium'

  const headline = `${top.variable} is your strongest inquiry driver`
  const detailParts = [
    `Ads with ${direction === 'more' ? 'higher' : 'lower'} ${top.variable.toLowerCase()} tend to attract ${direction} inquiries.`,
  ]
  if (weakest.variable !== top.variable && weakest.strength === 'weak') {
    detailParts.push(`${weakest.variable} barely moves the needle on its own.`)
  }

  return { confidence, headline, detail: detailParts.join(' '), ranked }
}
