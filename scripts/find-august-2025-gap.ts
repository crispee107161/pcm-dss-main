// One-off diagnostic for docs/raven/August_2025_Gap_and_Revised_Order.md §2.1
// — diffs the DB's August 2025 FacebookPost rows against Raven's 51 canonical
// post_ids from the raw export to find the extra post accounting for the
// 731-vs-730 gap. Read-only: no Prisma write calls.
import 'dotenv/config'
import { prisma } from '../lib/prisma'

const RAVEN_51 = new Set([
  '1143183467831544', '1143992261083998', '1144620944354463', '1144657814350776', '1145399880943236',
  '1146260720857152', '1147051864111371', '1147215077428383', '1147807227369168', '1148597307290160',
  '1148682687281622', '1148717527278138', '1149359147213976', '1149526623863895', '1150125677137323',
  '1151841726965718', '1151856600297564', '1151882130295011', '1151920496957841', '1151998363616721',
  '1152671320216092', '1152732216876669', '1153456963470861', '1153511516798739', '1153653996784491',
  '1154356133380944', '1154401640043060', '1157564366393454', '1157674446382446', '1158327189650505',
  '1158533912963166', '1159153516234539', '1159254506224440', '1159335216216369', '1159977542818803',
  '1160115492805008', '1160823646067526', '1160898422726715', '1163352475814643', '1163388009144423',
  '1164213689061855', '1164256579057566', '1164997688983455', '1165122022304355', '1165187055631185',
  '1165771252239432', '1166514915498399', '1166585345491356', '1167150692101488', '1167151252101432',
  '1167917848691439',
])

// publish_time is stored as UTC, anchored to Manila local at ingestion —
// August 2025 in Manila local, upper bound exclusive.
const AUG_START = new Date('2025-08-01T00:00:00.000+08:00')
const AUG_END = new Date('2025-09-01T00:00:00.000+08:00')

async function main() {
  const augustPosts = await prisma.facebookPost.findMany({
    where: { publish_time: { gte: AUG_START, lt: AUG_END } },
    select: {
      id: true, post_id: true, publish_time: true, title: true, description: true,
      post_type: true, category_final_source: true, created_at: true,
    },
    orderBy: { publish_time: 'asc' },
  })
  console.log('DB August 2025 (Manila) count:', augustPosts.length)

  const extra = augustPosts.filter((p) => !RAVEN_51.has(p.post_id))
  console.log('Posts in DB not in Raven\'s 51:', extra.length)
  for (const p of extra) console.log(JSON.stringify(p, (_k, v) => v, 2))

  const dbIds = new Set(augustPosts.map((p) => p.post_id))
  const missing = [...RAVEN_51].filter((id) => !dbIds.has(id))
  console.log('Raven IDs not found in DB:', missing.length, missing)

  if (extra.length === 1) {
    const uploadLogs = await prisma.uploadLog.findMany({
      where: { upload_type: 'POSTS_CSV' },
      orderBy: { uploaded_at: 'asc' },
      select: { id: true, uploaded_at: true, filename: true, records_inserted: true, records_updated: true, user: { select: { email: true } } },
    })
    console.log('\nAll POSTS_CSV UploadLog entries (for correlating which upload inserted the extra post):')
    for (const log of uploadLogs) console.log(JSON.stringify(log))
  }
}

main().finally(() => prisma.$disconnect())
