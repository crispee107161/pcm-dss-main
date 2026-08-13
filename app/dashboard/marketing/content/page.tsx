import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import ContentLibraryClient from '@/components/marketing/ContentLibraryClient'

export default async function ContentLibraryPage() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MARKETING_MANAGER' && session.user.role !== 'MARKETING_TEAM')) {
    redirect('/login')
  }

  const posts = await prisma.facebookPost.findMany({
    orderBy: { publish_time: 'desc' },
    select: {
      id: true,
      title: true,
      permalink: true,
      post_type: true,
      publish_time: true,
      views: true,
      engagement_rate: true,
      category_final: true,
    },
  })

  const rows = posts.map((p) => ({ ...p, publish_time: p.publish_time.toISOString() }))

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Content Library"
        description="All organic posts with their assigned category. Marketing Managers can assign categories here directly."
      />
      <ContentLibraryClient posts={rows} canEdit={session.user.role === 'MARKETING_MANAGER'} />
    </div>
  )
}
