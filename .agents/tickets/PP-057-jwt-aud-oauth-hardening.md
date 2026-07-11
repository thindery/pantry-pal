# PP-057: JWT audience and OAuth linking hardening

**Status:** ✅ Done  
**Priority:** P3  
**Phase:** 3 — Security remediation  
**Playbook:** `agent_paige_security_audit.md`, `clerk_authentication.md`  
**Finding:** SEC-111, SEC-112  
**Created:** 2026-07-11  
**Depends on:** PP-022  
**Blocks:** —

---

## Problem

Backend JWT verification disabled audience check (`verify_aud: False`). Google provider enabled `allowDangerousEmailAccountLinking`.

## Fix Plan

- [x] Set `aud: "pantry-pal"` when minting Bearer tokens in `auth-token.ts`
- [x] Verify `aud` in `backend/auth_session.py` (`JWT_AUDIENCE` env, default `pantry-pal`)
- [x] Disable `allowDangerousEmailAccountLinking` unless multi-provider linking is required
- [x] Document token contract in `docs/frontend-architecture.md`

## Acceptance Criteria

- [x] Tokens without correct `aud` rejected by backend
- [x] Existing sessions continue working after deploy (middleware re-mints tokens per request)
- [x] Google-only auth still works

## Log

- 2026-07-11: Created from security audit 2026-07-11
- 2026-07-11: OAuth linking disabled in `frontend/lib/auth-providers.ts`
- 2026-07-11: `aud` claim added; backend verification enabled; tests in `tests/test_auth_session.py`