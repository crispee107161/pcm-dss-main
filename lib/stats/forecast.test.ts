import { describe, it, expect } from 'vitest'
import { computeHoltWintersForecast } from './forecast'

function days(n: number, valueFn: (i: number) => number, startDate = '2026-01-01') {
  const start = new Date(startDate)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return { date: d, value: valueFn(i) }
  })
}

describe('computeHoltWintersForecast', () => {
  it('returns empty result for no data', () => {
    const result = computeHoltWintersForecast([])
    expect(result.history).toEqual([])
    expect(result.forecast).toEqual([])
    expect(result.lastLevel).toBe(0)
  })

  it('falls back to Holt linear when n < 2 * period', () => {
    // period defaults to 7, so 2*period = 14; 10 points is below the threshold.
    const data = days(10, (i) => 10 + i)
    const result = computeHoltWintersForecast(data)

    expect(result.method).toBe('holt-linear')
    expect(result.history).toHaveLength(10)
    expect(result.forecast).toHaveLength(7) // default horizon
  })

  it('uses Holt-Winters once n >= 2 * period', () => {
    const data = days(14, (i) => 10 + i)
    const result = computeHoltWintersForecast(data)
    expect(result.method).toBe('holt-winters')
  })

  it('holds a flat, seasonless series exactly constant in both fit and forecast', () => {
    // A constant series has zero trend and zero seasonal deviation, so the
    // level should stay locked at 100 throughout — any drift here would mean
    // the smoothing update or seasonal-index math is wrong.
    const data = days(21, () => 100)
    const result = computeHoltWintersForecast(data, 7, 5)

    expect(result.method).toBe('holt-winters')
    for (const point of result.history) {
      expect(point.ma).toBe(100)
    }
    for (const point of result.forecast) {
      expect(point.forecastValue).toBe(100)
    }
  })

  it('produces forecast dates that increment by one day from the last history date', () => {
    const data = days(14, (i) => 10 + i)
    const result = computeHoltWintersForecast(data, 7, 3)

    expect(result.forecast).toHaveLength(3)
    expect(result.forecast[0].date).toBe('2026-01-15') // day after the 14th input day (Jan 1 + 13)
    expect(result.forecast[1].date).toBe('2026-01-16')
    expect(result.forecast[2].date).toBe('2026-01-17')
  })

  it('never forecasts a negative value even for a sharply declining series', () => {
    const data = days(14, (i) => Math.max(0, 100 - i * 20))
    const result = computeHoltWintersForecast(data, 7, 5)

    for (const point of result.forecast) {
      expect(point.forecastValue).toBeGreaterThanOrEqual(0)
    }
  })

  it('filters out null values before computing', () => {
    const data = [
      { date: new Date('2026-01-01'), value: 10 },
      { date: new Date('2026-01-02'), value: null },
      { date: new Date('2026-01-03'), value: 30 },
    ]
    const result = computeHoltWintersForecast(data)
    expect(result.history).toHaveLength(2)
    expect(result.history.map((h) => h.value)).toEqual([10, 30])
  })
})
