import type { HoltWintersForecastResult } from '@/lib/stats/forecast'

export interface ForecastInsight {
  direction: 'up' | 'down' | 'flat'
  pctPerWeek: number
  nextWeekAvg: number
  strongestDayLabel: string | null
  headline: string
  detail: string
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const FLAT_THRESHOLD_PCT = 2

export function computeForecastInsight(
  forecast: HoltWintersForecastResult,
  metricLabel: string,
): ForecastInsight | null {
  if (forecast.history.length === 0) return null

  const { lastLevel: level, lastTrend: trend } = forecast
  const pctPerWeek = level !== 0 ? (trend * 7 / level) * 100 : 0

  let direction: ForecastInsight['direction'] = 'flat'
  if (pctPerWeek > FLAT_THRESHOLD_PCT) direction = 'up'
  else if (pctPerWeek < -FLAT_THRESHOLD_PCT) direction = 'down'

  const nextWeekAvg = forecast.forecast.length > 0
    ? Math.round(forecast.forecast.reduce((s, f) => s + f.forecastValue, 0) / forecast.forecast.length)
    : Math.round(level)

  let strongestDayLabel: string | null = null
  if (forecast.forecast.length >= 7) {
    const best = forecast.forecast.reduce((a, b) => (b.forecastValue > a.forecastValue ? b : a))
    strongestDayLabel = DAY_NAMES[new Date(best.date).getDay()]
  }

  const headline = direction === 'flat'
    ? `${metricLabel} are holding steady`
    : `${metricLabel} are trending ${direction} about ${Math.abs(pctPerWeek).toFixed(0)}% per week`

  const detailParts = [`Expect around ${nextWeekAvg.toLocaleString()}/day over the next 7 days.`]
  if (strongestDayLabel) {
    detailParts.push(`${strongestDayLabel}s are consistently the strongest day.`)
  }

  return {
    direction,
    pctPerWeek,
    nextWeekAvg,
    strongestDayLabel,
    headline,
    detail: detailParts.join(' '),
  }
}
