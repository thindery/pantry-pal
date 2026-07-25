# PP-071: Trusted client IP for rate limiting

**Status:** ✅ Done  
**Priority:** P2  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-207  
**Created:** 2026-07-25  
**Completed:** 2026-07-24  

---

## Problem

Unauthenticated rate-limit keys use `request.client.host`, which behind Docker nginx is typically the proxy hop — collapsing buckets for all clients.

## Fix Plan

- [x] Prefer `CF-Connecting-IP` then first trusted `X-Forwarded-For` hop when `TRUST_PROXY=1` / production behind CF  
- [x] Never trust forwarded headers unless explicitly enabled  
- [x] Tests for header preference and spoof resistance when disabled

## Acceptance Criteria

- [x] Distinct client IPs get distinct unauth rate buckets behind nginx (when TRUST_PROXY=1)
- [x] Header spoofing ignored when trust flag off

## Implementation

- `backend/lib/client_ip.py` — `get_client_ip` / `trust_proxy_headers`
- Rate limit middleware uses `ip:{get_client_ip(request)}`
- `.env.prod.example`: `TRUST_PROXY=1`
- Tests: `tests/test_client_ip.py`, extended `tests/test_rate_limit.py`
