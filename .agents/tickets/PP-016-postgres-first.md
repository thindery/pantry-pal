# PP-016: Postgres-first DATABASE_URL; SQLite tests only

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 2 — Playbook structure  
**Playbook:** `project-director/playbooks/postgresql_integration_testing.md`  
**Created:** 2026-07-10  
**Depends on:** PP-010  
**Blocks:** PP-026, PP-029

---

## Description

Treat PostgreSQL as the primary store for local Docker and production path. Keep SQLite only for fast unit/contract tests if needed.

## Acceptance Criteria

- [ ] Default local Docker path uses Postgres via `DATABASE_URL`
- [ ] Document SQLite as test/dev-without-docker only
- [ ] Adapter code paths still work during interim Express phase
- [ ] At least one integration test path against Postgres (or ticket follow-up if FastAPI rewrite owns it)
- [ ] README reflects Postgres-first

## Log

- 2026-07-10: Ticket created
