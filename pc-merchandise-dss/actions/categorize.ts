'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

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
