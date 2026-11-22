# PP-093: Keep Pro access until cancel-at-period-end actually ends

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** Billing & email audit (2026-11-22)  
**Created:** 2026-11-22
**Completed:** 2026-11-22  
**Depends on:** PP-028, PP-089

---

## Problem

`POST /api` cancel in `backend/routers/subscription.py` calls Stripe with `cancel_at_period_end=True`, then immediately writes `subscriptionStatus: "canceled"`.

Tier stays Pro (limits still use `tier`), but Settings can show canceled while the period is still paid. PP-089 treats only `active` / `trialing` as subscribed, so a period-end cancel can also change checkout / portal behavior before access should end.

## Fix Plan

- [x] Keep Stripe status `active` (or `trialing`) in the database until the subscription actually ends
- [x] Persist `cancelAtPeriodEnd` (or equivalent) and the period end date so the UI can say access continues until that date
- [x] Downgrade only on `customer.subscription.deleted` (already handled) or when status is no longer entitled
- [x] Reactivate should clear `cancelAtPeriodEnd` (already calls Stripe `cancel_at_period_end=False`)

## Acceptance Criteria

- [x] After cancel-at-period-end, the user keeps Pro until the period end
- [x] Settings shows that cancellation is scheduled, with the end date
- [x] Checkout still will not open a second subscription while the current one is active
- [x] Tests cover cancel, reactivate, and the deleted-subscription downgrade
