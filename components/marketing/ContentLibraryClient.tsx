'use client'

import { useActionState, useState } from 'react'
import { updatePostCategoryForm } from '@/actions/categorize'
import { CATEGORY_LABEL_DISPLAY } from '@/lib/category-label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CategoryLabel } from '@/app/generated/prisma/client'

const ASSIGNABLE_LABELS: CategoryLabel[] = ['PRODUCT_SHOWCASE', 'PROMOTIONAL_OFFER', 'TESTIMONIAL', 'ENTERTAINMENT']

export interface ContentLibraryRow {
  id: number
  title: string | null
  permalink: string
  post_type: string
  publish_time: string
  views: number | null
  engagement_rate: number
  category_final: CategoryLabel | null
}

interface Props {
  posts: ContentLibraryRow[]
  // FR-13 / mvp.md §3: only the Marketing Manager has "Full" rights on S3 —
  // Owner and Marketing Team are view-only.
  canEdit: boolean
}

const PAGE_SIZE = 50

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso))
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    Video: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
    Reel: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    Photo: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
    Link: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  }
  const cls = colors[type] ?? 'bg-secondary text-foreground border-border'
  return <Badge className={`rounded-full h-auto py-0.5 px-2 text-xs font-medium ${cls}`}>{type}</Badge>
}

function CategoryBadge({ label }: { label: CategoryLabel }) {
  const colors: Record<CategoryLabel, string> = {
    PRODUCT_SHOWCASE: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
    TESTIMONIAL: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
    PROMOTIONAL_OFFER: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
    ENTERTAINMENT: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
    UNCLASSIFIED: 'bg-secondary text-foreground border-border',
    // Ground-truth-only; never shown here in practice (S3 never assigns it), kept for exhaustiveness.
    UNCLEAR: 'bg-secondary text-foreground border-border',
  }
  return (
    <Badge className={`rounded-full h-auto py-0.5 px-2 text-xs font-medium ${colors[label]}`}>
      {CATEGORY_LABEL_DISPLAY[label]}
    </Badge>
  )
}

// Owns its own useActionState call — hooks can't be created per-item inside
// a .map(), so this needs to be its own component.
function CategoryCell({ post, canEdit }: { post: ContentLibraryRow; canEdit: boolean }) {
  const boundAction = updatePostCategoryForm.bind(null, post.id)
  const [state, action, isPending] = useActionState(boundAction, null)

  if (!canEdit) {
    return post.category_final ? (
      <CategoryBadge label={post.category_final} />
    ) : (
      <span className="text-muted-foreground text-xs">Uncategorized</span>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <form action={action} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Select name="categoryLabel" defaultValue={post.category_final ?? ''}>
          <SelectTrigger className="text-xs border-border focus-visible:ring-ring min-w-[140px] h-7" size="sm">
            <SelectValue placeholder="— None —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">— None —</SelectItem>
            {ASSIGNABLE_LABELS.map((label) => (
              <SelectItem key={label} value={label}>{CATEGORY_LABEL_DISPLAY[label]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" disabled={isPending}
          className="bg-primary hover:bg-primary/90 text-white text-xs whitespace-nowrap h-7 px-3">
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
      {state?.error && (
        <span role="alert" className="text-status-negative text-[11px]">{state.error}</span>
      )}
    </div>
  )
}

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

export default function ContentLibraryClient({ posts, canEdit }: Props) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(posts.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount)
  const pagedPosts = posts.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE)

  if (posts.length === 0) {
    return (
      <div className="bg-card rounded-2xl card-shadow overflow-hidden p-12 text-center text-muted-foreground text-sm">
        No organic posts uploaded yet.
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl card-shadow overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50">
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Post Details</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Type</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 text-right">Views</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 text-right">Engagement</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Category</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagedPosts.map((post) => (
            <TableRow key={post.id} className="hover:bg-secondary/50 border-t border-border">
              <TableCell className="px-4 py-3 max-w-xs">
                {post.title ? (
                  <div className="font-medium text-foreground text-sm truncate" title={post.title}>{post.title}</div>
                ) : (
                  <span className="text-muted-foreground text-xs italic">No title</span>
                )}
                <a href={post.permalink} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:text-green-700 hover:underline text-xs mt-0.5 inline-block">
                  View post ↗
                </a>
              </TableCell>
              <TableCell className="px-4 py-3"><TypeBadge type={post.post_type} /></TableCell>
              <TableCell className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(post.publish_time)}</TableCell>
              <TableCell className="px-4 py-3 text-xs text-muted-foreground text-right">{post.views !== null ? post.views.toLocaleString() : '—'}</TableCell>
              <TableCell className="px-4 py-3 text-xs text-muted-foreground text-right">{post.engagement_rate.toFixed(2)}%</TableCell>
              <TableCell className="px-4 py-3">
                <CategoryCell post={post} canEdit={canEdit} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationBar page={clampedPage} pageCount={pageCount} onPageChange={setPage} />
    </div>
  )
}
