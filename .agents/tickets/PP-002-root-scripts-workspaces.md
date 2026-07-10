# PP-002: Root scripts / workspaces / single dev entry

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 1 — Monorepo  
**Created:** 2026-07-10  
**Depends on:** PP-001  
**Blocks:** PP-006

---

## Description

Add a root orchestration layer so one clone can run frontend + backend with standard npm scripts (and optional npm workspaces).

## Acceptance Criteria

- [ ] Root `package.json` with scripts: `dev`, `dev:frontend`, `dev:backend`, `build`, `test`, `typecheck`, `lint`
- [ ] `dev` runs both packages (e.g. `concurrently`)
- [ ] Workspaces configured **or** documented `cd frontend && npm i` / `cd backend && npm i` install path (prefer workspaces if practical with mixed tools)
- [ ] Frontend API base URL still configurable via env
- [ ] Backend port remains 3001 (or documented change)
- [ ] Husky: single root pre-commit preferred; remove dual-repo confusion

## Log

- 2026-07-10: Ticket created
