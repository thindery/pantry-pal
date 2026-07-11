# PP-044: Route all /api through Next.js for JWT auth

**Status:** ✅ Done  
**Priority:** P0  
**Phase:** 3 — Post-cutover fixes  
**Playbook:** `ovh_deployment.md`, `clerk_middleware_pattern.md` (auth injection pattern)  
**Created:** 2026-07-11  
**Depends on:** PP-014, PP-034  
**Blocks:** —

---

## Description

nginx was proxying `/api/*` directly to FastAPI, bypassing Next.js middleware that injects `Authorization: Bearer <JWT>`. Dashboard inventory loads returned 401.

## Acceptance Criteria

- [x] `deploy/nginx/pantry-pal.conf` routes all `/api/` to `pantry-pal-frontend`
- [x] Token minting fallback in `/api/auth/token` when `getToken()` fails
- [x] `credentials: "include"` on client API fetches
- [x] `NEXT_PUBLIC_API_URL` set at runtime for Docker rewrites
- [x] Deployed to production (`2d54cae`)

## Log

- 2026-07-11: Identified root cause; shipped fix PP-044