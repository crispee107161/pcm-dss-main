// Finding L (docs/raven/analysis-tab-finding-l-memo.md §1) — the category
// panel's headline named a "highest"/"lowest" category by median alone, with
// no test behind the claim. This runs the rank-based test Raven verified
// independently against the reconciled labels (Kruskal-Wallis across all
// categories, pairwise Mann-Whitney with Holm-Bonferroni follow-up), so the
// headline can state whether a difference is actually distinguishable at
// this sample size rather than asserting it from medians alone.
//
// Run on exactly the population the panel displays (§1.2: not 707, the
// inter-coder reliability set, and not whatever subset either side of the
// review could individually reach) — callers pass the same rows already
// shown in the category table.

import type { CategoryLabel } from '@/app/generated/prisma/client'
import { chiSquareUpperTail, normalTwoTailedPValue } from './normal-dist'
import { isNonCategoryLabel } from './analysis-narrative'

// code-review-analyst (MEDIUM-1, 2026-09-06): the one place this grouping is
// done, shared by lib/data/analysis.ts (the app's own load path) and
// scripts/verify-finding-l.ts (the independent live-DB check) — the whole
// point of that script is proving the app runs the test on the population it
// displays, which only holds if both actually call the same code rather
// than keeping two hand-maintained copies of this loop in sync.
export function groupEngagementRatesByCategory(
  posts: { category_final: CategoryLabel | null; engagement_rate: number }[]
): { category: CategoryLabel; values: number[] }[] {
  const byCategory = new Map<CategoryLabel, number[]>()
  for (const post of posts) {
    const label = post.category_final
    if (label === null || isNonCategoryLabel(label)) continue
    const group = byCategory.get(label)
    if (group) group.push(post.engagement_rate)
    else byCategory.set(label, [post.engagement_rate])
  }
  return [...byCategory.entries()].map(([category, values]) => ({ category, values }))
}

export interface PairwiseComparison {
  a: CategoryLabel
  b: CategoryLabel
  rawP: number
  adjustedP: number
  significant: boolean
}

export interface CategorySignificanceResult {
  n: number
  groups: { category: CategoryLabel; n: number }[]
  h: number
  df: number
  p: number
  significant: boolean
  pairwise: PairwiseComparison[]
}

// Average-rank tie handling, self-contained rather than reused from
// spearman.ts (which imports `prisma` at module scope) — this stays a pure
// function with no DB dependency.
function averageRanks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const ranks = new Array<number>(values.length)
  let i = 0
  while (i < indexed.length) {
    let j = i
    while (j < indexed.length && indexed[j].v === indexed[i].v) j++
    const avgRank = (i + 1 + j) / 2
    for (let k = i; k < j; k++) ranks[indexed[k].i] = avgRank
    i = j
  }
  return ranks
}

// Sum of (t^3 - t) across tied groups, the standard tie-correction term
// shared by both Kruskal-Wallis and the Mann-Whitney normal approximation.
function tieCorrectionSum(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  let sum = 0
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j < sorted.length && sorted[j] === sorted[i]) j++
    const t = j - i
    if (t > 1) sum += t ** 3 - t
    i = j
  }
  return sum
}

function kruskalWallis(groups: number[][]): { h: number; df: number; p: number } {
  const n = groups.reduce((s, g) => s + g.length, 0)
  const allValues = groups.flat()
  const allRanks = averageRanks(allValues)

  let offset = 0
  let sumRankSqOverN = 0
  for (const group of groups) {
    const groupRanks = allRanks.slice(offset, offset + group.length)
    const rankSum = groupRanks.reduce((s, r) => s + r, 0)
    sumRankSqOverN += (rankSum * rankSum) / group.length
    offset += group.length
  }

  const hRaw = (12 / (n * (n + 1))) * sumRankSqOverN - 3 * (n + 1)
  const tieSum = tieCorrectionSum(allValues)
  const tieCorrection = 1 - tieSum / (n ** 3 - n)
  const h = tieCorrection === 0 ? 0 : hRaw / tieCorrection

  const df = groups.length - 1
  const p = chiSquareUpperTail(h, df)
  return { h, df, p }
}

// Mann-Whitney U, normal approximation with tie and continuity correction —
// the same pairwise procedure the finding-L memo's reference figures use
// (§1: "your pairing is the right one," Mann-Whitney over Dunn).
function mannWhitneyP(a: number[], b: number[]): number {
  const n1 = a.length
  const n2 = b.length
  const combined = [...a, ...b]
  const ranks = averageRanks(combined)
  const rankSumA = ranks.slice(0, n1).reduce((s, r) => s + r, 0)

  const u1 = rankSumA - (n1 * (n1 + 1)) / 2
  const meanU = (n1 * n2) / 2

  const n = n1 + n2
  const tieSum = tieCorrectionSum(combined)
  const varianceU = (n1 * n2 * (n + 1 - tieSum / (n * (n - 1)))) / 12
  if (varianceU <= 0) return 1

  const sigmaU = Math.sqrt(varianceU)
  const diff = u1 - meanU
  const continuity = diff > 0 ? -0.5 : diff < 0 ? 0.5 : 0
  const z = (diff + continuity) / sigmaU
  return normalTwoTailedPValue(z)
}

// Holm-Bonferroni step-down: sort ascending, multiply the i-th smallest raw
// p by (m - i), enforcing monotonicity (each adjusted p is at least as large
// as the one before it) so a later, larger raw p can't produce a smaller
// adjusted one. Matches the finding-L memo §1's cosmetic note about Holm's
// monotonicity step raising a raw 0.922 to 1.000.
function holmAdjust(rawPValues: number[]): number[] {
  const m = rawPValues.length
  const order = rawPValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p)
  const adjusted = new Array<number>(m)
  let runningMax = 0
  order.forEach(({ p, i }, rank) => {
    const stepAdjusted = Math.min(1, p * (m - rank))
    runningMax = Math.max(runningMax, stepAdjusted)
    adjusted[i] = runningMax
  })
  return adjusted
}

const SIGNIFICANCE_LEVEL = 0.05

export function computeCategorySignificance(
  groups: { category: CategoryLabel; values: number[] }[]
): CategorySignificanceResult | null {
  const eligible = groups.filter(g => g.values.length >= 3)
  if (eligible.length < 2) return null

  const { h, df, p } = kruskalWallis(eligible.map(g => g.values))

  const pairs: { a: CategoryLabel; b: CategoryLabel; rawP: number }[] = []
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      pairs.push({ a: eligible[i].category, b: eligible[j].category, rawP: mannWhitneyP(eligible[i].values, eligible[j].values) })
    }
  }
  const adjusted = holmAdjust(pairs.map(pair => pair.rawP))
  const pairwise: PairwiseComparison[] = pairs.map((pair, i) => ({
    ...pair,
    adjustedP: adjusted[i],
    significant: adjusted[i] < SIGNIFICANCE_LEVEL,
  }))

  return {
    n: eligible.reduce((s, g) => s + g.values.length, 0),
    groups: eligible.map(g => ({ category: g.category, n: g.values.length })),
    h,
    df,
    p,
    significant: p < SIGNIFICANCE_LEVEL,
    pairwise,
  }
}
