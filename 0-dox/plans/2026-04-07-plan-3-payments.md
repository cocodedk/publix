# Plan 3: Payments — Stripe Integration & User Plan Management

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Prerequisite:** Plans 1 and 2 must be complete.

**Goal:** Add Stripe-based subscription payments. Users can register, select a plan, and pay. Their `plan` field in Neo4j updates to `paid` on successful payment via Stripe webhook. An account page shows current plan and usage.

**Architecture:** Stripe Checkout handles payment UI. A webhook at `/api/stripe/webhook` listens for `checkout.session.completed` and updates the Neo4j User node plan field. A `/pricing` page shows plans. A `/account` page shows current plan and a "manage subscription" portal link.

**Tech Stack:** Stripe (npm: stripe), Next.js API routes for webhook + checkout.

**Prerequisites:**
- `STRIPE_SECRET_KEY` — from dashboard.stripe.com (use test key during development)
- `STRIPE_WEBHOOK_SECRET` — from Stripe webhook settings
- `STRIPE_PAID_PRICE_ID` — Stripe Price ID for the paid plan product
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — publishable key for frontend

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `frontend/pages/pricing.tsx` | Public pricing page with Stripe Checkout button |
| Create | `frontend/pages/account.tsx` | Authenticated user account + plan status |
| Create | `frontend/pages/api/stripe/checkout.ts` | Create Stripe Checkout session |
| Create | `frontend/pages/api/stripe/webhook.ts` | Handle Stripe events, update user plan |
| Create | `frontend/pages/api/stripe/portal.ts` | Create Stripe Customer Portal session |
| Create | `frontend/pages/api/users/register.ts` | Public user registration |
| Create | `frontend/pages/admin/users.tsx` | Admin: list + manage users |
| Create | `frontend/__tests__/api/stripe/webhook.test.ts` | Webhook handler unit tests |
| Create | `frontend/__tests__/api/users/register.test.ts` | Registration endpoint tests |
| Modify | `frontend/middleware.ts` | Protect /account route |

---

## Task 1: Install Stripe

- [ ] **Step 1: Install**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm install stripe
```

- [ ] **Step 2: Add env vars to .env.example**

Append to `.env.example`:
```
# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PAID_PRICE_ID=price_your_price_id_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

- [ ] **Step 3: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: install stripe"
```

---

## Task 2: User Registration Endpoint

**Files:**
- Create: `frontend/pages/api/users/register.ts`
- Create: `frontend/__tests__/api/users/register.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// frontend/__tests__/api/users/register.test.ts
jest.mock('../../../lib/neo4jClient', () => ({
  neo4jClient: {
    run: jest.fn(),
  },
}))
jest.mock('../../../lib/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}))

import { createMocks } from 'node-mocks-http'
import handler from '../../../pages/api/users/register'
import { neo4jClient } from '../../../lib/neo4jClient'

const mockRun = neo4jClient.run as jest.Mock

describe('POST /api/users/register', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 405 for non-POST', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(405)
  })

  it('returns 400 for missing email', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { password: 'test1234' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('returns 400 for weak password', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { email: 'a@b.com', password: '123' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('returns 409 when email already registered', async () => {
    mockRun.mockResolvedValueOnce([{ count: 1 }]) // email exists check
    const { req, res } = createMocks({
      method: 'POST',
      body: { email: 'existing@example.com', password: 'StrongPass1!' },
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(409)
  })

  it('returns 201 on success', async () => {
    mockRun.mockResolvedValueOnce([{ count: 0 }]) // email not exists
    mockRun.mockResolvedValueOnce([{ id: 'new-user-id' }]) // create user
    const { req, res } = createMocks({
      method: 'POST',
      body: { email: 'new@example.com', password: 'StrongPass1!' },
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(201)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=users/register
```

Expected: FAIL

- [ ] **Step 3: Create frontend/pages/api/users/register.ts**

```typescript
// frontend/pages/api/users/register.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import crypto from 'crypto'
import { neo4jClient } from '../../../lib/neo4jClient'
import { checkRateLimit } from '../../../lib/rateLimiter'
import { logger } from '../../../lib/logger'

const BodySchema = z.object({
  email: z.string().email('Valid email required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
})

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = getClientIp(req)
  const limit = await checkRateLimit(ip, 'auth')
  if (!limit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: limit.retryAfter })
  }

  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      message: parsed.error.errors[0]?.message,
    })
  }

  const { email, password } = parsed.data

  // Check if email already registered
  const existing = await neo4jClient.run<{ count: number }>(
    'MATCH (u:User {email: $email}) RETURN count(u) AS count',
    { email }
  )
  if (existing[0]?.count > 0) {
    return res.status(409).json({ error: 'Email already registered' })
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex')
  const id = crypto.randomUUID()

  await neo4jClient.run(
    `CREATE (u:User {
      id: $id,
      email: $email,
      passwordHash: $passwordHash,
      plan: 'free',
      role: 'user',
      createdAt: datetime()
    }) RETURN u.id AS id`,
    { id, email, passwordHash }
  )

  logger.info({ email }, 'New user registered')
  return res.status(201).json({ message: 'Account created. You can now sign in.' })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=users/register
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/pages/api/users/register.ts frontend/__tests__/api/users/register.test.ts
git commit -m "feat: add user registration endpoint"
```

---

## Task 3: Stripe Checkout Session

**Files:**
- Create: `frontend/pages/api/stripe/checkout.ts`

- [ ] **Step 1: Create frontend/pages/api/stripe/checkout.ts**

```typescript
// frontend/pages/api/stripe/checkout.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Sign in to purchase a plan' })
  }

  const priceId = process.env.STRIPE_PAID_PRICE_ID
  if (!priceId) {
    return res.status(500).json({ error: 'Stripe price not configured' })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: session.user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/account?upgraded=1`,
    cancel_url: `${baseUrl}/pricing`,
    metadata: { userId: (session.user as any).id || session.user.email },
  })

  return res.status(200).json({ url: checkout.url })
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/pages/api/stripe/checkout.ts
git commit -m "feat: add Stripe checkout session endpoint"
```

---

## Task 4: Stripe Webhook Handler

**Files:**
- Create: `frontend/pages/api/stripe/webhook.ts`
- Create: `frontend/__tests__/api/stripe/webhook.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// frontend/__tests__/api/stripe/webhook.test.ts
jest.mock('../../../lib/neo4jClient', () => ({
  neo4jClient: { run: jest.fn().mockResolvedValue([]) },
}))
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
  }))
})

import { createMocks } from 'node-mocks-http'
import handler from '../../../pages/api/stripe/webhook'

describe('POST /api/stripe/webhook', () => {
  it('returns 405 for non-POST', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(405)
  })

  it('returns 400 when stripe signature verification fails', async () => {
    const Stripe = require('stripe')
    Stripe.mockImplementation(() => ({
      webhooks: {
        constructEvent: jest.fn().mockImplementation(() => {
          throw new Error('Invalid signature')
        }),
      },
    }))
    const { req, res } = createMocks({
      method: 'POST',
      headers: { 'stripe-signature': 'bad-sig' },
      body: Buffer.from('{}'),
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })
})
```

- [ ] **Step 2: Create frontend/pages/api/stripe/webhook.ts**

```typescript
// frontend/pages/api/stripe/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { neo4jClient } from '../../../lib/neo4jClient'
import { logger } from '../../../lib/logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' })

// Stripe requires the raw body for signature verification
export const config = { api: { bodyParser: false } }

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return res.status(400).json({ error: 'Missing signature or webhook secret' })
  }

  let event: Stripe.Event
  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    logger.error({ err }, 'Stripe webhook signature verification failed')
    return res.status(400).json({ error: 'Webhook signature invalid' })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const email = session.customer_email
    const customerId = session.customer as string

    if (email) {
      await neo4jClient.run(
        `MATCH (u:User {email: $email})
         SET u.plan = 'paid', u.stripeCustomerId = $customerId, u.updatedAt = datetime()`,
        { email, customerId }
      )
      logger.info({ email }, 'User upgraded to paid plan')
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string

    await neo4jClient.run(
      `MATCH (u:User {stripeCustomerId: $customerId})
       SET u.plan = 'free', u.updatedAt = datetime()`,
      { customerId }
    )
    logger.info({ customerId }, 'User downgraded to free plan after subscription cancellation')
  }

  return res.status(200).json({ received: true })
}
```

- [ ] **Step 3: Run webhook tests**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=stripe/webhook
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/pages/api/stripe/webhook.ts frontend/__tests__/api/stripe/webhook.test.ts
git commit -m "feat: add Stripe webhook handler to upgrade/downgrade user plans"
```

---

## Task 5: Pricing Page

**Files:**
- Create: `frontend/pages/pricing.tsx`

- [ ] **Step 1: Create frontend/pages/pricing.tsx**

```typescript
// frontend/pages/pricing.tsx
import { useState } from 'react'
import axios from 'axios'
import {
  Box, Button, Card, CardContent, CardHeader, Chip, CircularProgress,
  Container, Divider, List, ListItem, ListItemIcon, ListItemText, Typography,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'

const FREE_FEATURES = [
  'Check your email against public breach databases',
  'Sources: XposedOrNot + LeakCheck',
  'Report delivered to your inbox',
  '3 checks per 10 minutes',
]

const PAID_FEATURES = [
  'Everything in Free',
  'Sources: HIBP Pro + Dehashed + Dark web intelligence',
  'Stealer log detection',
  'Richer breach details (dates, exposed data types)',
  'Priority processing',
]

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    if (!session) {
      router.push('/auth/signin?callbackUrl=/pricing')
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.post('/api/stripe/checkout')
      window.location.href = data.url
    } catch {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>Simple Pricing</Typography>
        <Typography variant="body1" color="text.secondary">
          Start free. Upgrade for deeper intelligence.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Free */}
        <Card sx={{ flex: 1 }}>
          <CardHeader
            title="Free"
            subheader="No account needed"
            titleTypographyProps={{ variant: 'h5', fontWeight: 'bold' }}
          />
          <CardContent>
            <Typography variant="h4" fontWeight="bold" gutterBottom>€0</Typography>
            <Divider sx={{ my: 2 }} />
            <List dense>
              {FREE_FEATURES.map(f => (
                <ListItem key={f} disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                  <ListItemText primary={f} />
                </ListItem>
              ))}
            </List>
            <Button variant="outlined" fullWidth href="/check" sx={{ mt: 2 }}>
              Check now →
            </Button>
          </CardContent>
        </Card>

        {/* Paid */}
        <Card sx={{ flex: 1, border: '2px solid', borderColor: 'primary.main' }}>
          <CardHeader
            title={<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>Pro <Chip label="Most popular" size="small" color="primary" /></Box>}
            subheader="Full breach intelligence"
            titleTypographyProps={{ variant: 'h5', fontWeight: 'bold' }}
          />
          <CardContent>
            <Typography variant="h4" fontWeight="bold" gutterBottom>€9<Typography component="span" variant="body1" color="text.secondary">/month</Typography></Typography>
            <Divider sx={{ my: 2 }} />
            <List dense>
              {PAID_FEATURES.map(f => (
                <ListItem key={f} disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}><CheckIcon color="primary" fontSize="small" /></ListItemIcon>
                  <ListItemText primary={f} />
                </ListItem>
              ))}
            </List>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleUpgrade}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Upgrade to Pro →'}
            </Button>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Attribution: Data powered by XposedOrNot, LeakCheck, HaveIBeenPwned, and Dehashed.
        </Typography>
      </Box>
    </Container>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/pages/pricing.tsx
git commit -m "feat: add pricing page with Stripe checkout integration"
```

---

## Task 6: Account Page

**Files:**
- Create: `frontend/pages/account.tsx`
- Modify: `frontend/middleware.ts` (protect /account)

- [ ] **Step 1: Create frontend/pages/account.tsx**

```typescript
// frontend/pages/account.tsx
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]'
import { Box, Button, Chip, Container, Divider, Paper, Typography } from '@mui/material'
import axios from 'axios'

interface Props {
  email: string
  plan: string
  upgraded: boolean
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session?.user) {
    return { redirect: { destination: '/auth/signin?callbackUrl=/account', permanent: false } }
  }
  return {
    props: {
      email: session.user.email ?? '',
      plan: (session.user as any).plan ?? 'free',
      upgraded: context.query.upgraded === '1',
    },
  }
}

export default function AccountPage({ email, plan, upgraded }: Props) {
  const handlePortal = async () => {
    const { data } = await axios.post('/api/stripe/portal')
    window.location.href = data.url
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Your Account</Typography>

      {upgraded && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.light' }}>
          <Typography fontWeight="bold">You are now on the Pro plan!</Typography>
        </Paper>
      )}

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">Email</Typography>
        <Typography variant="body1" gutterBottom>{email}</Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary">Plan</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Chip
            label={plan === 'paid' ? 'Pro' : 'Free'}
            color={plan === 'paid' ? 'primary' : 'default'}
          />
        </Box>
        <Divider sx={{ my: 2 }} />
        {plan === 'paid' ? (
          <Button variant="outlined" onClick={handlePortal}>
            Manage subscription →
          </Button>
        ) : (
          <Button variant="contained" href="/pricing">
            Upgrade to Pro →
          </Button>
        )}
      </Paper>
    </Container>
  )
}
```

- [ ] **Step 2: Create Stripe portal endpoint**

Create `frontend/pages/api/stripe/portal.ts`:

```typescript
// frontend/pages/api/stripe/portal.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { neo4jClient } from '../../../lib/neo4jClient'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })

  const users = await neo4jClient.run<{ customerId: string }>(
    'MATCH (u:User {email: $email}) RETURN u.stripeCustomerId AS customerId',
    { email: session.user.email }
  )

  const customerId = users[0]?.customerId
  if (!customerId) return res.status(404).json({ error: 'No subscription found' })

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/account`,
  })

  return res.status(200).json({ url: portal.url })
}
```

- [ ] **Step 3: Add /account to middleware matchers**

In `frontend/middleware.ts`, add `/account` to the protected paths list and to the `config.matcher` array.

- [ ] **Step 4: Run all tests**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/pages/account.tsx frontend/pages/api/stripe/portal.ts frontend/middleware.ts
git commit -m "feat: add account page with plan status and Stripe customer portal"
```

---

## Stripe Setup Checklist (Manual Steps)

These steps must be done in the Stripe dashboard before testing payments:

- [ ] Create a product called "Publix Pro" in the Stripe dashboard
- [ ] Create a recurring price (e.g. €9/month) for that product → copy the Price ID → set as `STRIPE_PAID_PRICE_ID`
- [ ] Create a webhook endpoint pointing to `https://publix.dk/api/stripe/webhook`
- [ ] Subscribe to events: `checkout.session.completed`, `customer.subscription.deleted`
- [ ] Copy the webhook signing secret → set as `STRIPE_WEBHOOK_SECRET`
- [ ] Enable the Stripe Customer Portal in dashboard settings

---

*This plan is Part 3 of 5. See `plan-4-production.md` for Nginx, SSL, and production deployment.*
