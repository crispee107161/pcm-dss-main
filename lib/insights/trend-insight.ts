export interface TrendPeriodPoint {
  period: string
  total_spend: number
  total_inquiries: number
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
  const inquiryDelta = prev.total_inquiries > 0
    ? ((curr.total_inquiries - prev.total_inquiries) / prev.total_inquiries) * 100
    : null

  if (spendDelta === null || inquiryDelta === null) {
    return {
      confidence: 'low',
      headline: `Not enough data to compare ${prev.period} and ${curr.period}`,
      detail: 'Upload more ad data with inquiry counts to see a period-over-period trend.',
    }
  }

  const prevCpi = prev.total_inquiries > 0 ? prev.total_spend / prev.total_inquiries : null
  const currCpi = curr.total_inquiries > 0 ? curr.total_spend / curr.total_inquiries : null

  const spendDir = spendDelta >= 0 ? 'up' : 'down'
  const inquiryDir = inquiryDelta >= 0 ? 'up' : 'down'
  const headline = `Spend is ${spendDir} ${Math.abs(spendDelta).toFixed(0)}%, inquiries are ${inquiryDir} ${Math.abs(inquiryDelta).toFixed(0)}% from ${prev.period} to ${curr.period}`

  const detailParts: string[] = []
  if (prevCpi !== null && currCpi !== null) {
    const cpiWord = currCpi > prevCpi ? 'up from' : currCpi < prevCpi ? 'down from' : 'about the same as'
    detailParts.push(
      `Each inquiry cost ₱${Math.round(currCpi).toLocaleString()} in ${curr.period}, ${cpiWord} ₱${Math.round(prevCpi).toLocaleString()} in ${prev.period}.`
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
