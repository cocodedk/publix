# Plan 5: Quality — CI/CD, Testing & Code Standards

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Prerequisite:** Plans 1–4 must be complete. This plan can run in parallel with Plan 4 (production) since it only touches tooling, not application logic.

**Goal:** Add a GitHub Actions CI pipeline that runs on every push and PR, enforce code style with ESLint + Prettier via pre-commit hooks (Husky), expand test coverage to all critical API routes, and add a coverage threshold that fails CI if coverage drops.

**Architecture:** GitHub Actions runs lint → typecheck → test → build on every push to any branch and on every PR targeting `main`. Husky blocks commits that fail lint or formatting. Jest coverage is collected and a minimum threshold of 70% is enforced.

**Tech Stack:** GitHub Actions, Husky, lint-staged, Prettier, ESLint (already installed), Jest (already configured in Plan 1).

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `.github/workflows/ci.yml` | CI pipeline: lint, typecheck, test, build |
| Create | `frontend/.prettierrc` | Prettier formatting rules |
| Create | `frontend/.prettierignore` | Files to skip formatting |
| Create | `.husky/pre-commit` | Pre-commit hook: lint-staged |
| Modify | `frontend/package.json` | Add prettier, husky, lint-staged scripts |
| Modify | `frontend/jest.config.ts` | Add coverage thresholds |
| Create | `frontend/__tests__/api/health.test.ts` | Health endpoint tests |
| Create | `frontend/__tests__/api/content/create.test.ts` | Content create endpoint tests |
| Create | `frontend/__tests__/lib/encryptor.test.ts` | Encryptor unit tests |

---

## Task 1: Prettier Setup

**Files:**
- Create: `frontend/.prettierrc`
- Create: `frontend/.prettierignore`
- Modify: `frontend/package.json`

- [ ] **Step 1: Install Prettier**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm install --save-dev prettier eslint-config-prettier
```

- [ ] **Step 2: Create frontend/.prettierrc**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

- [ ] **Step 3: Create frontend/.prettierignore**

```
.next
node_modules
public
package-lock.json
```

- [ ] **Step 4: Add format script to package.json**

In `frontend/package.json`, add to `"scripts"`:
```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- [ ] **Step 5: Update .eslintrc to include prettier**

Create `frontend/.eslintrc.json`:
```json
{
  "extends": ["next/core-web-vitals", "prettier"]
}
```

- [ ] **Step 6: Verify formatting runs**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm run format:check 2>&1 | head -20
```

Expected: Either "All matched files use Prettier code style!" or a list of files to fix.

- [ ] **Step 7: Auto-fix any formatting issues**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm run format
```

- [ ] **Step 8: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/.prettierrc frontend/.prettierignore frontend/.eslintrc.json frontend/package.json frontend/package-lock.json
git commit -m "feat: add Prettier with eslint-config-prettier integration"
```

---

## Task 2: Husky Pre-commit Hooks

**Files:**
- Create: `.husky/pre-commit`
- Modify: `frontend/package.json`

- [ ] **Step 1: Install Husky and lint-staged**

```bash
cd /home/cocodedk/0-projects/publix
npm install --save-dev husky lint-staged
npx husky init
```

- [ ] **Step 2: Create .husky/pre-commit**

Replace the generated `.husky/pre-commit` with:

```bash
#!/bin/sh
cd frontend && npx lint-staged
```

- [ ] **Step 3: Add lint-staged config to root package.json**

In `/home/cocodedk/0-projects/publix/package.json`, add:

```json
"lint-staged": {
  "frontend/**/*.{ts,tsx}": [
    "prettier --write",
    "eslint --fix --max-warnings=0"
  ],
  "frontend/**/*.{json,md}": [
    "prettier --write"
  ]
}
```

- [ ] **Step 4: Verify hook is executable**

```bash
ls -la /home/cocodedk/0-projects/publix/.husky/pre-commit
```

Expected: File is executable (`-rwxr-xr-x`). If not: `chmod +x .husky/pre-commit`

- [ ] **Step 5: Test the hook runs**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/.prettierrc
git commit -m "test: verify husky hook" --dry-run 2>&1 | head -20
```

Expected: lint-staged runs without errors.

- [ ] **Step 6: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add .husky/ package.json
git commit -m "feat: add Husky pre-commit hooks with lint-staged"
```

---

## Task 3: Coverage Thresholds

**Files:**
- Modify: `frontend/jest.config.ts`

- [ ] **Step 1: Update jest.config.ts with coverage config**

Replace the entire `frontend/jest.config.ts` with:

```typescript
// frontend/jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: { jsx: 'react' },
    }],
  },
  collectCoverageFrom: [
    'lib/**/*.ts',
    'pages/api/**/*.ts',
    '!lib/neo4jClient.ts',    // Requires live DB — integration tested separately
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThresholds: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
}

export default config
```

- [ ] **Step 2: Run tests with coverage to establish baseline**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm run test:coverage 2>&1 | tail -30
```

Expected: Coverage report printed. Note the current percentages. If below threshold, the next tasks add more tests to close the gap.

- [ ] **Step 3: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/jest.config.ts
git commit -m "feat: add Jest coverage thresholds (70% lines/functions)"
```

---

## Task 4: Encryptor Unit Tests

**Files:**
- Create: `frontend/__tests__/lib/encryptor.test.ts`

- [ ] **Step 1: Read the existing encryptor**

```bash
cat /home/cocodedk/0-projects/publix/frontend/lib/encryptor.ts
```

Note the class name and method signatures before writing tests.

- [ ] **Step 2: Write failing tests**

```typescript
// frontend/__tests__/lib/encryptor.test.ts
import { Encryptor } from '../lib/encryptor'

const KEY = 'dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdA=='
const SALT = 'dGVzdHNhbHQ='

describe('Encryptor', () => {
  const enc = new Encryptor(KEY + SALT)

  it('encrypts and decrypts a string', () => {
    const plaintext = 'hello@example.com'
    const encrypted = enc.encrypt(plaintext)
    expect(encrypted).not.toBe(plaintext)
    expect(enc.decrypt(encrypted)).toBe(plaintext)
  })

  it('produces different ciphertext for same input (IV randomness)', () => {
    const plaintext = 'same@example.com'
    const c1 = enc.encrypt(plaintext)
    const c2 = enc.encrypt(plaintext)
    expect(c1).not.toBe(c2)
  })

  it('decrypts correctly after multiple encryptions', () => {
    const values = ['user@test.com', 'password123', 'full line content']
    values.forEach(v => {
      expect(enc.decrypt(enc.encrypt(v))).toBe(v)
    })
  })

  it('throws on tampered ciphertext', () => {
    const encrypted = enc.encrypt('test@example.com')
    const tampered = encrypted.slice(0, -4) + 'XXXX'
    expect(() => enc.decrypt(tampered)).toThrow()
  })

  it('throws on empty string input', () => {
    expect(() => enc.encrypt('')).toThrow()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=encryptor
```

Expected: FAIL (if encryptor has issues) or PASS (if encryptor already handles these cases). Either way note the result.

- [ ] **Step 4: If any tests fail, fix encryptor.ts to handle the cases**

Common fixes needed:
- Empty string: add guard `if (!text) throw new Error('Cannot encrypt empty string')`
- Tampered ciphertext: AES-GCM auth tag validation should already throw — verify it does

- [ ] **Step 5: Run until green**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=encryptor
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/__tests__/lib/encryptor.test.ts frontend/lib/encryptor.ts
git commit -m "test: add encryptor unit tests, fix edge cases"
```

---

## Task 5: Health Endpoint Tests

**Files:**
- Create: `frontend/__tests__/api/health.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// frontend/__tests__/api/health.test.ts
jest.mock('../../lib/neo4jClient', () => ({
  neo4jClient: {
    verifyConnectivity: jest.fn(),
  },
}))

import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/health'
import { neo4jClient } from '../../lib/neo4jClient'

const mockVerify = neo4jClient.verifyConnectivity as jest.Mock

describe('GET /api/health', () => {
  it('returns 405 for non-GET', async () => {
    const { req, res } = createMocks({ method: 'POST' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(405)
  })

  it('returns 200 with status ok when DB is connected', async () => {
    mockVerify.mockResolvedValueOnce(true)
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(200)
    const body = JSON.parse(res._getData())
    expect(body.status).toBe('ok')
    expect(body.checks.database).toBe('ok')
    expect(body.timestamp).toBeDefined()
  })

  it('returns 503 with status degraded when DB is down', async () => {
    mockVerify.mockResolvedValueOnce(false)
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(503)
    const body = JSON.parse(res._getData())
    expect(body.status).toBe('degraded')
    expect(body.checks.database).toBe('error')
  })

  it('returns 503 when DB throws', async () => {
    mockVerify.mockRejectedValueOnce(new Error('Connection refused'))
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(503)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=api/health
```

Expected: FAIL

- [ ] **Step 3: Run until green (health.ts was updated in Plan 4)**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=api/health
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/__tests__/api/health.test.ts
git commit -m "test: add health endpoint tests"
```

---

## Task 6: Content Create Endpoint Tests

**Files:**
- Create: `frontend/__tests__/api/content/create.test.ts`

- [ ] **Step 1: Read the existing create endpoint**

```bash
cat /home/cocodedk/0-projects/publix/frontend/pages/api/content/create.ts
```

Note the request shape and response codes before writing tests.

- [ ] **Step 2: Write failing tests**

```typescript
// frontend/__tests__/api/content/create.test.ts
jest.mock('../../../lib/neo4jClient', () => ({
  neo4jClient: { run: jest.fn() },
}))
jest.mock('../../../lib/encryptor', () => ({
  Encryptor: jest.fn().mockImplementation(() => ({
    encrypt: jest.fn((v: string) => `enc:${v}`),
    decrypt: jest.fn((v: string) => v.replace('enc:', '')),
  })),
}))

import { createMocks } from 'node-mocks-http'
import handler from '../../../pages/api/content/create'
import { neo4jClient } from '../../../lib/neo4jClient'

const mockRun = neo4jClient.run as jest.Mock

describe('POST /api/content/create', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 405 for non-POST', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(405)
  })

  it('returns 400 when email is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { password: 'pass', line: 'line', domain: 'example', tld: 'com' },
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(400)
  })

  it('returns 201 on successful creation', async () => {
    mockRun.mockResolvedValue([])
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'secret',
        line: 'test@example.com:secret',
        domain: 'example',
        tld: 'com',
      },
    })
    await handler(req as any, res as any)
    expect(res._getStatusCode()).toBe(201)
  })
})
```

- [ ] **Step 3: Run test**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm test -- --testPathPattern=content/create
```

Expected: PASS (adjust test body shape if create.ts uses different field names — check the file you read in Step 1).

- [ ] **Step 4: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/__tests__/api/content/create.test.ts
git commit -m "test: add content create endpoint tests"
```

---

## Task 7: GitHub Actions CI Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create .github/workflows/ci.yml**

```bash
mkdir -p /home/cocodedk/0-projects/publix/.github/workflows
```

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  ci:
    name: Lint, Typecheck, Test, Build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Lint
        working-directory: frontend
        run: npm run lint

      - name: Format check
        working-directory: frontend
        run: npm run format:check

      - name: Typecheck
        working-directory: frontend
        run: npx tsc --noEmit

      - name: Test with coverage
        working-directory: frontend
        run: npm run test:coverage
        env:
          NEO4J_URI: bolt://localhost:7687
          NEO4J_USER: neo4j
          NEO4J_PASSWORD: testpassword
          ENCRYPTION_KEY: dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdA==
          SALT: dGVzdHNhbHQ=
          RESEND_API_KEY: re_test_123
          RESEND_FROM_EMAIL: noreply@publix.dk
          NEXTAUTH_SECRET: test-secret-for-ci

      - name: Build
        working-directory: frontend
        run: npm run build
        env:
          NEO4J_URI: bolt://localhost:7687
          NEO4J_USER: neo4j
          NEO4J_PASSWORD: testpassword
          ENCRYPTION_KEY: dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdA==
          SALT: dGVzdHNhbHQ=
          RESEND_API_KEY: re_test_123
          RESEND_FROM_EMAIL: noreply@publix.dk
          NEXTAUTH_SECRET: test-secret-for-ci
          NEXTAUTH_URL: http://localhost:3000
```

- [ ] **Step 2: Verify the workflow file is valid YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('/home/cocodedk/0-projects/publix/.github/workflows/ci.yml'))" && echo "Valid YAML"
```

Expected: `Valid YAML`

- [ ] **Step 3: Commit and push to trigger CI**

```bash
cd /home/cocodedk/0-projects/publix
git add .github/workflows/ci.yml
git commit -m "feat: add GitHub Actions CI pipeline"
git push origin features/new-plan
```

- [ ] **Step 4: Verify CI passes on GitHub**

```bash
gh run list --limit 5
```

Wait for the run to complete, then:

```bash
gh run view --log-failed
```

Expected: All steps pass. If not, check the failed step output and fix.

---

## Task 8: Final Coverage Check

- [ ] **Step 1: Run full test suite with coverage**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm run test:coverage
```

Expected: All coverage thresholds met (≥70% lines, functions, statements; ≥60% branches). If not, identify which files are below and add targeted tests.

- [ ] **Step 2: Check which files have low coverage**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm run test:coverage -- --coverageReporters=text 2>&1 | grep -E "^\s*(lib|pages)" | sort -k4 -n | head -10
```

This shows the 10 files with lowest line coverage. Add tests for any critical files below 50%.

- [ ] **Step 3: Final commit**

```bash
cd /home/cocodedk/0-projects/publix
git add -A
git commit -m "feat: Plan 5 complete — CI pipeline, Prettier, Husky, test coverage"
```

---

## Verification Checklist

- [ ] `npm run format:check` — passes with no formatting issues
- [ ] `npm run lint` — passes with no errors
- [ ] `npx tsc --noEmit` — passes with no type errors
- [ ] `npm run test:coverage` — all thresholds met
- [ ] `npm run build` — successful production build
- [ ] Making a commit triggers Husky pre-commit hook
- [ ] Pushing to GitHub triggers CI pipeline and it passes
- [ ] PR to `main` is blocked if CI fails

---

## Summary: All 5 Plans

| Plan | Scope | When done |
|------|-------|-----------|
| 1 — Foundation | Email delivery, public check page, free sources, rate limiting | Can soft-launch with this alone |
| 2 — Paid Sources | HIBP Pro, Dehashed, paid tier routing | Needed before charging users |
| 3 — Payments | Stripe, registration, pricing page, account | Needed before charging users |
| 4 — Production | Nginx, SSL, Docker, Sentry, deploy script | Needed before going public |
| 5 — Quality | CI/CD, Prettier, Husky, coverage | Ongoing — do in parallel with 4 |

**Minimum viable launch:** Plans 1 + 4 (free tier only, no payments)

**Full paid launch:** All 5 plans

---

*Plans saved to: `/home/cocodedk/0-projects/publix/0-dox/plans/`*
