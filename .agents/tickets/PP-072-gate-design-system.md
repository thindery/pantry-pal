# PP-072: Gate or remove public design-system

**Status:** ✅ Done (overnight 2026-11-25, PR #89, merge 3ffaa73)
**Priority:** P3  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-208  
**Created:** 2026-07-25  

---

## Problem

`/design-system` is in middleware `PUBLIC_PATHS` and returns 200 unauthenticated.

## Fix Plan

- [ ] Require auth/admin or remove from production routes  
- [ ] Update middleware public allowlist

## Acceptance Criteria

- [ ] Unauthenticated GET `/design-system` is not publicly useful (redirect or 404)

## Progress Notes

- 2026-11-25 overnight (Pantry Hub Lead): removed /design-system from middleware PUBLIC_PATHS, added it to PROTECTED_PREFIXES and to the same admin check as /admin, plus a server-side layout gate (signed out -> /auth/signin/, non-admin -> /dashboard/). Page stays noindex. Tests: frontend/tests/design-system-gate.test.tsx and an @smoke e2e check.
