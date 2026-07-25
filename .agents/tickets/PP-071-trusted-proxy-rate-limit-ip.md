# PP-071: Trusted client IP for rate limiting

**Status:** 📋 Open  
**Priority:** P2  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-207  
**Created:** 2026-07-25  

---

## Problem

Unauthenticated rate-limit keys use `request.client.host`, which behind Docker nginx is typically the proxy hop — collapsing buckets for all clients.

## Fix Plan

- [ ] Prefer `CF-Connecting-IP` then first trusted `X-Forwarded-For` hop when `TRUST_PROXY=1` / production behind CF  
- [ ] Never trust forwarded headers unless explicitly enabled  
- [ ] Tests for header preference and spoof resistance when disabled

## Acceptance Criteria

- [ ] Distinct client IPs get distinct unauth rate buckets behind nginx  
- [ ] Header spoofing ignored when trust flag off
