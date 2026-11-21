# PP-078: Fix Stripe webhook crash on current period fields

**Status:** ✅ Done  
**Priority:** P0  
**Phase:** User-reported bug  
**Created:** 2026-11-21  
**Completed:** 2026-11-21  

---

## Problem

After redeeming PANTRY1MO, Stripe Checkout succeeded and created an active Pro subscription, but Settings still showed Free. `checkout.session.completed` and `invoice.paid` reached prod and returned 400. The handler called `datetime.fromtimestamp(sub.current_period_start)` / `current_period_end`, which are no longer on the Subscription object (they live on the subscription item). That TypeError failed the webhook. Checkout sat ~10s before redirecting because Stripe waited on the failed fulfillment webhook.

## Acceptance Criteria

- [x] Period start/end are read from the subscription item when missing on the subscription
- [x] Invoice handlers resolve subscription id from current or legacy invoice shape
- [x] Webhook processing errors are logged server-side without leaking details to Stripe
- [x] Tylor's existing live subscription is synced to Pro via the fixed handler
