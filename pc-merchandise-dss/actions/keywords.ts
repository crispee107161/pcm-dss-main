'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function addKeyword(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    throw new Error('Unauthorized')
  }

  const word = (formData.get('word') as string)?.trim()
  const categoryId = parseInt(formData.get('categoryId') as string, 10)

  if (!word || isNaN(categoryId)) {
    throw new Error('Word and category are required')
  }

  await prisma.keyword.create({
    data: {
      word,
      category_id: categoryId,
    },
  })

  revalidatePath('/dashboard/marketing/keywords')
}

export async function deleteKeyword(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    throw new Error('Unauthorized')
  }

  const id = parseInt(formData.get('id') as string, 10)

  if (isNaN(id)) {
    throw new Error('Invalid keyword ID')
  }

  await prisma.keyword.delete({
    where: { id },
  })

  revalidatePath('/dashboard/marketing/keywords')
}
