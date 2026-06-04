import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/nav/PageHeader'
import CategorizeClient from '@/components/marketing/CategorizeClient'
import { detectCategoryFromText } from '@/lib/keywords/detect'

export default async function CategorizePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    redirect('/login')
  }

  const [posts, ads, categories, keywords] = await Promise.all([
    prisma.facebookPost.findMany({
      orderBy: { publish_time: 'desc' },
      select: {
        id: true,
        title: true,
        permalink: true,
        post_type: true,
        category_id: true,
      },
    }),
    prisma.ad.findMany({
      orderBy: { reporting_starts: 'desc' },
      select: {
        id: true,
        ad_name: true,
        ad_set_name: true,
        category_id: true,
      },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.keyword.findMany(),
  ])

  // Derive ad type from ad_set_name heuristic (reel/video/photo detection)
  function inferAdType(adSetName: string, adName: string): string {
    const text = `${adSetName} ${adName}`.toLowerCase()
    if (text.includes('reel')) return 'Reel'
    if (text.includes('video') || text.includes('vlog')) return 'Video'
    if (text.includes('photo') || text.includes('image')) return 'Photo'
    return 'Ad'
  }

  const postRows = posts.map(p => ({
    id: p.id,
    title: p.title,
    permalink: p.permalink,
    post_type: p.post_type,
    category_id: p.category_id,
    suggestedCategoryId: p.category_id
      ? null
      : detectCategoryFromText(p.title, keywords),
  }))

  const adRows = ads.map(a => ({
    id: a.id,
    ad_name: a.ad_name,
    ad_set_name: a.ad_set_name,
    post_type: inferAdType(a.ad_set_name, a.ad_name),
    category_id: a.category_id,
    suggestedCategoryId: a.category_id
      ? null
      : detectCategoryFromText(a.ad_name, keywords),
  }))

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Categorize Content"
        description="Assign categories to organic posts and ads. Keywords from Manage Keywords are used to auto-suggest."
      />
      <CategorizeClient posts={postRows} ads={adRows} categories={categories} />
    </div>
  )
}
