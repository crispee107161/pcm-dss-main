// `total_inquiries` keeps its legacy field name (components/analytics/pages/TrendAnalysisView.tsx
// constructs these objects and is out of scope for this pass) but now carries
// messaging-conversation totals, not Facebook-reported "Purchases".
export interface TrendPeriodPoint {
  period: string
  total_spend: number
  total_inquiries: number
}

export type Confidence = 'high' | 'medium' | 'low'

export interface TrendInsight {
  confidence: Confidence
  headline: string
  detail: string
}

// docs/raven/Trend_Analysis_Corrections_and_Confidence_Decision.md §3.1 — one
// entry per period in the `periods` array passed to computeTrendInsight,
// aligned by index. All three flags are about the DATA, not the comparison
// itself, so they're computed by the caller (which owns the raw ad/post
// rows) and passed in rather than re-derived here.
export interface PeriodDataCompleteness {
  // True when every ad row bucketed into this period's totals also has its
  // reporting_ends within the same calendar month — i.e. none of them spill
  // into the next month, so this period's spend/inquiries aren't secretly a
  // partial-month figure. False (not merely "unknown") when the period has
  // no ad rows at all, since there is nothing to certify as complete.
  isFullyPresent: boolean
  hasAdRecords: boolean
  hasOrganicRecords: boolean
}

// Reliable requires all three of §3.1's conditions; Rough guide is anything
// sound but limited (any one of them missing); Weak signal is decided
// earlier, before this runs, whenever there isn't even a valid delta to
// report (see the null-delta branch below) — unchanged by this widening.
function classifyConfidence(
  isConsecutive: boolean,
  prev: PeriodDataCompleteness | undefined,
  curr: PeriodDataCompleteness | undefined,
): Confidence {
  if (!isConsecutive || !prev || !curr) return 'medium'
  const bothFullyPresent = prev.isFullyPresent && curr.isFullyPresent
  const bothHaveBothSources = prev.hasAdRecords && prev.hasOrganicRecords && curr.hasAdRecords && curr.hasOrganicRecords
  return bothFullyPresent && bothHaveBothSources ? 'high' : 'medium'
}

export function computeTrendInsight(
  periods: TrendPeriodPoint[],
  isConsecutive: boolean,
  completeness: PeriodDataCompleteness[] = [],
): TrendInsight | null {
  const lastTwo = periods.slice(-2)
  if (lastTwo.length < 2) return null
  const [prev, curr] = lastTwo
  const [prevCompleteness, currCompleteness] = completeness.slice(-2)

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
      detail: 'Upload more ad data with messaging conversation counts to see a period-over-period trend.',
    }
  }

  const prevCpi = prev.total_inquiries > 0 ? prev.total_spend / prev.total_inquiries : null
  const currCpi = curr.total_inquiries > 0 ? curr.total_spend / curr.total_inquiries : null

  const spendDir = spendDelta >= 0 ? 'up' : 'down'
  const inquiryDir = inquiryDelta >= 0 ? 'up' : 'down'
  const headline = `Spend is ${spendDir} ${Math.abs(spendDelta).toFixed(0)}%, messaging conversations are ${inquiryDir} ${Math.abs(inquiryDelta).toFixed(0)}% from ${prev.period} to ${curr.period}`

  const detailParts: string[] = []
  if (prevCpi !== null && currCpi !== null) {
    const cpiWord = currCpi > prevCpi ? 'up from' : currCpi < prevCpi ? 'down from' : 'about the same as'
    detailParts.push(
      `Each messaging conversation cost ₱${Math.round(currCpi).toLocaleString()} in ${curr.period}, ${cpiWord} ₱${Math.round(prevCpi).toLocaleString()} in ${prev.period}.`
    )
  }
  if (!isConsecutive) {
    detailParts.push(`Note: ${prev.period} and ${curr.period} are not consecutive months, so this comparison spans a gap in the uploaded data.`)
  }

  return {
    confidence: classifyConfidence(isConsecutive, prevCompleteness, currCompleteness),
    headline,
    detail: detailParts.join(' '),
  }
}
