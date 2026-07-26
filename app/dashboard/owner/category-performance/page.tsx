import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v)
}

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

export default async function CategoryPerformancePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') redirect('/login')

  const [categories, allAds, allPosts] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.ad.findMany({
      select: { category_id: true, amount_spent: true, purchases: true, reach: true },
    }),
    prisma.facebookPost.findMany({
      select: { category_id: true, engagement_rate: true, reach: true },
    }),
  ])

  // Build per-category stats
  const rows = categories.map(cat => {
    const ads = allAds.filter(a => a.category_id === cat.id)
    const posts = allPosts.filter(p => p.category_id === cat.id)

    const ad_count       = ads.length
    const total_spend    = ads.reduce((s, a) => s + a.amount_spent, 0)
    const total_purchases = ads.reduce((s, a) => s + (a.purchases ?? 0), 0)
    const total_reach    = ads.reduce((s, a) => s + (a.reach ?? 0), 0)
    const cpa            = total_purchases > 0 ? total_spend / total_purchases : null
    const purchase_rate  = total_reach > 0 && total_purchases > 0 ? total_purchases / total_reach : null

    const post_count      = posts.length
    const total_post_reach = posts.reduce((s, p) => s + p.reach, 0)
    const avg_engagement  = posts.length > 0
      ? posts.reduce((s, p) => s + p.engagement_rate, 0) / posts.length
      : null

    return { cat, ad_count, total_spend, total_purchases, total_reach, cpa, purchase_rate, post_count, total_post_reach, avg_engagement }
  })

  // Only show categories that have at least one ad or post assigned
  const active = rows.filter(r => r.ad_count > 0 || r.post_count > 0)
  const uncategorized_ads   = allAds.filter(a => a.category_id === null).length
  const uncategorized_posts = allPosts.filter(p => p.category_id === null).length

  // Sort by total purchases desc, then spend
  const sorted = [...active].sort((a, b) =>
    b.total_purchases !== a.total_purchases
      ? b.total_purchases - a.total_purchases
      : b.total_spend - a.total_spend
  )

  const maxSpend     = Math.max(...sorted.map(r => r.total_spend), 1)
  const maxPurchases = Math.max(...sorted.map(r => r.total_purchases), 1)
  const maxEngagement = Math.max(...sorted.map(r => r.avg_engagement ?? 0), 1)

  const totalSpend     = allAds.reduce((s, a) => s + a.amount_spent, 0)
  const totalPurchases = allAds.reduce((s, a) => s + (a.purchases ?? 0), 0)

  return (
    <div className="p-5 md:p-10 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Category Performance"
        description="Compare how each content category performs across paid ads and organic posts."
      />

      {/* Summary row */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Categories tracked', value: active.length, sub: `of ${categories.length} total` },
            { label: 'Top by purchases', value: sorted[0]?.cat.name ?? '—', sub: `${formatNum(sorted[0]?.total_purchases ?? 0)} purchases` },
            { label: 'Lowest CPA', value: (() => {
                const withCpa = sorted.filter(r => r.cpa !== null)
                if (!withCpa.length) return '—'
                const best = withCpa.reduce((a, b) => (a.cpa! < b.cpa! ? a : b))
                return best.cat.name
              })(), sub: (() => {
                const withCpa = sorted.filter(r => r.cpa !== null)
                if (!withCpa.length) return ''
                const best = withCpa.reduce((a, b) => (a.cpa! < b.cpa! ? a : b))
                return formatPHP(best.cpa!)
              })() },
            { label: 'Best engagement', value: (() => {
                const withEng = sorted.filter(r => r.avg_engagement !== null)
                if (!withEng.length) return '—'
                const best = withEng.reduce((a, b) => (a.avg_engagement! > b.avg_engagement! ? a : b))
                return best.cat.name
              })(), sub: (() => {
                const withEng = sorted.filter(r => r.avg_engagement !== null)
                if (!withEng.length) return ''
                const best = withEng.reduce((a, b) => (a.avg_engagement! > b.avg_engagement! ? a : b))
                return `${best.avg_engagement!.toFixed(2)}% avg`
              })() },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-card rounded-2xl card-shadow p-5"
              style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-2">{label}</p>
              <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
              {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Main table */}
      {sorted.length === 0 ? (
        <div className="bg-card rounded-2xl card-shadow p-10 text-center"
          style={{ boxShadow: 'var(--card-elevate-shadow)' }}>
          <p className="text-gray-500 text-sm">No categories assigned yet.</p>
          <p className="text-gray-400 text-xs mt-1">Go to <strong>Categorize Content</strong> to assign categories to your ads and posts.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl card-shadow overflow-hidden"
          style={{ boxShadow: 'var(--card-elevate-shadow)' }}>

          {/* Paid ads section */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Paid Ad Performance by Category</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em] text-left">Category</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em] text-right hidden sm:table-cell">Ads</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em] text-right">Total Spend</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em] text-right">Purchases</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em] text-right hidden sm:table-cell">CPA</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em] text-right hidden sm:table-cell">Conv. Rate</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em] text-right hidden md:table-cell">Reach</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.cat.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <span className="font-semibold text-gray-800">{r.cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-gray-500 hidden sm:table-cell">{r.ad_count}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-semibold text-gray-800">{formatPHP(r.total_spend)}</div>
                      <GradeBar value={r.total_spend} max={maxSpend} color="bg-gray-300" />
                      {totalSpend > 0 && (
                        <div className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">{((r.total_spend / totalSpend) * 100).toFixed(1)}% of total</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-bold text-red-600">{formatNum(r.total_purchases)}</div>
                      <GradeBar value={r.total_purchases} max={maxPurchases} color="bg-red-400" />
                      {totalPurchases > 0 && (
                        <div className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">{((r.total_purchases / totalPurchases) * 100).toFixed(1)}% of total</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right hidden sm:table-cell">
                      {r.cpa !== null
                        ? <span className="font-semibold text-gray-700">{formatPHP(r.cpa)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-4 text-right hidden sm:table-cell">
                      {r.purchase_rate !== null
                        ? <span className="font-semibold text-gray-700">{(r.purchase_rate * 100).toFixed(3)}%</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-600 hidden md:table-cell">{formatNum(r.total_reach)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Organic posts section */}
          <div className="px-5 py-4 border-t border-gray-200 border-b border-gray-100 bg-gray-50/40">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Organic Post Performance by Category</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  {['Category', 'Posts', 'Total Reach', 'Avg Engagement Rate'].map(h => (
                    <th key={h} className={`px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em] ${h === 'Category' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted
                  .filter(r => r.post_count > 0)
                  .sort((a, b) => (b.avg_engagement ?? 0) - (a.avg_engagement ?? 0))
                  .map((r) => (
                    <tr key={r.cat.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 font-semibold text-gray-800">{r.cat.name}</td>
                      <td className="px-4 py-4 text-right text-gray-500">{r.post_count}</td>
                      <td className="px-4 py-4 text-right text-gray-700 font-semibold">{formatNum(r.total_post_reach)}</td>
                      <td className="px-4 py-4 text-right">
                        {r.avg_engagement !== null ? (
                          <div>
                            <span className="font-bold text-green-400">{r.avg_engagement.toFixed(2)}%</span>
                            <GradeBar value={r.avg_engagement} max={maxEngagement} color="bg-green-400" />
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                {sorted.every(r => r.post_count === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">No posts assigned to categories yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Uncategorized warning */}
      {(uncategorized_ads > 0 || uncategorized_posts > 0) && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex items-start gap-3">
          <svg className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>{uncategorized_ads} ad{uncategorized_ads !== 1 ? 's' : ''}</strong> and{' '}
            <strong>{uncategorized_posts} post{uncategorized_posts !== 1 ? 's' : ''}</strong> are uncategorized and excluded from this report.
            Assign them in <strong>Categorize Content</strong> for a complete picture.
          </p>
        </div>
      )}
    </div>
  )
}
