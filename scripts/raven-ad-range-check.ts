import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  const [minMax, totalSpend, allStarts] = await Promise.all([
    prisma.ad.aggregate({ _min: { reporting_starts: true }, _max: { reporting_starts: true } }),
    prisma.ad.aggregate({ _sum: { amount_spent: true } }),
    prisma.ad.findMany({ select: { reporting_starts: true } }),
  ])

  const months = new Set(allStarts.map(a => `${a.reporting_starts.getFullYear()}-${String(a.reporting_starts.getMonth() + 1).padStart(2, '0')}`))

  console.log('min reporting_starts:', minMax._min.reporting_starts?.toISOString())
  console.log('max reporting_starts:', minMax._max.reporting_starts?.toISOString())
  console.log('distinct months:', months.size)
  console.log('total amount_spent:', totalSpend._sum.amount_spent?.toFixed(2))
}

main().finally(() => prisma.$disconnect())
