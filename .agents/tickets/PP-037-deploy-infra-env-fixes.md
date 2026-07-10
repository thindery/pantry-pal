# PP-037: Deploy, Docker, env, and test fixes (audit follow-up)

**Status:** ✅ Done  
**Priority:** P0  
**Phase:** 2–3 — Post-migration fixes  
**Created:** 2026-07-10  
**Source:** Migration audit Issues 4–9, 13, 21  
**Depends on:** PP-010, PP-013  
**Blocks:** PP-034

---

## Description

Fix infra gaps blocking local Docker and OVH deploy readiness.

## Acceptance Criteria

- [ ] `docker-compose.yml` — use internal `app-network` (not external-only) OR document + auto-create in README
- [ ] `deploy/deploy-docker.sh` runs `database/migrate.py migrate` before health poll
- [ ] Align `CORS_ORIGINS` / `ALLOWED_ORIGINS` in `.env.example` and `backend/app/config.py`
- [ ] `frontend/next.config.ts` default API URL → `http://localhost:8000`
- [ ] `frontend/Dockerfile` default `NEXT_PUBLIC_API_URL` → port 8000
- [ ] Fix `tests/test_postgres_integration.py` — use `auth_headers`, expect 201 on create
- [ ] `Dockerfile.backend` test stage copies `tests/` directory
- [ ] `README.md` documents docker network + migrate steps
- [ ] `npm run test:postgres` passes with `docker compose up -d db`

## Log

- 2026-07-10: Created from migration audit