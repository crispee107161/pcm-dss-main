import Papa from 'papaparse'
import type { ReportData } from '@/lib/reports/report-data'

// SR-D6 — values like ad/ad-set names originate from the client's own
// Facebook exports and are rendered verbatim into CSV cells; a name that
// happens to start with =, +, -, or @ would otherwise be interpreted as a
// formula by Excel/Sheets on open (CSV/spreadsheet formula injection).
// Prefixing with a single quote forces those tools to treat it as text.
const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/
export function neutralizeFormula(value: unknown): unknown {
  if (typeof value === 'string' && FORMULA_PREFIX_RE.test(value)) {
    return `'${value}`
  }
  return value
}

// FR-23 — CSV export of the same analytical results shown on screen/PDF.
// One CSV per report, laid out as labelled blocks (title row, header row,
// data rows, blank separator) rather than one flat table, since the
// underlying results are different shapes (KPIs, quartiles, group rankings,
// correlations) that don't share a common row schema.
function block(title: string, rows: unknown[][]): string {
  const sanitizedRows = rows.map((row) => row.map(neutralizeFormula))
  // Every call site today passes a static or numeric-interpolated literal,
  // so this is currently a no-op — sanitizing anyway removes the implicit
  // "titles are always safe" assumption a future dynamic title could break.
  const titleLine = Papa.unparse([[neutralizeFormula(title)]])
  const dataLines = sanitizedRows.length > 0 ? Papa.unparse(sanitizedRows) : ''
  return dataLines ? `${titleLine}\n${dataLines}` : titleLine
}

export function buildReportCsv(data: ReportData): string {
  const blocks: string[] = []

  blocks.push(block('Executive Summary', [
    ['Metric', 'Value'],
    ['Total Ad Spend', data.overview.kpis.spend.value],
    ['Total Messaging Conversations', data.overview.kpis.inquiries.value],
    ['Median Cost per Messaging Conversation', data.overview.kpis.medianCpi.value ?? ''],
    ['Median Organic Engagement Rate', data.overview.kpis.medianEngagement.value ?? ''],
    ['Posts Categorized', data.overview.kpis.posts.categorized],
    ['Posts Uncategorized', data.overview.kpis.posts.uncategorized],
  ]))

  blocks.push(block('Monthly Ad Performance', [
    ['Period', 'Total Spend', 'Total Messaging Conversations', 'Total Reach', 'Ad Count'],
    ...data.overview.monthlyTrend.map((row) => [row.period, row.total_spend, row.total_inquiries, row.total_reach, row.ad_count]),
  ]))

  blocks.push(block(`Budget Reallocation (min spend PHP ${data.budgetReallocation.minSpendThreshold}, n=${data.budgetReallocation.n})`, [
    ['Quartile', 'Ad Count', 'Spend', 'Messaging Conversations', 'CPI'],
    ...data.budgetReallocation.quartiles.map((q, i) => [`Q${i + 1}`, q.n, q.spend, q.inquiries, q.cpi ?? '']),
  ]))

  blocks.push(block('Ad Set Ranking', [
    ['Ad Set', 'Ad Count', 'Spend', 'Messaging Conversations', 'CPI', 'Low Confidence'],
    ...data.adSetRows.map((row) => [row.name, row.adCount, row.spend, row.inquiries, row.cpi ?? '', row.lowConfidence]),
  ]))

  blocks.push(block('Post Type Performance', [
    ['Post Type', 'n', 'Median Reach', 'Median Engagement Rate', 'Median Views'],
    ...data.postTypeRows.map((row) => [row.postType, row.n, row.medianReach, row.medianEngagementRate, row.medianViews ?? '']),
  ]))

  if (data.watchThrough) {
    blocks.push(block('Watch-Through Rate (FR-28)', [
      ['n', 'Median Rate', 'Q1', 'Q3', 'Outlier Count', 'Correlation with Engagement (rho)', 'p'],
      [
        data.watchThrough.n, data.watchThrough.medianRate, data.watchThrough.q1Rate, data.watchThrough.q3Rate,
        data.watchThrough.outlierCount, data.watchThrough.correlationWithEngagement.rho, data.watchThrough.correlationWithEngagement.p,
      ],
    ]))
  }

  blocks.push(block('Category Distribution (FR-20)', [
    ['Category', 'n', 'Median Views', 'Median Engagement Rate'],
    ...data.categoryDistributionDisplay.map((row) => [row.label, row.n, row.views.median ?? '', row.engagementRate.median]),
  ]))

  blocks.push(block('Ranking Comparison — Views vs. Engagement Rate (FR-19)', [
    ['n', 'Excluded (null Views)', 'Spearman rho', 'p'],
    [data.analysis.ranking.n, data.analysis.ranking.excludedNullViews, data.analysis.ranking.rho, data.analysis.ranking.p],
  ]))

  blocks.push(block('Correlation — Ad Engagement Rate vs. Cost per Inquiry (FR-21/22)', [
    ['n', 'Method', 'Coefficient', 'p', 'Interpretation'],
    [
      data.analysis.correlation.n, data.analysis.correlation.method, data.analysis.correlation.coefficient,
      data.analysis.correlation.p, data.correlationInterpretation.summary,
    ],
  ]))

  if (data.lifecycle) {
    blocks.push(block('Ad Lifecycle — Frequency Diagnostic (FR-27)', [
      ['n', 'Median Frequency', 'Correlation with CPI (rho)', 'p'],
      data.lifecycle.frequencyDiagnostic
        ? [
            data.lifecycle.frequencyDiagnostic.n, data.lifecycle.frequencyDiagnostic.medianFrequency,
            data.lifecycle.frequencyDiagnostic.correlationWithCpi.rho, data.lifecycle.frequencyDiagnostic.correlationWithCpi.p,
          ]
        : ['', '', '', ''],
    ]))
  }

  blocks.push(block('Follows per 100 Page Visits (FR-30) — independently-collected series, not a conversion funnel', [
    ['Total Visits', 'Total Follows', 'Follows per 100 Visits'],
    [data.funnelTotals.visits, data.funnelTotals.follows, data.followsPer100Visits ?? ''],
  ]))

  return blocks.join('\n\n')
}
