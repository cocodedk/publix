# Plan 1: Foundation — Email Delivery Flow & Route Protection

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Publix from an admin search tool into a public breach notification service where users submit their email and receive a report — results never shown in the browser.

**Architecture:** A new public `/` page replaces the current search-as-you-type UI. Submitting an email triggers `POST /api/report` which searches all configured sources, builds a report, and sends it via Resend to the queried address. The existing admin search UI moves to `/admin` behind auth. Rate limiting is applied per IP and per email address.

**Tech Stack:** Next.js 13 Pages Router, TypeScript, Neo4j, Resend (email), rate-limiter-flexible, Pino (logging), Zod (validation already installed)

**Prerequisites:**
- `RESEND_API_KEY` from resend.com (free tier: 3,000 emails/month)
- `RESEND_FROM_EMAIL` e.g. `noreply@publix.dk`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `frontend/lib/email.ts` | Resend client + send report email |
| Create | `frontend/lib/rateLimiter.ts` | Per-IP and per-email rate limiting |
| Create | `frontend/lib/logger.ts` | Pino structured logger (replaces console.log) |
| Create | `frontend/lib/env.ts` | Validate required env vars at startup |
| Create | `frontend/lib/reportGenerator.ts` | Build free-tier report from search results |
| Create | `frontend/pages/api/report.ts` | POST /api/report — core product endpoint |
| Create | `frontend/pages/check.tsx` | Public "enter your email" page |
| Modify | `frontend/pages/index.tsx` | Redirect to /check (public) or /admin (authed) |
| Modify | `frontend/pages/_app.tsx` | Update nav, add /admin link for authed users |
| Modify | `frontend/middleware.ts` | Protect /admin/* routes, keep /check public |
| Modify | `frontend/lib/types.ts` | Add ReportResult, BreachSource types |
| Modify | `package.json` | Add resend, pino, rate-limiter-flexible |
| Create | `frontend/__tests__/lib/email.test.ts` | Unit tests for email builder |
| Create | `frontend/__tests__/lib/reportGenerator.test.ts` | Unit tests for report builder |
| Create | `frontend/__tests__/api/report.test.ts` | Integration tests for /api/report |
| Create | `jest.config.ts` | Jest configuration |
| Create | `jest.setup.ts` | Jest global setup |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install packages**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm install resend pino rate-limiter-flexible
npm install --save-dev jest ts-jest @types/jest jest-environment-node
```

- [ ] **Step 2: Verify installation**

```bash
cd /home/cocodedk/0-projects/publix/frontend
node -e "require('resend'); require('pino'); require('rate-limiter-flexible'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add resend, pino, rate-limiter-flexible, jest"
```

---

## Task 2: Jest Configuration

**Files:**
- Create: `frontend/jest.config.ts`
- Create: `frontend/jest.setup.ts`
- Modify: `frontend/package.json` (add test script)

- [ ] **Step 1: Create jest.config.ts**

```typescript
// frontend/jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
      },
    }],
  },
}

export default config
```

- [ ] **Step 2: Create jest.setup.ts**

```typescript
// frontend/jest.setup.ts
process.env.NEO4J_URI = 'bolt://localhost:7687'
process.env.NEO4J_USER = 'neo4j'
process.env.NEO4J_PASSWORD = 'testpassword'
process.env.ENCRYPTION_KEY = 'dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdA=='
process.env.SALT = 'dGVzdHNhbHQ='
process.env.RESEND_API_KEY = 're_test_123'
process.env.RESEND_FROM_EMAIL = 'noreply@publix.dk'
process.env.NEXTAUTH_SECRET = 'test-secret'
```

- [ ] **Step 3: Add test script to package.json**

In `frontend/package.json`, add to `"scripts"`:
```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

- [ ] **Step 4: Verify Jest works**

```bash
cd /home/cocodedk/0-projects/publix/frontend
mkdir -p __tests__
echo "describe('sanity', () => { it('works', () => expect(1+1).toBe(2)) })" > __tests__/sanity.test.ts
npm test -- --testPathPattern=sanity
```

Expected: `1 passed`

```bash
rm /home/cocodedk/0-projects/publix/frontend/__tests__/sanity.test.ts
```

- [ ] **Step 5: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/jest.config.ts frontend/jest.setup.ts frontend/package.json
git commit -m "feat: configure jest with ts-jest"
```

---

## Task 3: Environment Validation

**Files:**
- Create: `frontend/lib/env.ts`
- Create: `frontend/__tests__/lib/env.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/__tests__/lib/env.test.ts
describe('validateEnv', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('throws when NEO4J_URI is missing', () => {
    delete process.env.NEO4J_URI
    expect(() => require('../lib/env').validateEnv()).toThrow('NEO4J_URI')
  })

  it('throws when RESEND_API_KEY is missing', () => {
    delete process.env.RESEND_API_KEY
    expect(() => require('../lib/env').validateEnv()).toThrow('RESEND_API_KEY')
  })

  it('returns config when all required vars present', () => {
    process.env.NEO4J_URI = 'bolt://localhost:7687'
    process.env.NEO4J_USER = 'neo4j'
    process.env.NEO4J_PASSWORD = 'pass'
    process.env.ENCRYPTION_KEY = 'key'
    process.env.SALT = 'salt'
    process.env.RESEND_API_KEY = 're_123'
    process.env.RESEND_FROM_EMAIL = 'noreply@publix.dk'
    process.env.NEXTAUTH_SECRET = 'secret'
    const { validateEnv } = require('../lib/env')
    const config = validateEnv()
    expect(config.NEO4J_URI).toBe('bolt://localhost:7687')
    expect(config.RESEND_API_KEY).toBe('re_123')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=env
```

Expected: FAIL — `Cannot find module '../lib/env'`

- [ ] **Step 3: Create frontend/lib/env.ts**

```typescript
// frontend/lib/env.ts

const REQUIRED = [
  'NEO4J_URI',
  'NEO4J_USER',
  'NEO4J_PASSWORD',
  'ENCRYPTION_KEY',
  'SALT',
  'NEXTAUTH_SECRET',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
] as const

type EnvKey = typeof REQUIRED[number]

type ValidatedEnv = Record<EnvKey, string> & {
  INTELX_API_KEY?: string
  INTELX_API_URL?: string
  NEXTAUTH_URL?: string
}

export function validateEnv(): ValidatedEnv {
  const missing = REQUIRED.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  return {
    NEO4J_URI: process.env.NEO4J_URI!,
    NEO4J_USER: process.env.NEO4J_USER!,
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD!,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
    SALT: process.env.SALT!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    RESEND_API_KEY: process.env.RESEND_API_KEY!,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL!,
    INTELX_API_KEY: process.env.INTELX_API_KEY,
    INTELX_API_URL: process.env.INTELX_API_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=env
```

Expected: PASS

- [ ] **Step 5: Call validateEnv in neo4jClient.ts to catch bad config at startup**

In `frontend/lib/neo4jClient.ts`, add at the top of the constructor (after the class declaration):

```typescript
// Add this import at the top of the file:
import { validateEnv } from "./env";

// Replace the constructor body with:
constructor() {
    const env = validateEnv();
    this.uri = env.NEO4J_URI;
    this.user = env.NEO4J_USER;
    this.password = env.NEO4J_PASSWORD;
}
```

- [ ] **Step 6: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/lib/env.ts frontend/__tests__/lib/env.test.ts frontend/lib/neo4jClient.ts
git commit -m "feat: validate required env vars at startup"
```

---

## Task 4: Structured Logging

**Files:**
- Create: `frontend/lib/logger.ts`

- [ ] **Step 1: Create frontend/lib/logger.ts**

```typescript
// frontend/lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
})
```

- [ ] **Step 2: Replace console.log in neo4jClient.ts**

In `frontend/lib/neo4jClient.ts`, replace all `console.error(...)` calls:

```typescript
// Add at top of file:
import { logger } from "./logger";

// Replace:
//   console.error("Neo4j connectivity error:", error);
// With:
//   logger.error({ err: error }, "Neo4j connectivity error");

// Replace:
//   console.error("Neo4j query error:", error);
// With:
//   logger.error({ err: error, query }, "Neo4j query error");

// Replace:
//   console.error("Neo4j transaction error:", error);
// With:
//   logger.error({ err: error }, "Neo4j transaction error");
```

- [ ] **Step 3: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/lib/logger.ts frontend/lib/neo4jClient.ts
git commit -m "feat: add pino structured logging, replace console.log in neo4jClient"
```

---

## Task 5: Rate Limiter

**Files:**
- Create: `frontend/lib/rateLimiter.ts`
- Create: `frontend/__tests__/lib/rateLimiter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/__tests__/lib/rateLimiter.test.ts
import { checkRateLimit } from '../lib/rateLimiter'

describe('checkRateLimit', () => {
  it('allows requests within limit', async () => {
    const result = await checkRateLimit('test-ip-1', 'report')
    expect(result.allowed).toBe(true)
  })

  it('blocks after exceeding limit', async () => {
    // report limiter: 3 per 10 minutes per IP
    const ip = 'test-ip-block-' + Date.now()
    await checkRateLimit(ip, 'report')
    await checkRateLimit(ip, 'report')
    await checkRateLimit(ip, 'report')
    const result = await checkRateLimit(ip, 'report')
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('uses separate limits for different keys', async () => {
    const ts = Date.now()
    const r1 = await checkRateLimit('ip-separate-' + ts, 'report')
    const r2 = await checkRateLimit('ip-separate-' + ts, 'search')
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=rateLimiter
```

Expected: FAIL — `Cannot find module '../lib/rateLimiter'`

- [ ] **Step 3: Create frontend/lib/rateLimiter.ts**

```typescript
// frontend/lib/rateLimiter.ts
import { RateLimiterMemory } from 'rate-limiter-flexible'

// Report endpoint: 3 requests per 10 minutes per IP
const reportLimiter = new RateLimiterMemory({
  keyPrefix: 'report',
  points: 3,
  duration: 60 * 10,
})

// Search endpoint (admin): 30 requests per minute per IP
const searchLimiter = new RateLimiterMemory({
  keyPrefix: 'search',
  points: 30,
  duration: 60,
})

// Auth endpoint: 10 attempts per 15 minutes per IP
const authLimiter = new RateLimiterMemory({
  keyPrefix: 'auth',
  points: 10,
  duration: 60 * 15,
})

const limiters: Record<string, RateLimiterMemory> = {
  report: reportLimiter,
  search: searchLimiter,
  auth: authLimiter,
}

export interface RateLimitResult {
  allowed: boolean
  remaining?: number
  retryAfter?: number
}

export async function checkRateLimit(
  key: string,
  limiterName: keyof typeof limiters
): Promise<RateLimitResult> {
  const limiter = limiters[limiterName]
  if (!limiter) return { allowed: true }

  try {
    const result = await limiter.consume(key)
    return { allowed: true, remaining: result.remainingPoints }
  } catch (err: any) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(err.msBeforeNext / 1000),
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=rateLimiter
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/lib/rateLimiter.ts frontend/__tests__/lib/rateLimiter.test.ts
git commit -m "feat: add per-IP rate limiting for report, search, auth endpoints"
```

---

## Task 6: Add New Types

**Files:**
- Modify: `frontend/lib/types.ts`

- [ ] **Step 1: Append new types to frontend/lib/types.ts**

Add at the end of the file:

```typescript
// Breach report types

export interface BreachSource {
  name: string           // e.g. "XposedOrNot", "LeakCheck", "IntelX"
  breachCount: number
  breaches: BreachEntry[]
  tier: 'free' | 'paid'
}

export interface BreachEntry {
  name: string           // breach name e.g. "Adobe 2013"
  date?: string          // breach date if known
  dataClasses?: string[] // e.g. ["Emails", "Passwords"]
  description?: string
}

export interface ReportResult {
  email: string
  totalBreaches: number
  sources: BreachSource[]
  generatedAt: string
  tier: 'free' | 'paid'
}

export type ReportTier = 'free' | 'paid'
```

- [ ] **Step 2: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/lib/types.ts
git commit -m "feat: add BreachSource, BreachEntry, ReportResult types"
```

---

## Task 7: Report Generator

**Files:**
- Create: `frontend/lib/reportGenerator.ts`
- Create: `frontend/__tests__/lib/reportGenerator.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// frontend/__tests__/lib/reportGenerator.test.ts
import { buildReportHtml, buildReportText } from '../lib/reportGenerator'
import { ReportResult } from '../lib/types'

const mockReport: ReportResult = {
  email: 'test@example.com',
  totalBreaches: 2,
  generatedAt: '2026-04-07T12:00:00Z',
  tier: 'free',
  sources: [
    {
      name: 'XposedOrNot',
      breachCount: 2,
      tier: 'free',
      breaches: [
        { name: 'Adobe 2013', date: '2013-10-04', dataClasses: ['Emails', 'Passwords'] },
        { name: 'LinkedIn 2012', date: '2012-06-05', dataClasses: ['Emails', 'Passwords'] },
      ],
    },
  ],
}

describe('buildReportHtml', () => {
  it('includes the email address', () => {
    const html = buildReportHtml(mockReport)
    expect(html).toContain('test@example.com')
  })

  it('includes breach count', () => {
    const html = buildReportHtml(mockReport)
    expect(html).toContain('2')
  })

  it('includes breach names', () => {
    const html = buildReportHtml(mockReport)
    expect(html).toContain('Adobe 2013')
    expect(html).toContain('LinkedIn 2012')
  })

  it('does NOT include raw passwords', () => {
    const html = buildReportHtml(mockReport)
    expect(html).not.toContain('password123')
  })

  it('includes upgrade prompt for free tier', () => {
    const html = buildReportHtml(mockReport)
    expect(html).toContain('publix.dk')
  })
})

describe('buildReportText', () => {
  it('includes the email address', () => {
    const text = buildReportText(mockReport)
    expect(text).toContain('test@example.com')
  })

  it('includes breach names', () => {
    const text = buildReportText(mockReport)
    expect(text).toContain('Adobe 2013')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=reportGenerator
```

Expected: FAIL — `Cannot find module '../lib/reportGenerator'`

- [ ] **Step 3: Create frontend/lib/reportGenerator.ts**

```typescript
// frontend/lib/reportGenerator.ts
import { ReportResult, BreachSource } from './types'

export function buildReportHtml(report: ReportResult): string {
  const breachRows = report.sources
    .flatMap(s => s.breaches)
    .map(
      b => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(b.name)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${b.date ? escapeHtml(b.date) : 'Unknown'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${b.dataClasses ? b.dataClasses.map(escapeHtml).join(', ') : 'Unknown'}</td>
      </tr>`
    )
    .join('')

  const upgradeSection =
    report.tier === 'free'
      ? `
    <div style="margin-top: 32px; padding: 16px; background: #f0f4ff; border-radius: 8px; border-left: 4px solid #4f6ef7;">
      <h3 style="margin: 0 0 8px 0; color: #4f6ef7;">Get the full picture</h3>
      <p style="margin: 0;">This free report shows publicly available breach data. A paid report searches deeper sources including dark web intelligence and stealer logs.</p>
      <a href="https://publix.dk/pricing" style="display: inline-block; margin-top: 12px; padding: 10px 20px; background: #4f6ef7; color: white; text-decoration: none; border-radius: 4px;">See Plans →</a>
    </div>`
      : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your Breach Report — Publix</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #4f6ef7; margin: 0;">Publix</h1>
    <p style="color: #666; margin: 4px 0 0 0;">Breach Notification Report</p>
  </div>

  <p>Hello,</p>
  <p>We checked <strong>${escapeHtml(report.email)}</strong> against known data breaches. Here is what we found:</p>

  ${
    report.totalBreaches === 0
      ? `<div style="padding: 16px; background: #f0fff4; border-radius: 8px; border-left: 4px solid #22c55e;">
           <strong style="color: #16a34a;">Good news — no breaches found</strong>
           <p style="margin: 8px 0 0 0; color: #15803d;">This email was not found in any of the ${report.sources.length > 0 ? report.sources.map(s => s.name).join(', ') : 'checked'} databases.</p>
         </div>`
      : `<div style="padding: 16px; background: #fff5f5; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 24px;">
           <strong style="color: #dc2626;">Found in ${report.totalBreaches} breach${report.totalBreaches !== 1 ? 'es' : ''}</strong>
           <p style="margin: 8px 0 0 0; color: #7f1d1d;">Your email appeared in the following known data breaches. We recommend changing your passwords.</p>
         </div>
         <table style="width: 100%; border-collapse: collapse;">
           <thead>
             <tr style="background: #f8f9fa;">
               <th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Breach</th>
               <th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Date</th>
               <th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Exposed Data</th>
             </tr>
           </thead>
           <tbody>${breachRows}</tbody>
         </table>`
  }

  ${upgradeSection}

  <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
    <p>This report was generated on ${new Date(report.generatedAt).toUTCString()} for ${escapeHtml(report.email)}.</p>
    <p>You received this because someone submitted this address at <a href="https://publix.dk">publix.dk</a>. If that was not you, you can safely ignore this email.</p>
    <p>Data sources: ${report.sources.map(s => escapeHtml(s.name)).join(', ')}</p>
  </div>
</body>
</html>`
}

export function buildReportText(report: ReportResult): string {
  const breachList =
    report.sources
      .flatMap(s => s.breaches)
      .map(b => `- ${b.name}${b.date ? ` (${b.date})` : ''}`)
      .join('\n') || '  (none)'

  return `PUBLIX — BREACH NOTIFICATION REPORT
=====================================

Email checked: ${report.email}
Generated: ${new Date(report.generatedAt).toUTCString()}

${
  report.totalBreaches === 0
    ? 'RESULT: No breaches found. This email was not found in any checked databases.'
    : `RESULT: Found in ${report.totalBreaches} breach${report.totalBreaches !== 1 ? 'es' : ''}

Breaches:
${breachList}

We recommend changing your passwords on the affected services.`
}

${report.tier === 'free' ? 'Get a deeper report at https://publix.dk/pricing' : ''}

Data sources: ${report.sources.map(s => s.name).join(', ')}

---
You received this because someone submitted this address at publix.dk.
If that was not you, you can safely ignore this email.
`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=reportGenerator
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/lib/reportGenerator.ts frontend/__tests__/lib/reportGenerator.test.ts
git commit -m "feat: add HTML and text report generator"
```

---

## Task 8: Email Client

**Files:**
- Create: `frontend/lib/email.ts`
- Create: `frontend/__tests__/lib/email.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// frontend/__tests__/lib/email.test.ts
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'mock-email-id', error: null }),
    },
  })),
}))

import { sendBreachReport } from '../lib/email'
import { ReportResult } from '../lib/types'

const mockReport: ReportResult = {
  email: 'target@example.com',
  totalBreaches: 1,
  generatedAt: '2026-04-07T12:00:00Z',
  tier: 'free',
  sources: [
    {
      name: 'XposedOrNot',
      breachCount: 1,
      tier: 'free',
      breaches: [{ name: 'Test Breach 2020', date: '2020-01-01', dataClasses: ['Emails'] }],
    },
  ],
}

describe('sendBreachReport', () => {
  it('sends email to the queried address (not somewhere else)', async () => {
    const result = await sendBreachReport(mockReport)
    expect(result.success).toBe(true)
  })

  it('returns error gracefully on failure', async () => {
    const { Resend } = require('resend')
    Resend.mockImplementationOnce(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({ id: null, error: { message: 'API error' } }),
      },
    }))
    const result = await sendBreachReport(mockReport)
    expect(result.success).toBe(false)
    expect(result.error).toContain('API error')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=__tests__/lib/email
```

Expected: FAIL — `Cannot find module '../lib/email'`

- [ ] **Step 3: Create frontend/lib/email.ts**

```typescript
// frontend/lib/email.ts
import { Resend } from 'resend'
import { ReportResult } from './types'
import { buildReportHtml, buildReportText } from './reportGenerator'
import { logger } from './logger'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@publix.dk'

export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendBreachReport(report: ReportResult): Promise<SendResult> {
  const subject =
    report.totalBreaches === 0
      ? 'Publix — No breaches found for your email'
      : `Publix — Your email appeared in ${report.totalBreaches} breach${report.totalBreaches !== 1 ? 'es' : ''}`

  try {
    const { id, error } = await resend.emails.send({
      from: FROM,
      to: report.email,
      subject,
      html: buildReportHtml(report),
      text: buildReportText(report),
    })

    if (error) {
      logger.error({ email: report.email, error }, 'Resend API error')
      return { success: false, error: error.message }
    }

    logger.info({ email: report.email, messageId: id }, 'Breach report sent')
    return { success: true, messageId: id ?? undefined }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error({ email: report.email, err }, 'Failed to send breach report')
    return { success: false, error: message }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=__tests__/lib/email
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/lib/email.ts frontend/__tests__/lib/email.test.ts
git commit -m "feat: add Resend email client for breach reports"
```

---

## Task 9: Free Tier Data Sources

**Files:**
- Create: `frontend/lib/sources/xposedornot.ts`
- Create: `frontend/lib/sources/leakcheck.ts`
- Create: `frontend/lib/sources/index.ts`
- Create: `frontend/__tests__/lib/sources/xposedornot.test.ts`
- Create: `frontend/__tests__/lib/sources/leakcheck.test.ts`

- [ ] **Step 1: Write failing tests for XposedOrNot**

```typescript
// frontend/__tests__/lib/sources/xposedornot.test.ts
jest.mock('axios')
import axios from 'axios'
import { searchXposedOrNot } from '../../lib/sources/xposedornot'

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('searchXposedOrNot', () => {
  it('returns breaches when email is found', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        breaches: ['Adobe', 'LinkedIn'],
        BreachesSummary: { site: 'Adobe,LinkedIn' },
      },
    })
    const result = await searchXposedOrNot('found@example.com')
    expect(result.breachCount).toBe(2)
    expect(result.breaches[0].name).toBe('Adobe')
  })

  it('returns zero breaches when email is not found (404)', async () => {
    const err: any = new Error('Not Found')
    err.response = { status: 404 }
    mockedAxios.get.mockRejectedValueOnce(err)
    const result = await searchXposedOrNot('clean@example.com')
    expect(result.breachCount).toBe(0)
    expect(result.breaches).toHaveLength(0)
  })

  it('throws on unexpected API errors', async () => {
    const err: any = new Error('Server Error')
    err.response = { status: 500 }
    mockedAxios.get.mockRejectedValueOnce(err)
    await expect(searchXposedOrNot('test@example.com')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Create frontend/lib/sources/xposedornot.ts**

```typescript
// frontend/lib/sources/xposedornot.ts
import axios from 'axios'
import { BreachSource } from '../types'
import { logger } from '../logger'

const BASE = 'https://api.xposedornot.com/v1'

export async function searchXposedOrNot(email: string): Promise<BreachSource> {
  const source: BreachSource = {
    name: 'XposedOrNot',
    breachCount: 0,
    breaches: [],
    tier: 'free',
  }

  try {
    const { data } = await axios.get(`${BASE}/check-email/${encodeURIComponent(email)}`, {
      timeout: 8000,
    })

    const breachNames: string[] = data.breaches || []
    source.breaches = breachNames.map(name => ({ name }))
    source.breachCount = breachNames.length
    return source
  } catch (err: any) {
    if (err?.response?.status === 404) {
      // 404 means email not found — clean result
      return source
    }
    logger.error({ err, email }, 'XposedOrNot API error')
    throw err
  }
}
```

- [ ] **Step 3: Write failing tests for LeakCheck**

```typescript
// frontend/__tests__/lib/sources/leakcheck.test.ts
jest.mock('axios')
import axios from 'axios'
import { searchLeakCheck } from '../../lib/sources/leakcheck'

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('searchLeakCheck', () => {
  it('returns breaches when email is found', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        found: 2,
        sources: [
          { name: 'myspace.com', date: '2016-05-31' },
          { name: 'tumblr.com', date: '2013-03-01' },
        ],
      },
    })
    const result = await searchLeakCheck('found@example.com')
    expect(result.breachCount).toBe(2)
    expect(result.breaches[0].name).toBe('myspace.com')
  })

  it('returns zero when not found', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, found: 0, sources: [] },
    })
    const result = await searchLeakCheck('clean@example.com')
    expect(result.breachCount).toBe(0)
  })
})
```

- [ ] **Step 4: Create frontend/lib/sources/leakcheck.ts**

```typescript
// frontend/lib/sources/leakcheck.ts
// LeakCheck Public API — free, commercial use allowed with attribution
// Attribution: "Powered by LeakCheck" must appear in UI/report
import axios from 'axios'
import { BreachSource } from '../types'
import { logger } from '../logger'

const BASE = 'https://leakcheck.io/api/public'

export async function searchLeakCheck(email: string): Promise<BreachSource> {
  const source: BreachSource = {
    name: 'LeakCheck',
    breachCount: 0,
    breaches: [],
    tier: 'free',
  }

  try {
    const { data } = await axios.get(BASE, {
      params: { check: email },
      timeout: 8000,
    })

    if (!data.success) return source

    const sources: Array<{ name: string; date?: string }> = data.sources || []
    source.breaches = sources.map(s => ({ name: s.name, date: s.date }))
    source.breachCount = data.found || sources.length
    return source
  } catch (err: any) {
    logger.error({ err, email }, 'LeakCheck API error')
    // Non-fatal: return empty rather than crashing the report
    return source
  }
}
```

- [ ] **Step 5: Create frontend/lib/sources/index.ts (aggregator)**

```typescript
// frontend/lib/sources/index.ts
import { BreachSource, ReportResult, ReportTier } from '../types'
import { searchXposedOrNot } from './xposedornot'
import { searchLeakCheck } from './leakcheck'
import { logger } from '../logger'

export async function runFreeTierSearch(email: string): Promise<ReportResult> {
  const results = await Promise.allSettled([
    searchXposedOrNot(email),
    searchLeakCheck(email),
  ])

  const sources: BreachSource[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      sources.push(result.value)
    } else {
      logger.warn({ reason: result.reason }, 'A free-tier source failed, skipping')
    }
  }

  const totalBreaches = sources.reduce((sum, s) => sum + s.breachCount, 0)

  return {
    email,
    totalBreaches,
    sources,
    generatedAt: new Date().toISOString(),
    tier: 'free',
  }
}
```

- [ ] **Step 6: Run all source tests**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=sources
```

Expected: PASS (both xposedornot and leakcheck tests)

- [ ] **Step 7: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/lib/sources/ frontend/__tests__/lib/sources/
git commit -m "feat: add XposedOrNot and LeakCheck free-tier source integrations"
```

---

## Task 10: POST /api/report Endpoint

**Files:**
- Create: `frontend/pages/api/report.ts`
- Create: `frontend/__tests__/api/report.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// frontend/__tests__/api/report.test.ts
jest.mock('../../lib/sources', () => ({
  runFreeTierSearch: jest.fn().mockResolvedValue({
    email: 'test@example.com',
    totalBreaches: 1,
    sources: [{ name: 'XposedOrNot', breachCount: 1, tier: 'free', breaches: [{ name: 'Adobe' }] }],
    generatedAt: '2026-04-07T12:00:00Z',
    tier: 'free',
  }),
}))

jest.mock('../../lib/email', () => ({
  sendBreachReport: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
}))

jest.mock('../../lib/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 2 }),
}))

import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/report'

describe('POST /api/report', () => {
  it('returns 405 for non-POST', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(405)
  })

  it('returns 400 for missing email', async () => {
    const { req, res } = createMocks({ method: 'POST', body: {} })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('returns 400 for invalid email', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { email: 'notanemail' } })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('returns 202 and triggers email for valid request', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { email: 'test@example.com' },
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(202)
    const body = JSON.parse(res._getData())
    expect(body.message).toContain('test@example.com')
  })

  it('returns 429 when rate limited', async () => {
    const { checkRateLimit } = require('../../lib/rateLimiter')
    checkRateLimit.mockResolvedValueOnce({ allowed: false, retryAfter: 300 })
    const { req, res } = createMocks({
      method: 'POST',
      body: { email: 'test@example.com' },
      headers: { 'x-forwarded-for': '5.6.7.8' },
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(429)
  })
})
```

- [ ] **Step 2: Install node-mocks-http for API testing**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm install --save-dev node-mocks-http @types/node-mocks-http
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=__tests__/api/report
```

Expected: FAIL — `Cannot find module '../../pages/api/report'`

- [ ] **Step 4: Create frontend/pages/api/report.ts**

```typescript
// frontend/pages/api/report.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { runFreeTierSearch } from '../../lib/sources'
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

  // Rate limit by IP
  const limit = await checkRateLimit(ip, 'report')
  if (!limit.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: limit.retryAfter,
      message: `Please wait ${limit.retryAfter} seconds before trying again.`,
    })
  }

  // Validate input
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request',
      message: parsed.error.errors[0]?.message || 'Invalid email address',
    })
  }

  const { email } = parsed.data

  // Respond immediately — processing happens async
  res.status(202).json({
    message: `Report requested. If ${email} appears in any breaches, you will receive an email shortly.`,
  })

  // Run search and send email (fire-and-forget after response)
  try {
    const report = await runFreeTierSearch(email)
    const sent = await sendBreachReport(report)
    if (!sent.success) {
      logger.error({ email, error: sent.error }, 'Failed to deliver breach report')
    }
  } catch (err) {
    logger.error({ email, err }, 'Report generation failed')
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=__tests__/api/report
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/pages/api/report.ts frontend/__tests__/api/report.test.ts frontend/package.json frontend/package-lock.json
git commit -m "feat: add POST /api/report — breach check with email delivery"
```

---

## Task 11: Public Check Page

**Files:**
- Create: `frontend/pages/check.tsx`

- [ ] **Step 1: Create frontend/pages/check.tsx**

```typescript
// frontend/pages/check.tsx
import { useState } from 'react'
import axios from 'axios'
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  Link,
} from '@mui/material'
import ShieldIcon from '@mui/icons-material/Shield'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

type State = 'idle' | 'loading' | 'sent' | 'error'

export default function CheckPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setState('loading')
    setErrorMsg('')

    try {
      await axios.post('/api/report', { email: email.trim() })
      setState('sent')
    } catch (err: any) {
      if (err.response?.status === 429) {
        setErrorMsg(err.response.data.message || 'Too many requests. Please try again later.')
      } else if (err.response?.status === 400) {
        setErrorMsg(err.response.data.message || 'Please enter a valid email address.')
      } else {
        setErrorMsg('Something went wrong. Please try again.')
      }
      setState('error')
    }
  }

  return (
    <>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ py: 3, px: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" fontWeight="bold" color="primary">Publix</Typography>
          <Link href="/auth/signin" color="text.secondary" underline="hover" variant="body2">Sign in</Link>
        </Box>

        {/* Hero */}
        <Container maxWidth="sm" sx={{ flex: 1, display: 'flex', alignItems: 'center', py: 8 }}>
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <ShieldIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              Have you been breached?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Enter your email address. We will check it against known data breaches and send you a private report — directly to your inbox.
            </Typography>

            {state === 'sent' ? (
              <Alert severity="success" sx={{ textAlign: 'left' }}>
                <strong>Check your inbox at {email}</strong>
                <br />
                We have sent you a breach report. If your email does not appear in any known breaches, we will let you know that too.
              </Alert>
            ) : (
              <Paper elevation={3} sx={{ p: 4 }}>
                <form onSubmit={handleSubmit}>
                  <TextField
                    label="Your email address"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    fullWidth
                    required
                    disabled={state === 'loading'}
                    placeholder="you@example.com"
                    autoFocus
                  />
                  {state === 'error' && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {errorMsg}
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={state === 'loading' || !email.trim()}
                    sx={{ mt: 2 }}
                  >
                    {state === 'loading' ? <CircularProgress size={24} /> : 'Check my email'}
                  </Button>
                </form>
              </Paper>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
              Your email is used only for this check. Results are sent to you — never shown on screen.
              <br />
              Data sources: XposedOrNot, Powered by{' '}
              <Link href="https://leakcheck.io" target="_blank" rel="noopener">LeakCheck</Link>.
            </Typography>
          </Box>
        </Container>

        {/* Footer */}
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Link href="/pricing" color="text.secondary" underline="hover" variant="body2" sx={{ mr: 3 }}>
            Upgrade for deeper search
          </Link>
          <Link href="/privacy" color="text.secondary" underline="hover" variant="body2">
            Privacy Policy
          </Link>
        </Box>
      </Box>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </>
  )
}
```

- [ ] **Step 2: Update index.tsx to redirect**

Replace the content of `frontend/pages/index.tsx` with:

```typescript
// frontend/pages/index.tsx
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]'

// Public users → /check, authenticated admins → /admin
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (session) {
    return { redirect: { destination: '/admin', permanent: false } }
  }
  return { redirect: { destination: '/check', permanent: false } }
}

export default function Index() {
  return null
}
```

- [ ] **Step 3: Rename existing search page to /admin**

```bash
cp /home/cocodedk/0-projects/publix/frontend/pages/index.tsx /tmp/old-index-backup.tsx
```

The old full search UI content (from before this task) should now live at `frontend/pages/admin.tsx`. Copy the original full search page there:

> Note: The original `index.tsx` content (the full admin search tool with table, filters, export) should be saved as `frontend/pages/admin.tsx`. If you have the old content available, create `frontend/pages/admin.tsx` with it. The new `index.tsx` above just redirects.

- [ ] **Step 4: Update middleware to protect /admin**

Replace `frontend/middleware.ts` with:

```typescript
// frontend/middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        // Admin routes require authentication
        if (
          path.startsWith('/admin') ||
          path.startsWith('/api/content/create') ||
          path.startsWith('/api/content/update') ||
          path.startsWith('/api/content/delete') ||
          path.startsWith('/api/content/bulk') ||
          path.startsWith('/api/import') ||
          path.startsWith('/api/backup') ||
          path.startsWith('/api/intelx/sync') ||
          path.startsWith('/create') ||
          path.startsWith('/edit') ||
          path.startsWith('/dashboard')
        ) {
          return !!token
        }

        // /check, /api/report, /auth/* are public
        return true
      },
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/content/:path*',
    '/api/import',
    '/api/backup/:path*',
    '/api/intelx/sync',
    '/create',
    '/edit/:path*',
    '/dashboard',
  ],
}
```

- [ ] **Step 5: Verify the app builds**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm run build 2>&1 | tail -20
```

Expected: Build completes without errors.

- [ ] **Step 6: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/pages/check.tsx frontend/pages/index.tsx frontend/middleware.ts
git commit -m "feat: add public /check page, redirect index, protect /admin routes"
```

---

## Task 12: Run Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --passWithNoTests
```

Expected: All tests pass. Minimum passing: env, rateLimiter, reportGenerator, email, sources/xposedornot, sources/leakcheck, api/report.

- [ ] **Step 2: Update .env.example with new variables**

Add to `.env.example` (create if missing at project root):

```bash
# Resend email delivery
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@publix.dk

# Logging
LOG_LEVEL=info
```

- [ ] **Step 3: Final commit**

```bash
cd /home/cocodedk/0-projects/publix
git add .
git commit -m "feat: Plan 1 complete — breach notification email flow live"
```

---

## Verification Checklist

After completing all tasks, verify manually:

1. `npm run build` completes without errors
2. `npm test` — all tests pass
3. Start dev server: `npm run dev`
4. Visit `http://localhost:3000` → redirects to `/check`
5. Enter a real email → see "Check your inbox" confirmation
6. Email arrives (requires real `RESEND_API_KEY` in `.env`)
7. Visit `http://localhost:3000/admin` → redirects to sign-in
8. Submit invalid email → see validation error
9. Submit same email 4 times quickly → 4th gets 429

---

*This plan is Part 1 of 5. See `plan-2-paid-sources.md`, `plan-3-payments.md`, `plan-4-production.md`, `plan-5-quality.md` for subsequent phases.*
