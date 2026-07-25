# PP-073: Add security.txt

**Status:** ✅ Done  
**Priority:** P3  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-209  
**Created:** 2026-07-25  
**Completed:** 2026-07-24  

---

## Problem

`/.well-known/security.txt` returns 404.

## Fix Plan

- [x] Add `frontend/public/.well-known/security.txt` with contact, expires, preferred languages  
- [x] Use security@ or info@mypantryhub.com per policy

## Acceptance Criteria

- [x] File present at `frontend/public/.well-known/security.txt` (served after deploy)
- [ ] Live `GET https://www.mypantryhub.com/.well-known/security.txt` returns 200 text — **needs deploy**

## Implementation

Contact: `mailto:info@mypantryhub.com` · Expires: 2027-07-25 · Policy: /privacy
