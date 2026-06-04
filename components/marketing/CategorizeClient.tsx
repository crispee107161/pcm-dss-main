'use client'

import { useState, useTransition } from 'react'
import { updatePostCategoryForm, updateAdCategoryForm, autoCategorizeAll } from '@/actions/categorize'

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

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    Video: 'bg-purple-100 text-purple-700',
    Reel: 'bg-pink-100 text-pink-700',
    Photo: 'bg-red-100 text-red-700',
    Link: 'bg-amber-100 text-amber-700',
  }
  const cls = colors[type] ?? 'bg-slate-100 text-slate-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {type}
    </span>
  )
}

function CategoryBadge({ name }: { name: string }) {
  const colors: Record<string, string> = {
    'Product Showcase': 'bg-red-100 text-red-800',
    Testimonial: 'bg-green-100 text-green-800',
    'Promotional Offer': 'bg-orange-100 text-orange-800',
  }
  const cls = colors[name] ?? 'bg-slate-100 text-slate-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {name}
    </span>
  )
}

function PostsTable({ posts, categories }: { posts: PostRow[]; categories: Category[] }) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

  if (posts.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        No organic posts uploaded yet. Upload a Facebook Insights CSV first.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Post Details</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Type</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Current Category</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Update</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => {
            const displayCategory = post.category_id ? catMap[post.category_id] : null
            const suggestedName = post.suggestedCategoryId ? catMap[post.suggestedCategoryId] : null
            const defaultSelectValue = String(post.category_id ?? post.suggestedCategoryId ?? '')
            const boundAction = updatePostCategoryForm.bind(null, post.id)

            return (
              <tr key={post.id} className="hover:bg-slate-50 border-t border-slate-100">
                <td className="px-4 py-3 max-w-xs">
                  {post.title ? (
                    <div className="font-medium text-slate-800 text-sm truncate" title={post.title}>
                      {post.title}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs italic">No title</span>
                  )}
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-800 hover:underline text-xs mt-0.5 inline-block"
                  >
                    View post ↗
                  </a>
                </td>

                <td className="px-4 py-3">
                  <TypeBadge type={post.post_type} />
                </td>

                <td className="px-4 py-3">
                  {displayCategory ? (
                    <CategoryBadge name={displayCategory} />
                  ) : suggestedName ? (
                    <span className="flex items-center gap-1.5">
                      <CategoryBadge name={suggestedName} />
                      <span className="text-xs text-slate-400">(suggested)</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">Uncategorized</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  <form action={boundAction} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      name="categoryId"
                      defaultValue={defaultSelectValue}
                      className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 min-w-[140px]"
                    >
                      <option value="">— None —</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg px-3 py-1.5 transition-colors font-medium whitespace-nowrap"
                    >
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function AdsTable({ ads, categories }: { ads: AdRow[]; categories: Category[] }) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

  if (ads.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        No ads uploaded yet. Upload a Facebook Ads Manager CSV first.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Post Details</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Type</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Current Category</th>
            <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Update</th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => {
            const displayCategory = ad.category_id ? catMap[ad.category_id] : null
            const suggestedName = ad.suggestedCategoryId ? catMap[ad.suggestedCategoryId] : null
            const defaultSelectValue = String(ad.category_id ?? ad.suggestedCategoryId ?? '')
            const boundAction = updateAdCategoryForm.bind(null, ad.id)

            return (
              <tr key={ad.id} className="hover:bg-slate-50 border-t border-slate-100">
                <td className="px-4 py-3 max-w-xs">
                  <div className="font-medium text-slate-800 text-sm truncate" title={ad.ad_name}>
                    {ad.ad_name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate" title={ad.ad_set_name}>
                    {ad.ad_set_name}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <TypeBadge type={ad.post_type} />
                </td>

                <td className="px-4 py-3">
                  {displayCategory ? (
                    <CategoryBadge name={displayCategory} />
                  ) : suggestedName ? (
                    <span className="flex items-center gap-1.5">
                      <CategoryBadge name={suggestedName} />
                      <span className="text-xs text-slate-400">(suggested)</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">Uncategorized</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  <form action={boundAction} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      name="categoryId"
                      defaultValue={defaultSelectValue}
                      className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 min-w-[140px]"
                    >
                      <option value="">— None —</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg px-3 py-1.5 transition-colors font-medium whitespace-nowrap"
                    >
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function CategorizeClient({ posts, ads, categories }: Props) {
  const [activeTab, setActiveTab] = useState<'posts' | 'ads'>('posts')
  const [showAll, setShowAll] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ posts: number; ads: number } | null>(null)

  // Uncategorized counts
  const uncategorizedPosts = posts.filter(p => p.category_id === null)
  const uncategorizedAds = ads.filter(a => a.category_id === null)
  const totalUncategorized = uncategorizedPosts.length + uncategorizedAds.length


  // Filtered data for the tables
  const visiblePosts = showAll ? posts : uncategorizedPosts
  const visibleAds = showAll ? ads : uncategorizedAds

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
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        {/* Tabs — counts show uncategorized remaining */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] ${
              activeTab === 'posts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Organic Posts
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'posts' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-500'
            }`}>
              {showAll ? posts.length : uncategorizedPosts.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] ${
              activeTab === 'ads' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Ads
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'ads' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-500'
            }`}>
              {showAll ? ads.length : uncategorizedAds.length}
            </span>
          </button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Result pill */}
          {result && (
            <p className="animate-fade-slide-up text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              {result.posts + result.ads === 0
                ? 'Nothing new to categorize'
                : `Applied to ${result.posts + result.ads} item${result.posts + result.ads !== 1 ? 's' : ''} (${result.posts} post${result.posts !== 1 ? 's' : ''}, ${result.ads} ad${result.ads !== 1 ? 's' : ''})`
              }
            </p>
          )}

          {/* Show all toggle */}
          <button
            onClick={() => setShowAll(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showAll ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              )}
            </svg>
            {showAll ? 'Hide categorized' : 'Show all'}
          </button>

          {/* Auto-Categorize */}
          <button
            onClick={handleAutoCategorize}
            disabled={isPending || totalUncategorized === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
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
        <div className="animate-fade-slide-up flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">All caught up</p>
          <p className="text-xs text-slate-400 max-w-[240px]">Every post and ad has been categorized. Use <button onClick={() => setShowAll(true)} className="text-red-500 hover:underline">Show all</button> to review or reassign.</p>
        </div>
      ) : !showAll && currentTabEmpty ? (
        <div className="animate-fade-slide-up flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">
            All {activeTab === 'posts' ? 'posts' : 'ads'} categorized
          </p>
          <p className="text-xs text-slate-400">
            Switch to the {activeTab === 'posts' ? 'Ads' : 'Organic Posts'} tab, or{' '}
            <button onClick={() => setShowAll(true)} className="text-red-500 hover:underline">show all</button> to review.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {activeTab === 'posts' ? (
            <PostsTable posts={visiblePosts} categories={categories} />
          ) : (
            <AdsTable ads={visibleAds} categories={categories} />
          )}
        </div>
      )}

      {/* Legend */}
      <p className="text-xs text-slate-400 mt-3">
        Showing <span className="font-medium text-slate-500">{showAll ? 'all items' : 'uncategorized only'}</span> —
        use <span className="font-medium text-slate-500">Show all</span> to review or reassign existing categories.
        Keywords configured in{' '}
        <a href="/dashboard/marketing/keywords" className="text-red-500 hover:underline">Manage Keywords</a>.
      </p>
    </div>
  )
}
