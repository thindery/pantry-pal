# PP-048: Harden client-errors ingestion

**Status:** 📋 Open  
**Priority:** P1  
**Phase:** 3 — Security remediation  
**Playbook:** `agent_paige_security_audit.md`, `rate_limiting.md`  
**Finding:** SEC-102  
**Created:** 2026-07-11  
**Depends on:** PP-044  
**Blocks:** —

---

## Problem

`POST /api/client-errors` is public (middleware bypass) and accepts client-supplied `userId`. Production probe returns 422 (not 401), confirming open ingestion.

## Fix Plan

- [ ] Require authenticated session OR signed error-report token
- [ ] Bind `userId` to authenticated `sub`; ignore client `userId` field
- [ ] Add payload size limits on message/stack fields
- [ ] Dedicated low rate limit (e.g. 10/min per IP)
- [ ] Change `ClientErrorCreateRequest` to `extra="forbid"`

## Acceptance Criteria

- [ ] Unauthenticated `POST /api/client-errors` returns 401
- [ ] Saved errors always use server-derived user ID
- [ ] Rate limit returns 429 under abuse
- [ ] Production probe updated in audit doc

## Log

- 2026-07-11: Created from security audit 2026-07-11