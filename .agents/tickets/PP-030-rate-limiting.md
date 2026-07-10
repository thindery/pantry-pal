# PP-030: Rate limiting production patterns

**Status:** 🔄 To Do  
**Priority:** P1  
**Phase:** 3 — Modernization  
**Playbook:** `rate_limiting.md`  
**Created:** 2026-07-10  
**Depends on:** PP-026  
**Blocks:** —

---

## Description

Apply rate limiting to public/sensitive endpoints (scan, OCR, auth-adjacent) with clear 429 responses and optional X-RateLimit headers.

## Acceptance Criteria

- [ ] Rate limits on expensive endpoints (receipt OCR, AI scan)
- [ ] Tier-aware limits if product already has free/pro quotas
- [ ] Documented config via env
- [ ] Tests for limit exceeded path

## Log

- 2026-07-10: Ticket created
