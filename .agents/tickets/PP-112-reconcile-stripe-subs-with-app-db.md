# PP-112: Reconcile Stripe subscriptions with the app DB after the webhook outage

**Status:** ✅ Done
**Priority:** P0
**Phase:** Production incident follow-up
**Created:** 2026-11-22
**Completed:** 2026-11-22
**Depends on:** PP-078, PP-089

---

## Problem

Webhooks all returned 400 while `process_webhook` called `.get()` on Stripe objects (fixed in PP-089). The 2026-11-21 23:04 UTC signup `cus_VfihjuwPrSYpNl` (active subscription, no charge — likely the free-month promotion code) arrived during that window. The app user had to be checked and, if needed, set to Pro with the correct linked subscription and period end. Every other Stripe subscription also needed a scan against the app DB for mismatches.

## Behavior

- Inspected the app DB user for `cus_VfihjuwPrSYpNl` against Stripe. The row already matched: Pro, status `active` (not `trialing` — first invoice was $0 via a promotion, not a Stripe trial), linked to `sub_1UeNKURHCLA4QETr3shikvZy`, period 2026-11-21T23:04:21Z through 2026-12-21T23:04:21Z. No DB write was required. This subscription was not canceled or refunded.
- Scanned every Stripe subscription against `user_subscriptions`. Two live entitlements: this customer, and Sara Jane Cantwell’s kept subscription `sub_1UeKuaRHCLA4QETrsKPuoZSy` (`cus_VfgG163a2AMtjZ`) from PP-089. Her three canceled extras were correctly not linked. One other app user was Free with no Stripe customer. No mismatches; no further DB fixes.

## Acceptance Criteria

- [x] Ticket + status row for PP-112
- [x] `cus_VfihjuwPrSYpNl` confirmed Pro/active, linked to the correct sub, period end matches Stripe
- [x] DB left unchanged when already correct
- [x] Every Stripe subscription compared to the app DB; mismatches fixed or reported
- [x] No refund or cancel of this customer’s subscription
