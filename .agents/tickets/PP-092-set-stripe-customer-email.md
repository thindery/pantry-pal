# PP-092: Set the Stripe customer email from the signed-in user

**Status:** 📋 Open  
**Priority:** P1  
**Phase:** Billing & email audit (2026-11-22)  
**Created:** 2026-11-22  
**Depends on:** PP-028, PP-096 (for app-sent mail; still needed for Stripe receipts)

---

## Problem

`stripe.Customer.create` only sets `metadata.userId`. It does not set `email` (or name). Stripe’s own receipt, failed-payment, and invoice emails cannot be delivered, and later Resend messages have no billing-customer email to fall back on.

## Fix Plan

- [ ] Pass the authenticated user’s email (and name when present) into `Customer.create`
- [ ] If a customer already exists without email, `Customer.modify` when the email is first known (checkout, portal, or webhook)
- [ ] Never log full email addresses at info/debug in production

## Acceptance Criteria

- [ ] New Checkout customers in Stripe have the signed-in email
- [ ] Existing customers missing email are backfilled on the next billing action
- [ ] Tests cover create and backfill; no secrets or raw PII dumps in assertions beyond a fixture address
