# PP-090: Sync Pro entitlement when invoice.paid arrives

**Status:** 📋 Open  
**Priority:** P0  
**Phase:** Billing & email audit (2026-11-22)  
**Created:** 2026-11-22  
**Depends on:** Stripe webhooks (PP-028, PP-078, PP-089)

---

## Problem

`_handle_invoice_paid` in `backend/services/stripe_service.py` only writes an admin transaction. It does not update `user_subscriptions`.

If `checkout.session.completed` fails or is skipped (the 2026-11-21 incidents in PP-078 and PP-089), a successful `invoice.paid` still leaves the account on Free. Entitlement should not depend on a single event type.

## Fix Plan

- [ ] On `invoice.paid`, resolve the subscription and `userId` / `tier` metadata, then upsert the same entitlement fields used by `_handle_checkout_completed` (tier, Stripe ids, status, period start/end)
- [ ] Keep writing the admin transaction
- [ ] Add a pytest covering “invoice.paid alone grants Pro”

## Acceptance Criteria

- [ ] A signed-in user becomes Pro when only `invoice.paid` is processed
- [ ] Existing `checkout.session.completed` behavior is unchanged
- [ ] Tests cover the invoice-only path
