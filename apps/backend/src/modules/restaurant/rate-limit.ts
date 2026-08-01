/**
 * In-memory sliding-window rate limiter for store guest endpoints.
 * Adequate for single-node / local; replace with Redis when multi-instance.
 */
type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function consumeRateLimit(input: {
  key: string
  limit: number
  windowMs: number
}): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  const existing = buckets.get(input.key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs })
    return { ok: true, retryAfterSec: 0 }
  }

  if (existing.count >= input.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  return { ok: true, retryAfterSec: 0 }
}
