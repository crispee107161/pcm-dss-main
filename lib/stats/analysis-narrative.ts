// FR-18/22 (docs/raven/Analysis_Corrections_Accepted.md §2, accepting
// docs/raven/Analysis_Screen_Review.md §2) — plain-language findings for
// the Analysis screen's top level, generated from live data so nothing here
// is a hardcoded figure that goes stale between an import and a rebuild.
// Statistical notation (r, p, n, W, coefficients) stays out of every
// sentence here; it belongs behind the "See the numbers behind this"
// disclosure, generated separately by lib/stats/interpret.ts and the raw
// fields on each result.

import { magnitudeLabel } from './interpret'
import type { RankingComparisonResult } from './ranking-comparison'
import type { CategoryDistributionRow } from './category-distribution'
import type { CorrelationSelectionResult } from './correlation-selection'
import type { CohortCurve } from './ad-lifecycle'
import type { AccuracyPanel, ResidualDiagnostic, SpecificationComparison, Fr31Term } from './fr31-regression'
import { FR31_TERM_LABEL } from './fr31-regression'
import { CATEGORY_LABEL_DISPLAY } from '@/lib/category-label'
import type { CategoryLabel } from '@/app/generated/prisma/client'

type Fr31Predictor = SpecificationComparison['predictor']

function formatPHP(v: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v)
}

function pluralize(n: number, noun: string, pluralNoun = `${noun}s`): string {
  return n === 1 ? noun : pluralNoun
}

// Oxford-and join, so a 3rd (or more) branch doesn't degrade into "A and B
// and C" — code-review-analyst flagged this exact bug in an earlier draft.
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

// FR-19 — the top-10% overlap is the sharpest single figure for "views and
// engagement rank posts differently," so it drives the headline; the
// top-20% figure stays in the disclosure alongside the correlation.
// Proportional threshold (not `===`) so a near-total but not exact overlap
// (e.g. 72 of 73) still reads as agreement rather than "mostly not."
export function rankingOverlapSentence(ranking: RankingComparisonResult): string {
  const top10 = ranking.overlaps.find(o => o.k === 10)
  if (!top10) return 'The posts that get the most views are not necessarily the posts that earn the most engagement.'
  if (top10.overlapFraction >= 0.9) {
    return `The posts that get the most views are almost exactly the posts that earn the most engagement. ${top10.overlapCount} of the ${top10.topCount} posts in the top tenth by views also appear in the top tenth by engagement rate.`
  }
  return `The posts that get the most views are mostly not the posts that earn the most engagement. Of the ${top10.topCount} posts in the top tenth by views, only ${top10.overlapCount} also appear in the top tenth by engagement rate.`
}

// direction matters, not just magnitude: a strong NEGATIVE correlation
// (views falling as reach rises) is not "rises in step" — that framing only
// holds for a strong positive relationship.
export function viewsReachSentence(ranking: RankingComparisonResult): string {
  const magnitude = magnitudeLabel(ranking.viewsReachRho)
  if (magnitude === 'strong' && ranking.viewsReachRho > 0) {
    return 'View count rises almost exactly in step with how many people a post reached. It measures audience size more than it measures how well a post performed.'
  }
  if (magnitude === 'strong') {
    return 'View count falls almost exactly in step with how many people a post reached, an unusual pattern worth checking against how Reach and Views are being recorded.'
  }
  if (magnitude === 'moderate') {
    const verb = ranking.viewsReachRho > 0 ? 'rise' : 'fall'
    return `View count tends to ${verb} with how many people a post reached, though the relationship is not exact.`
  }
  return "View count and reach are only loosely related for this account's posts."
}

const NON_CATEGORY_LABELS: ReadonlySet<CategoryLabel> = new Set(['UNCLASSIFIED', 'UNCLEAR'])

export function isNonCategoryLabel(category: CategoryLabel): boolean {
  return NON_CATEGORY_LABELS.has(category)
}

// FR-20 headline + §3's accepted correction: UNCLEAR must be excluded here
// exactly like UNCLASSIFIED, or a reviewed-no-category label with n>=3 can
// be named best or worst performing.
export function categoryDistributionSentence(rows: CategoryDistributionRow[]): string | null {
  const eligible = rows.filter(r => !isNonCategoryLabel(r.category) && r.n >= 3)
  if (eligible.length < 2) return null
  const byEngagement = [...eligible].sort((a, b) => b.engagementRate.median - a.engagementRate.median)
  const best = byEngagement[0]
  const worst = byEngagement[byEngagement.length - 1]
  if (best.engagementRate.median === worst.engagementRate.median) {
    return `Every category has a similar median engagement rate, around ${best.engagementRate.median.toFixed(2)}%.`
  }
  return `${CATEGORY_LABEL_DISPLAY[best.category]} has the highest median engagement rate (${best.engagementRate.median.toFixed(2)}%); ${CATEGORY_LABEL_DISPLAY[worst.category]} has the lowest (${worst.engagementRate.median.toFixed(2)}%).`
}

// §3.1's accepted correction — the old "most posts are unlabelled" caveat
// stopped being true once the backlog import landed; this regenerates the
// caveat from whatever the live split actually is, so it can't go stale
// the same way again. Handles one bucket being empty (code-review-analyst
// caught "both" reading wrong once the 12 held-back posts get coded and
// only the Unclear bucket remains) and states the count is provisional
// rather than always claiming completeness.
export function categoryCoverageSentence(rows: CategoryDistributionRow[]): string | null {
  const unclassified = rows.find(r => r.category === 'UNCLASSIFIED')?.n ?? 0
  const unclear = rows.find(r => r.category === 'UNCLEAR')?.n ?? 0
  if (unclassified === 0 && unclear === 0) return null
  const parts: string[] = []
  if (unclassified > 0) parts.push(`${unclassified} ${pluralize(unclassified, 'post')} not yet categorised`)
  if (unclear > 0) parts.push(`${unclear} reviewed with no category applying`)
  const excludedSubject = parts.length === 1 ? 'excluded' : 'both excluded'
  return `${joinList(parts)}, ${excludedSubject} from the comparison above.`
}

// FR-27 — reports the change across the most inclusive cohort (the smallest
// survival threshold with a usable curve), since it has the most data and
// matches what a reader sees first. A stricter cohort (e.g. ran 4+ months)
// is a SUBSET of a looser one (ran 3+ months) — not independent, stronger
// evidence — so preferring the loosest available cohort, not the
// strictest, is the correct "most representative" choice. Returns null if
// no cohort's curve has at least two points (nothing to compare).
export function monthOfLifeSentence(cohorts: CohortCurve[]): string | null {
  const candidate = [...cohorts]
    .filter(c => c.curve.length >= 2 && c.curve[0].cpi != null && c.curve[c.curve.length - 1].cpi != null)
    .sort((a, b) => a.minSurvivalMonths - b.minSurvivalMonths)[0]
  if (!candidate) return null
  const first = candidate.curve[0]
  const last = candidate.curve[candidate.curve.length - 1]
  const direction = last.cpi! < first.cpi! ? 'fell' : last.cpi! > first.cpi! ? 'rose' : 'held steady'
  const claim = direction === 'rose'
    ? 'Advertisements get more expensive as they run.'
    : direction === 'fell'
      ? 'Advertisements do not get more expensive as they run.'
      : 'Cost per inquiry stays roughly flat as advertisements run.'
  const runLength = candidate.minSurvivalMonths + 1
  const changeSentence = direction === 'held steady'
    ? `Among advertisements that ran ${runLength} months or more, cost per inquiry stayed near ${formatPHP(first.cpi!)} from the first month to the ${ordinal(last.monthIndex + 1)}.`
    : `Among advertisements that ran ${runLength} months or more, cost per inquiry ${direction} from ${formatPHP(first.cpi!)} in the first month to ${formatPHP(last.cpi!)} in the ${ordinal(last.monthIndex + 1)}.`
  return `${claim} ${changeSentence}`
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

// "though" only makes sense as a hedge on a weak relationship; a moderate
// or strong one is stated plainly instead of undercut by its own sentence.
export function correlationWithMethodSentence(correlation: CorrelationSelectionResult): string {
  const magnitude = magnitudeLabel(correlation.coefficient)
  const direction = correlation.coefficient < 0 ? 'less' : 'more'
  const strengthAdverb = magnitude === 'strong' ? 'noticeably' : magnitude === 'moderate' ? 'somewhat' : 'slightly'
  const relationshipSentence =
    magnitude === 'negligible'
      ? 'Advertisement engagement rate is not related to cost per inquiry for this account.'
      : magnitude === 'weak'
        ? `Advertisements with higher engagement rates tend to cost ${strengthAdverb} ${direction} per inquiry, though the relationship is weak.`
        : `Advertisements with higher engagement rates tend to cost ${strengthAdverb} ${direction} per inquiry.`
  const bothNormal = correlation.shapiroX.isNormal && correlation.shapiroY.isNormal
  const methodSentence = bothNormal
    ? 'Both figures were tested for normal distribution first, and both passed, so a standard correlation was used.'
    : 'Both figures were tested for normal distribution first, and at least one is not normally distributed, so a rank-based method was used.'
  return `${relationshipSentence} ${methodSentence}`
}

// FR-27's frequency diagnostic — docs/raven/Analysis_Corrections_Accepted.md
// §2/§4 (accepting Analysis_Screen_Review.md §4): descriptive only, no
// causal recommendation. A rising-frequency case is reported with the same
// discipline as the falling case that prompted the original fix — never a
// lever the correlational data can't support.
export function frequencySentence(rho: number, p: number): string {
  if (magnitudeLabel(rho) === 'negligible' || p >= 0.05) {
    return "Frequency is not clearly related to cost per inquiry at this account's levels."
  }
  return rho < 0
    ? "Cost per inquiry does not rise as frequency rises at this account's levels."
    : "Cost per inquiry tends to rise as frequency rises at this account's levels."
}

// A negative improvement means the model did worse than the baseline on
// held-out data — a real (if undesirable) outcome the sentence must be able
// to state, not just the improving case the launch dataset happens to show.
export function accuracySentence(accuracy: AccuracyPanel): string {
  const improvement = accuracy.maeImprovementVsBaseline * 100
  if (improvement <= 0) {
    return "The model's estimates are not more accurate than simply guessing the middle value for every advertisement."
  }
  return `The model's estimates are about ${improvement.toFixed(1)} per cent closer to the actual cost per inquiry than simply guessing the middle value for every advertisement.`
}

export function residualSentence(diagnostic: ResidualDiagnostic): string {
  if (diagnostic.flaggedCount === 0) {
    return `No advertisements cost significantly more than their own characteristics would suggest, using a ratio of ${diagnostic.threshold} as the cutoff.`
  }
  if (diagnostic.flaggedCount === 1) {
    return `1 advertisement costs more than ${diagnostic.threshold} times what its own characteristics would suggest, spending ${formatPHP(diagnostic.flaggedTotalSpend)}.`
  }
  return `${diagnostic.flaggedCount} advertisements cost more than ${diagnostic.threshold} times what their own characteristics would suggest, spending ${formatPHP(diagnostic.flaggedTotalSpend)} between them.`
}

// FR-31 — which predictors survive being checked against a second sample of
// the same population (spend-filtered vs. unfiltered). comparison is null
// only when one specification has insufficient data.
export function predictorStabilitySentence(comparison: SpecificationComparison[] | null): string | null {
  if (!comparison || comparison.length === 0) return null
  const stable = comparison.filter(c => c.stable).map(c => c.predictor)
  const unstable = comparison.filter(c => !c.stable).map(c => c.predictor)
  const label = (terms: Fr31Predictor[]) => joinList(terms.map(t => FR31_TERM_LABEL[t as Fr31Term]))

  if (unstable.length === 0) {
    return `${label(stable)} are consistently associated with cost per inquiry across both ways of selecting advertisements.`
  }
  const changeVerb = unstable.length === 1 ? 'changes' : 'change'
  if (stable.length === 0) {
    return `${label(unstable)} ${changeVerb} direction depending on which advertisements are included, so none of the predictors can be relied on.`
  }
  const reliedOnSubject = unstable.length === 1 ? 'it cannot' : 'none of them can'
  return `${label(stable)} ${stable.length === 1 ? 'is' : 'are'} consistently associated with cost per inquiry across both ways of selecting advertisements. ${label(unstable)} ${changeVerb} direction depending on which advertisements are included, so ${reliedOnSubject} be relied on.`
}
