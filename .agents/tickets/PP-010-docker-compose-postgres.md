# PP-010: docker-compose — frontend + backend + PostgreSQL 16

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 2 — Playbook structure  
**Playbook:** `project-director/playbooks/portfolio_stack_baseline.md`  
**Created:** 2026-07-10  
**Depends on:** PP-006  
**Blocks:** PP-011, PP-016

---

## Description

Root `docker-compose.yml` matching portfolio templates: app services + `postgres:16-alpine`, external `app-network` readiness, named volumes.

## Acceptance Criteria

- [ ] Services: `db` (postgres:16-alpine), `backend`, `frontend` (frontend may stub until Dockerfiles land)
- [ ] `DATABASE_URL` style connection to db service
- [ ] Volumes for db data; storage volume if needed for uploads
- [ ] Container names `pantry-pal-*`
- [ ] Env via `.env` / env_file (no secrets committed)
- [ ] Documented `docker compose up` local path

## Related

- Templates: `project-director/templates/docker-compose.yml`
- Gold: `markdown-pdf/docker-compose.yml`

## Log

- 2026-07-10: Ticket created
