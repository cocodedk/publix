# CLAUDE.md — Publix Project Guide

Single source of truth for AI agents and developers. Plans live in `0-dox/plans/`.

---

## 1. Project Overview

**Publix** (publix.dk) is a breach notification service: user enters an email address, the system queries breach databases, and emails a report to that address. Results are **never** shown in the browser — always emailed.

- **Stack**: Next.js 13 (Pages Router), TypeScript, Neo4j (Docker), Material-UI
- **Tiers**: Free (XposedOrNot + LeakCheck) · Paid (+ HIBP Pro + Dehashed)
- **Attribution**: UI must show "Powered by LeakCheck" and "Powered by HaveIBeenPwned"
- **Compliance**: GDPR applies (Danish domain) — never store plaintext passwords, honour erasure requests

---

## 2. Coding Standards (mandatory)

| Rule | Detail |
|------|--------|
| **DRY** | No duplication; extract shared logic to `lib/` |
| **SOLID** | Single responsibility per file and function |
| **Max 200 lines** | Split by responsibility when approaching limit (see §3) |
| **TDD** | Write failing test first, then implement, then confirm pass |
| **No `console.log`** | Use `logger` from `lib/logger.ts` (Pino) |
| **No raw `process.env`** | Only in `lib/env.ts`; everywhere else use `validateEnv()` result |
| **Zod everywhere** | Validate all API request bodies and query params with Zod |
| **TypeScript strict** | `tsconfig.json` must keep `"strict": true` (already set) |

> These rules override any conflicting plan. See also `0-dox/plans/coding-standards.md`.

---

## 3. File Size Split Guide

When a file approaches 200 lines, split it:

| Situation | Split action |
|-----------|-------------|
| Large API handler | Extract DB queries → `lib/queries/thing.ts`; keep handler thin |
| Large HTML template | Move template → `lib/templates/thingHtml.ts` |
| Fat lib file | Separate file per logical concept |
| Long page component | Extract sections → `components/Thing/SectionName.tsx` |

**Known violations** (fix when you touch the file, not proactively):

| File | Lines | Fix |
|------|-------|-----|
| `pages/index.tsx` | ~585 | Split filter panel, results table, toolbar into components |
| `pages/api/search.ts` | ~232 | Extract query builders → `lib/queries/search.ts` |
| `lib/intelxClient.ts` | ~203 | Extract types → `lib/types/intelx.ts` |
| `pages/api/intelx/sync.ts` | ~230 | Extract parse logic → `lib/parsers/intelx.ts` |

---

## 4. Testing Requirements

> `__tests__/` and `e2e/` directories and test tooling (Jest, Playwright) are **not yet created** — set them up per `0-dox/plans/`.

- **Unit tests**: Jest + ts-jest in `frontend/__tests__/` — mirror source structure
- **E2E tests**: Playwright in `e2e/`
- **Coverage threshold**: 70% lines/functions/statements · 60% branches
- **TDD flow**: write failing test → confirm fail → implement → confirm pass → commit

| Command | What it does |
|---------|-------------|
| `cd frontend && npm test` | Run unit tests (requires Jest setup) |
| `cd frontend && npm run test:coverage` | Run with coverage report |
| `npx playwright test` | Run E2E tests (requires dev server) |

---

## 5. Development Workflow

```bash
# Start Neo4j
docker compose up -d neo4j

# Start dev server
cd frontend && npm run dev

# Build
cd frontend && npm run build

# Lint
cd frontend && npm run lint

# DB init
bash scripts/init-db.sh
```

> `scripts/deploy.sh` is planned but not yet created. `nginx/` config is planned but not yet present.

---

## 6. Environment Setup

Copy `.env.example` to `.env` and fill in values. Never commit `.env`.
All required variables are validated at startup by `lib/env.ts` (planned — add before first deploy).

---

## 7. Key Directories

```
frontend/
  lib/          — shared utilities (auth, encryptor, neo4jClient, validation,
                  qualityScoring, types, intelxClient)
                  planned: env.ts, logger.ts, rateLimiter.ts, sources/
  pages/        — Next.js pages and API routes
  components/   — React components (directory exists, currently empty)
  __tests__/    — unit tests, mirrors lib/ and pages/ (to be created)
  scripts/      — DB init Cypher scripts
e2e/            — Playwright E2E tests (to be created)
0-dox/          — documentation, plans, app state snapshots
scripts/        — shell scripts (init-db.sh)
nginx/          — Nginx config (to be created)
```

---

## 8. Available Skills

Invoke with the `Skill` tool. Always invoke `superpowers:using-superpowers` at conversation start.

| Skill | When to use |
|-------|-------------|
| `superpowers:using-superpowers` | Start of every conversation |
| `superpowers:brainstorming` | Before any feature, component, or creative work |
| `superpowers:writing-plans` | When you have requirements, before touching code |
| `superpowers:executing-plans` | When executing a written plan with review checkpoints |
| `superpowers:subagent-driven-development` | Independent tasks in current session |
| `superpowers:test-driven-development` | Every feature or bugfix |
| `superpowers:systematic-debugging` | Any bug or test failure, before proposing fixes |
| `superpowers:requesting-code-review` | Completing tasks or before merging |
| `superpowers:receiving-code-review` | When acting on review feedback |
| `superpowers:finishing-a-development-branch` | Implementation complete, ready to integrate |
| `superpowers:verification-before-completion` | Before claiming work is done or tests pass |
| `superpowers:using-git-worktrees` | Feature work needing isolation |
| `superpowers:dispatching-parallel-agents` | 2+ independent tasks |
| `superpowers:writing-skills` | Creating or editing skills |
| `advisor-hierarchy` (`/ah`) | Complex multi-step tasks with 3-tier hierarchy |
| `github-setup` | GitHub Actions, CI workflows, releases |
| `frontend-design:frontend-design` | Production-grade frontend UI |
| `simplify` | Review changed code for quality and reuse |
| `loop` | Recurring prompt on an interval |
| `schedule` | Scheduled remote agents on cron |
| `claude-api` | Build/debug Claude API apps |
| `llms-txt` | Create/update llms.txt per llmstxt.org spec |
| `humanizer` | Remove AI writing patterns from English text |
| `humanizer-da` | Remove AI writing patterns from Danish text |
| `update-config` | Configure Claude Code settings.json and hooks |
| `keybindings-help` | Customize keyboard shortcuts |
| `chrome-devtools-mcp:chrome-devtools` | Browser debugging and automation |
| `chrome-devtools-mcp:a11y-debugging` | Accessibility auditing |
| `chrome-devtools-mcp:debug-optimize-lcp` | LCP performance optimization |
| `chrome-devtools-mcp:troubleshooting` | Fix Chrome DevTools MCP issues |
| `humanizer-job-da` | Rewrite Danish job applications to remove AI patterns |
| `linkedin-profile-editor` | Automate LinkedIn profile edits via browser MCP |
| `outlook-email` | Send emails via outlook.office.com using Playwright MCP |
| `pptx` | Any task involving .pptx files (create, read, extract) |

---

## 9. Available MCP Plugins

| Plugin | When to use |
|--------|-------------|
| **Playwright MCP** (`mcp__plugin_playwright_playwright__*`) | E2E tests, UI verification, form filling, screenshots |
| **Chrome DevTools MCP** (`mcp__plugin_chrome-devtools-mcp_chrome-devtools__*`) | DevTools debugging, performance, accessibility, network |
