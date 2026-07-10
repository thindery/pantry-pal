# PP-028: Stripe billing + webhooks on FastAPI

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 3 — Modernization  
**Playbook:** `billing_and_database.md`  
**Created:** 2026-07-10  
**Depends on:** PP-026  
**Blocks:** PP-032

---

## Description

Port Stripe checkout, customer portal, and webhook handling to FastAPI with signature verification mandatory.

## Acceptance Criteria

- [ ] Checkout session creation endpoints
- [ ] Webhook route verifies Stripe signature before DB writes
- [ ] Tier/subscription sync matches existing product behavior
- [ ] Price IDs via env
- [ ] Test-mode path documented

## Log

- 2026-07-10: Ticket created
