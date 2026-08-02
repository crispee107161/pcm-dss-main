import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'
import { computeHoltWintersForecast } from '../lib/stats/forecast'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const HORIZON = 7 // matches production usage: computeHoltWintersForecast(data, 7, 7)
const PERIOD = 7

function metrics(actual: number[], predicted: number[]) {
  const n = actual.length
  const errors = actual.map((a, i) => predicted[i] - a)
  const mae = errors.reduce((s, e) => s + Math.abs(e), 0) / n
  const rmse = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / n)
  const mapeInputs = actual.map((a, i) => (a === 0 ? null : Math.abs(errors[i] / a)))
  const validMape = mapeInputs.filter((v): v is number => v !== null)
  const mape = validMape.length > 0 ? (validMape.reduce((s, v) => s + v, 0) / validMape.length) * 100 : null
  return { mae, rmse, mape }
}

async function main() {
  const rows = await prisma.pageMetricDaily.findMany({
    orderBy: { date: 'asc' },
    select: { date: true, views: true },
  })

  console.log(`Total PageMetricDaily rows: ${rows.length}`)
  if (rows.length < PERIOD + HORIZON) {
    console.log(`Need at least ${PERIOD + HORIZON} days for a ${HORIZON}-day holdout backtest with a full training period. Skipping.`)
    return
  }

  const trainRows = rows.slice(0, rows.length - HORIZON)
  const testRows = rows.slice(rows.length - HORIZON)

  console.log(`Train: ${trainRows.length} days (${trainRows[0].date.toISOString().slice(0, 10)} -> ${trainRows.at(-1)!.date.toISOString().slice(0, 10)})`)
  console.log(`Test:  ${testRows.length} days (${testRows[0].date.toISOString().slice(0, 10)} -> ${testRows.at(-1)!.date.toISOString().slice(0, 10)})`)

  const result = computeHoltWintersForecast(
    trainRows.map(r => ({ date: r.date, value: r.views })),
    PERIOD, HORIZON,
  )
  console.log(`Method used: ${result.method}${result.method === 'holt-linear' ? ' (fallback — training set < 2*period)' : ''}`)

  const actualViews = testRows.map(r => r.views ?? 0)
  const hwForecast = result.forecast.map(f => f.forecastValue)

  // Naive baseline: repeat the last known value for every day of the horizon.
  const lastKnown = trainRows.at(-1)!.views ?? 0
  const naiveForecast = testRows.map(() => lastKnown)

  // Seasonal-naive baseline: value from the same weekday one period (7 days) ago.
  const seasonalNaiveForecast = testRows.map((_, i) => {
    const idx = trainRows.length - PERIOD + i
    return trainRows[idx]?.views ?? lastKnown
  })

  console.log('\nDay-by-day (actual vs. Holt-Winters vs. naive vs. seasonal-naive):')
  testRows.forEach((r, i) => {
    console.log(
      `  ${r.date.toISOString().slice(0, 10)}  actual=${actualViews[i]}  hw=${hwForecast[i]}  naive=${naiveForecast[i]}  seasonalNaive=${seasonalNaiveForecast[i]}`
    )
  })

  const hwMetrics = metrics(actualViews, hwForecast)
  const naiveMetrics = metrics(actualViews, naiveForecast)
  const seasonalMetrics = metrics(actualViews, seasonalNaiveForecast)

  console.log('\nSummary (lower is better):')
  console.log(`  Holt-Winters    -> MAE=${hwMetrics.mae.toFixed(2)}  RMSE=${hwMetrics.rmse.toFixed(2)}  MAPE=${hwMetrics.mape?.toFixed(1) ?? 'n/a'}%`)
  console.log(`  Naive (flat)    -> MAE=${naiveMetrics.mae.toFixed(2)}  RMSE=${naiveMetrics.rmse.toFixed(2)}  MAPE=${naiveMetrics.mape?.toFixed(1) ?? 'n/a'}%`)
  console.log(`  Seasonal-naive  -> MAE=${seasonalMetrics.mae.toFixed(2)}  RMSE=${seasonalMetrics.rmse.toFixed(2)}  MAPE=${seasonalMetrics.mape?.toFixed(1) ?? 'n/a'}%`)

  const verdict = hwMetrics.rmse < naiveMetrics.rmse && hwMetrics.rmse < seasonalMetrics.rmse
    ? 'Holt-Winters beats both naive baselines on this holdout.'
    : 'Holt-Winters does NOT clearly beat a naive baseline on this holdout — treat forecasts with caution.'
  console.log(`\nVerdict: ${verdict}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
