# PP-172: Middleware must fail closed when Auth.js is misconfigured

**Status:** ✅ Done (overnight 2026-11-25, PR #91, merge b20bf7f)
**Priority:** P1
**Phase:** Security (found during the 2026-11-25 overnight sweep)
**Created:** 2026-11-25
**Related:** PP-128 (admin auth hardening), PP-072 (/design-system gate)

---

## Problem

`frontend/middleware.ts` treated `!!req.auth` as "logged in". With no `AUTH_SECRET` (the local Playwright harness), Auth.js logs `MissingSecret` and `req.auth` is still truthy, so an anonymous visitor got `/dashboard/` with a 200 and `/admin/` was redirected to the dashboard instead of sign-in. Production has the secret and correctly redirects to sign-in today, and the backend still requires a signed bearer token, so no data was exposed. But a lost or rotated-wrong secret in production would have opened every protected page shell.

## Fix

- `isLoggedIn = !!req.auth?.user`, so only a real session counts.
- New `e2e/auth-gate.spec.ts` (@smoke, runs in the deploy gate): anonymous `/dashboard/`, `/dashboard/account/`, `/admin/` and `/design-system/` must land on `/auth/signin`. It fails on the old code.

## Acceptance Criteria

- [x] Anonymous visitors are redirected to sign-in even when Auth.js is misconfigured
- [x] Signed-in behavior unchanged (same session object, same admin checks)
- [x] Deploy smoke gate covers it
