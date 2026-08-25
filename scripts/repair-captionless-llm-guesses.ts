import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { resolveCaption } from '../lib/keywords/caption'
import { captionWordCount } from '../lib/categorize/flag-reasons'
import { recomputeQueueFlagReasons } from '../lib/data/category-flags'

// Code review (2026-08-26) on the classify-posts.ts captionless-abstention
// fix (docs/raven-review/FR07_Review_Row_Compliance.md §1) — the fix only
// changes behavior for future runLlmClassification() calls. The posts that
// motivated it already carry a *guessed* category_llm from before the fix
// (runLlmClassification's selection query is `category_llm: null`, so a
// post with any category_llm, guessed or not, is never re-picked up). This
// repairs those existing rows: nulls category_llm/category_llm_model for
// every captionless post so the next classification run re-derives them
// under the corrected pre-filter, then recomputes queue flags so any
// DISAGREEMENT flag that was only true because of the stale guess clears
// immediately rather than waiting for the next LLM run.
//
// Not scoped by study period — the corruption isn't scoped that way either,
// and this only ever nulls a value, never fabricates one.
//
// USAGE
//   npx tsx scripts/repair-captionless-llm-guesses.ts --dry-run
//   npx tsx scripts/repair-captionless-llm-guesses.ts

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const posts = await prisma.facebookPost.findMany({
    where: { category_llm: { not: null } },
    select: { id: true, title: true, description: true, category_llm: true, category_final: true },
  })

  const captionless = posts.filter((p) => captionWordCount(resolveCaption(p.title, p.description)) === 0)

  console.log(`${captionless.length} post(s) have a captionless post with a non-null category_llm.`)
  for (const p of captionless) {
    console.log(`  id=${p.id} category_llm=${p.category_llm} category_final=${p.category_final ?? '(null, in queue)'}`)
  }

  if (dryRun || captionless.length === 0) {
    console.log(dryRun ? '\nDry run — no writes made.' : 'Nothing to repair.')
    await prisma.$disconnect()
    return
  }

  const result = await prisma.facebookPost.updateMany({
    where: { id: { in: captionless.map((p) => p.id) } },
    data: { category_llm: null, category_llm_model: null },
  })
  console.log(`\nRows updated: ${result.count}`)

  await recomputeQueueFlagReasons()
  console.log('Queue flag reasons recomputed.')

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
