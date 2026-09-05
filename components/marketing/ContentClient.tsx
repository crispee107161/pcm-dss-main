'use client'

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react'
import { usePathname } from 'next/navigation'
import { useProgressRouter } from '@/lib/navigation-progress'
import { SlidingTabs } from '@/components/ui/sliding-tabs'
import {
  updatePostCategory,
  batchConfirmAgreed,
} from '@/actions/categorize'
import { generateAllSuggestions } from '@/actions/generate-suggestions'
import { formatGenerateResult, type GenerateResultMessage } from '@/lib/categorize/generate-summary'
import { FLAG_REASON_SHORT, rankFlagReasons } from '@/lib/categorize/flag-reasons'
import {
  SELECTABLE_LABELS,
  ASSIGNABLE_LABELS,
  selectableLabelText,
  categoryEditLabel,
  suggestedCandidates,
  agreedSuggestion,
  isBatchConfirmEligible,
} from '@/lib/categorize/category-picker'
import type { ContentFilter } from '@/lib/categorize/content-filter'
import { useCooldown } from '@/hooks/useCooldown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CategoryLabel, CategoryFlagReason, CategoryFinalSource, Role } from '@/app/generated/prisma/client'

// Re-exported so the categorize/page.tsx routes can import it alongside the
// default export without a separate lib/ import line.
export type { ContentFilter }

export interface ContentPostRow {
  id: number
  title: string | null
  permalink: string
  post_type: string
  publish_time: string
  views: number | null
  engagement_rate: number
  // ALG-04 / ALG-05 suggestions (actions/categorize.ts, actions/classify-posts.ts).
  // Stored separately per FR-15 — never copied into category_final automatically.
  // Only meaningful on the "needs-review" filter — a post with a final
  // category has left the queue these describe.
  keywordSuggestion: CategoryLabel | null
  llmSuggestion: CategoryLabel | null
  // docs/raven/S4_Categorisation_Review_UI_Change.md §2.1/§3.2 — specific
  // condition(s), rendered via FLAG_REASON_SHORT. Empty = unflagged.
  flagReasons: CategoryFlagReason[]
  category_final: CategoryLabel | null
  category_final_source: CategoryFinalSource | null
  assignedByEmail: string | null
  assignedAt: string | null
}

// Client-side pacing floor, same rationale and value as Manage Keywords'
// ANALYZE_COOLDOWN_SECONDS (components/marketing/KeywordsClient.tsx) — a
// batch of Groq calls, so pace the next click regardless of what Groq's own
// (often shorter) retry-after header says.
const LLM_COOLDOWN_SECONDS = 60
const LLM_COOLDOWN_STORAGE_KEY = 'pcm-classify-llm-cooldown-until'

interface Props {
  posts: ContentPostRow[]
  // mvp.md §3 S4 permission grid: Owner=View, Marketing Manager=Full
  // (only role that finalises), Marketing Team=Suggest only (view only on
  // this screen since Phase 2 removed Propose).
  role: Role
  filter: ContentFilter
}

const PAGE_SIZE = 50

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso))
}

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

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
    // docs/raven/Content_Second_Pass.md §1 — no longer exhaustiveness-only:
    // UNCLEAR now appears on the Owner/Manager "No category" tab (codebook
    // and ground-truth imports both write it), styled identically to
    // UNCLASSIFIED since selectableLabelText renders both as "No category".
    UNCLEAR: 'bg-secondary text-muted-foreground border-border',
  }
  // Routed through selectableLabelText (not CATEGORY_LABEL_DISPLAY directly)
  // so UNCLASSIFIED/UNCLEAR both read "No category" here too — code review
  // caught this badge showing "Unclassified"/"Unclear" to Owner/Team while
  // the Manager's own picker and dropdown call the same value "No category".
  return (
    <Badge className={`rounded-full h-auto py-0.5 px-2 text-xs font-medium ${colors[label]}`}>
      {selectableLabelText(label)}
    </Badge>
  )
}

// Read-only display for Owner/Team (view-only roles — Phase 2 of
// docs/raven/Consolidation_Plan_Checklist.md). The Manager's interactive
// equivalent is CategoryPicker below, which reuses suggestedCandidates too.
function SuggestionCell({ post }: { post: ContentPostRow }) {
  // docs/raven/S4_Presentation_Fix.md §3.1: when one method abstains
  // (UNCLASSIFIED), rendering it as a chip still leaks which method said
  // what — UNCLASSIFIED is unmistakably "the keyword method found nothing,"
  // not a candidate category, and can't be selected anyway. The abstention
  // is already communicated by the UNCLASSIFIED flag reason, so it's
  // filtered out here via suggestedCandidates rather than shown as a chip.
  const suggestions = suggestedCandidates(post)
  if (suggestions.length === 0) {
    return <span className="text-muted-foreground text-xs">Uncategorised</span>
  }
  return (
    <div className="flex flex-col gap-1">
      {suggestions.map((label) => (
        <CategoryBadge key={label} label={label} />
      ))}
    </div>
  )
}

// A single radio-style option, styled as a pill matching CategoryBadge's
// visual language. The input is a real <input type="radio"> (sr-only, not
// display:none) so native keyboard nav (arrow keys between same-name
// options) and focus-visible both keep working — only its box is hidden;
// the visible pill is a sibling styled off its peer state.
//
// docs/raven-review/Needs_Review_Row_Design.md §1/§2.1/§2.2 — these pills
// used to be visually identical to the static Photos/Videos type badges
// elsewhere on the row (same shape, border, fill, weight), so two people
// who wrote the spec themselves still read a greyed Save button as a
// broken feature rather than "nothing selected yet." An explicit radio
// dot — empty when unchecked, filled solid when checked — makes these
// legible as controls at a glance, and a filled background on selection
// (not just a border-color shift) makes the chosen answer readable from
// across a desk, not just up close.
function CategoryOption({
  name, value, text, checked, onSelect, disabled,
}: { name: string; value: string; text: string; checked: boolean; onSelect: () => void; disabled?: boolean }) {
  return (
    // Named group (group/option) — code review (2026-08-26) flagged that an
    // unnamed .group would match *any* ancestor .group, so if some future
    // wrapper (a row, a card) also picks up className="group" for an
    // unrelated reason, every pill on this row would light up together with
    // no visible cause. Naming it makes that structurally impossible.
    <label className="group/option inline-flex focus-within:outline-none">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        disabled={disabled}
        className="sr-only"
      />
      <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs cursor-pointer select-none transition-[background-color,border-color,color] border-border text-muted-foreground bg-card hover:border-foreground/30 hover:text-foreground group-has-checked/option:bg-primary group-has-checked/option:border-primary group-has-checked/option:text-primary-foreground group-has-checked/option:font-medium group-has-focus-visible/option:outline-none group-has-focus-visible/option:ring-2 group-has-focus-visible/option:ring-ring group-has-focus-visible/option:ring-offset-1 group-has-disabled/option:opacity-50 group-has-disabled/option:cursor-not-allowed">
        {/* Unselected affordance (docs/raven-review/Needs_Review_Row_Design.md
            §2.1) — an empty ring reads unambiguously as "a slot waiting to be
            filled," which nothing else on this row has, so it stops the chip
            from being mistaken for a static badge like Photos/Videos. Fills
            solid on selection (§2.2) rather than relying on the pill's own
            border-color shift alone, which was too subtle on a dark
            background to read at a glance. */}
        <span aria-hidden="true" className="relative inline-flex size-2.5 shrink-0 rounded-full border border-current opacity-70 group-has-checked/option:opacity-100">
          <span className="absolute inset-0.5 rounded-full bg-transparent group-has-checked/option:bg-current" />
        </span>
        {text}
      </span>
    </label>
  )
}

// docs/raven/Categorisation_Workflow_Consolidation.md §4.1 — both candidates
// shown as selectable, unlabelled radio options when methods disagree
// (previously only one was visible), nothing pre-selected, chip becomes the
// radio option itself rather than a badge next to a separate dropdown.
// docs/raven-review/Needs_Review_Row_Design.md §4 / FR07_Review_Row_
// Compliance.md §3.3 — Unassigned used to sit in the same chip row as the
// four real categories, presenting "I cannot determine this" as a fifth
// content type rather than an escape hatch. Two things suggested that
// framing was having an effect: the bucket sat empty across the whole
// corpus, and several posts have no caption text at all. Given its own
// line and a one-line explanation. The chip's own label is
// selectableLabelText('UNCLASSIFIED') (not a separately-worded string) —
// code review (2026-08-26) caught an earlier version of this using
// "No category applies" here while the confirm dialog/badge/dropdown all
// called the same value "Unassigned"/"No category" independently; one
// source of truth now, everywhere this value is displayed.
const UNASSIGNED_CHIP_EXPLANATION = 'Cannot be determined from this post'

function CategoryPicker({
  post, value, onChange, disabled,
}: { post: ContentPostRow; value: CategoryLabel | ''; onChange: (label: CategoryLabel) => void; disabled?: boolean }) {
  const suggested = suggestedCandidates(post)
  const others = ASSIGNABLE_LABELS.filter((label) => !suggested.includes(label))
  const groupName = `category-${post.id}`

  return (
    <div className="flex flex-col gap-2">
      {suggested.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Suggested for this post</p>
          <div className="flex flex-wrap gap-1.5">
            {suggested.map((label) => (
              <CategoryOption key={label} name={groupName} value={label} text={selectableLabelText(label)}
                checked={value === label} onSelect={() => onChange(label)} disabled={disabled} />
            ))}
          </div>
        </div>
      )}
      {others.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {suggested.length > 0 ? 'Other categories' : 'Categories'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {others.map((label) => (
              <CategoryOption key={label} name={groupName} value={label} text={selectableLabelText(label)}
                checked={value === label} onSelect={() => onChange(label)} disabled={disabled} />
            ))}
          </div>
        </div>
      )}
      <div className="pt-1 border-t border-border/60">
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <CategoryOption name={groupName} value="UNCLASSIFIED" text={selectableLabelText('UNCLASSIFIED')}
            checked={value === 'UNCLASSIFIED'} onSelect={() => onChange('UNCLASSIFIED')} disabled={disabled} />
          <span className="text-[10px] text-muted-foreground">{UNASSIGNED_CHIP_EXPLANATION}</span>
        </div>
      </div>
    </div>
  )
}

// MARKETING_MANAGER — the queue's write path now that Propose is gone (Phase
// 2). §4.2/§4.3 of the 22 Aug memo: "Override" no longer labels the primary
// action (reserved for the non-queue filters' CategoryEditCell below), one
// "Save category" button enabled once a selection exists, header reads
// "Suggested" with no method attribution. Nothing pre-selected (§4.1) — an
// empty starting value, never agreedSuggestion, or the Manager is nudged
// toward one method's answer even on a flagged post. Confirmation gate
// matches the two bulk actions (evaluate audit, P1) — this isn't a single
// unconfirmed click.
function ManagerActionCell({ post }: { post: ContentPostRow }) {
  const [isPending, startTransition] = useTransition()
  const [rowError, setRowError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CategoryLabel | ''>('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleSave() {
    setRowError(null)
    startTransition(async () => {
      const res = await updatePostCategory(post.id, selected || null)
      setConfirmOpen(false)
      if (res.error) setRowError(res.error)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <CategoryPicker post={post} value={selected} onChange={setSelected} disabled={isPending} />
      <div>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          {/* docs/raven-review/Needs_Review_Row_Design.md §2.3/§2.4 — a
              button that names its own precondition ("Select a category")
              replaces a static "Save category" label plus an implied
              explanation, and removes an element from an already busy row.
              The disabled state previously used bg-primary at reduced
              opacity, which on this dark theme reads close enough to the
              enabled red that it looked like an unresponsive button rather
              than a waiting one — overridden here to a neutral grey so red
              is reserved for "this will do something." */}
          <DialogTrigger
            disabled={isPending || selected === ''}
            render={
              <Button
                type="button"
                size="sm"
                className="text-xs h-7 px-3 disabled:opacity-100 disabled:bg-secondary disabled:text-muted-foreground disabled:border disabled:border-border"
              />
            }
          >
            {selected === '' ? 'Select a category' : 'Save category'}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalize as &ldquo;{selected ? selectableLabelText(selected) : ''}&rdquo;?</DialogTitle>
              <DialogDescription>
                This finalizes the category directly. It can&apos;t be undone from here. A finalized post can only be changed afterward from the &ldquo;All&rdquo; filter, one at a time.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="button" disabled={isPending} onClick={handleSave} className="text-xs">
                {isPending ? 'Saving…' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {rowError && (
        <span role="alert" className="text-status-negative text-xs">{rowError}</span>
      )}
    </div>
  )
}

// docs/raven-review/FR07_Review_Row_Compliance.md §3.2 / Needs_Review_Row_
// Design.md §3 — "+N more" hid reasons behind a click. There are at most
// four possible reasons and each is a short phrase, so all fired reasons
// are now shown inline; no expand/collapse state needed.
function FlagReasonCell({ post }: { post: ContentPostRow }) {
  // docs/design changes/Upload_and_Content_Review_Revised_v2.md §4.2 — a
  // bare dash on an unflagged row reads as "no information". But empty
  // flagReasons alone doesn't mean the two methods agreed — DISAGREEMENT
  // only fires when both produced a value and they differ (lib/categorize/
  // flag-reasons.ts), so a post where one method (or neither) hasn't run
  // yet also has no flags. Gate the "agree" wording on the same
  // isBatchConfirmEligible predicate the Batch confirm button uses (code
  // review, 2026-09-03), so this cell can't say "agree" on a post
  // SuggestionCell is simultaneously showing as "Uncategorised".
  if (post.flagReasons.length === 0) {
    return (
      <span className="text-muted-foreground text-xs">
        {isBatchConfirmEligible(post) ? 'Both methods agree' : 'Waiting for suggestions'}
      </span>
    )
  }

  const [primary, ...rest] = rankFlagReasons(post.flagReasons)
  // Every row here is flagged by definition, so a triangle on every one
  // carries no information; dropped entirely. Warning-color emphasis is
  // reserved for the rank-1 DISAGREEMENT case, the strongest signal, so it
  // still stands out from the other reasons, purely text-driven differences.
  const primaryIsDisagreement = primary === 'DISAGREEMENT'

  return (
    <div className="flex flex-col gap-1">
      <div className={`text-xs ${primaryIsDisagreement ? 'text-status-warning font-medium' : 'text-foreground'}`}>
        {FLAG_REASON_SHORT[primary]}
      </div>
      {rest.length > 0 && (
        <ul className="flex flex-col gap-1 pl-4">
          {rest.map((reason) => (
            <li key={reason} className="text-xs text-muted-foreground">
              {FLAG_REASON_SHORT[reason]}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// docs/raven/S4_Presentation_Fix.md §4 — one card per post instead of a
// five-column table row, kept for the "needs-review" filter. For
// MARKETING_MANAGER, Phase 3 (§4 of the 22 Aug memo) replaces the old
// "Suggested" display row + separate action row with one block: the
// suggestion chips are themselves the category picker now, so there's
// nothing left to show read-only above it.
function ReviewCard({ post, role }: { post: ContentPostRow; role: Role }) {
  const isManager = role === 'MARKETING_MANAGER'
  return (
    <div className="px-4 py-4 border-t border-border first:border-t-0 hover:bg-secondary transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {post.title ? (
            <div className="font-medium text-foreground text-sm truncate" title={post.title}>{post.title}</div>
          ) : (
            <span className="text-muted-foreground text-xs italic">No title</span>
          )}
          {/* docs/raven-review/Unassigned_Labels_and_Coding_Procedure.md §1 —
              FR-07 lets the reviewer "consult the original post where the
              caption is not sufficient," and that's the primary action for
              exactly the posts most likely to need it (missing/short
              caption). A small text link under the title was easy to miss,
              so this renders as a real action pill instead. Already opens
              in a new tab (target="_blank"), so the reviewer never loses
              their place in the queue. */}
          <a href={post.permalink} target="_blank" rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors">
            View post ↗
          </a>
        </div>
        <TypeBadge type={post.post_type} />
      </div>

      <div className="mt-3">
        <FlagReasonCell post={post} />
      </div>

      {isManager ? (
        <div className="mt-3">
          <ManagerActionCell post={post} />
        </div>
      ) : (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Suggested</p>
            <SuggestionCell post={post} />
          </div>
          <div className="shrink-0"><span className="text-muted-foreground text-xs">View only</span></div>
        </div>
      )}
    </div>
  )
}

function ReviewTable({ posts, role }: { posts: ContentPostRow[]; role: Role }) {
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
  { value: 'DISAGREEMENT', label: 'Needs judgment (disagreement)' },
  { value: 'UNCLASSIFIED', label: "Needs judgment (couldn't classify)" },
  { value: 'ENTERTAINMENT_SUGGESTED', label: 'Entertainment suggested' },
  { value: 'SHORT_CAPTION', label: 'Short caption' },
]

function matchesFlagFilter(post: ContentPostRow, filter: FlagFilter): boolean {
  if (filter === 'ALL') return true
  if (filter === 'FLAGGED') return post.flagReasons.length > 0
  if (filter === 'UNFLAGGED') return post.flagReasons.length === 0
  return post.flagReasons.includes(filter)
}

// The "needs-review" filter's view — the old CategorizeClient body, unchanged
// in behavior. Only rendered when filter === 'needs-review', so `posts` here
// is always already scoped server-side to category_final: null.
function QueueView({ posts, role }: { posts: ContentPostRow[]; role: Role }) {
  const [isPending, startTransition] = useTransition()
  const [generateResult, setGenerateResult] = useState<GenerateResultMessage | null>(null)
  const [batchConfirmResult, setBatchConfirmResult] = useState<{ confirmed: number } | null>(null)
  const [batchConfirmError, setBatchConfirmError] = useState<string | null>(null)
  // Gates the live countdown suffix — only true while a cooldown started by
  // this attempt is still running, so a non-retryable message never implies
  // a wait that isn't actually happening.
  const [llmCoolingDown, setLlmCoolingDown] = useState(false)
  const [generatePending, setGeneratePending] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [flagFilter, setFlagFilter] = useState<FlagFilter>('ALL')
  const [confirmBatchOpen, setConfirmBatchOpen] = useState(false)
  const { secondsLeft: llmCooldown, begin: beginLlmCooldown } = useCooldown(LLM_COOLDOWN_STORAGE_KEY)

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

  // Batch confirm defaults to the active filter's scope (impeccable critique,
  // P1) — sitting directly above a filtered view previously confirmed
  // everything in the whole queue, not what was visible. When unfiltered,
  // filtered === full queue, so behavior is unchanged.
  const batchConfirmIdsInView = filteredPosts.filter(isBatchConfirmEligible).map((p) => p.id)
  const batchConfirmCountInView = batchConfirmIdsInView.length
  const batchConfirmCountOutsideView = batchConfirmCount - batchConfirmCountInView

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function updateFlagFilter(value: FlagFilter) {
    setFlagFilter(value)
    setPage(1)
  }

  // Auto-dismiss the generate toast — but only when it's good news. A
  // negative/warning toast (e.g. missing GROQ_API_KEY, a retired
  // classification model) needs to stay on screen until the user dismisses
  // it or runs Generate again; those failures don't always start a cooldown,
  // so gating on cooldown state alone let them vanish unread. While
  // llmCoolingDown is true the toast also doubles as the live countdown
  // display and must persist until the cooldown clears.
  useEffect(() => {
    if (!generateResult || generateResult.tone !== 'positive' || (llmCoolingDown && llmCooldown > 0)) return
    const timer = setTimeout(() => setGenerateResult(null), MESSAGE_AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [generateResult, llmCoolingDown, llmCooldown])

  useEffect(() => {
    if (!batchConfirmResult && !batchConfirmError) return
    const timer = setTimeout(() => { setBatchConfirmResult(null); setBatchConfirmError(null) }, MESSAGE_AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [batchConfirmResult, batchConfirmError])

  // Clears every toast slot, not just the one the caller's about to fill —
  // otherwise unrelated stale confirmations from an earlier action keep
  // sitting in the header while a new one renders next to them.
  function clearAllMessages() {
    setGenerateResult(null)
    setBatchConfirmResult(null); setBatchConfirmError(null)
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

  // docs/raven/Tracker_Row_Corrections_and_Combined_Generate_Question.md §2 —
  // one action runs both suggestion methods so a post can never end up with
  // only one method's answer (which would make it impossible for
  // DISAGREEMENT to ever fire on that post).
  //
  // docs/raven/Decouple_Both_Legs_and_Exercise_the_Merge.md §1 — the keyword
  // leg is free, instant, and has no rate limit, so an AI cooldown is not a
  // reason to withhold it. attemptLlm skips only the AI leg while one is
  // still running; the keyword leg always runs.
  async function handleGenerate() {
    clearAllMessages()
    const attemptLlm = llmCooldown <= 0
    setGeneratePending(true)
    const res = await generateAllSuggestions(attemptLlm)
    setGeneratePending(false)

    setGenerateResult(formatGenerateResult(res))

    if (!attemptLlm) {
      // Skipped — the earlier run's cooldown is still counting down, so
      // leave llmCoolingDown as-is rather than recomputing it from this
      // attempt's (skipped) llm outcome.
      return
    }

    setLlmCoolingDown(false)
    const llm = res.llm
    if (llm.ok && (llm.batchesRun > 0 || llm.batchesFailed > 0)) {
      // Pace the next click whenever this attempt actually reached Groq,
      // whether the batches succeeded or failed — "nothing new to classify"
      // (batchesRun === 0 && batchesFailed === 0) never spent tokens.
      setLlmCoolingDown(true)
      beginLlmCooldown(LLM_COOLDOWN_SECONDS)
    } else if (!llm.ok && llm.retryable) {
      // Always floor at the full pacing window, never Groq's shorter
      // retry-after value — mirrors KeywordsClient's handleAnalyze.
      setLlmCoolingDown(true)
      beginLlmCooldown(Math.max(LLM_COOLDOWN_SECONDS, llm.retryAfterSeconds ?? 0))
    }
  }

  const allCaughtUp = posts.length === 0
  const generateHint = llmCooldown > 0
    ? `Keyword matching runs now. AI is cooling down after the last run, wait ${llmCooldown}s to finish that half.`
    : 'Runs keyword matching and AI on every post missing a suggestion'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="font-semibold text-foreground">Uncategorised Posts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isFiltered ? `${filteredPosts.length} of ${posts.length} in queue` : `${posts.length} in queue`}
          </p>
        </div>

        {/* flex-col on mobile: flex's default align-items:stretch then makes
            each toast/button fill the row's width instead of shrinking to
            content and sitting stuck on the left with empty space beside it.
            sm:flex-row switches back to natural inline sizing once there's
            room for them side by side. w-full (with the parent now flex-col
            on mobile too) lets the button row reach the card's edge instead
            of shrink-wrapping to content width. */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto sm:flex-wrap">
          {generateResult && (
            <p role={generateResult.tone !== 'positive' ? 'alert' : undefined} className={`animate-fade-slide-up text-xs font-medium rounded-lg px-3 py-1.5 border ${
              generateResult.tone === 'negative'
                ? 'text-status-negative bg-status-negative/10 border-status-negative/30'
                : generateResult.tone === 'warning'
                  ? 'text-status-warning bg-status-warning/10 border-status-warning/30'
                  : 'text-status-positive bg-green-500/10 border-green-500/30'
            }`}>
              {generateResult.text}{llmCoolingDown && llmCooldown > 0 ? ` Try again in ${llmCooldown}s.` : ''}
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

          <TooltipProvider>
            {/* Paired row on mobile: "Generate suggestions" (primary) takes the
                remaining width, "Batch confirm" (secondary) stays a fixed-width
                chip beside it — one compact row instead of two stacked
                full-width pills. sm:contents drops this wrapper from the layout
                on desktop so both buttons sit exactly as they did before. */}
            <div className="flex flex-row items-start gap-2 w-full sm:contents">
              {role === 'MARKETING_MANAGER' && batchConfirmCountInView > 0 && (
                <Tooltip>
                  <Dialog open={confirmBatchOpen} onOpenChange={setConfirmBatchOpen}>
                    <TooltipTrigger
                      render={
                        <DialogTrigger
                          disabled={isPending || generatePending}
                          render={
                            <button
                              type="button"
                              className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground bg-card border border-border hover:bg-accent active:bg-accent/80 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 sm:gap-2 sm:px-4 sm:text-sm sm:font-semibold sm:w-auto"
                            />
                          }
                        />
                      }
                    >
                      {isFiltered ? `Batch confirm in view (${batchConfirmCountInView})` : `Batch confirm agreed (${batchConfirmCountInView})`}
                    </TooltipTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm {batchConfirmCountInView} unflagged, agreed post{batchConfirmCountInView !== 1 ? 's' : ''}{isFiltered ? ' in this filtered view' : ''}?</DialogTitle>
                        <DialogDescription>
                          Finalizes every post where both methods agree and nothing was flagged for review{isFiltered ? ', restricted to your current filter' : ''}. It can&apos;t be undone from here. A finalized post can only be changed afterward from the &ldquo;All&rdquo; filter, one at a time.
                          {isFiltered && batchConfirmCountOutsideView > 0 && (
                            <> {batchConfirmCountOutsideView} more eligible post{batchConfirmCountOutsideView !== 1 ? 's are' : ' is'} outside this filter and won&apos;t be included. Clear filters first to confirm everything.</>
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
                  <TooltipContent>Finalizes unflagged, agreed posts</TooltipContent>
                </Tooltip>
              )}

              {role === 'MARKETING_MANAGER' && (
                <div className="flex flex-col gap-1 flex-1 min-w-0 sm:flex-none sm:w-auto">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          onClick={handleGenerate}
                          disabled={generatePending || posts.length === 0}
                          // hover:bg-[var(--primary-hover)] — see app/globals.css
                          // for why (a real darker shade, not an opacity fade).
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-[var(--primary-hover)] active:bg-primary/80 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 w-full sm:w-auto"
                        />
                      }
                    >
                      {generatePending ? 'Generating…' : 'Generate suggestions'}
                    </TooltipTrigger>
                    <TooltipContent>{generateHint}</TooltipContent>
                  </Tooltip>
                  {/* A fine pointer (mouse/trackpad) gets the hover tooltip
                      above; a coarse pointer (touch) never triggers hover at
                      all, so the same text is shown as a caption instead —
                      pointer-fine:hidden keeps it from also appearing on
                      desktop. Lives in this button's own column (not the row's
                      left edge) so it reads as scoped to Generate suggestions,
                      not to Batch confirm beside it. */}
                  <p className="text-xs text-muted-foreground leading-relaxed pointer-fine:hidden">
                    {generateHint}
                  </p>
                </div>
              )}
            </div>
          </TooltipProvider>
        </div>
      </div>

      {posts.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Input
            type="search"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search captions…"
            aria-label="Search posts by caption"
            className="h-8 max-w-xs text-xs"
          />
          <Select value={flagFilter} onValueChange={(v) => updateFlagFilter(v as FlagFilter)}>
            {/* w-64 (not w-56): at text-xs the longest label ("Needs judgment
                (couldn't classify)") needs ~189px against ~182px of content box
                at w-56, so a selected long value was ellipsizing by a
                character or two in the closed trigger. */}
            <SelectTrigger className="text-xs border-border focus-visible:ring-ring w-64 h-8" size="sm">
              <SelectValue />
            </SelectTrigger>
            {/* Wider than the trigger — SelectContent otherwise matches the
                trigger's width exactly (components/ui/select.tsx's
                w-(--anchor-width); cn()'s tailwind-merge drops that base
                class in favor of this one since both are `w-*` utilities).
                The longest label here needs ~260px (label + pl-1.5 + the
                pr-8 reserved for the checkmark indicator) — doesn't fit on
                one line at the trigger's width, so it was clipping under
                the checkmark. w-80 leaves ~60px of headroom above that. */}
            <SelectContent align="start" alignItemWithTrigger={false} className="w-80">
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
          <p className="text-xs text-muted-foreground max-w-[240px]">Every post has a final category. Switch to the &ldquo;All&rdquo; filter to reassign one if needed.</p>
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

      {role === 'MARKETING_MANAGER' && (
        <p className="text-xs text-muted-foreground mt-3">
          Keywords configured in{' '}
          <a href="/dashboard/marketing/keywords" className="text-primary hover:underline">Manage Keywords</a>.
        </p>
      )}
    </div>
  )
}

const CATEGORY_FINAL_SOURCE_DISPLAY: Record<CategoryFinalSource, string> = {
  // docs/raven/Content_Second_Pass.md §2/§3 — this source now reaches the
  // Owner's screen (whereForFilter's includeGroundTruth), which §3 just
  // stripped "ground-truth benchmark" language from. "Ground truth import"
  // was the same manuscript vocabulary in the next column over — plain
  // language per §0.3, not a study/methodology term.
  MANUAL_GROUND_TRUTH: 'Locked reference set',
  ACCEPTED_SUGGESTION: 'Accepted suggestion',
  MANUAL_OVERRIDE: 'Manual selection',
  // docs/raven/Content_Filters_Review.md §2 — the pre-2026-08-13 schema
  // rework backfill, surfaced honestly instead of rendering as a bare dash
  // (which read as "nobody knows," when the real answer is "before we
  // tracked this").
  LEGACY_IMPORT: 'Legacy import',
  // §6.1 — a revision made from All/Unassigned to an already-finalised post,
  // distinct from "Manual selection" (first assignment via triage).
  MANUAL_CHANGE_AFTER_FINALISATION: 'Manual revision',
  // docs/raven-review/Content_Counts_and_Backlog.md §3.2 (A8) — researcher
  // coding of the requeued backlog against the codebook, same procedure as
  // the ground-truth sample but not part of the locked benchmark itself.
  MANUAL_CODEBOOK_ASSIGNMENT: 'Codebook assignment',
}

// docs/raven/Categorisation_Workflow_Consolidation.md §3.2 — shown on the
// non-queue filters ("who set it and when"). A post can have a
// category_final_source without the assignedBy/assignedAt pair (the ground
// truth import stamps neither), so those two lines are independent.
function ProvenanceCell({ post }: { post: ContentPostRow }) {
  if (!post.category_final_source) {
    return <span className="text-muted-foreground text-xs">—</span>
  }
  return (
    <div className="text-xs text-muted-foreground">
      <div>{CATEGORY_FINAL_SOURCE_DISPLAY[post.category_final_source]}</div>
      {/* Role, not the raw email — updatePostCategory/batchConfirmAgreed are
          both Marketing-Manager-only (mvp.md's three fixed accounts, one per
          role, prisma/seed.ts), so this line is always the same one account
          whenever it appears at all; showing the email added length without
          adding information, and was what was overflowing the column. Kept
          as a title tooltip in case anyone needs to check it directly. Own
          line rather than "Role · Date" on one line — three short lines read
          easier here than one long one. */}
      {post.assignedByEmail && post.assignedAt && (
        <>
          <div title={post.assignedByEmail}>Marketing Manager</div>
          <div>{fmtDateTime(post.assignedAt)}</div>
        </>
      )}
    </div>
  )
}

// The non-queue filters' (All / Unassigned) category control. Distinct from
// the queue's ManagerActionCell/CategoryPicker: this is an edit on an
// already-decided post, not a triage decision.
//
// docs/raven/Content_Filters_Review.md §6 — this used to render a live,
// always-armed dropdown + Save on every row, which was a second write path
// to category_final that bypassed triage entirely (the merge's whole point
// was to make triage unavoidable). Two changes close that:
// 1. A post with no category_final at all is not editable here — it links
//    to Needs Review instead, so first assignment only ever happens through
//    triage's suggestions/flags/two-candidate prompt.
// 2. An already-finalised post starts read-only (badge + a "Change" button);
//    clicking Change arms the dropdown+Save, matching the "an explicit click
//    arms it" pattern §6.1 asked for. updatePostCategory itself stamps
//    MANUAL_CHANGE_AFTER_FINALISATION for this path vs. MANUAL_OVERRIDE for
//    a first assignment, so Chapter 4 can tell the two apart without trusting
//    this component to say which one happened.
//
// The ground-truth 200 (category_final_source === 'MANUAL_GROUND_TRUTH') are
// the external, blind-coded reference standard FR-15's kappa study is
// measured against — this screen must never be a way to edit one, even by
// accident. The real enforcement is server-side (updatePostCategory refuses
// the write); this is the client half so the control doesn't even render as
// editable.
function CategoryEditCell({ post, canEdit, baseRoute }: { post: ContentPostRow; canEdit: boolean; baseRoute: string }) {
  const [isPending, startTransition] = useTransition()
  const [armed, setArmed] = useState(false)
  const [value, setValue] = useState<CategoryLabel | ''>(post.category_final ?? '')
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isGroundTruth = post.category_final_source === 'MANUAL_GROUND_TRUTH'

  if (!post.category_final) {
    if (!canEdit) return <span className="text-muted-foreground text-xs">Uncategorised</span>
    return (
      <a href={`${baseRoute}?filter=needs-review`} className="text-primary hover:underline text-xs">
        Categorise in review →
      </a>
    )
  }

  if (!canEdit || isGroundTruth) {
    return (
      <div className="flex items-center gap-1.5">
        <CategoryBadge label={post.category_final} />
        {/* docs/raven/Content_Second_Pass.md §2 — "ground truth" is the same
            manuscript register §3 removed from this screen's subtitle; this
            badge now reaches the Owner too, so it needs the same plain-
            language treatment. */}
        {isGroundTruth && <span className="text-[10px] text-muted-foreground">locked reference</span>}
      </div>
    )
  }

  if (!armed) {
    return (
      <div className="flex items-center gap-1.5">
        <CategoryBadge label={post.category_final} />
        <button
          type="button"
          onClick={() => { setValue(post.category_final ?? ''); setArmed(true) }}
          className="text-xs text-primary hover:underline"
        >
          Change
        </button>
      </div>
    )
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const res = await updatePostCategory(post.id, value || null)
      setConfirmOpen(false)
      if (res.error) setError(res.error)
      else setArmed(false)
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Select value={value} onValueChange={(v) => setValue(v as CategoryLabel | '')}>
          {/* Fixed width (not just min-w) so the trigger box doesn't grow/shrink
              with the selected label's length — keeps the Save button lined up
              in a straight column across rows. */}
          <SelectTrigger className="text-xs border-border focus-visible:ring-ring w-48 h-7" size="sm">
            <SelectValue>{categoryEditLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectItem value="" label="(None)">(None)</SelectItem>
            {SELECTABLE_LABELS.map((label) => (
              <SelectItem key={label} value={label} label={selectableLabelText(label)}>{selectableLabelText(label)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Same confirmation gate as the queue's "Save category" (Manager
            ActionCell) — this writes category_final just as finally, and
            previously saved with no confirmation at all, an inconsistency
            flagged in review. */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger
            disabled={isPending}
            render={<Button type="button" size="sm" className="text-xs whitespace-nowrap h-7 px-3" />}
          >
            Save
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set category to &ldquo;{categoryEditLabel(value)}&rdquo;?</DialogTitle>
              <DialogDescription>
                This updates the post&apos;s final category directly. It can&apos;t be undone from here.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="button" disabled={isPending} onClick={handleSave} className="text-xs">
                {isPending ? 'Saving…' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <button type="button" onClick={() => setArmed(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
      {error && <span role="alert" className="text-status-negative text-[11px]">{error}</span>}
    </div>
  )
}

// docs/raven/Content_Filters_Review.md §4 — each filter needed its own
// empty-state copy; a shared "No organic posts uploaded yet." rendered on
// Unassigned even with 730+ posts uploaded, asserting something false about
// the corpus. 'needs-review' isn't listed — that filter renders through
// QueueView/ReviewTable instead, which already has its own copy.
const LIBRARY_EMPTY_STATE: Record<Exclude<ContentFilter, 'needs-review'>, string> = {
  all: 'No organic posts uploaded yet.',
  // docs/raven-review/Unassigned_Labels_and_Coding_Procedure.md §2.1
  unassigned: 'No posts have been marked as having no category.',
}

// The "All" / "Unassigned" filters' view — the old ContentLibraryClient's
// table, extended with a Provenance column
// (docs/raven/Categorisation_Workflow_Consolidation.md §3.2). Search is
// carried over from Content Library's requirement; a post-type filter is
// NOT included — despite the memo describing one as already existing on
// Content Library "today," the pre-merge component (git history) never had
// one, so there's nothing to carry over. Flagged to Raven rather than
// invented.
function LibraryTable({ posts, canEdit, filter, baseRoute }: { posts: ContentPostRow[]; canEdit: boolean; filter: Exclude<ContentFilter, 'needs-review'>; baseRoute: string }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return posts
    return posts.filter((post) => (post.title ?? '').toLowerCase().includes(query))
  }, [posts, search])

  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount)
  const pagedPosts = filteredPosts.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE)
  const isFiltered = search.trim() !== ''

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  if (posts.length === 0) {
    return (
      <div className="bg-card rounded-2xl card-shadow overflow-hidden p-12 text-center text-muted-foreground text-sm">
        {LIBRARY_EMPTY_STATE[filter]}
      </div>
    )
  }

  return (
    <div>
      {/* docs/raven/Content_Filters_Review.md §8 — All/Unassigned had no row
          count anywhere, unlike the queue's "N in queue". */}
      <p className="text-xs text-muted-foreground mb-2">
        {isFiltered ? `${filteredPosts.length} of ${posts.length}` : `${posts.length}`} post{posts.length !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Input
          type="search"
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder="Search captions…"
          aria-label="Search posts by caption"
          className="h-8 max-w-xs text-xs"
        />
        {isFiltered && (
          <button type="button" onClick={() => updateSearch('')} className="text-xs text-primary hover:underline">
            Clear search
          </button>
        )}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-card rounded-2xl card-shadow">
          <p className="text-sm font-semibold text-foreground mb-1">No posts match your search</p>
          <button type="button" onClick={() => updateSearch('')} className="text-xs text-primary hover:underline mt-1">
            Clear search
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl card-shadow overflow-hidden">
          {/* table-fixed + explicit column widths, not table-layout's auto
              default: auto sizes each column from its widest *unwrapped*
              cell content, which ignores max-w/truncate entirely — a single
              long post title was blowing this table out past 1400px wide and
              taking the whole page with it on mobile instead of staying
              inside .table-scroll's own horizontal scrollbar (see
              components/ui/table.tsx). min-w-[760px] keeps columns legible
              at that computed width; .table-scroll (Table's own wrapper)
              handles the resulting overflow within this card. */}
          <Table className="table-fixed min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="w-[26%] text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Post Details</TableHead>
                <TableHead className="w-[10%] text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Type</TableHead>
                <TableHead className="w-[10%] text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</TableHead>
                <TableHead className="w-[10%] text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 text-right">Views</TableHead>
                <TableHead className="w-[12%] text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 text-right">Engagement</TableHead>
                <TableHead className="w-[16%] text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Category</TableHead>
                <TableHead className="w-[16%] text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Provenance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedPosts.map((post) => (
                <TableRow key={post.id} className="hover:bg-secondary/50 border-t border-border">
                  <TableCell className="px-4 py-3">
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
                  <TableCell className="px-4 py-3"><TypeBadge type={post.post_type} /></TableCell>
                  <TableCell className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(post.publish_time)}</TableCell>
                  <TableCell className="px-4 py-3 text-xs text-muted-foreground text-right">{post.views !== null ? post.views.toLocaleString() : '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-xs text-muted-foreground text-right">{post.engagement_rate.toFixed(2)}%</TableCell>
                  <TableCell className="px-4 py-3"><CategoryEditCell post={post} canEdit={canEdit} baseRoute={baseRoute} /></TableCell>
                  {/* whitespace-normal overrides TableCell's shared nowrap
                      default (components/ui/table.tsx) — ProvenanceCell
                      renders up to three stacked lines (source / role /
                      date), and nowrap would force them onto one long line
                      that pushes the whole table wider instead of wrapping
                      within this bounded column width. */}
                  <TableCell className="px-4 py-3 whitespace-normal"><ProvenanceCell post={post} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar page={clampedPage} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}
      {/* docs/raven/Content_Second_Pass.md §5 — a bare "Codebook assignment"
          next to rows that name a person and a timestamp invites the
          question of why some provenance entries have neither. Shown when
          the filtered set has one of those rows anywhere, not just on the
          current page — checking pagedPosts (code review, 2026-09-05) would
          make the footnote flicker in and out while paginating even though
          the table's contents haven't changed in the way that matters. */}
      {filteredPosts.some((post) => post.category_final_source === 'MANUAL_CODEBOOK_ASSIGNMENT') && (
        <p className="text-xs text-muted-foreground mt-3">
          Codebook assignments were made outside the system by the research coders, so no individual account is recorded against them.
        </p>
      )}
    </div>
  )
}

const CONTENT_FILTER_OPTIONS: { value: ContentFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'needs-review', label: 'Needs Review' },
  // docs/raven-review/Unassigned_Labels_and_Coding_Procedure.md §2.1 — "No
  // category" states an outcome rather than a pending status (the original
  // "Unassigned" misread as "not yet assigned"). Eleven characters, sits
  // evenly beside "Needs Review". The underlying filter value/enum stays
  // `unassigned` — this is a display-only rename.
  { value: 'unassigned', label: 'No category' },
]

// User-sketched spec: the active tab shouldn't just flip its own styling when
// the filter changes — a bordered box should slide smoothly from the old tab
// to the new one ("sliding tab indicator", segmented-control style, not just
// an underline). Built on the shared SlidingTabs primitive
// (components/ui/sliding-tabs.tsx) — the same motion-layoutId mechanism as
// TrendCharts.tsx's ChartViewToggle, on the same .segmented-control track/
// segment shell — but this control opts into the `--brand` indicator/active
// modifiers (globals.css) for a solid --primary chip instead of
// ChartViewToggle's neutral white/shadow one: this is the primary way
// managers act on content (vs. that toggle's secondary chart-view switch),
// so it earns the brand color. Solid fill + --primary-foreground text (the
// same pairing button-primary already uses), not translucent-tint-plus-
// colored-text — an earlier bg-primary/15 + text-primary version broke the
// Fill-vs-Read Rule (crimson is fills/chrome only, never a text read) and
// nearly disappeared in dark mode since the tint rode on top of a
// low-contrast dark surface (design critique, 2026-08-23). Also gives this
// control aria-pressed/role="group" for free, which the earlier hand-rolled
// version didn't have (code review, 2026-08-23).
//
// docs/raven/Categorisation_Workflow_Consolidation.md §3.4 — filter state
// lives in the query string, not component state, so the view is
// bookmarkable and deep-linkable. router.push (not replace) so Back steps
// through filter changes rather than skipping them.
function FilterTabs({ current }: { current: ContentFilter }) {
  const { push, isPending } = useProgressRouter()
  const pathname = usePathname()
  return (
    <SlidingTabs
      value={current}
      onChange={(next) => push(`${pathname}?filter=${next}`)}
      options={CONTENT_FILTER_OPTIONS}
      layoutId="content-filter-indicator"
      ariaLabel="Content filter"
      // overflow-y-hidden below is deliberate, not redundant: overflow-x-auto
      // alone computes overflow-y as auto too (CSS overflow spec's
      // interaction rule) — without it this row can trip a stray vertical
      // scrollbar on non-overlay scrollbar setups (Windows Chrome/Edge) even
      // though nothing here needs to scroll vertically.
      className={`segmented-control segmented-control--bordered mb-4 w-fit max-w-full overflow-x-auto overflow-y-hidden transition-opacity duration-150 ${isPending ? 'opacity-60' : ''}`}
      // ring-offset-1 (not a bare ring) matches every other bg-primary
      // control in this file (e.g. the primary action buttons below) — the
      // offset gap keeps the crimson focus ring visible against the
      // brand-filled active segment instead of blending into it.
      segmentClassName={(active) =>
        // text-sm (not text-xs like TrendCharts.tsx's ChartViewToggle) —
        // .segmented-control__segment no longer sets its own font-size
        // (code review, 2026-09-04: it used to, and being unlayered CSS it
        // silently beat any text-* utility a caller applied), so this keeps
        // FilterTabs at its original 14px rather than inheriting a default.
        `segmented-control__segment text-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
          active ? 'segmented-control__segment--active-brand' : ''
        }`
      }
      indicatorClassName="segmented-control__indicator segmented-control__indicator--brand"
    />
  )
}

// docs/raven/Categorisation_Workflow_Consolidation.md §3 — Content Library
// and Categorisation Review merged into one component, switched by `filter`
// (Phase 4 of docs/raven/Consolidation_Plan_Checklist.md). `key={filter}` on
// each view resets its local UI state (search, page, flag filter) on every
// filter switch, since a fresh server fetch means the old in-view state
// (e.g. a page number past the new post count) no longer applies.
export default function ContentClient({ posts, role, filter }: Props) {
  const canEdit = role === 'MARKETING_MANAGER'
  // Code review (2026-08-23) — CategoryEditCell's "Categorise in review" link
  // was hardcoded to the marketing route; it was only ever safe because
  // canEdit (and therefore the link's render path) happens to be
  // role === 'MARKETING_MANAGER' too, an incidental guard rather than an
  // intentional one. Threaded explicitly instead.
  const baseRoute = role === 'MARKETING_MANAGER' ? '/dashboard/marketing/categorize' : '/dashboard/owner/categorize'
  return (
    <div>
      <FilterTabs current={filter} />
      {filter === 'needs-review' ? (
        <QueueView key="needs-review" posts={posts} role={role} />
      ) : (
        <LibraryTable key={filter} posts={posts} canEdit={canEdit} filter={filter} baseRoute={baseRoute} />
      )}
    </div>
  )
}
