// docs/raven/Provenance_Followup_and_Revised_Order.md §2.2, Option A —
// "Revert the live table to the 50-term seed and freeze it there. Evaluated
// equals delivered." This deletes every `Keyword` row not in the seed list
// below (kept in sync with prisma/seed.ts's inline `keywordMappings`, not
// re-derived from it, since the seed script also creates categories/users
// and pulling in the wrong half would be more fragile than duplicating 50
// short strings once).
//
// Safe to run: `Keyword` has no incoming FK from `FacebookPost` — posts
// store `category_keyword` as a `CategoryLabel` enum value written by
// lib/keywords/detect.ts at classification time, not a live reference to
// any Keyword row. Deleting extra Keyword rows does not change any post's
// already-computed category_keyword; it only changes what a *future*
// `autoCategorizeAll()` run would compute.
//
// Read-before-write: reports the current count and the exact terms about to
// be removed before deleting anything, so this can be sanity-checked against
// docs/raven/Keyword_Lexicon_Snapshot_2026-08-22.md (the live-93 snapshot)
// before confirming.
import 'dotenv/config'
import { prisma } from '../lib/prisma'

const SEED_KEYWORDS: Record<string, string[]> = {
  'Product Showcase': [
    'available', 'new arrival', 'introducing', 'now available', 'check out',
    'shop now', 'pc set', 'ryzen', 'gaming', 'laptop', 'cctv', 'camera',
    'comshop', 'computer shop', 'monitor', 'keyboard', 'mouse',
  ],
  'Testimonial': [
    'testimonial', 'customer', 'review', 'feedback', 'satisfied',
    'happy', 'client', 'legit', 'legit seller', 'trusted',
  ],
  'Promotional Offer': [
    'sale', 'promo', 'discount', 'off', 'deal', 'offer', 'free',
    'limited', 'bundle', 'package', 'savings', 'special', 'treat',
  ],
  'Entertainment': [
    'meme', 'funny', 'giveaway', 'contest', 'raffle', 'trivia', 'quiz',
    'fun fact', 'behind the scenes', 'vlog',
  ],
}
const SEED_WORDS = new Set(Object.values(SEED_KEYWORDS).flat())

async function main() {
  // Code review (2026-08-23) — a destructive script should require an
  // explicit flag to write, not an explicit flag to preview. This already
  // only ever deleted (has since it was written) after passing the
  // full-seed-match guard below, but defaulting to a dry run and requiring
  // --confirm to actually delete is the safer default for a script that
  // mutates a real, already-run-once database.
  const confirm = process.argv.includes('--confirm')
  const dryRun = !confirm

  const all = await prisma.keyword.findMany({ include: { category: true }, orderBy: { word: 'asc' } })
  console.log('current live lexicon size:', all.length, '(seed target:', SEED_WORDS.size, 'terms)')

  const toDelete = all.filter((k) => !SEED_WORDS.has(k.word))
  const toKeep = all.filter((k) => SEED_WORDS.has(k.word))

  console.log(`\nwill KEEP ${toKeep.length} terms (should equal seed size, ${SEED_WORDS.size}):`)
  const missingFromLive = [...SEED_WORDS].filter((w) => !all.some((k) => k.word === w))
  if (missingFromLive.length > 0) {
    console.log('WARNING — these seed terms are not currently in the live table (upsert will be needed, not just delete):', missingFromLive)
  }

  console.log(`\nwill DELETE ${toDelete.length} terms:`)
  for (const k of toDelete) console.log(`  "${k.word}" (${k.category.name})`)

  if (dryRun) {
    console.log('\nDry run (default): no changes made. Re-run with --confirm to actually delete the terms listed above.')
    await prisma.$disconnect()
    return
  }

  if (toKeep.length !== SEED_WORDS.size || missingFromLive.length > 0) {
    console.error('\nABORTING: live table does not cleanly contain the full 50-term seed set. Resolve the mismatch above before reverting (do not delete blind).')
    await prisma.$disconnect()
    process.exit(1)
  }

  const result = await prisma.keyword.deleteMany({ where: { id: { in: toDelete.map((k) => k.id) } } })
  console.log(`\nDeleted ${result.count} keyword rows.`)

  const finalCount = await prisma.keyword.count()
  console.log('live lexicon size after revert:', finalCount)
  if (finalCount !== SEED_WORDS.size) {
    console.error(`WARNING: expected ${SEED_WORDS.size} after revert, got ${finalCount}`)
    process.exit(1)
  }

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
