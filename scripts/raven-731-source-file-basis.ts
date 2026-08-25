import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  const uploads = await prisma.uploadLog.findMany({
    where: { upload_type: 'POSTS_CSV', records_inserted: { gt: 0 } },
    orderBy: { uploaded_at: 'asc' },
    select: { filename: true, records_inserted: true },
  })
  for (const u of uploads) console.log(u.filename, u.records_inserted)
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
