import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import CategorizeClient from '@/components/marketing/CategorizeClient'

export default async function OwnerCategorizePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'BUSINESS_OWNER') {
    redirect('/login')
  }

  const posts = await prisma.facebookPost.findMany({
    where: { category_final: null },
    orderBy: { publish_time: 'desc' },
    select: {
      id: true,
      title: true,
      permalink: true,
      post_type: true,
      category_keyword: true,
      category_llm: true,
      category_pending: true,
      pending_by: { select: { email: true } },
    },
  })

  const postRows = posts.map((p) => ({
    id: p.id,
    title: p.title,
    permalink: p.permalink,
    post_type: p.post_type,
    keywordSuggestion: p.category_keyword,
    llmSuggestion: p.category_llm,
    category_pending: p.category_pending,
    pendingByEmail: p.pending_by?.email ?? null,
  }))

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Categorization Review"
        description="Queue of posts awaiting a final category (view only)."
      />
      <CategorizeClient posts={postRows} role={session.user.role} />
    </div>
  )
}
