import type { AnalysisScreenData, RegressionAnalysisData } from '@/lib/data/analysis'
import type { AdLifecycleResult } from '@/lib/stats/ad-lifecycle'
import { interpretCorrelation } from '@/lib/stats/interpret'
import {
  rankingOverlapSentence,
  viewsReachSentence,
  categoryDistributionSentence,
  categoryCoverageSentence,
  isNonCategoryLabel,
  monthOfLifeSentence,
  frequencySentence,
  correlationWithMethodSentence,
} from '@/lib/stats/analysis-narrative'
import { CATEGORY_LABEL_DISPLAY } from '@/lib/category-label'
import type { CategoryLabel } from '@/app/generated/prisma/client'
import { PageHeader } from '@/components/nav/PageHeader'
import InsightHeader from '@/components/analytics/InsightHeader'
import RegressionSection from '@/components/analytics/RegressionSection'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function fmtInt(n: number | null): string {
  return n === null ? '—' : n.toLocaleString()
}

function fmtPercent(n: number): string {
  return `${n.toFixed(2)}%`
}

function formatPHP(v: number | null): string {
  if (v === null) return '—'
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v)
}

function NormalityBadge({ label, W, p, isNormal }: { label: string; W: number; p: number; isNormal: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-mono text-foreground">
        W = {W.toFixed(4)}, p = {p < 0.001 ? '< 0.001' : p.toFixed(3)}{' '}
        <span className={isNormal ? 'text-status-positive font-semibold' : 'text-status-warning font-semibold'}>
          ({isNormal ? 'normal' : 'not normal'})
        </span>
      </span>
    </div>
  )
}

// docs/raven/Analysis_Corrections_Accepted.md §3: not derived from
// CATEGORY_LABEL_DISPLAY, which lib/reports/report-data.ts also consumes
// for the PDF/CSV exports — a scoped label here keeps this screen's wording
// from silently changing what those exports print.
const NON_CATEGORY_ROW_LABEL: Partial<Record<CategoryLabel, string>> = {
  UNCLASSIFIED: 'Not yet categorised',
  UNCLEAR: 'Reviewed, no category applies',
}

// FR-27 — Owner-facing only, so passed in as a separate optional prop
// rather than folded into AnalysisScreenData (which both Owner and
// Marketing Manager routes load identically).
function LifecycleSection({ lifecycle }: { lifecycle: AdLifecycleResult }) {
  const { singleMonthComparison, frequencyDiagnostic } = lifecycle
  const monthOfLifeHeadline =
    monthOfLifeSentence(lifecycle.cohorts) ?? 'Not enough advertisements have run long enough yet to compare cost per inquiry over time.'

  return (
    <>
      <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
          Month-of-Life
        </h2>
        <InsightHeader headline={monthOfLifeHeadline}>
          {lifecycle.cohorts.map(cohort => (
            <div key={cohort.minSurvivalMonths} className="rounded-xl border border-border overflow-hidden mb-4">
              <div className="px-4 py-3 bg-secondary/50 border-b border-border">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">
                  Advertisements That Ran for {cohort.minSurvivalMonths + 1}+ Months (n={cohort.n})
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 border-b border-border">
                    <TableHead className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Month of Life</TableHead>
                    <TableHead className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Ad-Months (n)</TableHead>
                    <TableHead className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">CPI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohort.curve.map(point => (
                    <TableRow key={point.monthIndex} className="border-t border-border">
                      <TableCell className="px-4 py-2.5 text-sm text-foreground">Month {point.monthIndex}</TableCell>
                      <TableCell className="px-4 py-2.5 text-right text-sm text-foreground">{point.n}</TableCell>
                      <TableCell className="sensitive px-4 py-2.5 text-right font-semibold text-foreground">{formatPHP(point.cpi)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-secondary/50 rounded-xl p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Single-month ads (n={singleMonthComparison.singleMonth.n})</p>
              <p className="sensitive text-lg font-semibold text-foreground">{formatPHP(singleMonthComparison.singleMonth.cpi)} CPI</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
                Ads spanning {singleMonthComparison.longRun.thresholdMonths}+ months (n={singleMonthComparison.longRun.n})
              </p>
              <p className="sensitive text-lg font-semibold text-foreground">{formatPHP(singleMonthComparison.longRun.cpi)} CPI</p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground pt-4">
            Month-of-life is each ad&apos;s calendar month minus its own first month, not a calendar-wide origin.
            Each cohort curve is restricted to ads that survived to its own minimum threshold before being shown,
            so a rising or falling CPI trend isn&apos;t an artefact of bad ads leaving the denominator early. CPI
            at each point is spend summed over results summed, never an average of per-row CPI. A dip in the
            Ad-Months column inside the curve is a paused advertisement missing a row that month, not an
            advertisement leaving the cohort, since the cohort itself is fixed for the whole curve.
          </p>
        </InsightHeader>
      </div>

      {frequencyDiagnostic && (
        <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
            Frequency Diagnostic
          </h2>
          <InsightHeader headline={frequencySentence(frequencyDiagnostic.correlationWithCpi.rho, frequencyDiagnostic.correlationWithCpi.p)}>
            <p className="text-sm text-foreground mb-2">
              Median frequency (Impressions/Reach): <span className="font-semibold">{frequencyDiagnostic.medianFrequency.toFixed(2)}</span>{' '}
              across {frequencyDiagnostic.n} ad-months, {frequencyDiagnostic.adCount} distinct advertisements.
            </p>
            <p className="text-sm text-foreground mb-2">
              {interpretCorrelation(frequencyDiagnostic.correlationWithCpi.rho, frequencyDiagnostic.n, frequencyDiagnostic.correlationWithCpi.p).summary}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Each advertisement contributes multiple rows here, so this significance is indicative, not a formal
              test on independent observations.
            </p>
          </InsightHeader>
        </div>
      )}
    </>
  )
}

export default function AnalysisView({
  data,
  lifecycle,
  regression,
  hideAdEfficiency = false,
}: {
  data: AnalysisScreenData
  lifecycle?: AdLifecycleResult
  regression: RegressionAnalysisData
  // Marketing Team's justified access (condition five) is to organic-content
  // findings (ranking, distribution); advertising-efficiency analyses
  // (correlation, regression) are Manager/Owner-only. See
  // docs/raven/FR_Table_Clarifications_Response_2026-08-25.md §2.5.
  hideAdEfficiency?: boolean
}) {
  const { ranking, categoryDistribution, correlation } = data
  const rankingInterpretation = interpretCorrelation(ranking.rho, ranking.n, ranking.p)
  const viewsReachInterpretation = interpretCorrelation(ranking.viewsReachRho, ranking.n, ranking.viewsReachP)
  const correlationInterpretation = interpretCorrelation(correlation.coefficient, correlation.n, correlation.p)
  const distributionHeadline =
    categoryDistributionSentence(categoryDistribution) ?? 'Not enough categorised posts yet to compare engagement rates by category.'
  const coverageNote = categoryCoverageSentence(categoryDistribution)
  const realCategoryRows = categoryDistribution.filter(r => !isNonCategoryLabel(r.category))
  const nonCategoryRows = categoryDistribution.filter(r => isNonCategoryLabel(r.category))

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Analysis"
        description="Ranking comparison, category distribution, and correlation with assumption-driven method selection"
      />

      {/* Ranking comparison */}
      <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
          Ranking Comparison
        </h2>
        <InsightHeader headline={rankingOverlapSentence(ranking)}>
          <p className="text-sm text-foreground mb-4">{rankingInterpretation.summary}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            {ranking.overlaps.map(o => (
              <div key={o.k} className="bg-secondary/50 rounded-xl p-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Top {o.k}% overlap</p>
                <p className="text-lg font-semibold text-foreground">
                  {(o.overlapFraction * 100).toFixed(0)}%{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({o.overlapCount} of {o.topCount} posts appear in both rankings)
                  </span>
                </p>
              </div>
            ))}
          </div>
          {ranking.excludedNullViews > 0 && (
            <p className="text-[11px] text-muted-foreground mb-2">
              {ranking.excludedNullViews} post{ranking.excludedNullViews === 1 ? '' : 's'} with a blank Views value
              {ranking.excludedNullViews === 1 ? ' was' : ' were'} excluded, not counted as 0 views.
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Spearman rank correlation between Views and organic engagement rate, with average-rank tie handling;
            the top-10%/20% overlap compares the two independently-ranked lists.
          </p>
        </InsightHeader>
      </div>

      {/* Views vs. Reach — why Views and engagement rate rank posts
          differently: Views is very nearly a restatement of Reach. */}
      <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
          Views vs. Reach
        </h2>
        <InsightHeader headline={viewsReachSentence(ranking)}>
          <p className="text-sm text-foreground mb-2">{viewsReachInterpretation.summary}</p>
          <p className="text-[11px] text-muted-foreground">
            Same Spearman method and eligible posts as the ranking comparison above, reported separately since
            Reach is a distinct column from engagement rate.
          </p>
        </InsightHeader>
      </div>

      {/* Distribution by Category */}
      <div className="bg-card rounded-2xl card-shadow overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
            Distribution by Category
          </h2>
          <InsightHeader headline={distributionHeadline}>
            <p className="text-sm text-foreground">
              Median Views and median post engagement rate per category, the median of each post&apos;s own
              individually-computed engagement rate, not a reach-weighted aggregate. Category Performance reports
              a different, reach-weighted figure for the same categories; the two will not match, by design.
            </p>
          </InsightHeader>
          {coverageNote && <p className="text-sm text-muted-foreground mt-2">{coverageNote}</p>}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 border-b border-border">
              <TableHead className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Category</TableHead>
              <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">n</TableHead>
              <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Median Views</TableHead>
              <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Median Post Engagement Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {realCategoryRows.map(row => (
              <TableRow key={row.category} className="border-t border-border">
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{CATEGORY_LABEL_DISPLAY[row.category]}</span>
                    {row.n < 3 && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-status-warning/10 text-status-warning flex-shrink-0"
                        title="Fewer than 3 posts, the median here is not a stable estimate"
                      >
                        Low confidence
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-foreground">{row.n}</TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-foreground">{fmtInt(row.views.median)}</TableCell>
                <TableCell className="px-4 py-3 text-right font-semibold text-foreground">{fmtPercent(row.engagementRate.median)}</TableCell>
              </TableRow>
            ))}
            {nonCategoryRows.length > 0 && (
              <TableRow className="border-t-2 border-border">
                <TableCell colSpan={4} className="px-4 py-1.5 bg-secondary/30" />
              </TableRow>
            )}
            {nonCategoryRows.map(row => (
              <TableRow key={row.category} className="border-t border-border">
                <TableCell className="px-4 py-3">
                  <span className="font-medium text-muted-foreground text-sm">
                    {NON_CATEGORY_ROW_LABEL[row.category] ?? CATEGORY_LABEL_DISPLAY[row.category]}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-muted-foreground">{row.n}</TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-muted-foreground">{fmtInt(row.views.median)}</TableCell>
                <TableCell className="px-4 py-3 text-right text-muted-foreground">{fmtPercent(row.engagementRate.median)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Correlation with method selection; advertising-efficiency, not shown to Marketing Team */}
      {!hideAdEfficiency && (
        <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
            Correlation with Method Selection
          </h2>
          <InsightHeader headline={correlationWithMethodSentence(correlation)}>
            <div className="bg-secondary/50 rounded-xl p-4 mb-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Normality test (Shapiro-Wilk)</p>
              <NormalityBadge label="Ad engagement rate" {...correlation.shapiroX} />
              <NormalityBadge label="Cost per inquiry" {...correlation.shapiroY} />
              <p className="text-[11px] text-muted-foreground mt-2">
                {correlation.method === 'PEARSON'
                  ? 'Both variables pass normality (p > 0.05), so Pearson correlation was selected.'
                  : 'At least one variable fails normality (p ≤ 0.05), so Spearman rank correlation was selected.'}
              </p>
            </div>
            <p className="text-sm text-foreground mb-2">
              <span className="font-semibold">{correlation.method === 'PEARSON' ? 'Pearson' : 'Spearman'} coefficient:</span>{' '}
              {correlationInterpretation.summary}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Shapiro-Wilk tests both variables for normality first; Pearson is used only when both pass, Spearman
              otherwise. The two coefficients are never both computed and the more favourable one shown.
            </p>
          </InsightHeader>
        </div>
      )}

      {lifecycle && <LifecycleSection lifecycle={lifecycle} />}

      {/* Regression analysis; advertising-efficiency, not shown to Marketing Team */}
      {!hideAdEfficiency && <RegressionSection data={regression} />}
    </div>
  )
}
