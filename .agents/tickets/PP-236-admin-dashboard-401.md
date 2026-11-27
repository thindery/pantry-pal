# PP-236: Admin dashboard "Failed to Load Dashboard, API error: 401"

**Status:** ✅ Live (2026-11-26, PR #161, build `8962809`)
**Priority:** P0 (admin blocked; ruled out a platform-wide auth outage)
**Phase:** Admin
**Created:** 2026-11-26

---

## Problem

Tylor, signed in, opens `/admin` and sees "Failed to Load Dashboard, API error: 401".

## Triage (P0 check first)

- Backend auth is healthy after PP-232 (PyJWT) and PP-230 (next-auth beta.32): a HS256 bearer token with the prod `AUTH_SECRET` and `aud=pantry-pal` returns 200 on `/api/items` for a normal user, 200 on `/api/admin/dashboard` for an `ADMIN_EMAILS` user, and 403 for a non-admin. No 401s on normal endpoints in backend logs.
- The only 401s were `GET /api/admin/dashboard`.

## Root cause

`frontend/services/adminService.ts` was the only service that sent no `Authorization` header. It relied on Next middleware injecting a bearer token into the proxied `/api` request, which only works when middleware's `getToken()` can read the session cookie. When it can't, FastAPI sees no token and returns 401. Every other service (`apiService`, `subscription`, `weekly-ads`, `email-preferences`) fetches `/api/auth/token` first (which has a session fallback), so regular users were not affected. The admin client-errors tab used raw `fetch` with the same gap.

## Fix

- `adminService.authedFetch` sends `Authorization: Bearer <token>` from `getBearerToken()` (same source as the rest of the app), with `credentials: 'include'` and a one-shot refresh-and-retry on 401. All admin service calls and the client-errors tab use it.
- Test: `frontend/tests/admin-service-auth.test.ts`.

## Rules

No backend or auth design change. No secrets in git.
