import { prisma } from '@/lib/prisma'
import type { PostRecord } from '@/lib/csv/validate-posts'
import { emptyCounts, isUnchanged, type UpsertCounts } from '@/lib/db/upsert-counts'

export async function upsertPosts(records: PostRecord[]): Promise<UpsertCounts> {
  const counts = emptyCounts()

  for (const record of records) {
    const existing = await prisma.facebookPost.findUnique({
      where: { post_id: record.post_id },
    })

    const update = {
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
    }

    await prisma.facebookPost.upsert({
      where: { post_id: record.post_id },
      create: { post_id: record.post_id, ...update },
      update,
    })

    if (!existing) {
      counts.inserted++
    } else if (isUnchanged(existing, update)) {
      counts.unchanged++
    } else {
      counts.updated++
    }
  }

  return counts
}
