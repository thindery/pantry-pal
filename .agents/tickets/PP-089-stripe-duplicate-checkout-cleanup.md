# PP-089: Refund extra Stripe charges and stop duplicate checkouts

**Status:** ✅ Done
**Priority:** P0
**Phase:** Production incident
**Created:** 2026-11-22
**Completed:** 2026-11-22
**Depends on:** Stripe checkout + webhooks (PP-028, PP-078)

---

## Problem

Sara Jane Cantwell (`cus_VfgG163a2AMtjZ`) was charged $4.99 four times on 2026-11-21 and had four active subscriptions. The app still showed her as Free, so Upgrade stayed available.

Root cause: Stripe webhook handling called `.get()` on a Stripe SDK object (`event["data"]`). That raises `AttributeError: get`, every webhook returned 400, and `checkout.session.completed` never marked her Pro. Checkout also created a new session every time, with no check for an existing active subscription, no idempotency key, and no reuse of an open session.

## Behavior

- Keep the earliest of her four subscriptions and its charge; refund and immediately cancel the other three (no proration). Do not touch `cus_VfihjuwPrSYpNl`.
- Webhook processing converts Stripe objects to dicts. Canceling a non-linked subscription must not downgrade a user who still has an active sub.
- Creating a checkout session is blocked when the user already has an active or trialing subscription (DB or Stripe); they are sent to the billing portal instead. Open sessions are reused, new sessions use an idempotency key, and the Upgrade button stays disabled while a request is in flight.
- Her account is Pro on the kept subscription.

## Acceptance Criteria

- [x] Ticket + status row for PP-089
- [x] Three extra charges refunded and three extra subscriptions canceled; earliest kept
- [x] Account remains Pro after webhook handling
- [x] Checkout cannot create a second active/trialing subscription
- [x] Deployed; live `build-id.txt` matches the commit; containers healthy
