import { createRequest, createResponse } from 'node-mocks-http'

jest.mock('../../lib/sources', () => ({
  runFreeTierSearch: jest.fn().mockResolvedValue({
    email: 'test@example.com', totalBreaches: 1, sources: [], generatedAt: new Date().toISOString(), tier: 'free'
  }),
  runPaidTierSearch: jest.fn().mockResolvedValue({
    email: 'test@example.com', totalBreaches: 2, sources: [], generatedAt: new Date().toISOString(), tier: 'paid'
  }),
}))
jest.mock('../../lib/email', () => ({
  sendBreachReport: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
}))
jest.mock('../../lib/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 2 }),
}))
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
  getServerSession: jest.fn().mockResolvedValue(null),
}))
jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}))
jest.mock('../../lib/neo4jClient', () => ({
  neo4jClient: { run: jest.fn() },
}))
jest.mock('../../lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import handler from '../../pages/api/report'
import { checkRateLimit } from '../../lib/rateLimiter'

const mockCheckRateLimit = checkRateLimit as jest.Mock

describe('POST /api/report', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 2 })
  })

  it('returns 405 for GET', async () => {
    const req = createRequest({ method: 'GET' })
    const res = createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(405)
  })

  it('returns 400 for missing email', async () => {
    const req = createRequest({ method: 'POST', body: {} })
    const res = createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    const data = res._getJSONData()
    expect(data).toHaveProperty('error')
  })

  it('returns 400 for invalid email format', async () => {
    const req = createRequest({ method: 'POST', body: { email: 'notanemail' } })
    const res = createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    const data = res._getJSONData()
    expect(data).toHaveProperty('error')
  })

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, retryAfter: 300 })
    const req = createRequest({ method: 'POST', body: { email: 'test@example.com' } })
    const res = createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(429)
    const data = res._getJSONData()
    expect(data).toHaveProperty('retryAfter')
  })

  it('returns 202 for valid email', async () => {
    const req = createRequest({ method: 'POST', body: { email: 'test@example.com' } })
    const res = createResponse()
    await handler(req, res)
    expect(res.statusCode).toBe(202)
    const data = res._getJSONData()
    expect(data).toHaveProperty('message')
    expect(data).toHaveProperty('tier')
  })
})
