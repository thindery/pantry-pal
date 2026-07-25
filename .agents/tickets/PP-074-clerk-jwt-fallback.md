# PP-074: Remove or harden Clerk JWT fallback

**Status:** ✅ Done  
**Priority:** P3  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-210  
**Created:** 2026-07-25  
**Completed:** 2026-07-24  

---

## Problem

`auth_session.resolve_authenticated_user` still falls back to Clerk session JWT verification with `verify_aud: False` after NextAuth HS256 fails. Product is NextAuth-primary.

## Fix Plan

- [x] Confirm production does not rely on Clerk session tokens  
- [x] If unused: remove Clerk fallback + dead `CLERK_*` env from prod template  
- [x] If retained: verify `iss` (and `azp` if present) against expected Clerk frontend API URL — N/A (removed)

## Acceptance Criteria

- [x] Production auth path is NextAuth-only **or** Clerk path has issuer checks  
- [x] Docs/env examples match

## Implementation

- Removed Clerk fallback from `backend/auth_session.py`
- Prod already had no `CLERK_*` in `.env.prod.example`; commented in `.env.example`
- `is_admin_user` / `error_detail` remain in `clerk_auth.py`
- Test: `test_resolve_does_not_fall_back_to_clerk`
