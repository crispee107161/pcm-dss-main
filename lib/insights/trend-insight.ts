export interface TrendPeriodPoint {
  period: string
  total_spend: number
  total_purchases: number
}

export type Confidence = 'medium' | 'low'

export interface TrendInsight {
  confidence: Confidence
  headline: string
  detail: string
}

export function computeTrendInsight(
  periods: TrendPeriodPoint[],
  isConsecutive: boolean,
): TrendInsight | null {
  const lastTwo = periods.slice(-2)
  if (lastTwo.length < 2) return null
  const [prev, curr] = lastTwo

  const spendDelta = prev.total_spend > 0
    ? ((curr.total_spend - prev.total_spend) / prev.total_spend) * 100
    : null
  const purchaseDelta = prev.total_purchases > 0
    ? ((curr.total_purchases - prev.total_purchases) / prev.total_purchases) * 100
    : null

  if (spendDelta === null || purchaseDelta === null) {
    return {
      confidence: 'low',
      headline: `Not enough data to compare ${prev.period} and ${curr.period}`,
      detail: 'Upload more ad data with purchase outcomes to see a period-over-period trend.',
    }
  }

  const prevCpa = prev.total_purchases > 0 ? prev.total_spend / prev.total_purchases : null
  const currCpa = curr.total_purchases > 0 ? curr.total_spend / curr.total_purchases : null

  const spendDir = spendDelta >= 0 ? 'up' : 'down'
  const purchaseDir = purchaseDelta >= 0 ? 'up' : 'down'
  const headline = `Spend is ${spendDir} ${Math.abs(spendDelta).toFixed(0)}%, purchases are ${purchaseDir} ${Math.abs(purchaseDelta).toFixed(0)}% from ${prev.period} to ${curr.period}`

  const detailParts: string[] = []
  if (prevCpa !== null && currCpa !== null) {
    const cpaWord = currCpa > prevCpa ? 'up from' : currCpa < prevCpa ? 'down from' : 'about the same as'
    detailParts.push(
      `Each purchase cost ₱${Math.round(currCpa).toLocaleString()} in ${curr.period}, ${cpaWord} ₱${Math.round(prevCpa).toLocaleString()} in ${prev.period}.`
    )
  }
  if (!isConsecutive) {
    detailParts.push(`Note: ${prev.period} and ${curr.period} are not consecutive months, so this comparison spans a gap in the uploaded data.`)
  }

  return {
    confidence: isConsecutive ? 'medium' : 'low',
    headline,
    detail: detailParts.join(' '),
  }
}
