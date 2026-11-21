# PP-077: Enable Stripe promotion codes on Checkout

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** User-reported enhancement  
**Created:** 2026-11-21  
**Completed:** 2026-11-21  

---

## Problem

Tylor needed a one-month free upgrade code, but Checkout sessions were created without `allow_promotion_codes`, so a Stripe promotion code could not be entered.

## Acceptance Criteria

- [x] `stripe.checkout.Session.create` sets `allow_promotion_codes=True`
- [x] Deployed so Pricing → Stripe Checkout shows the promo box
