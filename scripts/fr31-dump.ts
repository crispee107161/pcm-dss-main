// FR-31 Chapter 4 dump — docs/raven/FR31_Regression_Specification.md §10 asks for
// raw numbers as CSV/text, not screenshots: both coefficient tables (OLS
// and HC3 SEs, t/z-statistics, p-values), R²/adj R²/F + p for both
// specifications, all four diagnostic test statistics and p-values, the
// full accuracy table including the baseline row, and the residual
// diagnostic list (count over ratio 1.5, and their total spend).
//
// Usage: npx tsx scripts/fr31-dump.ts

import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { fitFr31BothSpecifications, FR31_RESULT_TYPE, type Fr31Fit } from '../lib/stats/fr31-regression'
import fs from 'fs'
import path from 'path'

// L-series fix (docs/raven/pr-review.md): resolved from this file's own location so
// the script writes to the same place regardless of the caller's cwd,
// rather than the old 'scripts/output' relative path (correct only when
// run from the repo root).
const OUTPUT_DIR = path.resolve(__dirname, 'output')

function fmt(v: number, digits = 4): string {
  return v.toFixed(digits)
}

// M3 (docs/raven/pr-review.md): spec §6 mandates the ≥₱1,000 spend filter
// on the residual diagnostic specifically and warns against including the
// unfiltered version, so `includeResidualDiagnostic` is false for SECONDARY
// (n=187, no spend filter) — matching the UI, which already only shows
// PRIMARY's. PRIMARY's own residual diagnostic is unaffected.
function dumpFit(label: string, fit: Fr31Fit, includeResidualDiagnostic: boolean) {
  console.log(`\n=== ${label} (n=${fit.fit.n}) ===`)
  console.log(`R² = ${fmt(fit.fit.rSquared, 3)}   adjusted R² = ${fmt(fit.fit.adjRSquared, 3)}`)
  console.log(`F = ${fmt(fit.fit.fStatistic, 3)}   p = ${fit.fit.fPValue.toExponential(3)}   df = (${fit.fit.dfModel}, ${fit.fit.dfResidual})`)
  console.log(`residual std error = ${fmt(fit.fit.residualStdError, 4)}`)

  console.log('\ncoefficient table (term, coef, SE_OLS, t_OLS, p_OLS, SE_HC3, z_HC3, p_HC3, VIF):')
  for (const c of fit.coefficients) {
    console.log(
      `  ${c.term.padEnd(16)} coef=${fmt(c.coefficient).padStart(10)}` +
        ` SE_OLS=${fmt(c.seOls).padStart(8)} t_OLS=${fmt(c.tOls, 3).padStart(8)} p_OLS=${fmt(c.pOls).padStart(7)}` +
        ` SE_HC3=${fmt(c.seHc3).padStart(8)} z_HC3=${fmt(c.zHc3, 3).padStart(8)} p_HC3=${fmt(c.pHc3).padStart(7)}` +
        ` VIF=${c.vif == null ? '-' : fmt(c.vif, 2)}`
    )
  }

  console.log('\ndiagnostics:')
  console.log(`  VIF: ${Object.entries(fit.vif).map(([k, v]) => `${k} ${fmt(v, 2)}`).join(' | ')}`)
  console.log(`  Breusch-Pagan: LM = ${fmt(fit.breuschPagan.lm)}, df = ${fit.breuschPagan.df}, p = ${fmt(fit.breuschPagan.pValue)}`)
  console.log(
    `  Jarque-Bera: JB = ${fmt(fit.normality.jarqueBera.jb, 3)}, p = ${fit.normality.jarqueBera.pValue.toExponential(2)}` +
      ` (skew = ${fmt(fit.normality.jarqueBera.skewness, 3)}, excess kurtosis = ${fmt(fit.normality.jarqueBera.excessKurtosis, 3)})`
  )
  if (fit.normality.shapiroWilk) {
    console.log(`  Shapiro-Wilk (corroborating): W = ${fmt(fit.normality.shapiroWilk.w)}, p = ${fit.normality.shapiroWilk.p.toExponential(2)}`)
  } else {
    console.log(`  Shapiro-Wilk (corroborating): unavailable (${fit.normality.shapiroWilkError})`)
  }

  if (fit.accuracy) {
    console.log('\naccuracy (in-sample / 10-fold CV / median baseline):')
    console.log(`  R²:   ${fit.accuracy.inSample.rSquared?.toFixed(3)} / ${fit.accuracy.crossValidated.rSquared?.toFixed(3)} / —`)
    console.log(`  MAE:  ₱${fmt(fit.accuracy.inSample.mae, 2)} / ₱${fmt(fit.accuracy.crossValidated.mae, 2)} / ₱${fmt(fit.accuracy.baselineMedian.mae, 2)}`)
    console.log(`  RMSE: ₱${fmt(fit.accuracy.inSample.rmse, 2)} / ₱${fmt(fit.accuracy.crossValidated.rmse, 2)} / ₱${fmt(fit.accuracy.baselineMedian.rmse, 2)}`)
    console.log(`  MAPE: ${fmt(fit.accuracy.inSample.mape, 1)}% / ${fmt(fit.accuracy.crossValidated.mape, 1)}% / ${fmt(fit.accuracy.baselineMedian.mape, 1)}%`)
    console.log(`  CV seed = ${fit.accuracy.crossValidated.seed}, folds = ${fit.accuracy.crossValidated.folds}, fold sizes = [${fit.accuracy.crossValidated.foldSizes.join(', ')}]`)
    console.log(`  MAE improvement vs. baseline: ${(fit.accuracy.maeImprovementVsBaseline * 100).toFixed(1)}%`)
  }

  if (includeResidualDiagnostic) {
    console.log('\nresidual diagnostic:')
    console.log(`  ${fit.residualDiagnostic.flaggedCount} ads exceed ratio ${fit.residualDiagnostic.threshold}, total spend = ₱${fmt(fit.residualDiagnostic.flaggedTotalSpend, 2)}`)
    if (fit.residualDiagnostic.flagged.length > 0) {
      console.log('  flagged ads:')
      for (const r of fit.residualDiagnostic.flagged) {
        console.log(`    ${r.ad_name} — spend ₱${fmt(r.spend, 2)}, actual CPI ₱${fmt(r.actualCpi, 2)}, predicted CPI ₱${fmt(r.predictedCpi, 2)}, ratio ${fmt(r.ratio, 2)}×`)
      }
    }
  } else {
    console.log('\nresidual diagnostic: suppressed — spec §6 mandates the spend filter on this diagnostic, and this specification has none (see PRIMARY above)')
  }

  console.log(`\nnumerical health: reciprocal condition number (1/κ) = ${fit.numerical.reciprocalConditionNumber.toExponential(2)}, rank deficient = ${fit.numerical.rankDeficient}`)
  if (fit.numerical.warnings.length > 0) console.log('  warnings:', fit.numerical.warnings.join('; '))
}

async function main() {
  try {
    const ads = await prisma.ad.findMany({
      where: { result_type: FR31_RESULT_TYPE },
      select: {
        ad_id: true,
        ad_name: true,
        amount_spent: true,
        results: true,
        result_type: true,
        reach: true,
        impressions: true,
        link_clicks: true,
        post_engagements: true,
      },
    })

    const { primary, secondary, comparison } = fitFr31BothSpecifications(ads)

    if (primary.status !== 'ok' || secondary.status !== 'ok') {
      console.error('One or both specifications returned insufficient_data:', { primary, secondary })
      // L-series fix (docs/raven/pr-review.md): throw rather than process.exit(1)
      // here — exiting mid-try skips the finally below and leaves the
      // Prisma connection open. The outer .catch() logs and sets exit 1.
      throw new Error('FR-31 dump aborted: insufficient data for one or both specifications')
    }

    dumpFit('PRIMARY (spend ≥ threshold)', primary, true)
    dumpFit('SECONDARY (all messaging ads)', secondary, false)

    console.log('\n=== SPECIFICATION COMPARISON ===')
    for (const c of comparison ?? []) {
      console.log(
        `  ${c.predictor}: primary=${c.primaryCoefficient?.toFixed(4)} secondary=${c.secondaryCoefficient?.toFixed(4)}` +
          ` signFlip=${c.signFlip} robustSignificant(primary/secondary)=${c.robustSignificantPrimary}/${c.robustSignificantSecondary} -> ${c.note}`
      )
    }

    // CSV dump: coefficient table, both specs, one row per (spec, term)
    const coefCsvLines = [
      'specification,term,coefficient,se_ols,t_ols,p_ols,se_hc3,z_hc3,p_hc3,vif',
    ]
    for (const [label, fit] of [['primary', primary], ['secondary', secondary]] as const) {
      for (const c of fit.coefficients) {
        coefCsvLines.push(
          [label, c.term, c.coefficient, c.seOls, c.tOls, c.pOls, c.seHc3, c.zHc3, c.pHc3, c.vif ?? ''].join(',')
        )
      }
    }
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    fs.writeFileSync(path.join(OUTPUT_DIR, 'fr31-coefficients.csv'), coefCsvLines.join('\n'))
    console.log(`\nWrote ${path.join(OUTPUT_DIR, 'fr31-coefficients.csv')}`)

    // CSV dump: residual diagnostic (primary spec, full list)
    const residualCsvLines = ['ad_id,ad_name,spend,actual_cpi,predicted_cpi,ratio,flagged']
    for (const r of primary.residualDiagnostic.rows) {
      residualCsvLines.push(
        [r.ad_id, `"${r.ad_name.replace(/"/g, '""')}"`, r.spend, r.actualCpi, r.predictedCpi, r.ratio, r.ratio > primary.residualDiagnostic.threshold].join(',')
      )
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, 'fr31-residual-diagnostic.csv'), residualCsvLines.join('\n'))
    console.log(`Wrote ${path.join(OUTPUT_DIR, 'fr31-residual-diagnostic.csv')}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
