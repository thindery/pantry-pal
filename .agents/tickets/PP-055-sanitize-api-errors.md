# PP-055: Sanitize API error responses

**Status:** 📋 Open  
**Priority:** P3  
**Phase:** 3 — Security remediation  
**Playbook:** `agent_paige_security_audit.md`  
**Finding:** SEC-113, SEC-114  
**Created:** 2026-07-11  
**Depends on:** PP-026  
**Blocks:** —

---

## Problem

Several routers return `str(exc)` in error bodies (`admin.py`, `receipts.py`, `subscription.py`). `/api/receipts/health` is unauthenticated.

## Fix Plan

- [ ] Log full exceptions server-side only
- [ ] Return generic `INTERNAL_ERROR` messages to clients
- [ ] Gate `/api/receipts/health` behind auth or disable in production

## Acceptance Criteria

- [ ] 500 responses do not contain stack traces or DB/Stripe error strings
- [ ] `/api/receipts/health` returns 401 or 404 in production
- [ ] Sentry/logging still captures detail

## Log

- 2026-07-11: Created from security audit 2026-07-11