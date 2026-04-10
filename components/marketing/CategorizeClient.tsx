'use client'

import { useState } from 'react'
import { updatePostCategoryForm, updateAdCategoryForm } from '@/actions/categorize'

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
                  <form action={boundAction} className="flex items-center gap-2">
                    <select
                      name="categoryId"
                      defaultValue={defaultSelectValue}
                      className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 min-w-[160px]"
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
                  <form action={boundAction} className="flex items-center gap-2">
                    <select
                      name="categoryId"
                      defaultValue={defaultSelectValue}
                      className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 min-w-[160px]"
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

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'posts'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Organic Posts
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'posts' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-500'}`}>
            {posts.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('ads')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'ads'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Ads
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'ads' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-500'}`}>
            {ads.length}
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === 'posts' ? (
          <PostsTable posts={posts} categories={categories} />
        ) : (
          <AdsTable ads={ads} categories={categories} />
        )}
      </div>

      {/* Legend */}
      <p className="text-xs text-slate-400 mt-3">
        Categories marked <span className="text-slate-500 font-medium">(suggested)</span> are auto-detected from title keywords configured in{' '}
        <a href="/dashboard/marketing/keywords" className="text-red-500 hover:underline">Manage Keywords</a>.
        Use the dropdown to override, then click Save.
      </p>
    </div>
  )
}
