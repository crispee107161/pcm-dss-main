import type { ReactNode } from 'react'

/**
 * Shared building blocks for the printable role reports (marketing/sales/owner).
 * Styled after Sure's plain print report: white page, black hairlines, uppercase
 * micro-labels, and color reserved for positive/negative polarity only.
 *
 * IMPORTANT: this app's `gray-*` scale is inverted (gray-25 = near-black,
 * gray-900 = near-white) so it reads correctly on the app's dark dashboard.
 * These components render on a WHITE page, so they deliberately use the LOW
 * end of the scale (gray-25/100/200/300) for text and the HIGH end
 * (gray-600/700) for hairlines — the opposite of how the rest of the app
 * (dark background) uses these same tokens.
 */

export function ReportHeader({
  title, periodLabel, generatedLabel,
}: { title: string; periodLabel: string; generatedLabel: string }) {
  return (
    <div className="pb-4 border-b-2 border-gray-25">
      <h1 className="text-2xl font-bold text-gray-25 tracking-tight">{title}</h1>
      <p className="text-sm text-gray-200 mt-1">{periodLabel}</p>
      <p className="text-xs text-gray-400 mt-1">{generatedLabel}</p>
    </div>
  )
}

export function FrTag({ code }: { code: string }) {
  return (
    <span className="ml-2 align-middle text-[10px] font-medium text-gray-400 border border-gray-600 rounded px-1.5 py-0.5 uppercase tracking-wide">
      {code}
    </span>
  )
}

export function ReportSection({
  title, frCode, children, noBreak = true,
}: { title: string; frCode?: string; children: ReactNode; noBreak?: boolean }) {
  return (
    <section className={noBreak ? 'print-no-break' : undefined}>
      <h2 className="text-xs font-bold text-gray-25 uppercase tracking-wider pb-2 border-b border-gray-700">
        {title}{frCode && <FrTag code={frCode} />}
      </h2>
      <div className="pt-4">{children}</div>
    </section>
  )
}

export type MetricTone = 'positive' | 'negative' | 'neutral'

const toneValueClass: Record<MetricTone, string> = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-gray-25',
}

const toneSubClass: Record<MetricTone, string> = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-gray-400',
}

export function MetricStat({
  label, value, sub, tone = 'neutral',
}: { label: string; value: string; sub?: string; tone?: MetricTone }) {
  return (
    <div>
      <p className="text-[11px] text-gray-200 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${toneValueClass[tone]}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${toneSubClass[tone]}`}>{sub}</p>}
    </div>
  )
}

export function ReportMetricRow({
  items,
}: { items: Array<{ label: string; value: string; sub?: string; tone?: MetricTone }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {items.map(item => <MetricStat key={item.label} {...item} />)}
    </div>
  )
}

// Plain table cell styles — bold hairline under the header, thin dividers between rows.
export const reportTh = 'text-left text-[11px] font-semibold text-gray-200 uppercase tracking-wider px-3 py-2 border-b-2 border-gray-25'
export const reportThRight = `${reportTh} text-right`
export const reportTd = 'px-3 py-2.5 border-t border-gray-700 text-gray-100'
export const reportTdRight = `${reportTd} text-right`
export const reportTotalRow = 'border-t-2 border-gray-25 font-semibold'

export function ReportKeyValueList({
  items,
}: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div className="divide-y divide-gray-700">
      {items.map(({ label, value }) => (
        <div key={label} className="flex justify-between items-center py-2 text-sm">
          <span className="text-gray-200">{label}</span>
          <span className="font-medium text-gray-25">{value}</span>
        </div>
      ))}
    </div>
  )
}

export function ReportFooter({ children }: { children: ReactNode }) {
  return <p className="text-center text-xs text-gray-400 pt-6 pb-2">{children}</p>
}
