# PP-053: Validate receiptUrl storage and rendering

**Status:** 📋 Open  
**Priority:** P2  
**Phase:** 3 — Security remediation  
**Playbook:** `agent_paige_security_audit.md`, `ssrf_protection.md`  
**Finding:** SEC-109  
**Created:** 2026-07-11  
**Depends on:** PP-026  
**Blocks:** —

---

## Problem

Shopping session `receiptUrl` is stored and rendered without scheme or domain validation. Arbitrary external URLs can be injected.

## Fix Plan

- [ ] Pydantic validator: `https://` only, block `data:` / `javascript:`
- [ ] Optional domain allowlist (CDN, same-origin uploads)
- [ ] Safe rendering in `SessionHistory.tsx` (Next.js Image with domains)

## Acceptance Criteria

- [ ] `receiptUrl: javascript:alert(1)` rejected at API
- [ ] Valid HTTPS URLs from allowlisted hosts accepted
- [ ] No raw `<img src={userUrl}>` without validation

## Log

- 2026-07-11: Created from security audit 2026-07-11