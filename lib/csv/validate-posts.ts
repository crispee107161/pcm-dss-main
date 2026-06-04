export interface PostRecord {
  post_id: string
  publish_time: Date
  post_type: string
  title: string | null
  description: string | null
  permalink: string
  reach: number
  reactions: number
  comments: number
  shares: number
  views: number
  engagement_rate: number
}

function parseIntOrZero(value: string | undefined): number {
  if (!value || value.trim() === '') return 0
  const parsed = parseInt(value.replace(/,/g, '').trim(), 10)
  return isNaN(parsed) ? 0 : parsed
}

export function validatePostsRows(rows: Record<string, string>[]): PostRecord[] {
  return rows.map((row, index) => {
    try {
      const post_id = (row['Post ID'] ?? '').trim()
      if (!post_id) throw new Error('Missing Post ID')

      const publishRaw = row['Publish time'] ?? ''
      if (!publishRaw.trim()) throw new Error('Missing Publish time')
      const publish_time = new Date(publishRaw.trim())
      if (isNaN(publish_time.getTime())) throw new Error(`Invalid Publish time: ${publishRaw}`)

      const post_type = (row['Post type'] ?? '').trim()
      const title = row['Title']?.trim() || null
      const description = row['Description']?.trim() || null
      const permalink = (row['Permalink'] ?? row['Post link'] ?? '').trim()

      const reachRaw = row['Reach'] ?? ''
      const reach = parseInt(reachRaw.replace(/,/g, '').trim(), 10)
      if (isNaN(reach)) throw new Error(`Invalid Reach value: ${reachRaw}`)

      const reactions = parseIntOrZero(row['Reactions'] ?? row['Post reactions'])
      const comments = parseIntOrZero(row['Comments'] ?? row['Post comments'])
      const shares = parseIntOrZero(row['Shares'] ?? row['Post shares'])
      const views = parseIntOrZero(row['Views'] ?? row['Video views'] ?? row['3-second video plays'])

      const engagement_rate =
        reach === 0 ? 0 : ((reactions + comments + shares) / reach) * 100

      return {
        post_id,
        publish_time,
        post_type,
        title,
        description,
        permalink,
        reach,
        reactions,
        comments,
        shares,
        views,
        engagement_rate,
      }
    } catch (err) {
      throw new Error(`Row ${index + 1}: ${(err as Error).message}`)
    }
  })
}
