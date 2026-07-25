# PP-069: Sanitize Stripe webhook error responses

**Status:** ✅ Done  
**Priority:** P2  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-205  
**Created:** 2026-07-25  

---

## Problem

`POST /api/webhooks/stripe` returned `str(exc)` for processing failures, potentially leaking internal/SDK detail to unauthenticated callers.

## Fix

- [x] Generic message for unexpected exceptions  
- [x] Preserve useful verification messages only when clearly about signature/secret

## Acceptance Criteria

- [x] Missing/invalid signature still 400  
- [x] Unexpected errors do not echo raw exception strings
