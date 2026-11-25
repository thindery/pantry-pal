# PP-174: Billing portal 500s (wrong Stripe SDK namespace)

**Status:** ✅ Done (overnight 2026-11-25, PR #98, live in a614caf)
**Priority:** P0
**Phase:** Billing
**Created:** 2026-11-25, 2:35 AM America/Chicago
**Source:** Found while building the PP-152 billing integration harness

---

## Problem

`backend/services/stripe_service.py` called `stripe.billingPortal.Session.create`. stripe-python (15.3.0, pinned in requirements.txt and running in production) only exposes `stripe.billing_portal`; `stripe.billingPortal` raises `AttributeError`.

Impact on production:

- `POST /api/subscription/portal` ("Manage billing") returned 500 for every paying user (`create_portal_session`, broken since the July monorepo refactor).
- PP-089 duplicate-checkout guard: an already-active Pro user who starts checkout again was meant to be sent to the portal (`_portal_redirect`), but got a 500 instead. No second subscription was created, so this was a broken redirect, not a double charge.

Existing unit tests mocked `_portal_redirect` as a whole, so they never hit the SDK attribute.

## Fix

Use `stripe.billing_portal.Session.create` in both places. `tests/test_billing_portal_namespace.py` patches only the SDK call (red on the old code: 3 failed; green after).

## Follow-up

- Manual check after deploy: open Settings → Manage billing on a Pro account and confirm the Stripe portal opens.
