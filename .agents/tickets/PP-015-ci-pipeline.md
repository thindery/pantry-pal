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

**Postgres integration CI job** is specified in detail in **[PP-019](PP-019-postgres-integration-and-linting.md)** — implement the suite there, wire the GitHub Actions job here.

## Acceptance Criteria

- [ ] `.github/workflows/ci.yml` with `node-version: "22"`
- [ ] Jobs or steps: install, typecheck, lint, unit tests (frontend + backend)
- [ ] Fails on type/lint-error/test failures
- [ ] No secrets required for unit CI
- [ ] **Postgres integration job** (service container) once PP-019 suite exists — required before OVH, not optional forever
- [ ] Align with `npm run check` / `check:ci` scripts

## Related

- [PP-007](PP-007-pre-commit-quality-gate.md) — local unit gate
- [PP-019](PP-019-postgres-integration-and-linting.md) — PG integration tests + lint maturity

## Log

- 2026-07-10: Ticket created
- 2026-07-10: Cross-linked PP-019 for Postgres integration + linting detail
