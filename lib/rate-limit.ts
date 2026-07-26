// In-memory fixed-window rate limiter. Sufficient for a single-instance
// deployment; state is per Node process and does not survive a restart
// or multiple instances/serverless replicas. If this app is ever deployed
// across multiple instances, replace with a shared store (e.g. Redis/Upstash).

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Opportunistic cleanup so the map doesn't grow unbounded over a long-running process.
const MAX_BUCKETS = 10_000

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, b] of buckets) {
        if (now >= b.resetAt) buckets.delete(k)
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}
