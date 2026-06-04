export interface ForecastHistoryPoint {
  date: string
  value: number
  ma: number | null  // Holt-Winters fitted value (or Holt linear if < 14 points)
}

export interface ForecastPoint {
  date: string
  forecastValue: number
}

export interface HoltWintersForecastResult {
  history: ForecastHistoryPoint[]
  forecast: ForecastPoint[]
  lastLevel: number
  lastTrend: number
  period: number
  method: 'holt-winters' | 'holt-linear'
}

// Double exponential smoothing (Holt linear) — fallback when n < 2*period
function holtLinear(
  clean: Array<{ date: string; value: number }>,
  alpha: number,
  beta: number,
  horizon: number,
): HoltWintersForecastResult {
  let L = clean[0].value
  let b = clean.length >= 2 ? clean[1].value - clean[0].value : 0

  const fitted: number[] = []
  for (const { value } of clean) {
    const prevL = L
    L = alpha * value + (1 - alpha) * (L + b)
    b = beta * (L - prevL) + (1 - beta) * b
    fitted.push(Math.round(L))
  }

  const history: ForecastHistoryPoint[] = clean.map((d, i) => ({
    date: d.date,
    value: d.value,
    ma: fitted[i],
  }))

  const lastDateStr = clean.at(-1)!.date
  const forecast: ForecastPoint[] = []
  for (let h = 1; h <= horizon; h++) {
    const d = new Date(lastDateStr)
    d.setDate(d.getDate() + h)
    forecast.push({
      date: d.toISOString().slice(0, 10),
      forecastValue: Math.max(0, Math.round(L + h * b)),
    })
  }

  return { history, forecast, lastLevel: L, lastTrend: b, period: 1, method: 'holt-linear' }
}

/**
 * Holt-Winters Triple Exponential Smoothing (additive seasonality).
 * Falls back to Holt linear (double) when n < 2 * period.
 *
 * α=0.3 (level), β=0.1 (trend), γ=0.3 (seasonal), period=7 (weekly)
 */
export function computeHoltWintersForecast(
  data: Array<{ date: Date; value: number | null }>,
  period = 7,
  horizon = 7,
  alpha = 0.3,
  beta = 0.1,
  gamma = 0.3,
): HoltWintersForecastResult {
  const clean = data
    .filter(d => d.value !== null)
    .map(d => ({ date: d.date.toISOString().slice(0, 10), value: d.value as number }))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (clean.length === 0) {
    return { history: [], forecast: [], lastLevel: 0, lastTrend: 0, period, method: 'holt-winters' }
  }

  if (clean.length < 2 * period) {
    return holtLinear(clean, alpha, beta, horizon)
  }

  // Initialization: level from first period mean, trend from slope between first two periods
  const firstMean = clean.slice(0, period).reduce((s, d) => s + d.value, 0) / period
  const secondMean = clean.slice(period, 2 * period).reduce((s, d) => s + d.value, 0) / period

  let L = firstMean
  let b = (secondMean - firstMean) / period

  // Additive seasonal factors: initial deviation from level
  const S: number[] = clean.slice(0, period).map(d => d.value - L)

  const n = clean.length
  const fitted: number[] = []

  for (let t = 0; t < n; t++) {
    const sIdx = t % period
    const prevL = L
    const y = clean[t].value

    fitted.push(Math.round(L + b + S[sIdx]))

    const newL = alpha * (y - S[sIdx]) + (1 - alpha) * (L + b)
    b = beta * (newL - prevL) + (1 - beta) * b
    S[sIdx] = gamma * (y - newL) + (1 - gamma) * S[sIdx]
    L = newL
  }

  const history: ForecastHistoryPoint[] = clean.map((d, i) => ({
    date: d.date,
    value: d.value,
    ma: fitted[i],
  }))

  const lastDateStr = clean.at(-1)!.date
  const forecast: ForecastPoint[] = []

  for (let h = 1; h <= horizon; h++) {
    const sIdx = (n - 1 + h) % period
    const forecastVal = L + h * b + S[sIdx]
    const d = new Date(lastDateStr)
    d.setDate(d.getDate() + h)
    forecast.push({
      date: d.toISOString().slice(0, 10),
      forecastValue: Math.max(0, Math.round(forecastVal)),
    })
  }

  return { history, forecast, lastLevel: L, lastTrend: b, period, method: 'holt-winters' }
}
