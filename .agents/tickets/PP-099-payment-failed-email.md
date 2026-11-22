# PP-099: Send a payment-failed email

**Status:** 📋 Open  
**Priority:** P1  
**Phase:** Billing & email audit (2026-11-22)  
**Created:** 2026-11-22  
**Depends on:** PP-092, PP-096

---

## Problem

`invoice.payment_failed` records an admin transaction and sets `subscriptionStatus` to `past_due`. The subscriber is not emailed. They can lose access without a notice or a link to update the card.

## Fix Plan

- [ ] On `invoice.payment_failed`, send a transactional email via Resend
- [ ] Include that payment failed, the amount due when known, and a billing-portal / Settings link to update the payment method
- [ ] Idempotent per invoice id (Stripe may retry the webhook)
- [ ] Do not include raw Stripe error strings that could leak internals

## Acceptance Criteria

- [ ] A failed invoice notifies the customer once
- [ ] A webhook retry does not send a second email for the same invoice
- [ ] Pytest covers send and idempotency
