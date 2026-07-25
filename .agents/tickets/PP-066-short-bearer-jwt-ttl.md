# PP-066: Shorten API bearer JWT TTL to 1 hour

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-202  
**Created:** 2026-07-25  

---

## Problem

`frontend/lib/auth-token.ts` minted HS256 API bearer tokens with a 30-day expiry. Middleware re-mints every request and `/api/auth/token` re-fetches, so long TTL only increased impact of token theft.

## Fix

- [x] Set `BEARER_TOKEN_TTL_SECONDS = 3600` (1 hour)  
- [x] Document rationale next to constant

## Acceptance Criteria

- [x] New bearer tokens expire in ~1 hour  
- [x] Authenticated API flow via middleware still works (fresh mint per request)
