# PP-065: Enforce tier limits on shopping-session add-to-inventory

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-201  
**Created:** 2026-07-25  

---

## Problem

`POST /api/shopping-sessions/{id}/add-to-inventory` created pantry items without `subscription_service.can_add_items()`, allowing free-tier users to bypass the 50-item cap enforced on `POST /api/items` and barcode save.

## Fix

- [x] Count barcoded session items vs remaining capacity before import  
- [x] Raise `PermissionError` → HTTP 403 `TIER_LIMIT_EXCEEDED`  
- [x] Contract tests in `tests/test_shopping_sessions_tier.py`

## Acceptance Criteria

- [x] Free user at cap receives 403 when importing session items  
- [x] Paid / under-cap users still import successfully  
- [x] pytest coverage for allow + deny paths
