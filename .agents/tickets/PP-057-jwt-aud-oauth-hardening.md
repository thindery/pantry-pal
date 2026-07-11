# PP-057: JWT audience and OAuth linking hardening

**Status:** 📋 Open  
**Priority:** P3  
**Phase:** 3 — Security remediation  
**Playbook:** `agent_paige_security_audit.md`, `clerk_authentication.md`  
**Finding:** SEC-111, SEC-112  
**Created:** 2026-07-11  
**Depends on:** PP-022  
**Blocks:** —

---

## Problem

Backend JWT verification disables audience check (`verify_aud: False`). Google provider enables `allowDangerousEmailAccountLinking`.

## Fix Plan

- [ ] Set `aud: "pantry-pal"` (or similar) when minting Bearer tokens in `auth-token.ts`
- [ ] Verify `aud` in `backend/auth_session.py`
- [ ] Disable `allowDangerousEmailAccountLinking` unless multi-provider linking is required
- [ ] Document token contract in `docs/frontend-architecture.md`

## Acceptance Criteria

- [ ] Tokens without correct `aud` rejected by backend
- [ ] Existing sessions continue working after deploy (coordinate token refresh)
- [ ] Google-only auth still works

## Log

- 2026-07-11: Created from security audit 2026-07-11