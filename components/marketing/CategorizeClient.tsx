'use client'

import { useState, useTransition } from 'react'
import { updatePostCategoryForm, updateAdCategoryForm, autoCategorizeAll } from '@/actions/categorize'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Category {
  id: number
  name: string
}

interface PostRow {
  id: number
  title: string | null
  permalink: string
  post_type: string
  category_id: number | null
  suggestedCategoryId: number | null
}

interface AdRow {
  id: number
  ad_name: string
  ad_set_name: string
  post_type: string
  category_id: number | null
  suggestedCategoryId: number | null
}

interface Props {
  posts: PostRow[]
  ads: AdRow[]
  categories: Category[]
}

const PAGE_SIZE = 50

function PaginationBar({
  page, pageCount, onPageChange,
}: { page: number; pageCount: number; onPageChange: (page: number) => void }) {
  if (pageCount <= 1) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-400">Page {page} of {pageCount}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-7 px-3 text-xs"
        >
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="h-7 px-3 text-xs"
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    Video: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
    Reel: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    Photo: 'bg-red-500/10 text-red-400 border-red-500/30',
    Link: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  }
  const cls = colors[type] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <Badge className={`rounded-full h-auto py-0.5 px-2 text-xs font-medium ${cls}`}>{type}</Badge>
  )
}

function CategoryBadge({ name }: { name: string }) {
  const colors: Record<string, string> = {
    'Product Showcase': 'bg-red-500/10 text-red-400 border-red-500/30',
    Testimonial: 'bg-green-500/10 text-green-400 border-green-500/30',
    'Promotional Offer': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  }
  const cls = colors[name] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <Badge className={`rounded-full h-auto py-0.5 px-2 text-xs font-medium ${cls}`}>{name}</Badge>
  )
}

function PostsTable({ posts, categories }: { posts: PostRow[]; categories: Category[] }) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

  if (posts.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500 text-sm">
        No organic posts uploaded yet. Upload a Facebook Insights CSV first.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50">
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Post Details</TableHead>
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Type</TableHead>
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Current Category</TableHead>
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Update</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post) => {
          const displayCategory = post.category_id ? catMap[post.category_id] : null
          const suggestedName = post.suggestedCategoryId ? catMap[post.suggestedCategoryId] : null
          const defaultSelectValue = String(post.category_id ?? post.suggestedCategoryId ?? '')
          const boundAction = updatePostCategoryForm.bind(null, post.id)

          return (
            <TableRow key={post.id} className="hover:bg-gray-50 border-t border-gray-100">
              <TableCell className="px-4 py-3 max-w-xs">
                {post.title ? (
                  <div className="font-medium text-gray-800 text-sm truncate" title={post.title}>
                    {post.title}
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs italic">No title</span>
                )}
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-800 hover:underline text-xs mt-0.5 inline-block"
                >
                  View post ↗
                </a>
              </TableCell>

              <TableCell className="px-4 py-3">
                <TypeBadge type={post.post_type} />
              </TableCell>

              <TableCell className="px-4 py-3">
                {displayCategory ? (
                  <CategoryBadge name={displayCategory} />
                ) : suggestedName ? (
                  <span className="flex items-center gap-1.5">
                    <CategoryBadge name={suggestedName} />
                    <span className="text-xs text-gray-400">(suggested)</span>
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">Uncategorized</span>
                )}
              </TableCell>

              <TableCell className="px-4 py-3">
                <form action={boundAction} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Select name="categoryId" defaultValue={defaultSelectValue}>
                    <SelectTrigger className="text-xs border-gray-300 focus-visible:ring-red-500 min-w-[140px] h-7" size="sm">
                      <SelectValue placeholder="— None —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— None —</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-red-600 hover:bg-red-500 text-white text-xs whitespace-nowrap h-7 px-3"
                  >
                    Save
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function AdsTable({ ads, categories }: { ads: AdRow[]; categories: Category[] }) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

  if (ads.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500 text-sm">
        No ads uploaded yet. Upload a Facebook Ads Manager CSV first.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50">
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Ad Details</TableHead>
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Type</TableHead>
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Current Category</TableHead>
          <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Update</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ads.map((ad) => {
          const displayCategory = ad.category_id ? catMap[ad.category_id] : null
          const suggestedName = ad.suggestedCategoryId ? catMap[ad.suggestedCategoryId] : null
          const defaultSelectValue = String(ad.category_id ?? ad.suggestedCategoryId ?? '')
          const boundAction = updateAdCategoryForm.bind(null, ad.id)

          return (
            <TableRow key={ad.id} className="hover:bg-gray-50 border-t border-gray-100">
              <TableCell className="px-4 py-3 max-w-xs">
                <div className="font-medium text-gray-800 text-sm truncate" title={ad.ad_name}>
                  {ad.ad_name}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 truncate" title={ad.ad_set_name}>
                  {ad.ad_set_name}
                </div>
              </TableCell>

              <TableCell className="px-4 py-3">
                <TypeBadge type={ad.post_type} />
              </TableCell>

              <TableCell className="px-4 py-3">
                {displayCategory ? (
                  <CategoryBadge name={displayCategory} />
                ) : suggestedName ? (
                  <span className="flex items-center gap-1.5">
                    <CategoryBadge name={suggestedName} />
                    <span className="text-xs text-gray-400">(suggested)</span>
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">Uncategorized</span>
                )}
              </TableCell>

              <TableCell className="px-4 py-3">
                <form action={boundAction} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Select name="categoryId" defaultValue={defaultSelectValue}>
                    <SelectTrigger className="text-xs border-gray-300 focus-visible:ring-red-500 min-w-[140px] h-7" size="sm">
                      <SelectValue placeholder="— None —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— None —</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-red-600 hover:bg-red-500 text-white text-xs whitespace-nowrap h-7 px-3"
                  >
                    Save
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default function CategorizeClient({ posts, ads, categories }: Props) {
  const [activeTab, setActiveTab] = useState<'posts' | 'ads'>('posts')
  const [showAll, setShowAll] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ posts: number; ads: number } | null>(null)
  const [postsPage, setPostsPage] = useState(1)
  const [adsPage, setAdsPage] = useState(1)

  // Uncategorized counts
  const uncategorizedPosts = posts.filter(p => p.category_id === null)
  const uncategorizedAds = ads.filter(a => a.category_id === null)
  const totalUncategorized = uncategorizedPosts.length + uncategorizedAds.length


  // Filtered data for the tables
  const visiblePosts = showAll ? posts : uncategorizedPosts
  const visibleAds = showAll ? ads : uncategorizedAds

  const postsPageCount = Math.max(1, Math.ceil(visiblePosts.length / PAGE_SIZE))
  const adsPageCount = Math.max(1, Math.ceil(visibleAds.length / PAGE_SIZE))
  const clampedPostsPage = Math.min(postsPage, postsPageCount)
  const clampedAdsPage = Math.min(adsPage, adsPageCount)
  const pagedPosts = visiblePosts.slice((clampedPostsPage - 1) * PAGE_SIZE, clampedPostsPage * PAGE_SIZE)
  const pagedAds = visibleAds.slice((clampedAdsPage - 1) * PAGE_SIZE, clampedAdsPage * PAGE_SIZE)

  function handleShowAllChange(next: boolean) {
    setShowAll(next)
    setPostsPage(1)
    setAdsPage(1)
  }

  // All done in the current tab view
  const currentTabEmpty = activeTab === 'posts' ? visiblePosts.length === 0 : visibleAds.length === 0
  const allCategorized = totalUncategorized === 0

  function handleAutoCategorize() {
    setResult(null)
    startTransition(async () => {
      const res = await autoCategorizeAll()
      setResult(res)
    })
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => { if (v) setActiveTab(v as 'posts' | 'ads') }}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        {/* Tabs — counts show uncategorized remaining */}
        <TabsList className="bg-gray-100 rounded-xl p-1 h-auto gap-1">
          <TabsTrigger
            value="posts"
            className="px-5 py-2 rounded-lg text-sm font-medium data-active:bg-white data-active:text-black data-active:shadow-sm text-gray-500 hover:text-gray-700"
          >
            Organic Posts
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500 data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
              {showAll ? posts.length : uncategorizedPosts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="ads"
            className="px-5 py-2 rounded-lg text-sm font-medium data-active:bg-white data-active:text-black data-active:shadow-sm text-gray-500 hover:text-gray-700"
          >
            Ads
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500">
              {showAll ? ads.length : uncategorizedAds.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Result pill */}
          {result && (
            <p className="animate-fade-slide-up text-xs text-green-400 font-medium bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
              {result.posts + result.ads === 0
                ? 'Nothing new to categorize'
                : `Applied to ${result.posts + result.ads} item${result.posts + result.ads !== 1 ? 's' : ''} (${result.posts} post${result.posts !== 1 ? 's' : ''}, ${result.ads} ad${result.ads !== 1 ? 's' : ''})`
              }
            </p>
          )}

          {/* Show all toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700 select-none">
            <span>{showAll ? 'Show all' : 'Uncategorized only'}</span>
            <Switch
              checked={showAll}
              onCheckedChange={handleShowAllChange}
            />
          </label>

          {/* Auto-Categorize */}
          <button
            onClick={handleAutoCategorize}
            disabled={isPending || totalUncategorized === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
            style={{ boxShadow: totalUncategorized > 0 && !isPending ? '0 4px 14px rgba(220,38,38,0.25)' : undefined }}
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Categorizing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Auto-Categorize
                {totalUncategorized > 0 && (
                  <span className="bg-white/20 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                    {totalUncategorized}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table or all-done state */}
      {!showAll && allCategorized ? (
        <div className="animate-fade-slide-up flex flex-col items-center justify-center py-16 px-6 text-center bg-card rounded-2xl card-shadow">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">All caught up</p>
          <p className="text-xs text-gray-400 max-w-[240px]">Every post and ad has been categorized. Use <button onClick={() => handleShowAllChange(true)} className="text-red-500 hover:underline">Show all</button> to review or reassign.</p>
        </div>
      ) : (
        <>
          <TabsContent value="posts">
            {!showAll && visiblePosts.length === 0 ? (
              <div className="animate-fade-slide-up flex flex-col items-center justify-center py-16 px-6 text-center bg-card rounded-2xl card-shadow">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">All posts categorized</p>
                <p className="text-xs text-gray-400">
                  Switch to the Ads tab, or{' '}
                  <button onClick={() => handleShowAllChange(true)} className="text-red-500 hover:underline">show all</button> to review.
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-2xl card-shadow overflow-hidden">
                <PostsTable posts={pagedPosts} categories={categories} />
                <PaginationBar page={clampedPostsPage} pageCount={postsPageCount} onPageChange={setPostsPage} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="ads">
            {!showAll && visibleAds.length === 0 ? (
              <div className="animate-fade-slide-up flex flex-col items-center justify-center py-16 px-6 text-center bg-card rounded-2xl card-shadow">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">All ads categorized</p>
                <p className="text-xs text-gray-400">
                  Switch to the Organic Posts tab, or{' '}
                  <button onClick={() => handleShowAllChange(true)} className="text-red-500 hover:underline">show all</button> to review.
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-2xl card-shadow overflow-hidden">
                <AdsTable ads={pagedAds} categories={categories} />
                <PaginationBar page={clampedAdsPage} pageCount={adsPageCount} onPageChange={setAdsPage} />
              </div>
            )}
          </TabsContent>
        </>
      )}

      {/* Legend */}
      <p className="text-xs text-gray-400 mt-3">
        Showing <span className="font-medium text-gray-500">{showAll ? 'all items' : 'uncategorized only'}</span> —
        use <span className="font-medium text-gray-500">Show all</span> to review or reassign existing categories.
        Keywords configured in{' '}
        <a href="/dashboard/marketing/keywords" className="text-red-500 hover:underline">Manage Keywords</a>.
      </p>
    </Tabs>
  )
}
