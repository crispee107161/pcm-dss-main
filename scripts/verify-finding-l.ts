import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { STUDY_PERIOD_POST_WHERE } from '@/lib/data/study-period'
import { computeCategorySignificance, groupEngagementRatesByCategory } from '@/lib/stats/category-significance'
import { CATEGORY_LABEL_DISPLAY } from '@/lib/category-label'

// code-review-analyst (MEDIUM-1, 2026-09-06): grouping now shared with
// lib/data/analysis.ts via groupEngagementRatesByCategory, so this script
// actually proves the app's own load path runs the test on the population it
// displays, instead of independently re-implementing (and potentially
// drifting from) that same loop.
async function main() {
  const posts = await prisma.facebookPost.findMany({
    where: STUDY_PERIOD_POST_WHERE,
    select: { engagement_rate: true, category_final: true },
  })

  const groups = groupEngagementRatesByCategory(posts)

  console.log('Total posts in study period:', posts.length)
  console.log('Group sizes:', groups.map(g => `${g.category}=${g.values.length}`).join(', '))

  const result = computeCategorySignificance(groups)
  if (!result) {
    console.log('Not enough data for the test.')
    return
  }

  console.log(`H = ${result.h.toFixed(4)}, df = ${result.df}, p = ${result.p}`)
  for (const pair of result.pairwise) {
    console.log(
      `${CATEGORY_LABEL_DISPLAY[pair.a]} vs ${CATEGORY_LABEL_DISPLAY[pair.b]}: raw p = ${pair.rawP.toFixed(4)}, adjusted p = ${pair.adjustedP.toFixed(4)}, significant = ${pair.significant}`
    )
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async err => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
