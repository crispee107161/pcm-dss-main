import { prisma } from '@/lib/prisma'
import type { PostRecord } from '@/lib/csv/validate-posts'

export async function upsertPosts(records: PostRecord[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0

  for (const record of records) {
    const existing = await prisma.facebookPost.findUnique({
      where: { post_id: record.post_id },
    })

    await prisma.facebookPost.upsert({
      where: { post_id: record.post_id },
      create: {
        post_id: record.post_id,
        publish_time: record.publish_time,
        post_type: record.post_type,
        title: record.title,
        description: record.description,
        permalink: record.permalink,
        reach: record.reach,
        reactions: record.reactions,
        comments: record.comments,
        shares: record.shares,
        views: record.views,
        engagement_rate: record.engagement_rate,
      },
      update: {
        publish_time: record.publish_time,
        post_type: record.post_type,
        title: record.title,
        description: record.description,
        permalink: record.permalink,
        reach: record.reach,
        reactions: record.reactions,
        comments: record.comments,
        shares: record.shares,
        views: record.views,
        engagement_rate: record.engagement_rate,
      },
    })

    if (existing) {
      updated++
    } else {
      inserted++
    }
  }

  return { inserted, updated }
}
