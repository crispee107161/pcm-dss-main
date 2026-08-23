import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import KeywordsClient from '@/components/marketing/KeywordsClient'

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
      <PageHeader title="Keyword Lexicon" description="Fixed research baseline used to auto-suggest categories — view only, see docs/raven/FR08_Seed_Lexicon_Rerun_Results.md" />
      <KeywordsClient categories={categories} />
    </div>
  )
}
