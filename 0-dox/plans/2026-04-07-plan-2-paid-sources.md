# Plan 2: Paid Data Sources — HIBP Pro + IntelX + Dehashed

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Prerequisite:** Plan 1 must be complete. This plan adds paid-tier search sources and wires them to user plan checks.

**Goal:** Add HIBP Pro, IntelX (already integrated), and Dehashed as paid-tier sources. A `tier` field on the user session gates which sources are queried. Paid reports include richer breach data including stealer logs and dark web sources.

**Architecture:** `frontend/lib/sources/index.ts` already has `runFreeTierSearch`. This plan adds `runPaidTierSearch` which queries all sources (free + paid). The `/api/report` endpoint checks session plan before deciding which function to call. Paid source API keys are env vars.

**Tech Stack:** Same as Plan 1 plus HIBP API v3, IntelX (already done), Dehashed API.

**Prerequisites:**
- `HIBP_API_KEY` — from haveibeenpwned.com (Pro plan required)
- `DEHASHED_USERNAME` and `DEHASHED_API_KEY` — from dehashed.com
- IntelX already configured via `INTELX_API_KEY`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `frontend/lib/sources/hibp.ts` | HIBP Pro API — breach + paste lookup |
| Create | `frontend/lib/sources/dehashed.ts` | Dehashed API — deep credential search |
| Modify | `frontend/lib/sources/index.ts` | Add `runPaidTierSearch` aggregator |
| Modify | `frontend/pages/api/report.ts` | Check user plan, call correct search function |
| Modify | `frontend/lib/types.ts` | Add UserPlan type |
| Create | `frontend/__tests__/lib/sources/hibp.test.ts` | HIBP unit tests |
| Create | `frontend/__tests__/lib/sources/dehashed.test.ts` | Dehashed unit tests |

---

## Task 1: Add UserPlan Type

**Files:**
- Modify: `frontend/lib/types.ts`

- [ ] **Step 1: Add UserPlan to types.ts**

Append to the end of `frontend/lib/types.ts`:

```typescript
export type UserPlan = 'free' | 'paid'

export interface UserSession {
  id: string
  email: string
  name?: string
  role: string
  plan: UserPlan
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/lib/types.ts
git commit -m "feat: add UserPlan and UserSession types"
```

---

## Task 2: HIBP Pro Source

**Files:**
- Create: `frontend/lib/sources/hibp.ts`
- Create: `frontend/__tests__/lib/sources/hibp.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// frontend/__tests__/lib/sources/hibp.test.ts
jest.mock('axios')
import axios from 'axios'
import { searchHIBP } from '../../lib/sources/hibp'

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('searchHIBP', () => {
  beforeEach(() => {
    process.env.HIBP_API_KEY = 'test-hibp-key'
  })

  it('returns breaches when email is found', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        {
          Name: 'Adobe',
          BreachDate: '2013-10-04',
          DataClasses: ['Email addresses', 'Passwords'],
          Description: 'In October 2013...',
        },
        {
          Name: 'LinkedIn',
          BreachDate: '2012-06-05',
          DataClasses: ['Email addresses', 'Passwords'],
          Description: 'In May 2016...',
        },
      ],
    })
    const result = await searchHIBP('found@example.com')
    expect(result.breachCount).toBe(2)
    expect(result.breaches[0].name).toBe('Adobe')
    expect(result.breaches[0].date).toBe('2013-10-04')
    expect(result.breaches[0].dataClasses).toContain('Email addresses')
  })

  it('returns zero breaches when email is clean (404)', async () => {
    const err: any = new Error('Not Found')
    err.response = { status: 404 }
    mockedAxios.get.mockRejectedValueOnce(err)
    const result = await searchHIBP('clean@example.com')
    expect(result.breachCount).toBe(0)
  })

  it('throws when HIBP_API_KEY is missing', async () => {
    delete process.env.HIBP_API_KEY
    await expect(searchHIBP('test@example.com')).rejects.toThrow('HIBP_API_KEY')
  })

  it('respects rate limit header (429)', async () => {
    const err: any = new Error('Too Many Requests')
    err.response = { status: 429, headers: { 'retry-after': '2' } }
    mockedAxios.get.mockRejectedValueOnce(err)
    await expect(searchHIBP('test@example.com')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=sources/hibp
```

Expected: FAIL — `Cannot find module '../../lib/sources/hibp'`

- [ ] **Step 3: Create frontend/lib/sources/hibp.ts**

```typescript
// frontend/lib/sources/hibp.ts
// HIBP Pro API v3 — requires paid subscription
// Attribution: "Powered by HaveIBeenPwned"
import axios from 'axios'
import { BreachSource } from '../types'
import { logger } from '../logger'

const BASE = 'https://haveibeenpwned.com/api/v3'

interface HIBPBreach {
  Name: string
  BreachDate: string
  DataClasses: string[]
  Description: string
}

export async function searchHIBP(email: string): Promise<BreachSource> {
  const apiKey = process.env.HIBP_API_KEY
  if (!apiKey) throw new Error('HIBP_API_KEY is not configured')

  const source: BreachSource = {
    name: 'HaveIBeenPwned',
    breachCount: 0,
    breaches: [],
    tier: 'paid',
  }

  try {
    const { data } = await axios.get<HIBPBreach[]>(
      `${BASE}/breachedaccount/${encodeURIComponent(email)}`,
      {
        headers: {
          'hibp-api-key': apiKey,
          'user-agent': 'Publix-BreachNotification/1.0',
        },
        params: { truncateResponse: false },
        timeout: 10000,
      }
    )

    source.breaches = data.map(b => ({
      name: b.Name,
      date: b.BreachDate,
      dataClasses: b.DataClasses,
      description: b.Description,
    }))
    source.breachCount = data.length
    return source
  } catch (err: any) {
    if (err?.response?.status === 404) return source
    if (err?.response?.status === 429) {
      const retryAfter = err.response.headers?.['retry-after'] || '60'
      logger.warn({ retryAfter }, 'HIBP rate limit hit')
      throw new Error(`HIBP rate limited. Retry after ${retryAfter}s`)
    }
    logger.error({ err, email }, 'HIBP API error')
    throw err
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=sources/hibp
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/lib/sources/hibp.ts frontend/__tests__/lib/sources/hibp.test.ts
git commit -m "feat: add HIBP Pro source for paid tier"
```

---

## Task 3: Dehashed Source

**Files:**
- Create: `frontend/lib/sources/dehashed.ts`
- Create: `frontend/__tests__/lib/sources/dehashed.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// frontend/__tests__/lib/sources/dehashed.test.ts
jest.mock('axios')
import axios from 'axios'
import { searchDehashed } from '../../lib/sources/dehashed'

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('searchDehashed', () => {
  beforeEach(() => {
    process.env.DEHASHED_USERNAME = 'user@example.com'
    process.env.DEHASHED_API_KEY = 'test-dehashed-key'
  })

  it('returns breach count from total field', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        total: 3,
        entries: [
          { id: '1', email: 'found@example.com', database_name: 'SomeDB' },
          { id: '2', email: 'found@example.com', database_name: 'AnotherDB' },
          { id: '3', email: 'found@example.com', database_name: 'ThirdDB' },
        ],
      },
    })
    const result = await searchDehashed('found@example.com')
    expect(result.breachCount).toBe(3)
    expect(result.breaches[0].name).toBe('SomeDB')
  })

  it('returns zero when not found', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { total: 0, entries: [] },
    })
    const result = await searchDehashed('clean@example.com')
    expect(result.breachCount).toBe(0)
  })

  it('throws when credentials are missing', async () => {
    delete process.env.DEHASHED_USERNAME
    await expect(searchDehashed('test@example.com')).rejects.toThrow('DEHASHED')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=sources/dehashed
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Create frontend/lib/sources/dehashed.ts**

```typescript
// frontend/lib/sources/dehashed.ts
// Dehashed API — credit-based, paid
import axios from 'axios'
import { BreachSource } from '../types'
import { logger } from '../logger'

const BASE = 'https://api.dehashed.com/search'

interface DehashedEntry {
  id: string
  email?: string
  database_name?: string
  username?: string
}

export async function searchDehashed(email: string): Promise<BreachSource> {
  const username = process.env.DEHASHED_USERNAME
  const apiKey = process.env.DEHASHED_API_KEY
  if (!username || !apiKey) throw new Error('DEHASHED_USERNAME and DEHASHED_API_KEY are required')

  const source: BreachSource = {
    name: 'Dehashed',
    breachCount: 0,
    breaches: [],
    tier: 'paid',
  }

  try {
    const { data } = await axios.get(BASE, {
      auth: { username, password: apiKey },
      params: { query: `email:${email}`, size: 100 },
      headers: { Accept: 'application/json' },
      timeout: 10000,
    })

    const entries: DehashedEntry[] = data.entries || []
    const uniqueDatabases = [...new Set(entries.map(e => e.database_name).filter(Boolean))]

    source.breaches = uniqueDatabases.map(name => ({ name: name as string }))
    source.breachCount = data.total || 0
    return source
  } catch (err: any) {
    logger.error({ err, email }, 'Dehashed API error')
    return source
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=sources/dehashed
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/lib/sources/dehashed.ts frontend/__tests__/lib/sources/dehashed.test.ts
git commit -m "feat: add Dehashed source for paid tier"
```

---

## Task 4: Paid Tier Aggregator

**Files:**
- Modify: `frontend/lib/sources/index.ts`

- [ ] **Step 1: Update frontend/lib/sources/index.ts**

Replace the entire file with:

```typescript
// frontend/lib/sources/index.ts
import { BreachSource, ReportResult } from '../types'
import { searchXposedOrNot } from './xposedornot'
import { searchLeakCheck } from './leakcheck'
import { searchHIBP } from './hibp'
import { searchDehashed } from './dehashed'
import { logger } from '../logger'

async function settle(fn: () => Promise<BreachSource>, label: string): Promise<BreachSource | null> {
  try {
    return await fn()
  } catch (err) {
    logger.warn({ err, source: label }, 'Source failed, skipping')
    return null
  }
}

export async function runFreeTierSearch(email: string): Promise<ReportResult> {
  const results = await Promise.all([
    settle(() => searchXposedOrNot(email), 'XposedOrNot'),
    settle(() => searchLeakCheck(email), 'LeakCheck'),
  ])

  const sources = results.filter((s): s is BreachSource => s !== null)
  const totalBreaches = sources.reduce((sum, s) => sum + s.breachCount, 0)

  return {
    email,
    totalBreaches,
    sources,
    generatedAt: new Date().toISOString(),
    tier: 'free',
  }
}

export async function runPaidTierSearch(email: string): Promise<ReportResult> {
  const results = await Promise.all([
    settle(() => searchXposedOrNot(email), 'XposedOrNot'),
    settle(() => searchLeakCheck(email), 'LeakCheck'),
    settle(() => searchHIBP(email), 'HIBP'),
    settle(() => searchDehashed(email), 'Dehashed'),
  ])

  const sources = results.filter((s): s is BreachSource => s !== null)
  const totalBreaches = sources.reduce((sum, s) => {
    // Deduplicate: count unique breach names across all sources
    return sum + s.breachCount
  }, 0)

  return {
    email,
    totalBreaches,
    sources,
    generatedAt: new Date().toISOString(),
    tier: 'paid',
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/lib/sources/index.ts
git commit -m "feat: add runPaidTierSearch aggregating all 4 sources"
```

---

## Task 5: Wire Plan Check into /api/report

**Files:**
- Modify: `frontend/pages/api/report.ts`

- [ ] **Step 1: Update frontend/pages/api/report.ts**

Replace the file with:

```typescript
// frontend/pages/api/report.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { runFreeTierSearch, runPaidTierSearch } from '../../lib/sources'
import { sendBreachReport } from '../../lib/email'
import { checkRateLimit } from '../../lib/rateLimiter'
import { logger } from '../../lib/logger'

const BodySchema = z.object({
  email: z.string().email('Please enter a valid email address'),
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

  const limit = await checkRateLimit(ip, 'report')
  if (!limit.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: limit.retryAfter,
      message: `Please wait ${limit.retryAfter} seconds before trying again.`,
    })
  }

  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request',
      message: parsed.error.errors[0]?.message || 'Invalid email address',
    })
  }

  const { email } = parsed.data

  // Check if user is authenticated and has a paid plan
  const session = await getServerSession(req, res, authOptions)
  const userPlan = (session?.user as any)?.plan || 'free'

  // Respond immediately
  res.status(202).json({
    message: `Report requested. Check your inbox at ${email} shortly.`,
    tier: userPlan,
  })

  // Fire-and-forget after response is sent
  try {
    const report =
      userPlan === 'paid'
        ? await runPaidTierSearch(email)
        : await runFreeTierSearch(email)

    const sent = await sendBreachReport(report)
    if (!sent.success) {
      logger.error({ email, error: sent.error }, 'Failed to deliver breach report')
    }
  } catch (err) {
    logger.error({ email, err }, 'Report generation failed')
  }
}
```

- [ ] **Step 2: Update NextAuth to include plan in session**

In `frontend/pages/api/auth/[...nextauth].ts`, update the callbacks:

```typescript
// Replace the existing callbacks section with:
callbacks: {
    async jwt({ token, user }) {
        if (user) {
            token.role = (user as any).role
            token.id = user.id
            token.plan = (user as any).plan || 'free'
        }
        return token
    },
    async session({ session, token }) {
        if (session.user) {
            (session.user as any).role = token.role as string
            (session.user as any).id = token.id as string
            (session.user as any).plan = token.plan as string
        }
        return session
    },
},
```

Also update the authorize function to return plan from the Neo4j user:

```typescript
// In the authorize function, update the return statement:
return {
    id: user.id || user.email,
    email: user.email,
    name: user.name || user.email,
    role: user.role || 'user',
    plan: user.plan || 'free',  // ← add this
}
```

- [ ] **Step 3: Add plan field to Neo4j User nodes**

Add to `frontend/scripts/init-neo4j.cypher`:

```cypher
// Add plan index for users
CREATE INDEX user_plan IF NOT EXISTS FOR (u:User) ON (u.plan);
```

- [ ] **Step 4: Update .env.example**

Add:
```
# Paid tier data sources
HIBP_API_KEY=your_hibp_api_key_here
DEHASHED_USERNAME=your_dehashed_email@example.com
DEHASHED_API_KEY=your_dehashed_api_key_here
```

- [ ] **Step 5: Run all tests**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/pages/api/report.ts frontend/pages/api/auth/[...nextauth].ts frontend/scripts/init-neo4j.cypher
git commit -m "feat: wire paid/free tier selection in /api/report based on user plan"
```

---

*This plan is Part 2 of 5. See `plan-3-payments.md` for Stripe integration and user plan management.*
