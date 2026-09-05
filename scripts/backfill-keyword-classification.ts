// docs/raven/Keyword_Backfill_Approved.md §2 — the 23 Aug lexicon revert
// (revert-lexicon-to-seed.ts) deleted Keyword rows but deliberately left
// every post's already-computed category_keyword untouched, and
// autoCategorizeAll() only fills posts where category_keyword IS NULL — so
// any post classified before the revert was frozen at whatever the lexicon
// looked like on that day, with nothing in the running system able to
// refresh it. This recomputes category_keyword for every post whose
// category_final is already set (the finalised set — cannot reach the open
// review queue or the 12 demonstration holdback posts, which all have
// category_final: null) against the CURRENT live Keyword table, and stamps
// category_keyword_lexicon_count on every row it touches so a future
// divergence between stored suggestion and live lexicon is detectable
// instead of silent (the same reasoning behind that column existing at all).
//
// Read-before-write, same convention as revert-lexicon-to-seed.ts: dry run
// by default, --confirm to write.
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { detectCategoryFromText } from '../lib/keywords/detect'
import { resolveCaption } from '../lib/keywords/caption'
import { CATEGORY_NAME_TO_LABEL } from '../lib/category-label'
import type { CategoryLabel } from '../app/generated/prisma/client'

async function main() {
  const confirm = process.argv.includes('--confirm')
  const dryRun = !confirm

  const [posts, keywordRows] = await Promise.all([
    prisma.facebookPost.findMany({
      where: { category_final: { not: null } },
      select: { id: true, post_id: true, title: true, description: true, category_keyword: true },
    }),
    prisma.keyword.findMany({ include: { category: true } }),
  ])

  const keywords = keywordRows
    .map((k) => {
      const label = CATEGORY_NAME_TO_LABEL[k.category.name]
      return label ? { word: k.word, label } : null
    })
    .filter((k): k is { word: string; label: CategoryLabel } => k !== null)

  const lexiconTermCount = keywordRows.length
  console.log(`live Keyword table: ${lexiconTermCount} rows`)
  console.log(`scoped posts (category_final NOT NULL): ${posts.length}`)

  const resolved = posts.map((post) => {
    const caption = resolveCaption(post.title, post.description)
    const fresh = detectCategoryFromText(caption, keywords).label
    return { post, fresh }
  })

  const changes = resolved
    .filter(({ post, fresh }) => fresh !== post.category_keyword)
    .map(({ post, fresh }) => ({ id: post.id, post_id: post.post_id, before: post.category_keyword, after: fresh }))

  console.log(`\nrows whose category_keyword would change: ${changes.length}`)
  console.log('sample (up to 10):')
  for (const c of changes.slice(0, 10)) {
    console.log(`  ${c.post_id}: ${c.before ?? 'NULL'} -> ${c.after}`)
  }

  if (dryRun) {
    console.log('\nDry run (default): no changes made. Re-run with --confirm to write.')
    await prisma.$disconnect()
    return
  }

  // Chunked, not one Promise.all across ~700 rows — a single unbounded batch
  // risks exhausting the Neon connection pool, and a mid-flight failure would
  // leave the table half-backfilled with no way to tell which rows landed.
  const CHUNK_SIZE = 25
  for (let i = 0; i < resolved.length; i += CHUNK_SIZE) {
    const chunk = resolved.slice(i, i + CHUNK_SIZE)
    await prisma.$transaction(
      chunk.map(({ post, fresh }) =>
        prisma.facebookPost.update({
          where: { id: post.id },
          data: { category_keyword: fresh, category_keyword_lexicon_count: lexiconTermCount },
        })
      )
    )
  }

  console.log(`\nBackfilled ${posts.length} rows (${changes.length} value changes), stamped category_keyword_lexicon_count=${lexiconTermCount} on all of them.`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
