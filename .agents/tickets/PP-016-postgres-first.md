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

**Full Postgres integration test suite + SQL safety guard** live in **[PP-019](PP-019-postgres-integration-and-linting.md)** — this ticket is config/runtime defaults only.

## Acceptance Criteria

- [ ] Default local Docker path uses Postgres via `DATABASE_URL`
- [ ] Document SQLite as test/dev-without-docker only
- [ ] Adapter code paths still work during interim Express phase
- [ ] README reflects Postgres-first
- [ ] Hand off integration coverage to PP-019 (do not consider this ticket “done” by claiming tests elsewhere without linking)

## Related

- [PP-010](PP-010-docker-compose-postgres.md) — compose `db` service
- [PP-019](PP-019-postgres-integration-and-linting.md) — integration tests + linting standards

## Log

- 2026-07-10: Ticket created
- 2026-07-10: Integration suite ownership moved to PP-019
