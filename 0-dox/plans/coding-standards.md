# Coding Standards

These rules apply to all code written for Publix. They override any plan that conflicts.

---

## File Size: 200 Lines Maximum

Every source file must stay under 200 lines. No exceptions.

When a file approaches the limit, split it by responsibility:

| Pattern | How to split |
|---------|-------------|
| Large API handler | Extract DB queries → `lib/queries/thing.ts`, keep handler thin |
| Large HTML template | Move template → `lib/templates/thingHtml.ts`, import in generator |
| Fat lib file | Extract each logical group → separate file per concept |
| Long page component | Extract sections → `components/Thing/SectionName.tsx` |

---

## Existing files that violate this rule (must be fixed when touched)

| File | Lines | Fix |
|------|-------|-----|
| `frontend/pages/index.tsx` (old admin search) | ~585 | Split filter panel, results table, toolbar into components |
| `frontend/pages/api/search.ts` | ~232 | Extract query builders → `lib/queries/search.ts` |
| `frontend/lib/intelxClient.ts` | ~203 | Extract types → `lib/types/intelx.ts`, keep client ~150 lines |
| `frontend/pages/api/intelx/sync.ts` | ~230 | Extract parse logic → `lib/parsers/intelx.ts` |

**Rule:** You do not need to fix these proactively. Fix them when you touch the file for another reason.

---

## Other Standards

- **TypeScript strict mode** — `tsconfig.json` must have `strict: true`
- **No `console.log`** — use `logger` from `lib/logger.ts`
- **No raw `process.env` access** outside `lib/env.ts` — use `validateEnv()` result
- **Zod for all external input** — API request bodies, query params
- **TDD** — write the failing test first, then implement

---

## Plan File Splits Required

The following files planned in the implementation plans exceed 200 lines and must be split when implementing:

### Plan 1 — `lib/reportGenerator.ts`
Planned as one file (~200 lines including HTML template). Split into:
- `lib/reportGenerator.ts` — `buildReportHtml()` and `buildReportText()` function signatures + orchestration (~60 lines)
- `lib/templates/breachReportHtml.ts` — the HTML string builder (~100 lines)
- `lib/templates/breachReportText.ts` — the text string builder (~40 lines)

### Plan 1 — `pages/check.tsx`
Planned as ~130 lines. Acceptable. If it grows, extract:
- `components/Check/HeroForm.tsx` — the email input form
- `components/Check/SuccessMessage.tsx` — the post-submit state

### Plan 3 — `pages/pricing.tsx`
Planned as ~100 lines. Acceptable as-is.

### Plan 3 — `pages/api/stripe/webhook.ts`
Planned as ~80 lines. Acceptable. If event handlers grow, extract:
- `lib/stripe/handlers.ts` — one function per event type

### Plan 4 — `nginx/nginx.conf`
Config files are exempt from the 200-line rule.
