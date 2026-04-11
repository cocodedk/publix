import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { checkRateLimit } from '../../lib/rateLimiter'
import { runFreeTierSearch, runPaidTierSearch } from '../../lib/sources'
import { sendBreachReport } from '../../lib/email'
import { logger } from '../../lib/logger'
import { authOptions } from './auth/[...nextauth]'

const emailSchema = z.object({
  email: z.string().email(),
})

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress ?? 'unknown'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = getClientIp(req)
  const rateLimit = await checkRateLimit(ip, 'report')
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: rateLimit.retryAfter,
      message: `Please try again in ${rateLimit.retryAfter} seconds`,
    })
  }

  const parsed = emailSchema.safeParse(req.body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid email'
    return res.status(400).json({ error: 'Validation error', message })
  }

  const { email } = parsed.data

  const session = await getServerSession(req, res, authOptions)
  const tier = (session?.user as any)?.plan === 'paid' ? 'paid' : 'free'

  res.status(202).json({
    message: `Check your inbox at ${email}`,
    tier,
  })

  // Fire-and-forget after response is sent
  const search = tier === 'paid' ? runPaidTierSearch : runFreeTierSearch
  search(email)
    .then((report) => sendBreachReport(report))
    .catch((err) => {
      logger.error({ err, email }, 'Background breach report failed')
    })
}
