# PP-049: Validate Stripe redirect URLs

**Status:** 📋 Open  
**Priority:** P1  
**Phase:** 3 — Security remediation  
**Playbook:** `agent_paige_security_audit.md`, `billing_and_database.md`  
**Finding:** SEC-103  
**Created:** 2026-07-11  
**Depends on:** PP-028  
**Blocks:** —

---

## Problem

`CheckoutRequest.successUrl`, `cancelUrl`, and `PortalRequest.returnUrl` are passed to Stripe without origin validation. Authenticated users can redirect victims to phishing sites after payment.

## Fix Plan

- [ ] Add `validate_redirect_url(url: str)` helper — must match `AUTH_URL` / `FRONTEND_URL` origin
- [ ] Reject relative paths that resolve off-origin
- [ ] Apply in `subscription.py` checkout and portal handlers
- [ ] Return 400 `VALIDATION_ERROR` for invalid URLs

## Acceptance Criteria

- [ ] `successUrl: https://evil.com` rejected with 400
- [ ] `successUrl: https://www.mypantryhub.com/checkout/success/` accepted
- [ ] Unit tests for allowlist logic

## Log

- 2026-07-11: Created from security audit 2026-07-11