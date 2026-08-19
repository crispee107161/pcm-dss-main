'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import {
  addKeyword, deleteKeyword, suggestKeywords, addKeywordsBulk,
  type KeywordSuggestion,
} from '@/actions/keywords'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCooldown } from '@/hooks/useCooldown'

interface Keyword { id: number; word: string }
interface Category { id: number; name: string; keywords: Keyword[] }
interface Props { categories: Category[] }

// Client-side pacing floor so repeated clicks can't stack requests faster
// than Groq's per-minute token quota can absorb — always at least this long,
// even when Groq's own 429 `retry-after` header comes back shorter (it's
// tuned to Groq's quota window, not this app's UX pacing intent).
const ANALYZE_COOLDOWN_SECONDS = 60

const COOLDOWN_STORAGE_KEY = 'pcm-analyze-content-cooldown-until'

// Owns its own confirm-then-delete state and useActionState call — hooks
// can't be created per-item inside a .map(), so each chip needs to be its
// own component (mirrors UserManagement.tsx's UserRow extraction).
function KeywordChip({ kw }: { kw: Keyword }) {
  const [confirming, setConfirming] = useState(false)
  const [delState, delAction, isDeleting] = useActionState(deleteKeyword, null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)
  const triggerBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (confirming) confirmBtnRef.current?.focus()
  }, [confirming])

  function cancel() {
    setConfirming(false)
    triggerBtnRef.current?.focus()
  }

  return (
    <span className="inline-flex items-center gap-1 bg-muted text-foreground rounded-full px-3 py-1 text-xs font-medium">
      {kw.word}
      {confirming ? (
        <span
          className="inline-flex items-center gap-1 ml-0.5"
          onKeyDown={(e) => { if (e.key === 'Escape') cancel() }}
        >
          <form
            action={delAction}
            className="inline"
            onSubmit={() => setConfirming(false)}
          >
            <input type="hidden" name="id" value={kw.id} />
            <button
              ref={confirmBtnRef}
              type="submit"
              disabled={isDeleting}
              aria-label={`Confirm delete keyword "${kw.word}"`}
              title="Confirm delete"
              className="text-status-negative hover:text-status-negative/70 disabled:opacity-50 transition-colors leading-none p-1.5 -m-1.5"
            >
              ✓
            </button>
          </form>
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancel delete"
            title="Cancel"
            className="text-muted-foreground hover:text-foreground transition-colors leading-none p-1.5 -m-1.5"
          >
            ×
          </button>
        </span>
      ) : (
        <button
          ref={triggerBtnRef}
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete keyword "${kw.word}"`}
          title="Delete"
          className="text-muted-foreground hover:text-status-negative transition-colors leading-none ml-0.5 p-1.5 -m-1.5"
        >
          ×
        </button>
      )}
      {delState?.error && (
        <span role="alert" className="text-status-negative text-[10px] ml-1">{delState.error}</span>
      )}
    </span>
  )
}

export default function KeywordsClient({ categories }: Props) {
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [bulkAddError, setBulkAddError] = useState<string | null>(null)
  // Only true while a cooldown started by this attempt is still running —
  // gates whether the live countdown suffix is appended to analyzeError, so
  // a non-retryable message (e.g. "not enough categorized content") never
  // implies a wait that isn't actually happening.
  const [analyzeCoolingDown, setAnalyzeCoolingDown] = useState(false)
  const [isAnalyzing, startAnalyze] = useTransition()
  const [isAdding, startAdd] = useTransition()
  const { secondsLeft: cooldown, begin: beginCooldown } = useCooldown(COOLDOWN_STORAGE_KEY)
  const [addState, addAction, isAddingKeyword] = useActionState(addKeyword, null)
  const addFormRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (addState?.success) addFormRef.current?.reset()
  }, [addState])

  function key(categoryId: number, word: string) { return `${categoryId}:${word}` }

  function handleAnalyze() {
    setAnalyzeError(null)
    setAnalyzeCoolingDown(false)
    setSuggestions([])
    setDismissed(new Set())
    setAdded(new Set())
    startAnalyze(async () => {
      const result = await suggestKeywords()
      if (result.ok) {
        setSuggestions(result.suggestions)
        if (result.suggestions.length === 0) {
          setAnalyzeError('No new suggestions found — your existing keywords may already cover the content well.')
        }
        // A successful call still spent Groq tokens, so pace the next one too.
        setAnalyzeCoolingDown(true)
        beginCooldown(ANALYZE_COOLDOWN_SECONDS)
        return
      }

      setAnalyzeError(result.reason)
      // Only pace future clicks when this attempt actually consumed AI
      // quota — pre-flight failures (auth, missing config, no data yet)
      // shouldn't lock the user out of retrying immediately. Always floor at
      // the full pacing window, never Groq's shorter retry-after value.
      if (result.retryable) {
        setAnalyzeCoolingDown(true)
        beginCooldown(Math.max(ANALYZE_COOLDOWN_SECONDS, result.retryAfterSeconds ?? 0))
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
    return s.keywords.filter(k => !dismissed.has(key(s.categoryId, k)) && !added.has(key(s.categoryId, k)))
  }

  function handleAddCategory(categoryId: number) {
    const s = suggestions.find(s => s.categoryId === categoryId)
    if (!s) return
    const items = activeFor(s).map(word => ({ word, categoryId }))
    if (!items.length) return
    setBulkAddError(null)
    startAdd(async () => {
      const res = await addKeywordsBulk(items)
      if (res.error) { setBulkAddError(res.error); return }
      setAdded(prev => {
        const next = new Set(prev)
        items.forEach(i => next.add(key(categoryId, i.word)))
        return next
      })
    })
  }

  function handleAddAll() {
    const items = suggestions.flatMap(s => activeFor(s).map(word => ({ word, categoryId: s.categoryId })))
    if (!items.length) return
    setBulkAddError(null)
    startAdd(async () => {
      const res = await addKeywordsBulk(items)
      if (res.error) { setBulkAddError(res.error); return }
      setAdded(prev => {
        const next = new Set(prev)
        items.forEach(i => next.add(key(i.categoryId, i.word)))
        return next
      })
    })
  }

  const totalActive = suggestions.reduce((acc, s) => acc + activeFor(s).length, 0)
  const hasSuggestions = suggestions.length > 0

  return (
    <div className="space-y-6">

      {/* ── AI Suggestions Panel ── */}
      <div className="bg-card rounded-2xl card-shadow overflow-hidden"
        style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>

        <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h2 className="text-sm font-bold text-foreground">AI Keyword Suggestions</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Analyzes your categorized posts and ads to suggest keywords for each category. Powered by Groq.
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || cooldown > 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 active:bg-primary/80 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 flex-shrink-0"
            style={{ boxShadow: !isAnalyzing && cooldown === 0 ? '0 4px 14px color-mix(in srgb, var(--primary) 25%, transparent)' : undefined }}
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing…
              </>
            ) : cooldown > 0 ? (
              `Wait ${cooldown}s`
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
          <Alert className="animate-fade-slide-up mx-6 mt-5 bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-300">
            <svg className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <AlertDescription className="text-xs text-yellow-700/90 dark:text-yellow-300/80">
              {analyzeError}{analyzeCoolingDown && cooldown > 0 ? ` Try again in ${cooldown}s.` : ''}
            </AlertDescription>
          </Alert>
        )}

        {/* Suggestions */}
        {hasSuggestions && (
          <div className="animate-fade-slide-up p-6 space-y-5">
            {suggestions.map(s => {
              const active = activeFor(s)
              if (active.length === 0) {
                const addedCount = s.keywords.filter(k => added.has(key(s.categoryId, k))).length
                const dismissedCount = s.keywords.filter(k => dismissed.has(key(s.categoryId, k))).length
                const label = addedCount > 0 && dismissedCount > 0
                  ? `${s.categoryName} — ${addedCount} added, ${dismissedCount} dismissed`
                  : addedCount > 0
                    ? `${s.categoryName} — all added`
                    : `${s.categoryName} — all dismissed`
                return (
                  <div key={s.categoryId} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                )
              }
              return (
                <div key={s.categoryId}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em]">{s.categoryName}</p>
                    <button
                      onClick={() => handleAddCategory(s.categoryId)}
                      disabled={isAdding}
                      className="text-xs font-semibold text-status-positive hover:text-status-positive/80 disabled:opacity-40 transition-[color]"
                    >
                      Add all ({active.length})
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {active.map(word => (
                      <span
                        key={word}
                        className="animate-fade-slide-up inline-flex items-center gap-1.5 bg-status-positive/10 border border-status-positive/30 text-status-positive rounded-full px-3 py-1 text-xs font-medium"
                      >
                        {word}
                        <button
                          onClick={() => dismiss(s.categoryId, word)}
                          className="text-status-positive hover:text-muted-foreground transition-[color] leading-none ml-0.5"
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
              <div className="pt-4 border-t border-border flex items-center gap-3">
                <button
                  onClick={handleAddAll}
                  disabled={isAdding}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="text-sm text-muted-foreground hover:text-foreground transition-[color]"
                >
                  Dismiss all
                </button>
              </div>
            )}
            {bulkAddError && (
              <p role="alert" className="text-xs text-status-negative">{bulkAddError}</p>
            )}
          </div>
        )}

        {/* Idle state */}
        {!hasSuggestions && !analyzeError && !isAnalyzing && (
          <p className="px-6 py-5 text-xs text-muted-foreground">
            Click <span className="font-medium text-foreground">Analyze Content</span> to scan your categorized posts and ads for keyword suggestions. Requires at least a few categorized items.
          </p>
        )}
      </div>

      {/* ── Keywords by Category ── */}
      <div className="bg-card rounded-2xl card-shadow p-6"
        style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
        <h2 className="text-sm font-bold text-foreground mb-5">Keywords by Category</h2>
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">No categories found.</p>
        ) : (
          <div className="space-y-6">
            {categories.map(cat => (
              <div key={cat.id}>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em]">{cat.name}</p>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {cat.keywords.length} keyword{cat.keywords.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {cat.keywords.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">No keywords yet — use the form below or Analyze Content.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {cat.keywords.map(kw => (
                      <KeywordChip key={kw.id} kw={kw} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Keyword Form ── */}
      <div className="bg-card rounded-2xl card-shadow p-6"
        style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}>
        <h2 className="text-sm font-bold text-foreground mb-4">Add Keyword Manually</h2>
        <form ref={addFormRef} action={addAction} className="flex flex-col sm:flex-row gap-3">
          <Input
            name="word"
            placeholder="Enter keyword..."
            required
            className="flex-1 border-border focus-visible:ring-ring"
          />
          <Select name="categoryId">
            <SelectTrigger className="border-border text-foreground focus-visible:ring-ring w-auto min-w-[160px]">
              <SelectValue placeholder="Select category…" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={String(cat.id)} label={cat.name}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="submit"
            disabled={isAddingKeyword}
            className="bg-primary hover:bg-primary/90 active:bg-primary/80 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-semibold transition-[background-color] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            {isAddingKeyword ? 'Adding…' : 'Add Keyword'}
          </button>
        </form>
        {addState?.error && (
          <Alert className="mt-3 bg-status-negative/10 border-status-negative/30 text-status-negative">
            <AlertDescription className="text-xs">{addState.error}</AlertDescription>
          </Alert>
        )}
        {addState?.success && (
          <p role="status" className="mt-3 text-xs text-status-positive">{addState.success}</p>
        )}
      </div>
    </div>
  )
}
