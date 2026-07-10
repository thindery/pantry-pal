# PP-006: Smoke — install, typecheck, unit tests (monorepo)

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 1 — Monorepo  
**Created:** 2026-07-10  
**Depends on:** PP-001, PP-002, PP-003  
**Blocks:** PP-005, Phase 2

---

## Description

Prove the monorepo is healthy after the move: install, typecheck, and unit tests for both packages. Fix path-only breakages.

## Acceptance Criteria

- [ ] `npm install` (root and/or workspaces) succeeds
- [ ] Frontend: `typecheck` + Vitest pass (or documented failures with tickets)
- [ ] Backend: `typecheck` + Jest pass (or documented failures with tickets)
- [ ] `npm run dev` starts frontend + backend without sibling-path hacks
- [ ] Health check reachable on backend `/health`
- [ ] Brief note in ticket log of any deferred failures

## Log

- 2026-07-10: Ticket created
