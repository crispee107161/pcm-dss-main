'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { detectCategoryFromText } from '@/lib/keywords/detect'

export async function updatePostCategory(postId: number, categoryId: number | null): Promise<void> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    throw new Error('Unauthorized')
  }

  await prisma.facebookPost.update({
    where: { id: postId },
    data: { category_id: categoryId },
  })

  revalidatePath('/dashboard/marketing/categorize')
}

export async function updateAdCategory(adId: number, categoryId: number | null): Promise<void> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    throw new Error('Unauthorized')
  }

  await prisma.ad.update({
    where: { id: adId },
    data: { category_id: categoryId },
  })

  revalidatePath('/dashboard/marketing/categorize')
}

export async function autoCategorizeAll(): Promise<{ posts: number; ads: number }> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    throw new Error('Unauthorized')
  }

  const [uncategorizedPosts, uncategorizedAds, keywords] = await Promise.all([
    prisma.facebookPost.findMany({
      where: { category_id: null },
      select: { id: true, title: true },
    }),
    prisma.ad.findMany({
      where: { category_id: null },
      select: { id: true, ad_name: true },
    }),
    prisma.keyword.findMany(),
  ])

  let postsUpdated = 0
  let adsUpdated = 0

  await Promise.all(
    uncategorizedPosts.map(async (post) => {
      const categoryId = detectCategoryFromText(post.title, keywords)
      if (categoryId !== null) {
        await prisma.facebookPost.update({ where: { id: post.id }, data: { category_id: categoryId } })
        postsUpdated++
      }
    })
  )

  await Promise.all(
    uncategorizedAds.map(async (ad) => {
      const categoryId = detectCategoryFromText(ad.ad_name, keywords)
      if (categoryId !== null) {
        await prisma.ad.update({ where: { id: ad.id }, data: { category_id: categoryId } })
        adsUpdated++
      }
    })
  )

  revalidatePath('/dashboard/marketing/categorize')
  return { posts: postsUpdated, ads: adsUpdated }
}

// FormData-compatible versions for use with form action + .bind()
export async function updatePostCategoryForm(postId: number, formData: FormData): Promise<void> {
  const raw = formData.get('categoryId')
  const categoryId = raw && raw !== '' ? parseInt(raw as string, 10) : null
  await updatePostCategory(postId, categoryId)
}

export async function updateAdCategoryForm(adId: number, formData: FormData): Promise<void> {
  const raw = formData.get('categoryId')
  const categoryId = raw && raw !== '' ? parseInt(raw as string, 10) : null
  await updateAdCategory(adId, categoryId)
}
