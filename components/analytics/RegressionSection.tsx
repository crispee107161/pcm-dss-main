// FR-31 — Regression Analysis (S7 Analysis, new section).
// docs/raven/FR31_Regression_Specification.md §7 mandates the display order:
// assumptions first, then coefficients, then accuracy. See
// docs/raven/FR31_Amendment_TypeScript_Implementation.md for the
// TS-native implementation decisions (Jarque-Bera + Shapiro-Wilk in place
// of Shapiro-Wilk alone, and the normal-vs-t HC3 p-value rule).
//
// This is a DIFFERENT model from the cut-feature regression/simulation
// cluster (lib/stats/regression.ts, WhatIfSimulator, etc.) — spec §1
// explicitly forbids a what-if slider here. Do not add one.

import type { RegressionAnalysisData } from '@/lib/data/analysis'
import { FR31_PREDICTORS, FR31_TERM_LABEL, FR31_VIF_WARNING_THRESHOLD, type Fr31Fit } from '@/lib/stats/fr31-regression'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function formatPHP(v: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(v)
}

function fmtP(p: number): string {
  return p < 0.001 ? '< 0.001' : p.toFixed(4)
}

function fmtCoef(v: number, digits = 4): string {
  const s = v.toFixed(digits)
  return v >= 0 ? `+${s}` : s
}

function InsufficientData({ n, minimum }: { n: number; minimum: number }) {
  return (
    <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
      <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-2">
        Regression Analysis
      </h2>
      <p className="text-sm text-muted-foreground">insufficient data: n = {n}, minimum {minimum}</p>
    </div>
  )
}

// H2 fix (docs/raven/pr-review.md): rankDeficient and VIF-over-threshold
// warnings were computed (fr31-regression.ts numerical.warnings) but never
// surfaced — a rank-deficient coefficient silently renders as "+0.0000" in
// an otherwise confident-looking table. Spec §3.1 requires flagging VIF > 10.
function NumericalWarnings({ rankDeficient, warnings }: { rankDeficient: boolean; warnings: string[] }) {
  if (!rankDeficient && warnings.length === 0) return null
  return (
    <div className="bg-status-warning/10 border border-status-warning/30 rounded-xl p-3 mb-4">
      {rankDeficient && (
        <p className="text-sm font-semibold text-status-warning mb-1">
          Rank-deficient fit — one or more coefficients could not be estimated and render as 0.
        </p>
      )}
      {warnings.map(w => (
        <p key={w} className="text-sm text-status-warning">
          {w}
        </p>
      ))}
    </div>
  )
}

const STABILITY_EXPLANATION = 'Sign or significance changes between the two specifications — not robust across specifications'

// spec §7 item 3: engagement_rate flagged as not robust across
// specifications — a "Not robust" pill mirroring AdSetRankingTable's
// "Low confidence" pattern. L-series fix (docs/raven/pr-review.md): the
// explanation used to live only in `title`, unreachable by keyboard/touch
// users — the table footnote below (see the coefficient table) now makes
// it visible to everyone. (Not `aria-label` on this bare `<span>`: ARIA
// 1.2 prohibits `aria-label` on role-less/generic elements, so support is
// inconsistent — some AT ignore it, others honor it but then replace the
// visible "Not robust" text with it, a visible-label/accessible-name
// mismatch. `title` stays as a bonus for sighted mouse users, not as the
// source of truth.)
function StabilityPill({ stable }: { stable: boolean }) {
  if (stable) return null
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-status-warning/10 text-status-warning flex-shrink-0"
      title={STABILITY_EXPLANATION}
    >
      Not robust
    </span>
  )
}

interface RegressionSectionProps {
  data: RegressionAnalysisData
}

export default function RegressionSection({ data }: RegressionSectionProps) {
  const { primary, secondary, comparison } = data

  if (primary.status !== 'ok') {
    return <InsufficientData n={primary.n} minimum={primary.minimum} />
  }

  const stabilityByPredictor = new Map((comparison ?? []).map(c => [c.predictor, c]))

  return (
    <>
      {/* 1. Model specification */}
      <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
          Regression Analysis — Model Specification
        </h2>
        <p className="text-sm text-foreground mb-2">
          Outcome: <span className="font-semibold">ln(cost per inquiry)</span>. Predictors: engagement rate,
          frequency, CTR, and CPM — all four computed as sum-then-divide ratios per advertisement (ALG-09).
        </p>
        <p className="text-sm text-foreground mb-2">
          Primary specification: messaging ads with spend at or above{' '}
          <span className="font-semibold">{primary.minSpendFilter != null ? formatPHP(primary.minSpendFilter) : '—'}</span>{' '}
          (n={primary.fit.n}). Secondary specification: all messaging ads, no spend filter
          {secondary.status === 'ok' ? ` (n=${secondary.fit.n})` : ''}.
        </p>
        {primary.logReachSpendCorrelation != null && (
          <p className="text-sm text-muted-foreground">
            Reach and spend are excluded as predictors: on the log scale they correlate at r ={' '}
            {primary.logReachSpendCorrelation.toFixed(3)}, so including both would make coefficients unstable.
          </p>
        )}
        <p className="text-sm text-foreground mt-3">
          This is an explanatory model, not a predictor or forecast. It answers which advertisement
          characteristics are associated with cost per inquiry among ads that ran — not what would happen if a
          setting were changed.
        </p>
      </div>

      {/* 2. Diagnostics panel */}
      <div className="bg-card rounded-2xl card-shadow p-6 mb-6">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
          Diagnostics (primary specification, n={primary.fit.n})
        </h2>
        <NumericalWarnings rankDeficient={primary.numerical.rankDeficient} warnings={primary.numerical.warnings} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {FR31_PREDICTORS.map(predictor => {
            const v = primary.vif[predictor]
            const exceeds = v > FR31_VIF_WARNING_THRESHOLD
            return (
              <div key={predictor} className={`rounded-xl p-3 ${exceeds ? 'bg-status-warning/10' : 'bg-secondary/50'}`}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                  VIF — {FR31_TERM_LABEL[predictor]}
                </p>
                <p className={`text-base font-semibold ${exceeds ? 'text-status-warning' : 'text-foreground'}`}>
                  {v.toFixed(2)}
                  {exceeds && <span className="sr-only"> (above the VIF warning threshold of {FR31_VIF_WARNING_THRESHOLD})</span>}
                </p>
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Breusch-Pagan (heteroscedasticity)
            </p>
            <p className="text-sm font-semibold text-foreground">
              LM = {primary.breuschPagan.lm.toFixed(4)}, p = {fmtP(primary.breuschPagan.pValue)}{' '}
              <span className={primary.breuschPagan.homoscedastic ? 'text-status-positive' : 'text-status-warning'}>
                ({primary.breuschPagan.homoscedastic ? 'homoscedastic' : 'heteroscedastic'})
              </span>
            </p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Jarque-Bera / Shapiro-Wilk (normality)
            </p>
            <p className="text-sm font-semibold text-foreground">
              JB = {primary.normality.jarqueBera.jb.toFixed(3)}, p = {fmtP(primary.normality.jarqueBera.pValue)}
              {primary.normality.shapiroWilk && (
                <>
                  {' '}· W = {primary.normality.shapiroWilk.w.toFixed(4)}, p = {fmtP(primary.normality.shapiroWilk.p)}
                </>
              )}{' '}
              <span className={primary.normality.residualsNormal ? 'text-status-positive' : 'text-status-warning'}>
                ({primary.normality.residualsNormal ? 'normal' : 'not normal'})
              </span>
            </p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">{primary.normality.narrative}</p>
      </div>

      {/* 3. Coefficient table — both specifications side by side */}
      <div className="bg-card rounded-2xl card-shadow overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
            Coefficients — Both Specifications
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableCaption className="sr-only">Regression coefficients for the primary and secondary specifications</TableCaption>
            <TableHeader>
              <TableRow className="bg-secondary/50 border-b border-border">
                <TableHead className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Predictor</TableHead>
                <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">
                  Coef (n={primary.fit.n})
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">p (OLS)</TableHead>
                <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">p (HC3)</TableHead>
                {secondary.status === 'ok' && (
                  <>
                    <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">
                      Coef (n={secondary.fit.n})
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">p (OLS)</TableHead>
                    <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">p (HC3)</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {primary.coefficients.map(row => {
                const secondaryRow = secondary.status === 'ok' ? secondary.coefficients.find(c => c.term === row.term) : undefined
                const stability = row.term === 'intercept' ? undefined : stabilityByPredictor.get(row.term)
                const secondaryColor = !secondaryRow
                  ? 'text-muted-foreground'
                  : secondaryRow.coefficient >= 0
                    ? 'text-status-positive'
                    : 'text-status-negative'
                return (
                  <TableRow key={row.term} className="border-t border-border">
                    <TableHead scope="row" className="px-4 py-3 text-sm text-foreground font-normal">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{FR31_TERM_LABEL[row.term]}</span>
                        {stability && <StabilityPill stable={stability.stable} />}
                      </div>
                    </TableHead>
                    <TableCell className={`px-4 py-3 text-right text-sm font-semibold ${row.coefficient >= 0 ? 'text-status-positive' : 'text-status-negative'}`}>
                      {fmtCoef(row.coefficient)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right text-sm text-foreground">{fmtP(row.pOls)}</TableCell>
                    <TableCell className="px-4 py-3 text-right text-sm text-foreground">{fmtP(row.pHc3)}</TableCell>
                    {secondary.status === 'ok' && (
                      <>
                        <TableCell className={`px-4 py-3 text-right text-sm font-semibold ${secondaryColor}`}>
                          {secondaryRow ? fmtCoef(secondaryRow.coefficient) : '—'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right text-sm text-foreground">{secondaryRow ? fmtP(secondaryRow.pOls) : '—'}</TableCell>
                        <TableCell className="px-4 py-3 text-right text-sm text-foreground">{secondaryRow ? fmtP(secondaryRow.pHc3) : '—'}</TableCell>
                      </>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-5 py-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            R² = {primary.fit.rSquared.toFixed(3)}, adjusted R² = {primary.fit.adjRSquared.toFixed(3)}, F ={' '}
            {primary.fit.fStatistic.toFixed(2)} (p {fmtP(primary.fit.fPValue)}).{' '}
            {secondary.status === 'ok' &&
              `Secondary: R² = ${secondary.fit.rSquared.toFixed(3)}, adjusted R² = ${secondary.fit.adjRSquared.toFixed(3)}.`}
          </p>
          {(comparison ?? []).some(c => !c.stable) && (
            <p className="text-[11px] text-muted-foreground mt-1">
              &quot;Not robust&quot;: {STABILITY_EXPLANATION}.
            </p>
          )}
        </div>
      </div>

      {/* 4. Accuracy panel */}
      {primary.accuracy && (
        <div className="bg-card rounded-2xl card-shadow overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
              Accuracy — Cross-Validated, With a Baseline
            </h2>
          </div>
          <Table>
            <TableCaption className="sr-only">Accuracy metrics: in-sample, 10-fold cross-validated, and median baseline</TableCaption>
            <TableHeader>
              <TableRow className="bg-secondary/50 border-b border-border">
                <TableHead className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">
                  <span className="sr-only">Metric</span>
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">In-Sample</TableHead>
                <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">10-Fold CV</TableHead>
                <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Baseline (Median)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-t border-border">
                <TableHead scope="row" className="px-4 py-3 text-sm font-medium text-foreground">R²</TableHead>
                <TableCell className="px-4 py-3 text-right text-sm text-foreground">{primary.accuracy.inSample.rSquared?.toFixed(3) ?? '—'}</TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-foreground">{primary.accuracy.crossValidated.rSquared?.toFixed(3) ?? '—'}</TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-muted-foreground">—</TableCell>
              </TableRow>
              <TableRow className="border-t border-border">
                <TableHead scope="row" className="px-4 py-3 text-sm font-medium text-foreground">MAE</TableHead>
                <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(primary.accuracy.inSample.mae)}</TableCell>
                <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(primary.accuracy.crossValidated.mae)}</TableCell>
                <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(primary.accuracy.baselineMedian.mae)}</TableCell>
              </TableRow>
              <TableRow className="border-t border-border">
                <TableHead scope="row" className="px-4 py-3 text-sm font-medium text-foreground">RMSE</TableHead>
                <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(primary.accuracy.inSample.rmse)}</TableCell>
                <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(primary.accuracy.crossValidated.rmse)}</TableCell>
                <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(primary.accuracy.baselineMedian.rmse)}</TableCell>
              </TableRow>
              <TableRow className="border-t border-border">
                <TableHead scope="row" className="px-4 py-3 text-sm font-medium text-foreground">MAPE</TableHead>
                <TableCell className="px-4 py-3 text-right text-sm text-foreground">{primary.accuracy.inSample.mape.toFixed(1)}%</TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-foreground">{primary.accuracy.crossValidated.mape.toFixed(1)}%</TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-foreground">{primary.accuracy.baselineMedian.mape.toFixed(1)}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="px-5 py-3 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              MAPE {primary.accuracy.crossValidated.mape.toFixed(1)}% on held-out data, versus{' '}
              {primary.accuracy.baselineMedian.mape.toFixed(1)}% for a median baseline (
              {(primary.accuracy.maeImprovementVsBaseline * 100).toFixed(0)}% lower MAE than the baseline).
            </p>
          </div>
        </div>
      )}

      {/* 5. Residual diagnostic */}
      <div className="bg-card rounded-2xl card-shadow overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
            Residual Diagnostic — Ads Costing More Than Their Characteristics Suggest
          </h2>
        </div>
        {primary.residualDiagnostic.rows.length === 0 ? (
          <p className="text-muted-foreground text-sm p-6">No ads in the primary population.</p>
        ) : (
          <Table>
            <TableCaption className="sr-only">
              Ads whose actual cost per inquiry exceeds what the model predicts, ratio above {primary.residualDiagnostic.threshold}× is flagged
            </TableCaption>
            <TableHeader>
              <TableRow className="bg-secondary/50 border-b border-border">
                <TableHead className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Ad</TableHead>
                <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Spend</TableHead>
                <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Actual CPI</TableHead>
                <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Predicted CPI</TableHead>
                <TableHead className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Ratio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {primary.residualDiagnostic.rows.map(row => {
                const flagged = row.ratio > primary.residualDiagnostic.threshold
                return (
                  <TableRow key={row.ad_id} className="border-t border-border">
                    <TableHead scope="row" className="px-4 py-3 text-sm text-foreground font-normal">{row.ad_name}</TableHead>
                    <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(row.spend)}</TableCell>
                    <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(row.actualCpi)}</TableCell>
                    <TableCell className="sensitive px-4 py-3 text-right text-sm text-foreground">{formatPHP(row.predictedCpi)}</TableCell>
                    <TableCell
                      className={`px-4 py-3 text-right text-sm font-semibold ${flagged ? 'text-status-negative' : 'text-foreground'}`}
                    >
                      {row.ratio.toFixed(2)}×
                      {flagged && <span className="sr-only"> (above the {primary.residualDiagnostic.threshold}× threshold)</span>}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <div className="px-5 py-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            {primary.residualDiagnostic.flaggedCount} ad{primary.residualDiagnostic.flaggedCount === 1 ? '' : 's'}{' '}
            exceed{primary.residualDiagnostic.flaggedCount === 1 ? 's' : ''} a ratio of {primary.residualDiagnostic.threshold} (total spend{' '}
            <span className="sensitive">{formatPHP(primary.residualDiagnostic.flaggedTotalSpend)}</span>).{' '}
            {primary.residualDiagnostic.caption}
          </p>
        </div>
      </div>
    </>
  )
}
