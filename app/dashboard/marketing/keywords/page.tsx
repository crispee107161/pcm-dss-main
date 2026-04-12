import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import { addKeyword, deleteKeyword } from '@/actions/keywords'

export default async function KeywordsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    redirect('/login')
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { keywords: { orderBy: { word: 'asc' } } },
  })

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader title="Manage Keywords" description="Keywords are used to auto-suggest categories for posts and ads" />

      {/* Category list */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Categories</h2>
        {categories.length === 0 ? (
          <p className="text-slate-500 text-sm">No categories found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">ID</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Name</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 bg-slate-50">Keywords</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 border-t border-slate-100">{cat.id}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium border-t border-slate-100">{cat.name}</td>
                    <td className="px-4 py-3 text-slate-700 border-t border-slate-100">{cat.keywords.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Keywords by category */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Keywords by Category</h2>
        {categories.length === 0 ? (
          <p className="text-slate-500 text-sm">No categories found.</p>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat.id}>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">{cat.name}</h3>
                {cat.keywords.length === 0 ? (
                  <p className="text-slate-400 text-xs">No keywords yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {cat.keywords.map((kw) => (
                      <span key={kw.id} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 rounded-full px-3 py-1 text-xs">
                        {kw.word}
                        <form action={deleteKeyword} className="inline">
                          <input type="hidden" name="id" value={kw.id} />
                          <button
                            type="submit"
                            className="text-slate-400 hover:text-red-600 transition-colors leading-none"
                            title="Delete keyword"
                          >
                            &times;
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

      {/* Add keyword form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Keyword</h2>
        <form action={addKeyword} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="word"
            placeholder="Enter keyword..."
            required
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <select
            name="categoryId"
            required
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap"
          >
            Add Keyword
          </button>
        </form>
      </div>
    </div>
  )
}
