# PP-056: Stripe webhook signature tests

**Status:** 📋 Open  
**Priority:** P3  
**Phase:** 3 — Security remediation  
**Playbook:** `agent_paige_security_audit.md`, `billing_and_database.md`  
**Finding:** SEC-116  
**Created:** 2026-07-11  
**Depends on:** PP-028  
**Blocks:** —

---

## Problem

Stripe webhook handler verifies signatures but has no automated tests. Regressions could ship undetected.

## Fix Plan

- [ ] Add `tests/test_webhooks.py`
- [ ] Test valid signature → 200
- [ ] Test missing/invalid signature → 400
- [ ] Mock `stripe.Webhook.construct_event`

## Acceptance Criteria

- [ ] Three webhook signature scenarios covered in pytest
- [ ] `npm run test:backend` passes

## Log

- 2026-07-11: Created from security audit 2026-07-11