// Read-only: Manila publish-month counts for all FacebookPost rows.
import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  const all = await prisma.facebookPost.findMany({ select: { publish_time: true } })
  const counts = new Map<string, number>()
  for (const p of all) {
    const manila = new Date(p.publish_time.getTime() + 8 * 60 * 60 * 1000)
    const key = `${manila.getUTCFullYear()}-${String(manila.getUTCMonth() + 1).padStart(2, '0')}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  for (const [m, c] of [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))) console.log(m, c)
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
