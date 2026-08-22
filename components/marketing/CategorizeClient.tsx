'use client'

import { useActionState, useEffect, useMemo, useState, useTransition, type FormEvent } from 'react'
import {
  updatePostCategory,
  proposePostCategoryForm,
  acceptPendingCategory,
  rejectPendingCategory,
  bulkAcceptPendingCategories,
  batchConfirmAgreed,
  autoCategorizeAll,
} from '@/actions/categorize'
import { runLlmClassification } from '@/actions/classify-posts'
import { CATEGORY_LABEL_DISPLAY, categorySelectLabel } from '@/lib/category-label'
import { FLAG_REASON_SHORT, rankFlagReasons } from '@/lib/categorize/flag-reasons'
import { useCooldown } from '@/hooks/useCooldown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  const [jumpValue, setJumpValue] = useState('')

  if (pageCount <= 1) return null

  function handleJumpSubmit(e: FormEvent) {
    e.preventDefault()
    const target = parseInt(jumpValue, 10)
    if (Number.isInteger(target) && target >= 1 && target <= pageCount) {
      onPageChange(target)
    }
    setJumpValue('')
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border flex-wrap">
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
        {/* Jump-to-page: Previous/Next alone means a long queue can take a dozen
            blind clicks to reach a specific page. */}
        {pageCount > 3 && (
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
            <Input
              type="number"
              min={1}
              max={pageCount}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              placeholder="Go to…"
              aria-label="Jump to page"
              className="h-7 w-20 text-xs"
            />
            <Button type="submit" size="sm" variant="outline" className="h-7 px-3 text-xs">
              Go
            </Button>
          </form>
        )}
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
    // violet, not purple — purple has no branded ramp in globals.css and
    // would render literal default-Tailwind purple instead of the theme.
    ENTERTAINMENT: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
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
  // docs/raven/S4_Presentation_Fix.md §3.1: when one method abstains
  // (UNCLASSIFIED), rendering it as a chip still leaks which method said
  // what — UNCLASSIFIED is unmistakably "the keyword method found nothing,"
  // not a candidate category, and can't be selected anyway. The abstention
  // is already communicated by the UNCLASSIFIED flag reason, so it's
  // filtered out here via assignableSuggestion rather than shown as a chip.
  const suggestions = Array.from(
    new Set([assignableSuggestion(post.keywordSuggestion), assignableSuggestion(post.llmSuggestion)]
      .filter((v): v is CategoryLabel => v !== undefined))
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
        <span role="alert" className="text-status-negative text-xs">{proposeState.error}</span>
      )}
    </div>
  )
}

// MARKETING_MANAGER — full: accept/reject a pending proposal, or override
// directly. When a pending proposal exists, the override form starts
// collapsed behind a toggle so Accept/Reject reads as the default path and
// override as the deliberate exception — showing both a full Select+button
// form and Accept/Reject side by side left every row asking the Manager to
// re-parse "am I accepting, or overriding?" (impeccable critique, P2).
// Accept and Override both now confirm before writing, matching the
// confirmation gate on the two bulk actions (though not their close timing —
// the bulk dialogs close before the transition, these close after) — all
// four paths perform the identical category-finalizing write, so none
// should be a single unconfirmed click (evaluate audit, P1: Accept had been
// the one path left with no safety net).
function ManagerActionCell({ post }: { post: ReviewPostRow }) {
  const [isPending, startTransition] = useTransition()
  const [rowError, setRowError] = useState<string | null>(null)
  const [overrideValue, setOverrideValue] = useState<CategoryLabel | ''>(defaultSelection(post))
  // Derived, not snapshotted: this component instance survives across a
  // Reject's revalidate (ReviewTable keys by post.id), so a plain
  // useState(post.category_pending === null) would freeze at its mount-time
  // value — after Reject clears category_pending, the toggle block above
  // unmounts and this stayed false, leaving the row with no controls at all.
  const [overrideExpanded, setOverrideExpanded] = useState(false)
  const showOverrideForm = overrideExpanded || post.category_pending === null
  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false)
  const [confirmOverrideOpen, setConfirmOverrideOpen] = useState(false)

  function handleAccept() {
    setRowError(null)
    startTransition(async () => {
      const res = await acceptPendingCategory(post.id)
      setConfirmAcceptOpen(false)
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

  function handleOverride() {
    setRowError(null)
    startTransition(async () => {
      const res = await updatePostCategory(post.id, overrideValue || null)
      setConfirmOverrideOpen(false)
      if (res.error) setRowError(res.error)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {post.category_pending && (
        <div className="flex items-center gap-2">
          <Dialog open={confirmAcceptOpen} onOpenChange={setConfirmAcceptOpen}>
            <DialogTrigger
              disabled={isPending}
              render={<Button type="button" size="sm" className="text-xs h-7 px-3" />}
            >
              Accept
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Finalize as &ldquo;{categorySelectLabel(post.category_pending)}&rdquo;?</DialogTitle>
                <DialogDescription>
                  This finalizes the category directly. It can&apos;t be undone from here — a finalized post can only be changed afterward from the Content Library, one at a time.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirmAcceptOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="button" disabled={isPending} onClick={handleAccept} className="text-xs">
                  {isPending ? 'Saving…' : 'Confirm'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          {!showOverrideForm && (
            <button
              type="button"
              onClick={() => setOverrideExpanded(true)}
              className="text-xs text-primary hover:underline"
            >
              Choose a different category
            </button>
          )}
        </div>
      )}
      {showOverrideForm && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select value={overrideValue} onValueChange={(v) => setOverrideValue(v as CategoryLabel | '')}>
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
          <Dialog open={confirmOverrideOpen} onOpenChange={setConfirmOverrideOpen}>
            <DialogTrigger
              disabled={isPending}
              render={<Button type="button" size="sm" variant="outline" className="text-xs whitespace-nowrap h-7 px-3" />}
            >
              Override & finalize
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Finalize as &ldquo;{categorySelectLabel(overrideValue)}&rdquo;?</DialogTitle>
                <DialogDescription>
                  This finalizes the category directly. It can&apos;t be undone from here — a finalized post can only be changed afterward from the Content Library, one at a time.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirmOverrideOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="button" disabled={isPending} onClick={handleOverride} className="text-xs">
                  {isPending ? 'Saving…' : 'Confirm'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
      {rowError && (
        <span role="alert" className="text-status-negative text-xs">{rowError}</span>
      )}
    </div>
  )
}

// docs/raven/S4_Presentation_Fix.md §2.1 — stacking every fired reason read
// as an undifferentiated wall of warnings across rows. Show only the
// highest-ranked (most informative) reason, with the rest available on
// demand rather than always visible.
function FlagReasonCell({ post }: { post: ReviewPostRow }) {
  const [expanded, setExpanded] = useState(false)

  if (post.flagReasons.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>
  }

  const [primary, ...rest] = rankFlagReasons(post.flagReasons)
  // §2.4 — every row here is flagged by definition, so a triangle on every
  // one carries no information; dropped entirely. Warning-color emphasis is
  // reserved for the rank-1 DISAGREEMENT case, the strongest signal, so it
  // still stands out from the other three, purely text-driven differences.
  const primaryIsDisagreement = primary === 'DISAGREEMENT'

  return (
    <div className="flex flex-col gap-1">
      <div className={`text-xs ${primaryIsDisagreement ? 'text-status-warning font-medium' : 'text-foreground'}`}>
        {FLAG_REASON_SHORT[primary]}
      </div>
      {rest.length > 0 && (
        <>
          {expanded && (
            <ul className="flex flex-col gap-1 pl-4">
              {rest.map((reason) => (
                <li key={reason} className="text-xs text-muted-foreground">
                  {FLAG_REASON_SHORT[reason]}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-primary hover:underline text-left pl-4 w-fit"
          >
            {expanded ? 'Show less' : `+${rest.length} more`}
          </button>
        </>
      )}
    </div>
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

// docs/raven/S4_Presentation_Fix.md §4 — one card per post instead of a
// five-column table row. The table spread "View post," the suggestion
// chips, and the review reason across separate columns that could be a
// full row-width apart; a card keeps them in one visual block so, e.g.,
// the reason line and the action control read together instead of
// requiring a left-to-right scan. Suggested-category input stays the
// existing Select (ManagerActionCell/TeamProposeCell), not the mockup's
// literal radio buttons — same rationale as
// docs/raven/S4_Categorisation_Review_UI_Change.md §2.2's badge+Select
// choice: same no-attribution/no-forced-pick effect, already-built control.
function ReviewCard({ post, role }: { post: ReviewPostRow; role: Role }) {
  return (
    <div className="px-4 py-4 border-t border-border first:border-t-0 hover:bg-secondary transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {post.title ? (
            <div className="font-medium text-foreground text-sm truncate" title={post.title}>{post.title}</div>
          ) : (
            <span className="text-muted-foreground text-xs italic">No title</span>
          )}
          <a href={post.permalink} target="_blank" rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 hover:underline text-xs mt-0.5 inline-block">
            View post ↗
          </a>
        </div>
        <TypeBadge type={post.post_type} />
      </div>

      <div className="mt-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Suggested / Pending</p>
        <PendingCell post={post} />
      </div>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div className="min-w-0 flex-1"><FlagReasonCell post={post} /></div>
        <div className="shrink-0"><ActionCell post={post} role={role} /></div>
      </div>
    </div>
  )
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
    <div>
      {posts.map((post) => (
        <ReviewCard key={post.id} post={post} role={role} />
      ))}
    </div>
  )
}

// Toast messages persist until either the next relevant action or this
// timeout — without it, a manager who fires several actions in one session
// accumulates stale confirmations next to fresh ones (5 independent slots,
// nothing clearing an unrelated one previously).
const MESSAGE_AUTO_DISMISS_MS = 6000

type FlagFilter = 'ALL' | 'FLAGGED' | 'UNFLAGGED' | CategoryFlagReason

const FLAG_FILTER_OPTIONS: { value: FlagFilter; label: string }[] = [
  { value: 'ALL', label: 'All posts' },
  { value: 'FLAGGED', label: 'Flagged only' },
  { value: 'UNFLAGGED', label: 'Unflagged only' },
  { value: 'DISAGREEMENT', label: 'Needs judgment — disagreement' },
  { value: 'UNCLASSIFIED', label: "Needs judgment — couldn't classify" },
  { value: 'ENTERTAINMENT_SUGGESTED', label: 'Entertainment suggested' },
  { value: 'SHORT_CAPTION', label: 'Short caption' },
]

function matchesFlagFilter(post: ReviewPostRow, filter: FlagFilter): boolean {
  if (filter === 'ALL') return true
  if (filter === 'FLAGGED') return post.flagReasons.length > 0
  if (filter === 'UNFLAGGED') return post.flagReasons.length === 0
  return post.flagReasons.includes(filter)
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
  const [search, setSearch] = useState('')
  const [flagFilter, setFlagFilter] = useState<FlagFilter>('ALL')
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false)
  const [confirmBatchOpen, setConfirmBatchOpen] = useState(false)
  const { secondsLeft: llmCooldown, begin: beginLlmCooldown } = useCooldown(LLM_COOLDOWN_STORAGE_KEY)

  const pendingCount = posts.filter((p) => p.category_pending !== null).length
  const batchConfirmCount = posts.filter(isBatchConfirmEligible).length

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return posts.filter((post) => {
      if (query && !(post.title ?? '').toLowerCase().includes(query)) return false
      return matchesFlagFilter(post, flagFilter)
    })
  }, [posts, search, flagFilter])

  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount)
  const pagedPosts = filteredPosts.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE)
  const isFiltered = search.trim() !== '' || flagFilter !== 'ALL'

  // Bulk actions default to the active filter's scope (impeccable critique,
  // P1) — "Accept all pending" sitting directly above a filtered view
  // previously accepted everything in the whole queue, not what was visible.
  // When unfiltered, filtered === full queue, so behavior is unchanged.
  const pendingIdsInView = filteredPosts.filter((p) => p.category_pending !== null).map((p) => p.id)
  const batchConfirmIdsInView = filteredPosts.filter(isBatchConfirmEligible).map((p) => p.id)
  const pendingCountInView = pendingIdsInView.length
  const batchConfirmCountInView = batchConfirmIdsInView.length
  const pendingCountOutsideView = pendingCount - pendingCountInView
  const batchConfirmCountOutsideView = batchConfirmCount - batchConfirmCountInView

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function updateFlagFilter(value: FlagFilter) {
    setFlagFilter(value)
    setPage(1)
  }

  // Auto-dismiss non-LLM toasts so a long review session doesn't accumulate
  // stale confirmations. llmResult is excluded — it doubles as the live
  // cooldown countdown display and must persist until the cooldown clears.
  useEffect(() => {
    if (!autoResult && !autoError) return
    const timer = setTimeout(() => { setAutoResult(null); setAutoError(null) }, MESSAGE_AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [autoResult, autoError])

  useEffect(() => {
    if (!bulkResult && !bulkError) return
    const timer = setTimeout(() => { setBulkResult(null); setBulkError(null) }, MESSAGE_AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [bulkResult, bulkError])

  useEffect(() => {
    if (!batchConfirmResult && !batchConfirmError) return
    const timer = setTimeout(() => { setBatchConfirmResult(null); setBatchConfirmError(null) }, MESSAGE_AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [batchConfirmResult, batchConfirmError])

  // Clears every toast slot, not just the one the caller's about to fill —
  // otherwise unrelated stale confirmations from an earlier action keep
  // sitting in the header while a new one renders next to them.
  function clearAllMessages() {
    setAutoResult(null); setAutoError(null)
    setBulkResult(null); setBulkError(null)
    setBatchConfirmResult(null); setBatchConfirmError(null)
  }

  function handleAutoCategorize() {
    clearAllMessages()
    startTransition(async () => {
      const res = await autoCategorizeAll()
      if (res.ok) setAutoResult({ posts: res.posts })
      else setAutoError(res.reason)
    })
  }

  function handleBulkAccept(scopeToView: boolean) {
    clearAllMessages()
    setConfirmBulkOpen(false)
    startTransition(async () => {
      const res = await bulkAcceptPendingCategories(scopeToView ? pendingIdsInView : undefined)
      if (res.ok) setBulkResult({ accepted: res.accepted })
      else setBulkError(res.reason)
    })
  }

  function handleBatchConfirm(scopeToView: boolean) {
    clearAllMessages()
    setConfirmBatchOpen(false)
    startTransition(async () => {
      const res = await batchConfirmAgreed(scopeToView ? batchConfirmIdsInView : undefined)
      if (res.ok) setBatchConfirmResult({ confirmed: res.confirmed })
      else setBatchConfirmError(res.reason)
    })
  }

  async function handleLlmClassify() {
    clearAllMessages()
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
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="font-semibold text-foreground">Uncategorized Posts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isFiltered ? `${filteredPosts.length} of ${posts.length} in queue` : `${posts.length} in queue`}
            {pendingCount > 0 ? ` · ${pendingCount} pending review` : ''}
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
            <p role={llmIsError ? 'alert' : undefined} className={`animate-fade-slide-up text-xs font-medium rounded-lg px-3 py-1.5 border ${
              llmIsError
                ? 'text-status-warning bg-status-warning/10 border-status-warning/30'
                : 'text-status-positive bg-green-500/10 border-green-500/30'
            }`}>
              {llmResult}{llmCoolingDown && llmCooldown > 0 ? ` Try again in ${llmCooldown}s.` : ''}
            </p>
          )}

          {role === 'MARKETING_MANAGER' && pendingCountInView > 0 && (
            <Dialog open={confirmBulkOpen} onOpenChange={setConfirmBulkOpen}>
              <DialogTrigger
                disabled={isPending}
                render={<Button type="button" size="sm" className="text-xs h-8 px-3" />}
              >
                {isFiltered ? `Accept pending in view (${pendingCountInView})` : `Accept all pending (${pendingCountInView})`}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Accept {pendingCountInView} pending proposal{pendingCountInView !== 1 ? 's' : ''}{isFiltered ? ' in this filtered view' : ''}?</DialogTitle>
                  <DialogDescription>
                    This finalizes the category for every post a Team member has proposed on{isFiltered ? ' that matches your current filter' : ''}. It can&apos;t be undone from here — a finalized post can only be changed afterward from the Content Library, one at a time.
                    {isFiltered && pendingCountOutsideView > 0 && (
                      <> {pendingCountOutsideView} more pending proposal{pendingCountOutsideView !== 1 ? 's are' : ' is'} outside this filter and won&apos;t be included — clear filters first to accept everything.</>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setConfirmBulkOpen(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => handleBulkAccept(isFiltered)} className="text-xs">
                    Accept {pendingCountInView}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {role === 'MARKETING_MANAGER' && batchConfirmCountInView > 0 && (
            <Dialog open={confirmBatchOpen} onOpenChange={setConfirmBatchOpen}>
              <DialogTrigger
                disabled={isPending}
                render={<Button type="button" size="sm" variant="outline" className="text-xs h-8 px-3" />}
              >
                {isFiltered ? `Batch confirm in view (${batchConfirmCountInView})` : `Batch confirm agreed (${batchConfirmCountInView})`}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm {batchConfirmCountInView} unflagged, agreed post{batchConfirmCountInView !== 1 ? 's' : ''}{isFiltered ? ' in this filtered view' : ''}?</DialogTitle>
                  <DialogDescription>
                    Finalizes every post where both methods agree and nothing was flagged for review{isFiltered ? ', restricted to your current filter' : ''}. It can&apos;t be undone from here — a finalized post can only be changed afterward from the Content Library, one at a time.
                    {isFiltered && batchConfirmCountOutsideView > 0 && (
                      <> {batchConfirmCountOutsideView} more eligible post{batchConfirmCountOutsideView !== 1 ? 's are' : ' is'} outside this filter and won&apos;t be included — clear filters first to confirm everything.</>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setConfirmBatchOpen(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => handleBatchConfirm(isFiltered)} className="text-xs">
                    Confirm {batchConfirmCountInView}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {role === 'MARKETING_MANAGER' && (
            <div className="flex flex-col items-start gap-0.5">
              <button
                onClick={handleAutoCategorize}
                disabled={isPending || posts.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 active:bg-primary/80 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                {isPending ? 'Categorizing…' : 'Generate suggestions'}
              </button>
              <span className="text-xs text-muted-foreground pl-1">Matches your keyword lists</span>
            </div>
          )}

          {role === 'MARKETING_MANAGER' && (
            <div className="flex flex-col items-start gap-0.5">
              <button
                onClick={handleLlmClassify}
                disabled={llmPending || posts.length === 0 || llmCooldown > 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-foreground bg-card border border-border hover:bg-accent active:bg-accent/80 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                {llmPending ? 'Classifying…' : llmCooldown > 0 ? `Wait ${llmCooldown}s` : 'Generate AI suggestions'}
              </button>
              <span className="text-xs text-muted-foreground pl-1">Uses AI to read each post</span>
            </div>
          )}
        </div>
      </div>

      {posts.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Input
            type="search"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search by title…"
            aria-label="Search posts by title"
            className="h-8 max-w-xs text-xs"
          />
          <Select value={flagFilter} onValueChange={(v) => updateFlagFilter(v as FlagFilter)}>
            <SelectTrigger className="text-xs border-border focus-visible:ring-ring w-56 h-8" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {FLAG_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} label={opt.label}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isFiltered && (
            <button
              type="button"
              onClick={() => { updateSearch(''); updateFlagFilter('ALL') }}
              className="text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

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
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-card rounded-2xl card-shadow">
          <p className="text-sm font-semibold text-foreground mb-1">No posts match your filters</p>
          <button type="button" onClick={() => { updateSearch(''); updateFlagFilter('ALL') }} className="text-xs text-primary hover:underline mt-1">
            Clear filters
          </button>
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
