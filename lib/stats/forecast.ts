export interface ForecastHistoryPoint {
  date: string
  value: number
  ma: number | null
}

export interface ForecastPoint {
  date: string
  forecastValue: number
}

export interface MovingAverageForecastResult {
  history: ForecastHistoryPoint[]
  forecast: ForecastPoint[]
  lastMA: number
  window: number
}

export function computeMovingAverageForecast(
  data: Array<{ date: Date; value: number | null }>,
  window = 7,
  horizon = 7
): MovingAverageForecastResult {
  const clean = data
    .filter(d => d.value !== null)
    .map(d => ({ date: d.date.toISOString().slice(0, 10), value: d.value as number }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const history: ForecastHistoryPoint[] = clean.map((d, i) => {
    if (i < window - 1) return { date: d.date, value: d.value, ma: null }
    const slice = clean.slice(i - window + 1, i + 1)
    const ma = slice.reduce((s, x) => s + x.value, 0) / window
    return { date: d.date, value: d.value, ma: Math.round(ma) }
  })

  const validMAs = history.filter(h => h.ma !== null)
  const lastMA = validMAs.length > 0
    ? (validMAs.at(-1)!.ma as number)
    : (clean.at(-1)?.value ?? 0)

  const lastDateStr = clean.at(-1)?.date
  const forecast: ForecastPoint[] = []

  if (lastDateStr) {
    for (let i = 1; i <= horizon; i++) {
      const d = new Date(lastDateStr)
      d.setDate(d.getDate() + i)
      forecast.push({
        date: d.toISOString().slice(0, 10),
        forecastValue: Math.round(lastMA),
      })
    }
  }

  return { history, forecast, lastMA, window }
}
