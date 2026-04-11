import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible'

const reportLimiter = new RateLimiterMemory({
  points: 3,
  duration: 600, // 10 minutes in seconds
})

const searchLimiter = new RateLimiterMemory({
  points: 30,
  duration: 60, // 1 minute in seconds
})

const authLimiter = new RateLimiterMemory({
  points: 10,
  duration: 900, // 15 minutes in seconds
})

const limiters = {
  report: reportLimiter,
  search: searchLimiter,
  auth: authLimiter,
} as const

export type LimiterName = keyof typeof limiters

export interface RateLimitResult {
  allowed: boolean
  remaining?: number
  retryAfter?: number
}

export async function checkRateLimit(
  key: string,
  limiterName: LimiterName
): Promise<RateLimitResult> {
  const limiter = limiters[limiterName]
  try {
    const res = await limiter.consume(key)
    return {
      allowed: true,
      remaining: res.remainingPoints,
    }
  } catch (err) {
    const rateLimiterRes = err as RateLimiterRes
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(rateLimiterRes.msBeforeNext / 1000),
    }
  }
}
