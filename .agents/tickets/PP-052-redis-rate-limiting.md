# PP-052: Postgres-backed rate limiting

**Status:** ✅ Done  
**Priority:** P2  
**Phase:** 3 — Security remediation  
**Playbook:** `rate_limiting.md`, `agent_paige_security_audit.md`  
**Finding:** SEC-108  
**Created:** 2026-07-11  
**Depends on:** PP-030  
**Blocks:** —

---

## Problem

Rate limits were in-memory per process (`backend/middleware/rate_limit.py`). Limits reset on deploy and did not work across replicas. Identifier used token substring, not verified `user_id`.

## Fix Plan

- [x] Use Postgres sliding-window store (`rate_limit_events` table) per portfolio `rate_limiting.md` playbook — no Redis dependency on OVH
- [x] Key rate limits on verified `user_id` from JWT via `resolve_authenticated_user`
- [x] Keep IP fallback for unauthenticated routes (client-errors after PP-048)
- [x] Env config: `RATE_LIMIT_STORE=postgres|memory`, limit tiers in `backend/app/config.py`

## Acceptance Criteria

- [x] Rate limits survive container restart (Postgres store)
- [x] 429 responses include `Retry-After` where applicable
- [x] Tests cover limit exceeded path (`tests/test_rate_limit.py`)

## Log

- 2026-07-11: Created from security audit 2026-07-11
- 2026-07-11: Implemented Postgres-backed `rate_limit_service.py` + migration `015_rate_limits.sql`; middleware wired to verified user IDs