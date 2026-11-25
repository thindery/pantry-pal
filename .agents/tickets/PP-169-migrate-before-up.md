# PP-169: Deploy runs migrations before starting the new containers

**Status:** 🔄 In review
**Priority:** P1 (data / deploy safety)
**Phase:** Production follow-up
**Created:** 2026-11-25
**Depends on:** PP-013, PP-079
**Source:** Pantry Hub Lead overnight follow-up

---

## Problem

`deploy/deploy-docker.sh` ran `docker compose up -d` and only then `migrate.py migrate`. For a few seconds (or forever, if the migration failed) new backend code served requests against the old schema, and a failed migration left the new containers up.

## Behavior

After `docker compose build`: `up -d --wait db` (no-op when the DB is already healthy), then `run --rm --no-deps backend python database/migrate.py migrate` with the new image, then `up -d`. A failed migration exits non-zero before any app container is replaced; the ERR trap now uses `up -d --no-recreate`, so it restarts anything stopped but never swaps in the new image after a failed migration. No `--remove-orphans`, no `down`, no volume changes.

## Acceptance Criteria

- [x] Migrations run with the new image before `up -d`
- [x] Migration failure aborts before the app containers are swapped
- [ ] Next production deploy log shows the new order and all services healthy
