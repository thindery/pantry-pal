# PP-015: GitHub Actions CI (Node 22 + both packages)

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 2 — Playbook structure  
**Created:** 2026-07-10  
**Depends on:** PP-006  
**Blocks:** —

---

## Description

Replace or extend existing deploy workflow with a proper CI pipeline: Node 22, typecheck, lint, unit tests for frontend and backend.

## Acceptance Criteria

- [ ] `.github/workflows/ci.yml` with `node-version: "22"`
- [ ] Jobs or steps: install, typecheck, test frontend, test backend
- [ ] Fails on type/test failures
- [ ] No secrets required for unit CI
- [ ] Optional: Postgres service container job (align with PP-016)

## Log

- 2026-07-10: Ticket created
