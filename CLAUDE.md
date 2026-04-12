# CLAUDE.md — Publix

## Project Overview

Publix (publix.dk) is a breach notification service. A user enters an email address, the system queries breach databases, and emails a report to that address. Results are **never** shown in the browser — always emailed.

- **Language / Runtime**: TypeScript, Node.js 20
- **Framework**: Next.js 13 (Pages Router), Material-UI
- **Architecture**: Monorepo — `frontend/` (Next.js) + Neo4j (Docker) backend
- **Package / Namespace**: `publix`

---

## Required Skills — ALWAYS Invoke These

These skills **must** be invoked when the relevant situation arises. Never skip them.

| Situation | Skill |
|-----------|-------|
| Before any new feature or screen | `superpowers:brainstorming` |
| Planning multi-step changes | `superpowers:writing-plans` |
| Writing or fixing core logic | `superpowers:test-driven-development` |
| First sign of a bug or failure | `superpowers:systematic-debugging` |
| Before completing a feature branch | `superpowers:requesting-code-review` |
| Before claiming any task done | `superpowers:verification-before-completion` |
| Working on UI / frontend | `frontend-design:frontend-design` |
| After implementing — reviewing quality | `simplify` |

---

## Architecture

```
publix/
├── frontend/          <- Next.js app (Pages Router, TypeScript, Material-UI)
│   ├── pages/         <- Route handlers and API endpoints
│   ├── components/    <- React components
│   ├── lib/           <- Shared utilities (logger, env, db, breach APIs)
│   └── scripts/       <- Database init and utility scripts
├── website/           <- GitHub Pages static site
├── scripts/           <- Project-level scripts
├── docker-compose.yml <- Neo4j + app services
└── CLAUDE.md          <- This file
```

### Layer Rules
- `pages/api/` must never return breach data in the response — always email it
- `lib/env.ts` is the only place `process.env` is accessed
- All API inputs must be validated with Zod
- No `console.log` — use `logger` from `lib/logger.ts` (Pino)

---

## Coding Conventions

- [ ] All models are **immutable** — use `copy()` / spread for mutations
- [ ] Functions are **pure** where possible — no hidden side effects
- [ ] State is a single source of truth per feature
- [ ] No hardcoded strings — use constants, config, or i18n resources
- [ ] Strict typing everywhere (TypeScript strict mode, no `any`)

---

## Engineering Principles

### File Size
- **200-line maximum per file** — extract a class, function, or module when approaching the limit

### DRY · SOLID · KISS · YAGNI
- Extract shared logic into named utilities; never copy-paste
- Single Responsibility: one class/function does one thing
- Don't add features not yet needed
- Delete dead code immediately

### TDD
- Write the failing test first, make it pass, then refactor
- Test names describe behaviour: `"should reject duplicate email"`
- One assertion per test — keep tests focused and readable

### Commit hygiene
- Follow Conventional Commits: `feat: ...` / `fix: ...` / `chore: ...`
- The `commit-msg` hook enforces this automatically

---

## Build Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Lint TypeScript/React
npm run docker:up    # Start Neo4j database
npm run docker:down  # Stop database
npm run install      # Install all dependencies
```

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | This file — project conventions and session startup |
| `version.txt` | Semantic version (MAJOR.MINOR.PATCH) |
| `frontend/lib/env.ts` | Environment variable validation (Zod) |
| `frontend/lib/logger.ts` | Pino logger (use instead of console.log) |
| `.github/workflows/` | CI, release, and Pages automation |
| `.githooks/` | Pre-commit and commit-msg hooks |
| `scripts/install-hooks.sh` | One-time hook installer |

---

## Starting a New Session

1. Read this file
2. Run `npm run lint` to confirm everything passes
3. Invoke `superpowers:brainstorming` before touching any feature
4. Follow the Required Skills table — every skill is mandatory, not optional
