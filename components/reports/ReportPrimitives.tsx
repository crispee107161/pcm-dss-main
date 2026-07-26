import type { ReactNode } from 'react'

/**
 * Shared building blocks for the printable role reports (marketing/sales/owner).
 * Styled after Sure's plain print report: white page, black hairlines, uppercase
 * micro-labels, and color reserved for positive/negative polarity only.
 *
 * These always render on a WHITE page regardless of the app's active theme
 * (print output shouldn't change with the viewer's light/dark preference), so
 * they deliberately use Tailwind's untouched default `neutral-*` scale
 * instead of this app's theme-dependent `gray-*` dual ramp — the same
 * approach `app/docs/page.tsx` uses for its own standalone light page.
 */

export function ReportHeader({
  title, periodLabel, generatedLabel,
}: { title: string; periodLabel: string; generatedLabel: string }) {
  return (
    <div className="pb-4 border-b-2 border-neutral-900">
      <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{title}</h1>
      <p className="text-sm text-neutral-600 mt-1">{periodLabel}</p>
      <p className="text-xs text-neutral-400 mt-1">{generatedLabel}</p>
    </div>
  )
}

export function FrTag({ code }: { code: string }) {
  return (
    <span className="ml-2 align-middle text-[10px] font-medium text-neutral-400 border border-neutral-300 rounded px-1.5 py-0.5 uppercase tracking-wide">
      {code}
    </span>
  )
}

export function ReportSection({
  title, frCode, children, noBreak = true,
}: { title: string; frCode?: string; children: ReactNode; noBreak?: boolean }) {
  return (
    <section className={noBreak ? 'print-no-break' : undefined}>
      <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100">
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
  neutral: 'text-neutral-900',
}

const toneSubClass: Record<MetricTone, string> = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-neutral-400',
}

export function MetricStat({
  label, value, sub, tone = 'neutral',
}: { label: string; value: string; sub?: string; tone?: MetricTone }) {
  return (
    <div>
      <p className="text-[11px] text-neutral-600 uppercase tracking-wider">{label}</p>
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
export const reportTh = 'text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wider px-3 py-2 border-b-2 border-neutral-900'
export const reportThRight = `${reportTh} text-right`
export const reportTd = 'px-3 py-2.5 border-t border-neutral-100 text-neutral-700'
export const reportTdRight = `${reportTd} text-right`
export const reportTotalRow = 'border-t-2 border-neutral-900 font-semibold'

export function ReportKeyValueList({
  items,
}: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div className="divide-y divide-neutral-100">
      {items.map(({ label, value }) => (
        <div key={label} className="flex justify-between items-center py-2 text-sm">
          <span className="text-neutral-600">{label}</span>
          <span className="font-medium text-neutral-900">{value}</span>
        </div>
      ))}
    </div>
  )
}

export function ReportFooter({ children }: { children: ReactNode }) {
  return <p className="text-center text-xs text-neutral-400 pt-6 pb-2">{children}</p>
}
