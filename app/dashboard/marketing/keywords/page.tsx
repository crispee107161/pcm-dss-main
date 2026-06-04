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
      <PageHeader title="Manage Keywords" description="Keywords are used to auto-suggest categories for posts and ads" />
      <KeywordsClient categories={categories} />
    </div>
  )
}
