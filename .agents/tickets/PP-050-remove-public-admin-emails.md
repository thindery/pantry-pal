# PP-050: Remove public admin email exposure

**Status:** 📋 Open  
**Priority:** P2  
**Phase:** 3 — Security remediation  
**Playbook:** `agent_paige_security_audit.md`  
**Finding:** SEC-106  
**Created:** 2026-07-11  
**Depends on:** PP-022  
**Blocks:** —

---

## Problem

`NEXT_PUBLIC_ADMIN_EMAILS` is bundled client-side and used in middleware/account UI. Admin identities are enumerable from the JS bundle.

## Fix Plan

- [ ] Use server-only `ADMIN_EMAILS` in middleware (already supported)
- [ ] Expose `isAdmin` via session/JWT callback only
- [ ] Remove `NEXT_PUBLIC_ADMIN_EMAILS` from `.env.prod.example` and account view
- [ ] Update admin link visibility to use `session.user.isAdmin`

## Acceptance Criteria

- [ ] No `NEXT_PUBLIC_ADMIN_EMAILS` in committed env templates
- [ ] Client bundle does not contain admin email strings
- [ ] Admin routes still gated correctly

## Log

- 2026-07-11: Created from security audit 2026-07-11