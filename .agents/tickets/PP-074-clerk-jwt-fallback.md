# PP-074: Remove or harden Clerk JWT fallback

**Status:** 📋 Open  
**Priority:** P3  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-210  
**Created:** 2026-07-25  

---

## Problem

`auth_session.resolve_authenticated_user` still falls back to Clerk session JWT verification with `verify_aud: False` after NextAuth HS256 fails. Product is NextAuth-primary.

## Fix Plan

- [ ] Confirm production does not rely on Clerk session tokens  
- [ ] If unused: remove Clerk fallback + dead `CLERK_*` env from prod template  
- [ ] If retained: verify `iss` (and `azp` if present) against expected Clerk frontend API URL

## Acceptance Criteria

- [ ] Production auth path is NextAuth-only **or** Clerk path has issuer checks  
- [ ] Docs/env examples match
