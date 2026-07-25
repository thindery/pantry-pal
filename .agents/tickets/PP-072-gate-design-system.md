# PP-072: Gate or remove public design-system

**Status:** 📋 Open  
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
