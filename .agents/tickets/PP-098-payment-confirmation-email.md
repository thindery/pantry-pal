# PP-098: Send a payment / subscription confirmation email

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** Billing & email audit (2026-11-22)  
**Created:** 2026-11-22
**Completed:** 2026-11-22  
**Depends on:** PP-090, PP-092, PP-096

---

## Problem

Checkout and invoice webhooks update billing state (or record a transaction) but send no email. After the 2026-11-21 charges, users had no Pantry Hub confirmation that payment succeeded or that Pro was on. Stripe may send a receipt only if the customer has an email (see PP-092); the app should still send its own confirmation.

## Fix Plan

- [x] Send a confirmation on the first successful payment that grants or renews access (`invoice.paid` is the durable event; do not double-send if `checkout.session.completed` also fires)
- [x] Include plan/tier, amount, period end when known, and a link to manage billing
- [x] Use the Stripe customer email (PP-092) or the signed-in account email
- [x] Idempotent per invoice id

## Acceptance Criteria

- [x] A successful first payment and each later paid invoice send exactly one confirmation
- [x] `checkout.session.completed` plus `invoice.paid` for the same invoice do not send two emails
- [x] Tests cover the idempotency key (invoice id)
