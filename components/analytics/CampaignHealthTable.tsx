'use client'

import { Fragment, useState } from 'react'
import type { ScoredAd } from '@/lib/stats/health-score'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

const GRADE_STYLES: Record<ScoredAd['grade'], { bar: string; badge: string; text: string }> = {
  Excellent: { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' },
  Good:      { bar: 'bg-teal-500',    badge: 'bg-teal-50 text-teal-700 border-teal-200',          text: 'text-teal-700' },
  Fair:      { bar: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200',        text: 'text-amber-700' },
  Poor:      { bar: 'bg-orange-500',  badge: 'bg-orange-50 text-orange-700 border-orange-200',     text: 'text-orange-700' },
  Critical:  { bar: 'bg-red-500',     badge: 'bg-red-50 text-red-600 border-red-200',              text: 'text-red-600' },
}

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v)
}

function ScoreBar({ score, grade }: { score: number; grade: ScoredAd['grade'] }) {
  const style = GRADE_STYLES[grade]
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${style.bar}`}
          style={{
            width: `${score}%`,
            animation: 'bar-fill 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both',
          }}
        />
      </div>
      <span className={`text-xs font-bold tabular w-7 text-right ${style.text}`}>{score}</span>
    </div>
  )
}

const PAGE_SIZE = 10

type Sort = 'score' | 'cpa' | 'rate' | 'spend'

export default function CampaignHealthTable({ ads }: { ads: ScoredAd[] }) {
  const [sort, setSort] = useState<Sort>('score')
  const [asc, setAsc] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [gradeFilter, setGradeFilter] = useState<ScoredAd['grade'] | 'All'>('All')
  const [showAll, setShowAll] = useState(false)

  if (ads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
        <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm font-semibold text-slate-600 mb-1">No campaign data yet</p>
        <p className="text-xs text-slate-400 max-w-[220px]">Upload an Ads CSV to start scoring your campaigns by health.</p>
      </div>
    )
  }

  function toggleSort(col: Sort) {
    if (sort === col) setAsc(a => !a)
    else { setSort(col); setAsc(false) }
    setShowAll(false)
    setExpandedId(null)
  }

  const grades: Array<ScoredAd['grade'] | 'All'> = ['All', 'Excellent', 'Good', 'Fair', 'Poor', 'Critical']

  const filtered = gradeFilter === 'All' ? ads : ads.filter(a => a.grade === gradeFilter)

  const sorted = [...filtered].sort((a, b) => {
    let va = 0, vb = 0
    if (sort === 'score') { va = a.score; vb = b.score }
    else if (sort === 'cpa') { va = a.cpa ?? 999999; vb = b.cpa ?? 999999 }
    else if (sort === 'rate') { va = a.purchase_rate ?? 0; vb = b.purchase_rate ?? 0 }
    else { va = a.amount_spent; vb = b.amount_spent }
    return asc ? va - vb : vb - va
  })

  const visible = showAll ? sorted : sorted.slice(0, PAGE_SIZE)
  const hasMore = sorted.length > PAGE_SIZE

  function SortBtn({ col, label }: { col: Sort; label: string }) {
    const active = sort === col
    return (
      <button
        onClick={() => toggleSort(col)}
        className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
          active ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        {label}
        <span className="text-[10px]">{active ? (asc ? '▲' : '▼') : '⇅'}</span>
      </button>
    )
  }

  const gradeCounts = (['Excellent', 'Good', 'Fair', 'Poor', 'Critical'] as ScoredAd['grade'][]).map(g => ({
    grade: g,
    count: ads.filter(a => a.grade === g).length,
  }))

  return (
    <div className="space-y-4">

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {gradeCounts.map(({ grade, count }) => {
          if (count === 0) return null
          const s = GRADE_STYLES[grade]
          return (
            <button
              key={grade}
              onClick={() => { setGradeFilter(gradeFilter === grade ? 'All' : grade); setShowAll(false); setExpandedId(null) }}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border transition-[opacity,box-shadow] ${
                gradeFilter === grade
                  ? `${s.badge} ring-2 ring-offset-1 ring-current`
                  : `${s.badge} opacity-70 hover:opacity-100`
              }`}
            >
              {grade}
              <span className="bg-white/60 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{count}</span>
            </button>
          )
        })}
        {gradeFilter !== 'All' && (
          <button
            onClick={() => { setGradeFilter('All'); setShowAll(false); setExpandedId(null) }}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 underline"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className={showAll && sorted.length > PAGE_SIZE ? 'max-h-[520px] overflow-y-auto' : ''}>
          <Table className="text-sm">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-slate-50/95 border-b border-slate-200 backdrop-blur-sm hover:bg-slate-50/95">
                <TableHead className="text-left px-4 py-3 w-8">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.1em]">#</span>
                </TableHead>
                <TableHead className="text-left px-4 py-3">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.1em]">Ad Name</span>
                </TableHead>
                <TableHead className="px-4 py-3">
                  <SortBtn col="score" label="Health" />
                </TableHead>
                <TableHead className="text-right px-4 py-3">
                  <SortBtn col="spend" label="Spend" />
                </TableHead>
                <TableHead className="text-right px-4 py-3 hidden sm:table-cell">
                  <SortBtn col="cpa" label="CPA" />
                </TableHead>
                <TableHead className="text-right px-4 py-3 hidden sm:table-cell">
                  <SortBtn col="rate" label="Conv. Rate" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((ad, i) => {
                const style = GRADE_STYLES[ad.grade]
                const isExpanded = expandedId === ad.id
                return (
                  <Fragment key={ad.id}>
                    <TableRow
                      className="border-t border-slate-100 hover:bg-red-50/40 cursor-pointer transition-[background-color]"
                      onClick={() => setExpandedId(isExpanded ? null : ad.id)}
                    >
                      <TableCell className="px-4 py-3 text-slate-400 text-xs">{i + 1}</TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="font-semibold text-slate-800 text-sm max-w-[200px] truncate" title={ad.ad_name}>
                          {ad.ad_name}
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-[200px]">{ad.ad_set_name}</div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <Badge className={`self-start text-[10px] font-bold ${style.badge}`}>
                            {ad.grade}
                          </Badge>
                          <ScoreBar score={ad.score} grade={ad.grade} />
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-semibold text-slate-700 tabular-nums">
                        {formatPHP(ad.amount_spent)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                        {ad.cpa !== null
                          ? <span className="font-semibold text-slate-700">{formatPHP(ad.cpa)}</span>
                          : <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                        {ad.purchase_rate !== null
                          ? <span className="font-semibold text-slate-700">{(ad.purchase_rate * 100).toFixed(3)}%</span>
                          : <span className="text-slate-300">—</span>}
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="border-t border-slate-100 bg-red-50/20 hover:bg-red-50/20">
                        <TableCell />
                        <TableCell colSpan={5} className="px-4 py-4">
                          <div className="animate-fade-slide-up grid grid-cols-1 sm:grid-cols-3 gap-4 sm:max-w-lg">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">CPA Score</p>
                              <ScoreBar score={ad.breakdown.cpa_score} grade={ad.grade} />
                              <p className="text-[10px] text-slate-400 mt-1">50% weight</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Conv. Rate Score</p>
                              <ScoreBar score={ad.breakdown.rate_score} grade={ad.grade} />
                              <p className="text-[10px] text-slate-400 mt-1">35% weight</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Reach Score</p>
                              <ScoreBar score={ad.breakdown.reach_score} grade={ad.grade} />
                              <p className="text-[10px] text-slate-400 mt-1">15% weight</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-3">
                            Click row to collapse · Scores are relative to all campaigns in this dataset
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Footer: show more / show less */}
        {hasMore && (
          <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50/60">
            <p className="text-xs text-slate-400">
              {showAll ? `All ${sorted.length} campaigns` : `Showing top ${Math.min(PAGE_SIZE, sorted.length)} of ${sorted.length}`}
            </p>
            <button
              onClick={() => { setShowAll(v => !v); setExpandedId(null) }}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
            >
              {showAll ? (
                <> Show less <span>▲</span> </>
              ) : (
                <> Show all {sorted.length} campaigns <span>▼</span> </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
