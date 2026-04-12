# Contributing to Publix

## Local Setup
1. Install Node.js 20+.
2. Install Docker and Docker Compose.
3. Clone and install dependencies: `npm run install`
4. Start the database: `npm run docker:up`
5. Install Git hooks (see below).

## Install Git Hooks
```sh
./scripts/install-hooks.sh
```

## Local Git Setup
Run these once after cloning:
```bash
git config pull.rebase true
git config core.autocrlf input
git config push.autoSetupRemote true
git config init.defaultBranch main
```

## Build and Test Commands
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Lint TypeScript/React
npm run docker:up    # Start Neo4j database
npm run docker:down  # Stop database
```

## Coding Style
- TypeScript strict mode enabled — no `any` types
- Max 200 lines per file — split by responsibility when approaching limit
- No `console.log` — use `logger` from `lib/logger.ts` (Pino)
- No raw `process.env` — only in `lib/env.ts`; everywhere else use `validateEnv()`
- Zod everywhere — validate all API request bodies and query params

## PR Checklist
- [ ] Lint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual test completed for changed functionality
- [ ] Updated docs if behavior changed

## Branch Naming Conventions

| Branch prefix | Conventional Commit type | Example |
|---|---|---|
| `feature/` | `feat:` | `feature/add-breach-export` |
| `fix/` | `fix:` | `fix/email-not-sent` |
| `chore/` | `chore:` | `chore/update-dependencies` |
| `docs/` | `docs:` | `docs/update-api-guide` |
| `refactor/` | `refactor:` | `refactor/extract-breach-service` |
| `ci/` | `ci:` | `ci/add-dependabot` |

Branch names use **kebab-case**. Never commit directly to `main` — always open a PR.
