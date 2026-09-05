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
import type { CategorySignificanceResult } from './category-significance'
import type { CorrelationSelectionResult } from './correlation-selection'
import type { CohortCurve } from './ad-lifecycle'
import type { AccuracyPanel, ResidualDiagnostic, SpecificationComparison, Fr31Term } from './fr31-regression'
import { FR31_TERM_LABEL } from './fr31-regression'
import type { BudgetReallocationResult } from './budget-reallocation'
import type { GroupRankingRow, CampaignAdSetMapping } from './ad-set-ranking'
import { STUDY_PERIOD_LABEL } from '@/lib/data/study-period'
import { CATEGORY_LABEL_DISPLAY } from '@/lib/category-label'
import type { CategoryLabel } from '@/app/generated/prisma/client'

type Fr31Predictor = SpecificationComparison['predictor']

function formatPHP(v: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v)
}

// Matches the Budget Reallocation cards' own formatter (BudgetReallocation.tsx),
// which rounds to whole pesos — a sentence beside those cards must not show
// more precision than the cards it is describing.
function formatPHPWhole(v: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v)
}

// Rounds to the nearest half so "2.5 times" reads naturally instead of
// "2.47 times" — plain language, not a computed statistic.
function formatRatio(ratio: number): string {
  const rounded = Math.round(ratio * 2) / 2
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1)
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
  const countClause = ` Across ${ranking.n} posts.`
  if (!top10) return `The posts that get the most views are not necessarily the posts that earn the most engagement.${countClause}`
  if (top10.overlapFraction >= 0.9) {
    return `The posts that get the most views are almost exactly the posts that earn the most engagement. ${top10.overlapCount} of the ${top10.topCount} posts in the top tenth by views also appear in the top tenth by engagement rate.${countClause}`
  }
  return `The posts that get the most views are mostly not the posts that earn the most engagement. Of the ${top10.topCount} posts in the top tenth by views, only ${top10.overlapCount} also appear in the top tenth by engagement rate.${countClause}`
}

// direction matters, not just magnitude: a strong NEGATIVE correlation
// (views falling as reach rises) is not "rises in step" — that framing only
// holds for a strong positive relationship.
export function viewsReachSentence(ranking: RankingComparisonResult): string {
  const magnitude = magnitudeLabel(ranking.viewsReachRho)
  const countClause = ` Across ${ranking.n} posts.`
  if (magnitude === 'strong' && ranking.viewsReachRho > 0) {
    return `View count rises almost exactly in step with how many people a post reached. It measures audience size more than it measures how well a post performed.${countClause}`
  }
  if (magnitude === 'strong') {
    return `View count falls almost exactly in step with how many people a post reached, an unusual pattern worth checking against how Reach and Views are being recorded.${countClause}`
  }
  if (magnitude === 'moderate') {
    const verb = ranking.viewsReachRho > 0 ? 'rise' : 'fall'
    return `View count tends to ${verb} with how many people a post reached, though the relationship is not exact.${countClause}`
  }
  return `View count and reach are only loosely related for this account's posts.${countClause}`
}

const NON_CATEGORY_LABELS: ReadonlySet<CategoryLabel> = new Set(['UNCLASSIFIED', 'UNCLEAR'])

export function isNonCategoryLabel(category: CategoryLabel): boolean {
  return NON_CATEGORY_LABELS.has(category)
}

// Finding L (docs/raven/analysis-tab-finding-l-memo.md §1.3) — replaces the
// old median-only "highest"/"lowest" headline, which asserted a difference
// without ever testing whether it was distinguishable from noise. Generated
// from the Kruskal-Wallis + Holm-adjusted pairwise Mann-Whitney result
// (lib/stats/category-significance.ts) computed on the same population this
// panel displays, so the claim always matches what the test actually found
// rather than being hardcoded ahead of a re-run. "Not distinguishable"
// (never "equal" or "the same") is deliberate: a non-significant result
// means the test found no evidence of a difference, not evidence of no
// difference — the memo's own phrasing, kept verbatim.
//
// significance is null when fewer than two categories have 3+ posts
// (computeCategorySignificance's own eligibility floor); the eligible-count
// guard below already independently confirms the same threshold, so a null
// significance with 2+ eligible rows should not occur in practice, but the
// median-only fallback covers it defensively rather than throwing.
export function categorySignificanceSentence(
  rows: CategoryDistributionRow[],
  significance: CategorySignificanceResult | null
): string | null {
  const eligible = rows.filter(r => !isNonCategoryLabel(r.category) && r.n >= 3)
  if (eligible.length < 2) return null
  // Finding D (docs/raven/analysis-tab-memo-final.md): total CATEGORISED
  // posts, not the n>=3 "eligible" subset above — every real-category row
  // counts here even if too small to be included in the test.
  const totalCategorized = rows.filter(r => !isNonCategoryLabel(r.category)).reduce((s, r) => s + r.n, 0)
  const countClause = ` Across ${totalCategorized} categorised posts.`
  const medianByCategory = new Map(eligible.map(r => [r.category, r.engagementRate.median]))

  // code-review-analyst (MEDIUM-2, 2026-09-06): gated on the omnibus test
  // rejecting, not just on individual pairs — Holm already controls the
  // family-wise error rate on its own, so a pair can in principle survive
  // adjustment even when the omnibus doesn't reject. Without this gate the
  // headline could claim a difference in the same breath as a disclosure
  // printing a non-significant omnibus p, directly above it on screen.
  const significantPairs = significance?.significant ? significance.pairwise.filter(p => p.significant) : []
  if (significantPairs.length === 0) {
    const values = eligible.map(r => r.engagementRate.median)
    if (values.every(v => v === values[0])) {
      return `Every category has a similar median engagement rate, around ${values[0].toFixed(2)}%.${countClause}`
    }
    return `Median engagement rate differs across categories, but not by enough to be distinguishable at this sample size.${countClause}`
  }

  // Orient every significant pair as (lower-median category) -> (higher-median
  // categories it's distinguishable from), then group by the lower side so
  // "Testimonial is lower than both X and Y" reads as one sentence rather
  // than two nearly-identical ones.
  const lowerToHigher = new Map<CategoryLabel, CategoryLabel[]>()
  const involved = new Set<CategoryLabel>()
  for (const pair of significantPairs) {
    const [lower, higher] =
      (medianByCategory.get(pair.a) ?? 0) <= (medianByCategory.get(pair.b) ?? 0) ? [pair.a, pair.b] : [pair.b, pair.a]
    involved.add(lower)
    involved.add(higher)
    const highers = lowerToHigher.get(lower) ?? []
    highers.push(higher)
    lowerToHigher.set(lower, highers)
  }

  const clauses = [...lowerToHigher.entries()].map(
    ([lower, highers]) =>
      `${CATEGORY_LABEL_DISPLAY[lower]} posts earn a significantly lower rate than ${joinList(highers.map(h => CATEGORY_LABEL_DISPLAY[h]))} posts.`
  )
  // code-review-analyst (LOW-3, 2026-09-06): "from one another" reads oddly
  // when only one category is left uninvolved — there's nothing for it to
  // be indistinguishable "from one another" with, only from the categories
  // already named above.
  const uninvolved = eligible.filter(r => !involved.has(r.category))
  const tail =
    uninvolved.length === 0
      ? ''
      : uninvolved.length === 1
        ? ` ${CATEGORY_LABEL_DISPLAY[uninvolved[0].category]} is not distinguishable from the others at this sample size.`
        : ' The other categories are not distinguishable from one another at this sample size.'

  return `Median engagement rate by content category. ${clauses.join(' ')}${tail}${countClause}`
}

// FR-18 (docs/raven/Budget_Reallocation_Review.md §4) — plain-language
// finding for the Budget Reallocation screen's quartile cards, generated
// from the same figures the cards display so it can never disagree with
// them, and recomputed automatically when the minimum-spend threshold
// selector changes the population.
// "The 27 most efficient advertisements" / "The single most efficient
// advertisement" — a bare "The 1 most efficient advertisement" reads as
// broken grammar, and the ₱300 threshold can produce quartiles this small.
function groupLabel(n: number, superlative: string): string {
  return n === 1 ? `The single ${superlative} advertisement` : `The ${n} ${superlative} advertisements`
}

export function budgetReallocationFindingSentence(result: BudgetReallocationResult): string | null {
  const q1 = result.quartiles[0]
  const q4 = result.quartiles[3]
  if (!q1 || !q4 || q1.n === 0 || q4.n === 0 || q1.cpi <= 0) return null

  const ratio = q4.cpi / q1.cpi
  const rounded = Math.round(ratio * 2) / 2
  // Below ~1.15x the multiplier reads as noise ("1 times as much" is both
  // ungrammatical and not a meaningful finding) — drop the clause instead.
  const comparisonClause = rounded <= 1
    ? 'for about the same result'
    : `for the same result, ${rounded >= 1.9 && rounded <= 2.1 ? 'twice' : `${formatRatio(rounded)} times`} as much`

  return `${groupLabel(q1.n, 'most efficient')} generated inquiries at ${formatPHPWhole(q1.cpi)} each. ${groupLabel(q4.n, 'least efficient')} paid ${formatPHPWhole(q4.cpi)} ${comparisonClause}. Both groups spent real money over the same period (${STUDY_PERIOD_LABEL}).`
}

// docs/raven/Rankings_Review.md §2/§2.1 — states the reason "By Ad Set" and
// "By Campaign" show identical figures, computed fresh on every load rather
// than asserted as a permanent fact about the account.
export function sameGroupingsSentence(mapping: CampaignAdSetMapping): string {
  if (mapping.allOneToOne) {
    return 'Each campaign in this account contains exactly one ad set, so these two groupings show the same advertisements under different names.'
  }
  const n = mapping.multiAdSetCampaignCount
  const verb = n === 1 ? 'contains' : 'contain'
  return `${n} ${pluralize(n, 'campaign')} ${verb} more than one ad set, so the two groupings differ.`
}

// docs/raven/Rankings_Review.md §5 — plain-language finding above the Ad Set
// / Campaign tables, generated from the same rows the table renders so it
// can never disagree with them. "noun" is 'ad set' or 'campaign' (singular);
// only groups that recorded at least one messaging conversation (a ratio to
// report) count toward the "N ad sets that recorded messaging conversations"
// clause — a zero-conversation group has no CPI to be most or least efficient.
export function rankingsFindingSentence(rows: GroupRankingRow[], noun: string): string | null {
  const withCpi = rows.filter((r): r is GroupRankingRow & { cpi: number } => r.cpi !== null)
  if (withCpi.length < 2) return null
  const sorted = [...withCpi].sort((a, b) => a.cpi - b.cpi)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  return `The most efficient ${noun} generated inquiries at ${formatPHPWhole(best.cpi)} each and the least efficient at ${formatPHPWhole(worst.cpi)}, across ${withCpi.length} ${pluralize(withCpi.length, noun)} that recorded messaging conversations.`
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
// totalAds (Finding D): distinct advertisements in the whole messaging-ad
// lifecycle population, not any one cohort's (smaller, survival-restricted)
// n — callers pass the sum of AdLifecycleResult.maxMonthOfLifeDistribution,
// so this stays tied to the same computation as the rest of the panel
// rather than a separately-maintained constant.
export function monthOfLifeSentence(cohorts: CohortCurve[], totalAds: number): string | null {
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
  return `${claim} ${changeSentence} Of ${totalAds} advertisements that recorded a messaging conversation.`
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
  return `${relationshipSentence} ${methodSentence} Across ${correlation.n} advertisements.`
}

// FR-27's frequency diagnostic — docs/raven/Analysis_Corrections_Accepted.md
// §2/§4 (accepting Analysis_Screen_Review.md §4): descriptive only, no
// causal recommendation. A rising-frequency case is reported with the same
// discipline as the falling case that prompted the original fix — never a
// lever the correlational data can't support.
// Finding C (docs/raven/analysis-tab-memo-final.md): this is the one
// correlation on a screen otherwise built around "tested for normality
// first, method named accordingly" (correlationWithMethodSentence above)
// that didn't say which method it used. It always uses a rank-based
// correlation here (computeFrequencyDiagnostic in ad-lifecycle.ts), so the
// method is stated plainly rather than run through that same selection logic.
const FREQUENCY_METHOD_NOTE = 'This uses a rank-based (Spearman) correlation.'

// Open question 1 (docs/raven/Analysis_Tab_Response_2026-09-06.md), resolved
// in docs/raven/Analysis_Tab_Response_2026-9-6.md: FR-18 wants the count the
// correlation actually rests on (n, the ad-month rows), but the panel's own
// non-independent-observations caveat only makes sense once the reader can
// also see how many distinct advertisements those rows come from — so both
// numbers are stated together rather than picking one.
export function frequencySentence(rho: number, p: number, n: number, adCount: number): string {
  const countClause = `Across ${n} monthly records from ${adCount} advertisements.`
  if (magnitudeLabel(rho) === 'negligible' || p >= 0.05) {
    return `Frequency is not clearly related to cost per inquiry at this account's levels. ${FREQUENCY_METHOD_NOTE} ${countClause}`
  }
  return rho < 0
    ? `Cost per inquiry does not rise as frequency rises at this account's levels. ${FREQUENCY_METHOD_NOTE} ${countClause}`
    : `Cost per inquiry tends to rise as frequency rises at this account's levels. ${FREQUENCY_METHOD_NOTE} ${countClause}`
}

// A negative improvement means the model did worse than the baseline on
// held-out data — a real (if undesirable) outcome the sentence must be able
// to state, not just the improving case the launch dataset happens to show.
export function accuracySentence(accuracy: AccuracyPanel, n: number): string {
  const improvement = accuracy.maeImprovementVsBaseline * 100
  const countClause = ` Across ${n} advertisements.`
  if (improvement <= 0) {
    return `The model's estimates are not more accurate than simply guessing the middle value for every advertisement.${countClause}`
  }
  return `The model's estimates are about ${improvement.toFixed(1)} per cent closer to the actual cost per inquiry than simply guessing the middle value for every advertisement.${countClause}`
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
// code-review-analyst (MEDIUM-2): the stability claim is about BOTH
// specifications ("across both ways of selecting advertisements"), so a
// single count naming only the spend-filtered n contradicted its own
// sentence — this now names both populations the comparison actually drew
// from.
export function predictorStabilitySentence(comparison: SpecificationComparison[] | null, primaryN: number, secondaryN: number): string | null {
  if (!comparison || comparison.length === 0) return null
  const stable = comparison.filter(c => c.stable).map(c => c.predictor)
  // Finding F (docs/raven/analysis-tab-memo-final.md): "not robust" covers
  // two different failure modes (compareSpecifications' own `stable` check
  // is signFlip OR fails HC3 significance in either spec) that read as one
  // claim ("changes direction") when only some of the unstable predictors
  // actually flip sign — frequency stays negative in both specs but loses
  // HC3 significance, which is not the same finding as engagement rate
  // reversing sign entirely. Split them so the sentence only claims a
  // direction reversal for predictors that actually reverse.
  const signFlip = comparison.filter(c => !c.stable && c.signFlip).map(c => c.predictor)
  // code-review-analyst (HIGH-1): "!stable && !signFlip" covers two
  // different findings that must not share the "changes in strength"
  // wording — a predictor significant in one spec but not the other really
  // did change in strength, but a predictor significant in NEITHER spec was
  // never associated with cost per inquiry at all, so nothing "changed."
  const strengthChange = comparison
    .filter(c => !c.stable && !c.signFlip && (c.robustSignificantPrimary || c.robustSignificantSecondary))
    .map(c => c.predictor)
  const neverSignificant = comparison
    .filter(c => !c.stable && !c.signFlip && !c.robustSignificantPrimary && !c.robustSignificantSecondary)
    .map(c => c.predictor)
  const unstable = [...signFlip, ...strengthChange, ...neverSignificant]
  const label = (terms: Fr31Predictor[]) => joinList(terms.map(t => FR31_TERM_LABEL[t as Fr31Term]))
  const countClause = ` Across ${primaryN} advertisements at or above the spend threshold, and ${secondaryN} without it.`

  if (unstable.length === 0) {
    return `${label(stable)} are consistently associated with cost per inquiry across both ways of selecting advertisements.${countClause}`
  }

  const clauses: string[] = []
  if (signFlip.length > 0) clauses.push(`${label(signFlip)} ${signFlip.length === 1 ? 'reverses' : 'reverse'} direction`)
  if (strengthChange.length > 0) clauses.push(`${label(strengthChange)} ${strengthChange.length === 1 ? 'changes' : 'change'} in strength`)
  if (neverSignificant.length > 0) {
    clauses.push(`${label(neverSignificant)} ${neverSignificant.length === 1 ? 'is' : 'are'} not clearly associated with cost per inquiry in either selection`)
  }
  const unstableClause = clauses.join(', and ')
  const reliedOnSubject = unstable.length === 1 ? 'it cannot' : unstable.length === 2 ? 'neither can' : 'none of them can'

  if (stable.length === 0) {
    return `${unstableClause}, so ${reliedOnSubject} be relied on.${countClause}`
  }
  return `${label(stable)} ${stable.length === 1 ? 'is' : 'are'} consistently associated with cost per inquiry across both ways of selecting advertisements. ${unstableClause}, so ${reliedOnSubject} be relied on.${countClause}`
}
