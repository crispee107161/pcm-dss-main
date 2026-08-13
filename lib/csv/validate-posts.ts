import { parseIsoLocalAsManila } from './timezone'

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
  // Nullable, unlike the other counters — FR-19/ALG-07 requires excluding
  // the handful of posts with a genuinely blank "Views" cell from the
  // ranking comparison, rather than silently treating them as 0 views
  // (which would corrupt both the correlation and the top-k overlap).
  views: number | null
  /** Percentage, 0-100 (e.g. 4.2 means 4.2%). Already scaled — do not multiply by 100 again. */
  engagement_rate: number
  // FR-28 watch-through rate inputs — populated for videos/reels only.
  // duration_sec is guarded to > 0 here (mvp.md ALG edge case) so a stray 0
  // or blank never becomes a division-by-zero downstream.
  duration_sec: number | null
  avg_seconds_viewed: number | null
}

function parseIntOrZero(value: string | undefined): number {
  if (!value || value.trim() === '') return 0
  const parsed = parseInt(value.replace(/,/g, '').trim(), 10)
  return isNaN(parsed) ? 0 : parsed
}

function parseIntOrNull(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null
  const parsed = parseInt(value.replace(/,/g, '').trim(), 10)
  return isNaN(parsed) ? null : parsed
}

function parseFloatOrNull(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null
  const parsed = parseFloat(value.replace(/,/g, '').trim())
  return isNaN(parsed) ? null : parsed
}

/** "Publish time" is exported as "MM/DD/YYYY HH:MM" with no timezone marker. */
function parsePublishTime(raw: string): Date {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/)
  if (!match) {
    // Unrecognized format — fall back to the platform parser rather than fail outright.
    return new Date(trimmed)
  }
  const [, mm, dd, yyyy, hh, min] = match
  return parseIsoLocalAsManila(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`)
}

export function validatePostsRows(rows: Record<string, string>[]): PostRecord[] {
  return rows.map((row, index) => {
    try {
      const post_id = (row['Post ID'] ?? '').trim()
      if (!post_id) throw new Error('Missing Post ID')

      const publishRaw = row['Publish time'] ?? ''
      if (!publishRaw.trim()) throw new Error('Missing Publish time')
      const publish_time = parsePublishTime(publishRaw)
      if (isNaN(publish_time.getTime())) throw new Error(`Invalid Publish time: ${publishRaw}`)

      const post_type = (row['Post type'] ?? '').trim()
      // Capped to keep a single malicious/garbage field from ballooning the
      // LLM prompts these values later get interpolated into (chat.ts, keywords.ts).
      const title = row['Title']?.trim().slice(0, 200) || null
      const description = row['Description']?.trim().slice(0, 2000) || null
      const permalink = (row['Permalink'] ?? row['Post link'] ?? '').trim()

      const reach = parseIntOrZero(row['Reach'])

      const reactions = parseIntOrZero(row['Reactions'] ?? row['Post reactions'])
      const comments = parseIntOrZero(row['Comments'] ?? row['Post comments'])
      const shares = parseIntOrZero(row['Shares'] ?? row['Post shares'])
      const views = parseIntOrNull(row['Views'] ?? row['Video views'] ?? row['3-second video plays'])

      const engagement_rate =
        reach === 0 ? 0 : ((reactions + comments + shares) / reach) * 100

      const rawDuration = parseFloatOrNull(row['Duration (sec)'])
      const duration_sec = rawDuration !== null && rawDuration > 0 ? rawDuration : null
      const avg_seconds_viewed = parseFloatOrNull(row['Average Seconds viewed'])

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
        duration_sec,
        avg_seconds_viewed,
      }
    } catch (err) {
      throw new Error(`Row ${index + 1}: ${(err as Error).message}`)
    }
  })
}
