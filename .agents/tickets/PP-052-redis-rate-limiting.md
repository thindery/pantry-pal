# PP-052: Redis-backed rate limiting

**Status:** 📋 Open  
**Priority:** P2  
**Phase:** 3 — Security remediation  
**Playbook:** `rate_limiting.md`, `agent_paige_security_audit.md`  
**Finding:** SEC-108  
**Created:** 2026-07-11  
**Depends on:** PP-030  
**Blocks:** —

---

## Problem

Rate limits are in-memory per process (`backend/middleware/rate_limit.py`). Limits reset on deploy and do not work across replicas. Identifier uses token substring, not verified `user_id`.

## Fix Plan

- [ ] Add Redis service or use shared portfolio Redis on `app-network`
- [ ] Key rate limits on verified `user_id` from JWT
- [ ] Keep IP fallback for unauthenticated routes (client-errors after PP-048)
- [ ] Env config: `REDIS_URL`, limit tiers documented

## Acceptance Criteria

- [ ] Rate limits survive container restart
- [ ] 429 responses include `Retry-After` where applicable
- [ ] Tests mock Redis for limit exceeded path

## Log

- 2026-07-11: Created from security audit 2026-07-11