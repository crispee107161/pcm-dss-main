import type { CategoryPerformanceData } from '@/lib/data/category-performance'
import { CATEGORY_LABEL_DISPLAY } from '@/lib/category-label'
import { PageHeader } from '@/components/nav/PageHeader'
import MethodologyNote from '@/components/analytics/MethodologyNote'

function formatNum(v: number) {
  return new Intl.NumberFormat('en-PH').format(v)
}

function GradeBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function CategoryPerformanceView({ data }: { data: CategoryPerformanceData }) {
  const { rows, total_posts, uncategorized_posts } = data
  const active = rows.filter(r => r.post_count > 0)
  const sorted = [...active].sort((a, b) => (b.avg_engagement ?? 0) - (a.avg_engagement ?? 0))
  const maxEngagement = Math.max(...sorted.map(r => r.avg_engagement ?? 0), 1)

  return (
    <div className="p-5 md:p-10 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Category Performance"
        description="Compare how each organic content category performs by reach and engagement rate."
      />

      {/* Summary row */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Categories tracked', value: active.length, sub: `of ${rows.length} total` },
            { label: 'Best engagement', value: (() => {
                const withEng = sorted.filter(r => r.avg_engagement !== null)
                if (!withEng.length) return '—'
                const best = withEng.reduce((a, b) => (a.avg_engagement! > b.avg_engagement! ? a : b))
                return CATEGORY_LABEL_DISPLAY[best.label]
              })(), sub: (() => {
                const withEng = sorted.filter(r => r.avg_engagement !== null)
                if (!withEng.length) return ''
                const best = withEng.reduce((a, b) => (a.avg_engagement! > b.avg_engagement! ? a : b))
                return `${best.avg_engagement!.toFixed(2)}% avg`
              })() },
            { label: 'Total posts categorized', value: formatNum(total_posts - uncategorized_posts), sub: `of ${formatNum(total_posts)} total` },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-card rounded-2xl card-shadow p-5"
              style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-2">{label}</p>
              <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Main table */}
      {sorted.length === 0 ? (
        <div className="bg-card rounded-2xl card-shadow p-10 text-center"
          style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
          <p className="text-gray-500 text-sm">No categories assigned yet.</p>
          <p className="text-muted-foreground text-xs mt-1">Go to <strong>Categorize Content</strong> to assign categories to your posts.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl card-shadow overflow-hidden"
          style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Organic Post Performance by Category</p>
          </div>
          <div className="table-scroll rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  {['Category', 'Posts', 'Total Reach', 'Aggregate Engagement Rate (reach-weighted)'].map(h => (
                    <th key={h} className={`px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em] ${h === 'Category' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.label} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-status-negative/10 text-status-negative text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <span className="font-semibold text-gray-800">{CATEGORY_LABEL_DISPLAY[r.label]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-gray-500">{r.post_count}</td>
                    <td className="px-4 py-4 text-right text-gray-700 font-semibold">{formatNum(r.total_reach)}</td>
                    <td className="px-4 py-4 text-right">
                      {r.avg_engagement !== null ? (
                        <div>
                          <span className="font-bold text-status-positive">{r.avg_engagement.toFixed(2)}%</span>
                          <GradeBar value={r.avg_engagement} max={maxEngagement} color="bg-status-positive" />
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4">
        <MethodologyNote>
          Aggregate engagement rate (reach-weighted) per category is (sum of reactions + comments + shares across
          every post in the category) ÷ (sum of reach across the same posts) — sum-then-divide, not the mean of
          each post&apos;s own engagement rate, so a handful of high-reach posts don&apos;t get diluted to the
          same weight as low-reach ones. This is a different figure from the &quot;Median post engagement rate&quot;
          shown on the Analysis screen&apos;s category distribution table, which is the median of each post&apos;s
          individually-computed engagement rate. Both are legitimate; they answer different questions and will not
          match for the same category.
        </MethodologyNote>
      </div>

      {/* Uncategorized warning */}
      {uncategorized_posts > 0 && (
        <div className="rounded-xl border border-status-warning/30 bg-status-warning/10 px-4 py-3 flex items-start gap-3">
          <svg className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-status-warning">
            <strong>{uncategorized_posts} post{uncategorized_posts !== 1 ? 's' : ''}</strong> are uncategorized and excluded from this report.
            Assign them in <strong>Categorize Content</strong> for a complete picture.
          </p>
        </div>
      )}
    </div>
  )
}
