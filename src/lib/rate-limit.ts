// Simple in-memory rate limiter
// In production, replace with Redis-based solution

const rateLimitMap = new Map<string, number[]>()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const recent = timestamps.filter(t => t > now - 3600000)
    if (recent.length === 0) {
      rateLimitMap.delete(key)
    } else {
      rateLimitMap.set(key, recent)
    }
  }
}, 5 * 60 * 1000)

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now()
  const windowStart = now - windowMs

  const timestamps = rateLimitMap.get(key) || []
  const recent = timestamps.filter(t => t > windowStart)

  if (recent.length >= maxRequests) {
    const oldestInWindow = recent[0]
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestInWindow + windowMs - now,
    }
  }

  recent.push(now)
  rateLimitMap.set(key, recent)

  return {
    allowed: true,
    remaining: maxRequests - recent.length,
    resetMs: windowMs,
  }
}
