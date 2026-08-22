'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import {
  updatePostCategoryForm,
  proposePostCategoryForm,
  acceptPendingCategory,
  rejectPendingCategory,
  bulkAcceptPendingCategories,
  batchConfirmAgreed,
  autoCategorizeAll,
} from '@/actions/categorize'
import { runLlmClassification } from '@/actions/classify-posts'
import { CATEGORY_LABEL_DISPLAY, categorySelectLabel } from '@/lib/category-label'
import { FLAG_REASON_SHORT } from '@/lib/categorize/flag-reasons'
import { useCooldown } from '@/hooks/useCooldown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CategoryLabel, CategoryFlagReason, Role } from '@/app/generated/prisma/client'

// FR-13: only Product Showcase / Promotional Offer / Testimonial /
// Entertainment are assignable manually. UNCLASSIFIED is a system-set
// outcome (ALG-04/05 zero-match), not a manual choice.
const ASSIGNABLE_LABELS: CategoryLabel[] = ['PRODUCT_SHOWCASE', 'PROMOTIONAL_OFFER', 'TESTIMONIAL', 'ENTERTAINMENT']

// Same first-paint rationale as categorySelectLabel (lib/category-label.ts),
// which it delegates to for everything except '' — this Select has no
// "— None —" item, so an empty value means nothing has been proposed yet
// and should resolve back to the placeholder text instead.
function proposeCategoryLabel(value: string | null): string {
  return value === '' || value === null ? 'Select category' : categorySelectLabel(value)
}

// Client-side pacing floor, same rationale and value as Manage Keywords'
// ANALYZE_COOLDOWN_SECONDS (components/marketing/KeywordsClient.tsx) — a
// batch of Groq calls, so pace the next click regardless of what Groq's own
// (often shorter) retry-after header says.
const LLM_COOLDOWN_SECONDS = 60
const LLM_COOLDOWN_STORAGE_KEY = 'pcm-classify-llm-cooldown-until'

export interface ReviewPostRow {
  id: number
  title: string | null
  permalink: string
  post_type: string
  // ALG-04 / ALG-05 suggestions (actions/categorize.ts, actions/classify-posts.ts).
  // Stored separately per FR-15 — never copied into category_final automatically.
  keywordSuggestion: CategoryLabel | null
  llmSuggestion: CategoryLabel | null
  category_pending: CategoryLabel | null
  // docs/raven/S4_Categorisation_Review_UI_Change.md §2.1/§3.2 — specific
  // condition(s), rendered via FLAG_REASON_SHORT. Empty = unflagged.
  flagReasons: CategoryFlagReason[]
  pendingByEmail: string | null
}

// A suggestion usable as a select default must be one of the four assignable
// labels — UNCLASSIFIED means "the method found nothing," not a category
// choice, and UNCLEAR is ground-truth-only. Mirrors isUnflaggedAgreed's
// ASSIGNABLE_LABELS membership check (lib/data/category-flags.ts) so
// isBatchConfirmEligible below can't diverge from what the server actually
// confirms.
function assignableSuggestion(label: CategoryLabel | null): CategoryLabel | undefined {
  return label && ASSIGNABLE_LABELS.includes(label) ? label : undefined
}

// Docs/raven/S4_Categorisation_Review_UI_Change.md §2.2: pre-select only when
// there's nothing to referee — a human proposal, or both methods already
// agreeing. A disagreement or a single-method suggestion must NOT be
// pre-selected, or the Manager is nudged toward one method's answer.
function agreedSuggestion(post: ReviewPostRow): CategoryLabel | undefined {
  const keyword = assignableSuggestion(post.keywordSuggestion)
  const llm = assignableSuggestion(post.llmSuggestion)
  return keyword && llm && keyword === llm ? keyword : undefined
}

function defaultSelection(post: ReviewPostRow): CategoryLabel | '' {
  return post.category_pending ?? agreedSuggestion(post) ?? ''
}

// Mirrors lib/data/category-flags.ts's isUnflaggedAgreed (server-only, can't
// be imported into a client bundle) — kept in sync by both reading the same
// three fields the same way, and by assignableSuggestion sharing its
// ASSIGNABLE_LABELS membership check. Used only to size the "Batch confirm"
// button; the action itself re-derives eligibility server-side before
// writing.
function isBatchConfirmEligible(post: ReviewPostRow): boolean {
  return post.flagReasons.length === 0 && post.category_pending === null && agreedSuggestion(post) !== undefined
}

interface Props {
  posts: ReviewPostRow[]
  // mvp.md §3 S4 permission grid: Owner=View, Marketing Manager=Full
  // (only role that finalises), Marketing Team=Suggest only.
  role: Role
}

const PAGE_SIZE = 50

function PaginationBar({
  page, pageCount, onPageChange,
}: { page: number; pageCount: number; onPageChange: (page: number) => void }) {
  if (pageCount <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
      <p className="text-xs text-muted-foreground">Page {page} of {pageCount}</p>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={page <= 1}
          onClick={() => onPageChange(page - 1)} className="h-7 px-3 text-xs">
          Previous
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)} className="h-7 px-3 text-xs">
          Next
        </Button>
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    Video: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
    Reel: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    Photo: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
    Link: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  }
  const cls = colors[type] ?? 'bg-secondary text-muted-foreground border-border'
  return <Badge className={`rounded-full h-auto py-0.5 px-2 text-xs font-medium ${cls}`}>{type}</Badge>
}

function CategoryBadge({ label }: { label: CategoryLabel }) {
  const colors: Record<CategoryLabel, string> = {
    PRODUCT_SHOWCASE: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
    TESTIMONIAL: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
    PROMOTIONAL_OFFER: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
    ENTERTAINMENT: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
    UNCLASSIFIED: 'bg-secondary text-muted-foreground border-border',
    // Ground-truth-only; never shown here in practice (S4 never assigns it), kept for exhaustiveness.
    UNCLEAR: 'bg-secondary text-muted-foreground border-border',
  }
  return (
    <Badge className={`rounded-full h-auto py-0.5 px-2 text-xs font-medium ${colors[label]}`}>
      {CATEGORY_LABEL_DISPLAY[label]}
    </Badge>
  )
}

function PendingCell({ post }: { post: ReviewPostRow }) {
  if (post.category_pending) {
    return (
      <span className="flex items-center gap-1.5">
        <CategoryBadge label={post.category_pending} />
        <span className="text-xs text-muted-foreground">
          proposed{post.pendingByEmail ? ` by ${post.pendingByEmail}` : ''}
        </span>
      </span>
    )
  }
  // Docs/raven/S4_Categorisation_Review_UI_Change.md §2.2: show suggestions
  // as unlabelled candidates, deduped (agreement collapses to one badge) and
  // in a consistent alphabetical order — never which method produced which.
  const suggestions = Array.from(
    new Set([post.keywordSuggestion, post.llmSuggestion].filter((v): v is CategoryLabel => v !== null))
  ).sort((a, b) => CATEGORY_LABEL_DISPLAY[a].localeCompare(CATEGORY_LABEL_DISPLAY[b]))
  if (suggestions.length === 0) {
    return <span className="text-muted-foreground text-xs">Uncategorized</span>
  }
  return (
    <div className="flex flex-col gap-1">
      {suggestions.map((label) => (
        <CategoryBadge key={label} label={label} />
      ))}
    </div>
  )
}

// Each role renders as its own component (rather than branching inside one
// component) so a future per-role useActionState call is guaranteed to stay
// unconditional — role-branching a single component with hooks inside each
// branch would violate the rules of hooks the moment one is added there.
function TeamProposeCell({ post }: { post: ReviewPostRow }) {
  const boundAction = proposePostCategoryForm.bind(null, post.id)
  const [proposeState, proposeAction, isProposing] = useActionState(boundAction, null)
  return (
    <div className="flex flex-col gap-1">
      <form action={proposeAction} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Select name="categoryLabel" defaultValue={defaultSelection(post)}>
          {/* Fixed width (not just min-w) so the trigger box doesn't grow/shrink
              with the selected label's length — keeps the submit button lined up
              in a straight column across rows. */}
          <SelectTrigger className="text-xs border-border focus-visible:ring-ring w-48 h-7" size="sm">
            {/* proposeCategoryLabel already resolves '' to "Select category", so
                the placeholder prop below would never actually render. */}
            <SelectValue>{proposeCategoryLabel}</SelectValue>
          </SelectTrigger>
          {/* alignItemWithTrigger={false}: base-ui's default popup positioning
              overlays the list directly on top of the trigger, which spills the
              list across the row below and visually collides with its submit
              button. Normal dropdown positioning (opens below the trigger)
              avoids that. Popup width stays default (== trigger width) — it
              doesn't need to stretch over the button; base-ui's Select is
              modal, so the button is inert while the popup is open anyway. */}
          <SelectContent align="start" alignItemWithTrigger={false}>
            {ASSIGNABLE_LABELS.map((label) => (
              <SelectItem key={label} value={label} label={CATEGORY_LABEL_DISPLAY[label]}>{CATEGORY_LABEL_DISPLAY[label]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" disabled={isProposing} className="bg-primary hover:bg-primary/90 text-white text-xs whitespace-nowrap h-7 px-3">
          {isProposing ? 'Saving…' : post.category_pending ? 'Update proposal' : 'Propose'}
        </Button>
      </form>
      {proposeState?.error && (
        <span role="alert" className="text-status-negative text-[11px]">{proposeState.error}</span>
      )}
    </div>
  )
}

// MARKETING_MANAGER — full: accept/reject a pending proposal, or override directly.
function ManagerActionCell({ post }: { post: ReviewPostRow }) {
  const [isPending, startTransition] = useTransition()
  const [rowError, setRowError] = useState<string | null>(null)
  const boundOverride = updatePostCategoryForm.bind(null, post.id)
  const [overrideState, overrideAction, isOverriding] = useActionState(boundOverride, null)

  // A successful override shouldn't leave a stale Accept/Reject error
  // showing underneath it.
  useEffect(() => {
    if (overrideState?.success) setRowError(null)
  }, [overrideState])

  function handleAccept() {
    setRowError(null)
    startTransition(async () => {
      const res = await acceptPendingCategory(post.id)
      if (res.error) setRowError(res.error)
    })
  }

  function handleReject() {
    setRowError(null)
    startTransition(async () => {
      const res = await rejectPendingCategory(post.id)
      if (res.error) setRowError(res.error)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {post.category_pending && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handleAccept}
            className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-3"
          >
            Accept
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={handleReject}
            className="text-xs h-7 px-3"
          >
            Reject
          </Button>
        </div>
      )}
      <form action={overrideAction} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Select name="categoryLabel" defaultValue={defaultSelection(post)}>
          {/* Fixed width (not just min-w) so the trigger box doesn't grow/shrink
              with the selected label's length — keeps the "Override & finalize"
              button lined up in a straight column across rows. */}
          <SelectTrigger className="text-xs border-border focus-visible:ring-ring w-48 h-7" size="sm">
            {/* categorySelectLabel already resolves '' to "— None —", so the
                placeholder prop below would never actually render. */}
            <SelectValue>{categorySelectLabel}</SelectValue>
          </SelectTrigger>
          {/* alignItemWithTrigger={false}: base-ui's default popup positioning
              overlays the list directly on top of the trigger, which spills the
              list across the row below and visually collides with its "Override
              & finalize" button. Normal dropdown positioning (opens below the
              trigger) avoids that. Popup width stays default (== trigger width)
              — it doesn't need to stretch over the button; base-ui's Select is
              modal, so the button is inert while the popup is open anyway. */}
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectItem value="" label="— None —">— None —</SelectItem>
            {ASSIGNABLE_LABELS.map((label) => (
              <SelectItem key={label} value={label} label={CATEGORY_LABEL_DISPLAY[label]}>{CATEGORY_LABEL_DISPLAY[label]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" variant="outline" disabled={isOverriding} className="text-xs whitespace-nowrap h-7 px-3">
          {isOverriding ? 'Saving…' : 'Override & finalize'}
        </Button>
      </form>
      {(rowError || overrideState?.error) && (
        <span role="alert" className="text-status-negative text-[11px]">{rowError ?? overrideState?.error}</span>
      )}
    </div>
  )
}

function FlagReasonCell({ post }: { post: ReviewPostRow }) {
  if (post.flagReasons.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>
  }
  return (
    <ul className="flex flex-col gap-1">
      {post.flagReasons.map((reason) => (
        <li key={reason} className="text-xs text-status-warning flex items-start gap-1">
          <span aria-hidden="true">⚠</span>
          <span>{FLAG_REASON_SHORT[reason]}</span>
        </li>
      ))}
    </ul>
  )
}

function ActionCell({ post, role }: { post: ReviewPostRow; role: Role }) {
  if (role === 'BUSINESS_OWNER') {
    return <span className="text-muted-foreground text-xs">View only</span>
  }
  if (role === 'MARKETING_TEAM') {
    return <TeamProposeCell post={post} />
  }
  return <ManagerActionCell post={post} />
}

function ReviewTable({ posts, role }: { posts: ReviewPostRow[]; role: Role }) {
  if (posts.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground text-sm">
        No organic posts uploaded yet. Upload a Facebook Insights CSV first.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-secondary">
          <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Post Details</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Type</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Suggested / Pending</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Review reason(s)</TableHead>
          <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post) => (
          <TableRow key={post.id} className="hover:bg-secondary border-t border-border">
            <TableCell className="px-4 py-3 max-w-xs align-top">
              {post.title ? (
                <div className="font-medium text-foreground text-sm truncate" title={post.title}>{post.title}</div>
              ) : (
                <span className="text-muted-foreground text-xs italic">No title</span>
              )}
              <a href={post.permalink} target="_blank" rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 hover:underline text-xs mt-0.5 inline-block">
                View post ↗
              </a>
            </TableCell>
            <TableCell className="px-4 py-3 align-top"><TypeBadge type={post.post_type} /></TableCell>
            <TableCell className="px-4 py-3 align-top"><PendingCell post={post} /></TableCell>
            <TableCell className="px-4 py-3 max-w-[220px] whitespace-normal align-top"><FlagReasonCell post={post} /></TableCell>
            <TableCell className="px-4 py-3 align-top"><ActionCell post={post} role={role} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function CategorizeClient({ posts, role }: Props) {
  const [isPending, startTransition] = useTransition()
  const [autoResult, setAutoResult] = useState<{ posts: number } | null>(null)
  const [autoError, setAutoError] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<{ accepted: number } | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [batchConfirmResult, setBatchConfirmResult] = useState<{ confirmed: number } | null>(null)
  const [batchConfirmError, setBatchConfirmError] = useState<string | null>(null)
  const [llmResult, setLlmResult] = useState<string | null>(null)
  const [llmIsError, setLlmIsError] = useState(false)
  // Gates the live countdown suffix — only true while a cooldown started by
  // this attempt is still running, so a non-retryable message never implies
  // a wait that isn't actually happening.
  const [llmCoolingDown, setLlmCoolingDown] = useState(false)
  const [llmPending, setLlmPending] = useState(false)
  const [page, setPage] = useState(1)
  const { secondsLeft: llmCooldown, begin: beginLlmCooldown } = useCooldown(LLM_COOLDOWN_STORAGE_KEY)

  const pendingCount = posts.filter((p) => p.category_pending !== null).length
  const batchConfirmCount = posts.filter(isBatchConfirmEligible).length
  const pageCount = Math.max(1, Math.ceil(posts.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount)
  const pagedPosts = posts.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE)

  function handleAutoCategorize() {
    setAutoResult(null)
    setAutoError(null)
    startTransition(async () => {
      const res = await autoCategorizeAll()
      if (res.ok) setAutoResult({ posts: res.posts })
      else setAutoError(res.reason)
    })
  }

  function handleBulkAccept() {
    setBulkResult(null)
    setBulkError(null)
    startTransition(async () => {
      const res = await bulkAcceptPendingCategories()
      if (res.ok) setBulkResult({ accepted: res.accepted })
      else setBulkError(res.reason)
    })
  }

  function handleBatchConfirm() {
    setBatchConfirmResult(null)
    setBatchConfirmError(null)
    startTransition(async () => {
      const res = await batchConfirmAgreed()
      if (res.ok) setBatchConfirmResult({ confirmed: res.confirmed })
      else setBatchConfirmError(res.reason)
    })
  }

  async function handleLlmClassify() {
    setLlmResult(null)
    setLlmIsError(false)
    setLlmCoolingDown(false)
    setLlmPending(true)
    const res = await runLlmClassification()
    setLlmPending(false)

    if (res.ok) {
      setLlmResult(
        res.batchesRun === 0
          ? 'Nothing new to classify'
          : `Classified ${res.classified} post${res.classified !== 1 ? 's' : ''} (${res.unclassified} unclassified)`
      )
      // Only pace the next click when this attempt actually reached Groq
      // (batchesRun > 0) — "nothing new to classify" never spent tokens.
      if (res.batchesRun > 0) {
        setLlmCoolingDown(true)
        beginLlmCooldown(LLM_COOLDOWN_SECONDS)
      }
      return
    }

    setLlmResult(res.reason)
    setLlmIsError(true)
    // Always floor at the full pacing window, never Groq's shorter
    // retry-after value — mirrors KeywordsClient's handleAnalyze.
    if (res.retryable) {
      setLlmCoolingDown(true)
      beginLlmCooldown(Math.max(LLM_COOLDOWN_SECONDS, res.retryAfterSeconds ?? 0))
    }
  }

  const allCaughtUp = posts.length === 0

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="font-semibold text-foreground">Uncategorized Posts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {posts.length} in queue{pendingCount > 0 ? ` · ${pendingCount} pending review` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {autoResult && (
            <p className="animate-fade-slide-up text-xs text-status-positive font-medium bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
              {autoResult.posts === 0 ? 'Nothing new to categorize' : `Applied to ${autoResult.posts} post${autoResult.posts !== 1 ? 's' : ''}`}
            </p>
          )}
          {autoError && (
            <p role="alert" className="animate-fade-slide-up text-xs text-status-negative font-medium bg-status-negative/10 border border-status-negative/30 rounded-lg px-3 py-1.5">
              {autoError}
            </p>
          )}
          {bulkResult && (
            <p className="animate-fade-slide-up text-xs text-status-positive font-medium bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
              Accepted {bulkResult.accepted} proposal{bulkResult.accepted !== 1 ? 's' : ''}
            </p>
          )}
          {bulkError && (
            <p role="alert" className="animate-fade-slide-up text-xs text-status-negative font-medium bg-status-negative/10 border border-status-negative/30 rounded-lg px-3 py-1.5">
              {bulkError}
            </p>
          )}
          {batchConfirmResult && (
            <p className="animate-fade-slide-up text-xs text-status-positive font-medium bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
              Confirmed {batchConfirmResult.confirmed} post{batchConfirmResult.confirmed !== 1 ? 's' : ''}
            </p>
          )}
          {batchConfirmError && (
            <p role="alert" className="animate-fade-slide-up text-xs text-status-negative font-medium bg-status-negative/10 border border-status-negative/30 rounded-lg px-3 py-1.5">
              {batchConfirmError}
            </p>
          )}
          {llmResult && (
            <p className={`animate-fade-slide-up text-xs font-medium rounded-lg px-3 py-1.5 border ${
              llmIsError
                ? 'text-status-warning bg-status-warning/10 border-status-warning/30'
                : 'text-status-positive bg-green-500/10 border-green-500/30'
            }`}>
              {llmResult}{llmCoolingDown && llmCooldown > 0 ? ` Try again in ${llmCooldown}s.` : ''}
            </p>
          )}

          {role === 'MARKETING_MANAGER' && pendingCount > 0 && (
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleBulkAccept}
              className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3"
            >
              Accept all pending ({pendingCount})
            </Button>
          )}

          {role === 'MARKETING_MANAGER' && batchConfirmCount > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handleBatchConfirm}
              className="text-xs h-8 px-3"
            >
              Batch confirm agreed ({batchConfirmCount})
            </Button>
          )}

          {role === 'MARKETING_MANAGER' && (
            <button
              onClick={handleAutoCategorize}
              disabled={isPending || posts.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 active:bg-primary/80 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              {isPending ? 'Categorizing…' : 'Generate suggestions'}
            </button>
          )}

          {role === 'MARKETING_MANAGER' && (
            <button
              onClick={handleLlmClassify}
              disabled={llmPending || posts.length === 0 || llmCooldown > 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-foreground bg-card border border-border hover:bg-accent active:bg-accent/80 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              {llmPending ? 'Classifying…' : llmCooldown > 0 ? `Wait ${llmCooldown}s` : 'Generate AI suggestions'}
            </button>
          )}
        </div>
      </div>

      {allCaughtUp ? (
        <div className="animate-fade-slide-up flex flex-col items-center justify-center py-16 px-6 text-center bg-card rounded-2xl card-shadow">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-status-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">All caught up</p>
          <p className="text-xs text-muted-foreground max-w-[240px]">Every post has a final category. Reassign from the Content Library if needed.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          <ReviewTable posts={pagedPosts} role={role} />
          <PaginationBar page={clampedPage} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}

      {role === 'MARKETING_TEAM' && (
        <p className="text-xs text-muted-foreground mt-3">
          Proposals stay pending until a Marketing Manager accepts them.
        </p>
      )}
      {role === 'MARKETING_MANAGER' && (
        <p className="text-xs text-muted-foreground mt-3">
          Keywords configured in{' '}
          <a href="/dashboard/marketing/keywords" className="text-primary hover:underline">Manage Keywords</a>.
        </p>
      )}
    </div>
  )
}
