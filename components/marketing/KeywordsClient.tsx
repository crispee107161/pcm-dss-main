'use client'

import { useState, useTransition } from 'react'
import {
  addKeyword, deleteKeyword, suggestKeywords, addKeywordsBulk,
  type KeywordSuggestion,
} from '@/actions/keywords'

interface Keyword { id: number; word: string }
interface Category { id: number; name: string; keywords: Keyword[] }
interface Props { categories: Category[] }

export default function KeywordsClient({ categories }: Props) {
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [isAnalyzing, startAnalyze] = useTransition()
  const [isAdding, startAdd] = useTransition()

  function key(categoryId: number, word: string) { return `${categoryId}:${word}` }

  function handleAnalyze() {
    setAnalyzeError(null)
    setSuggestions([])
    setDismissed(new Set())
    startAnalyze(async () => {
      try {
        const result = await suggestKeywords()
        setSuggestions(result)
        if (result.length === 0) {
          setAnalyzeError('No new suggestions found — your existing keywords may already cover the content well.')
        }
      } catch (e: unknown) {
        setAnalyzeError(e instanceof Error ? e.message : 'Failed to analyze content')
      }
    })
  }

  function dismiss(categoryId: number, word: string) {
    setDismissed(prev => new Set([...prev, key(categoryId, word)]))
  }

  function dismissAll() {
    setDismissed(new Set(suggestions.flatMap(s => s.keywords.map(k => key(s.categoryId, k)))))
  }

  function activeFor(s: KeywordSuggestion) {
    return s.keywords.filter(k => !dismissed.has(key(s.categoryId, k)))
  }

  function handleAddCategory(categoryId: number) {
    const s = suggestions.find(s => s.categoryId === categoryId)
    if (!s) return
    const items = activeFor(s).map(word => ({ word, categoryId }))
    if (!items.length) return
    startAdd(async () => {
      await addKeywordsBulk(items)
      setDismissed(prev => {
        const next = new Set(prev)
        items.forEach(i => next.add(key(categoryId, i.word)))
        return next
      })
    })
  }

  function handleAddAll() {
    const items = suggestions.flatMap(s => activeFor(s).map(word => ({ word, categoryId: s.categoryId })))
    if (!items.length) return
    startAdd(async () => {
      await addKeywordsBulk(items)
      dismissAll()
    })
  }

  const totalActive = suggestions.reduce((acc, s) => acc + activeFor(s).length, 0)
  const hasSuggestions = suggestions.length > 0

  return (
    <div className="space-y-6">

      {/* ── AI Suggestions Panel ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)' }}>

        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h2 className="text-sm font-bold text-slate-800">AI Keyword Suggestions</h2>
            </div>
            <p className="text-xs text-slate-400">
              Analyzes your categorized posts and ads to suggest keywords for each category. Powered by Groq.
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 flex-shrink-0"
            style={{ boxShadow: !isAnalyzing ? '0 4px 14px rgba(220,38,38,0.25)' : undefined }}
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Analyze Content
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {analyzeError && (
          <div className="animate-fade-slide-up mx-6 mt-5 flex items-start gap-2.5 rounded-lg px-4 py-3 bg-amber-50 border border-amber-200">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-xs text-amber-700">{analyzeError}</p>
          </div>
        )}

        {/* Suggestions */}
        {hasSuggestions && (
          <div className="animate-fade-slide-up p-6 space-y-5">
            {suggestions.map(s => {
              const active = activeFor(s)
              if (active.length === 0) return (
                <div key={s.categoryId} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-slate-400">{s.categoryName} — all added</span>
                </div>
              )
              return (
                <div key={s.categoryId}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.1em]">{s.categoryName}</p>
                    <button
                      onClick={() => handleAddCategory(s.categoryId)}
                      disabled={isAdding}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40 transition-[color]"
                    >
                      Add all ({active.length})
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {active.map(word => (
                      <span
                        key={word}
                        className="animate-fade-slide-up inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 rounded-full px-3 py-1 text-xs font-medium"
                      >
                        {word}
                        <button
                          onClick={() => dismiss(s.categoryId, word)}
                          className="text-red-400 hover:text-red-600 transition-[color] leading-none ml-0.5"
                          title="Dismiss"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Global actions */}
            {totalActive > 0 && (
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  onClick={handleAddAll}
                  disabled={isAdding}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  {isAdding ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Adding…
                    </>
                  ) : (
                    `Add all ${totalActive} keywords`
                  )}
                </button>
                <button
                  onClick={dismissAll}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-[color]"
                >
                  Dismiss all
                </button>
              </div>
            )}
          </div>
        )}

        {/* Idle state */}
        {!hasSuggestions && !analyzeError && !isAnalyzing && (
          <p className="px-6 py-5 text-xs text-slate-400">
            Click <span className="font-medium text-slate-500">Analyze Content</span> to scan your categorized posts and ads for keyword suggestions. Requires at least a few categorized items.
          </p>
        )}
      </div>

      {/* ── Keywords by Category ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6"
        style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)' }}>
        <h2 className="text-sm font-bold text-slate-800 mb-5">Keywords by Category</h2>
        {categories.length === 0 ? (
          <p className="text-slate-400 text-sm">No categories found.</p>
        ) : (
          <div className="space-y-6">
            {categories.map(cat => (
              <div key={cat.id}>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.1em]">{cat.name}</p>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                    {cat.keywords.length} keyword{cat.keywords.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {cat.keywords.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No keywords yet — use the form below or Analyze Content.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {cat.keywords.map(kw => (
                      <span key={kw.id} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 rounded-full px-3 py-1 text-xs font-medium">
                        {kw.word}
                        <form action={deleteKeyword} className="inline">
                          <input type="hidden" name="id" value={kw.id} />
                          <button
                            type="submit"
                            className="text-slate-400 hover:text-red-600 transition-[color] leading-none ml-0.5"
                            title="Delete"
                          >
                            ×
                          </button>
                        </form>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Keyword Form ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6"
        style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)' }}>
        <h2 className="text-sm font-bold text-slate-800 mb-4">Add Keyword Manually</h2>
        <form action={addKeyword} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="word"
            placeholder="Enter keyword..."
            required
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
          />
          <select
            name="categoryId"
            required
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
          >
            <option value="">Select category…</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-[background-color] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
          >
            Add Keyword
          </button>
        </form>
      </div>
    </div>
  )
}
