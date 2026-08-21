import type { AnalysisScreenData, RegressionAnalysisData } from '@/lib/data/analysis'
import type { AdLifecycleResult } from '@/lib/stats/ad-lifecycle'
import { interpretCorrelation } from '@/lib/stats/interpret'
import { CATEGORY_LABEL_DISPLAY } from '@/lib/category-label'
import { PageHeader } from '@/components/nav/PageHeader'
import MethodologyNote from '@/components/analytics/MethodologyNote'
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

// FR-27 — Owner-facing only, so passed in as a separate optional prop
// rather than folded into AnalysisScreenData (which both Owner and
// Marketing Manager routes load identically).
function LifecycleSection({ lifecycle }: { lifecycle: AdLifecycleResult }) {
  const { singleMonthComparison, frequencyDiagnostic } = lifecycle

  return (
    <>
      {lifecycle.cohorts.map(cohort => (
        <div key={cohort.minSurvivalMonths} className="bg-card rounded-2xl card-shadow overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
              Month-of-Life CPI — Ads Surviving ≥{cohort.minSurvivalMonths} Months (n={cohort.n})
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 border-b border-border">
                <TableHead className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Month of Life</TableHead>
                <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Ad-Months (n)</TableHead>
                <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">CPI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohort.curve.map(point => (
                <TableRow key={point.monthIndex} className="border-t border-border">
                  <TableCell className="px-4 py-3 text-sm text-foreground">Month {point.monthIndex}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm text-foreground">{point.n}</TableCell>
                  <TableCell className="sensitive px-4 py-3 text-right font-semibold text-foreground">{formatPHP(point.cpi)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}

      <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
          Single-Month vs. Long-Run Ads
        </p>
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
      </div>

      {frequencyDiagnostic && (
        <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
            Frequency Diagnostic (n={frequencyDiagnostic.n})
          </p>
          <p className="text-sm text-foreground mb-2">
            Median frequency (Impressions/Reach): <span className="font-semibold">{frequencyDiagnostic.medianFrequency.toFixed(2)}</span>
          </p>
          <p className="text-sm text-foreground">
            {interpretCorrelation(frequencyDiagnostic.correlationWithCpi.rho, frequencyDiagnostic.n, frequencyDiagnostic.correlationWithCpi.p).summary}{' '}
            {frequencyDiagnostic.correlationWithCpi.rho < 0
              ? 'No ad fatigue is detectable at this account\'s frequency levels — retiring ads early is more likely costing inquiries than saving them.'
              : ''}
          </p>
        </div>
      )}
    </>
  )
}

export default function AnalysisView({
  data,
  lifecycle,
  regression,
}: {
  data: AnalysisScreenData
  lifecycle?: AdLifecycleResult
  regression: RegressionAnalysisData
}) {
  const { ranking, categoryDistribution, correlation } = data
  const rankingInterpretation = interpretCorrelation(ranking.rho, ranking.n, ranking.p)
  const correlationInterpretation = interpretCorrelation(correlation.coefficient, correlation.n, correlation.p)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Analysis"
        description="Ranking comparison, category distribution, and correlation with assumption-driven method selection"
      />

      {/* FR-19 / ALG-07 — Ranking comparison */}
      <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
          Ranking Comparison — Views vs. Engagement Rate (organic, n={ranking.n})
        </p>
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
          <p className="text-[11px] text-muted-foreground">
            {ranking.excludedNullViews} post{ranking.excludedNullViews === 1 ? '' : 's'} with a blank Views value
            {ranking.excludedNullViews === 1 ? ' was' : ' were'} excluded, not counted as 0 views.
          </p>
        )}
      </div>

      {/* FR-20 — Category distribution */}
      <div className="bg-card rounded-2xl card-shadow overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
            Distribution by Category
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 border-b border-border">
              <TableHead className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Category</TableHead>
              <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">n</TableHead>
              <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Median Views</TableHead>
              <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Median Engagement Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryDistribution.map(row => (
              <TableRow key={row.category} className="border-t border-border">
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{CATEGORY_LABEL_DISPLAY[row.category]}</span>
                    {row.n < 3 && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-status-warning/10 text-status-warning flex-shrink-0"
                        title="Fewer than 3 posts — the median here is not a stable estimate"
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
          </TableBody>
        </Table>
      </div>

      {/* FR-21 / ALG-08 — Correlation with method selection */}
      <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
          Correlation — Ad Engagement Rate vs. Cost per Inquiry (messaging ads, n={correlation.n})
        </p>

        <div className="bg-secondary/50 rounded-xl p-4 mb-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Normality test (Shapiro-Wilk)</p>
          <NormalityBadge label="Ad engagement rate" {...correlation.shapiroX} />
          <NormalityBadge label="Cost per inquiry" {...correlation.shapiroY} />
          <p className="text-[11px] text-muted-foreground mt-2">
            {correlation.method === 'PEARSON'
              ? 'Both variables pass normality (p > 0.05) — Pearson correlation was selected.'
              : 'At least one variable fails normality (p ≤ 0.05) — Spearman rank correlation was selected.'}
          </p>
        </div>

        <p className="text-sm text-foreground">
          <span className="font-semibold">{correlation.method === 'PEARSON' ? 'Pearson' : 'Spearman'} coefficient:</span>{' '}
          {correlationInterpretation.summary}
        </p>
      </div>

      {lifecycle && <LifecycleSection lifecycle={lifecycle} />}

      {/* FR-31 — Regression analysis, new S7 section */}
      <RegressionSection data={regression} />

      <div className="mt-4">
        <MethodologyNote>
          Ranking comparison (FR-19): Spearman rank correlation between Views and organic engagement rate, with
          average-rank tie handling; the top-10%/20% overlap compares the two independently-ranked lists.
          Distribution (FR-20): median Views and median engagement rate per category, grouped by the finalised
          category — uncategorised posts are shown as their own row, not dropped. Correlation (FR-21/ALG-08):
          Shapiro-Wilk tests both variables for normality first; Pearson is used only when both pass, Spearman
          otherwise — the two coefficients are never both computed and the more favourable one shown. Every
          coefficient above is reported with its sample size, p-value, and a magnitude label (negligible / weak
          / moderate / strong) rather than a bare number.{lifecycle && (
            <>
              {' '}Lifecycle (FR-27): month-of-life is each ad&apos;s calendar month minus its own first month, not
              a calendar-wide origin. Each cohort curve is restricted to ads that survived to its own minimum
              threshold before being shown, so a rising or falling CPI trend isn&apos;t an artefact of bad ads
              leaving the denominator early. CPI at each point is spend summed over results summed, never an
              average of per-row CPI.
            </>
          )} Regression (FR-31): an explanatory OLS model of ln(cost per inquiry) on four ratio predictors —
          engagement rate, frequency, CTR, and CPM — not a predictor, forecast, or simulation; reach and spend are
          excluded as predictors for near-perfect collinearity with the others. Ordinary and heteroscedasticity-
          consistent (HC3) standard errors are both reported because residuals are non-normal; HC3 significance is
          referred to the standard normal distribution, OLS significance to the t distribution, since HC3 is an
          asymptotic estimator. Two specifications are shown side by side (spend-filtered and unfiltered) and any
          predictor whose sign or significance changes between them is flagged as not robust rather than reported
          as if it were settled. Accuracy is 10-fold cross-validated (seed 42) against a median-CPI baseline, and
          the residual diagnostic compares each ad&apos;s actual cost per inquiry to the level associated with its
          own characteristics — not a prediction of future performance.
        </MethodologyNote>
      </div>
    </div>
  )
}
