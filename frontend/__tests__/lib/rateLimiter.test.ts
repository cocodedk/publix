import { checkRateLimit } from '../../lib/rateLimiter'

describe('checkRateLimit', () => {
  it('allows requests within the report limit', async () => {
    const result = await checkRateLimit('test-ip-allow-1', 'report')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeDefined()
  })

  it('blocks after exceeding report limit (3 per 10 min)', async () => {
    const key = 'test-ip-block-report'
    // Consume all 3 allowed
    await checkRateLimit(key, 'report')
    await checkRateLimit(key, 'report')
    await checkRateLimit(key, 'report')
    // 4th request should be blocked
    const blocked = await checkRateLimit(key, 'report')
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfter).toBeDefined()
  })

  it('uses separate limits per key name', async () => {
    const keyA = 'test-ip-separate-a'
    const keyB = 'test-ip-separate-b'
    // Exhaust keyA
    await checkRateLimit(keyA, 'report')
    await checkRateLimit(keyA, 'report')
    await checkRateLimit(keyA, 'report')
    const blockedA = await checkRateLimit(keyA, 'report')
    expect(blockedA.allowed).toBe(false)
    // keyB should still be allowed
    const allowedB = await checkRateLimit(keyB, 'report')
    expect(allowedB.allowed).toBe(true)
  })
})
