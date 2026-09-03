import Link from 'next/link'

interface AlertsStripProps {
  uncategorizedCount: number
  missingMonths: string[]
  spendNoResultAds: { name: string; spend: number }[]
  categorizeHref: string
}

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

// Renders nothing when every condition is false (mvp.md §4.1: "only when
// true") — data-health signals, so they stay visible regardless of the
// period filter above them.
export default function AlertsStrip({ uncategorizedCount, missingMonths, spendNoResultAds, categorizeHref }: AlertsStripProps) {
  const hasAlerts = uncategorizedCount > 0 || missingMonths.length > 0 || spendNoResultAds.length > 0
  if (!hasAlerts) return null

  return (
    <div className="flex flex-wrap items-center gap-2.5" role="status">
      {uncategorizedCount > 0 && (
        <Link
          href={categorizeHref}
          className="inline-flex items-center gap-2 text-xs font-semibold rounded-full pl-2.5 pr-3 py-1.5 bg-status-warning/10 border border-status-warning/30 text-status-warning hover:bg-status-warning/15 transition-colors"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          {uncategorizedCount} post{uncategorizedCount === 1 ? '' : 's'} awaiting categorisation
        </Link>
      )}

      {missingMonths.length > 0 && (
        <span
          className="inline-flex items-center gap-2 text-xs font-semibold rounded-full pl-2.5 pr-3 py-1.5 bg-status-negative/10 border border-status-negative/30 text-status-negative"
          title={missingMonths.join(', ')}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {missingMonths.length} month{missingMonths.length === 1 ? '' : 's'} missing ad data ({missingMonths.slice(0, 3).join(', ')}{missingMonths.length > 3 ? '…' : ''})
        </span>
      )}

      {spendNoResultAds.length > 0 && (
        <span
          className="sensitive inline-flex items-center gap-2 text-xs font-semibold rounded-full pl-2.5 pr-3 py-1.5 bg-status-negative/10 border border-status-negative/30 text-status-negative"
          title={`Expected for ads run for reach or video views rather than messaging, not necessarily an error (FR-06).\n\n${spendNoResultAds.map(a => `${a.name}: ${formatPhp(a.spend)}`).join('\n')}`}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m9-8a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {spendNoResultAds.length} ad{spendNoResultAds.length === 1 ? '' : 's'} with spend but no messaging conversations, may be expected for reach/video ads
        </span>
      )}
    </div>
  )
}
