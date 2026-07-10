# PP-007: Pre-commit quality gate (typecheck + lint + tests)

**Status:** ✅ Closed/Done  
**Priority:** P0  
**Phase:** 1 — Monorepo readiness  
**Created:** 2026-07-10  
**Depends on:** PP-000  
**Blocks:** PP-001+ (reliable commits)

---

## Description

Harden local git hooks so commits cannot land with type errors, lint errors, or failing unit tests. Pattern inspired by shipinaday (husky + quality scripts).

## Acceptance Criteria

- [x] `npm run check` runs typecheck → lint → unit tests (single entry)
- [x] `.husky/pre-commit` runs `npm run check` (no full vite build required on every commit)
- [x] Husky install via `prepare` still works after `npm install`
- [x] Unit test suite is green under `npm run test:run`
- [x] Document gate in AGENTS.md / ticket status
- [x] Commit and leave working tree clean

## Non-goals

- CI monorepo workflow (PP-015)
- Postgres integration tests + lint maturity (PP-019 — do after monorepo + compose)
- max-warnings=0 for entire codebase (hundreds of pre-existing warnings; errors still fail) — track under PP-019
- E2E / Playwright

## Log

- 2026-07-10: Ticket created; implementing on `feature/PP-007-pre-commit-quality-gate`
- 2026-07-10: Fixed broken unit tests (gemini mock, admin retry, UI matchers); suite green 257 pass
