# PP-168: Pro success page confirms the purchase with the backend

**Status:** 🔄 In review
**Priority:** P1 (billing / entitlement display)
**Phase:** Production follow-up
**Created:** 2026-11-25
**Depends on:** PP-089–PP-094, PP-167
**Source:** Pantry Hub Lead overnight follow-up (Nov 21 customer saw Settings on Free until the webhook landed)

---

## Problem

`/checkout/success` said “Welcome to Pro! Your subscription is now active” and redirected after 5 seconds without checking anything. Entitlement only changed when `checkout.session.completed` / `invoice.paid` / `customer.subscription.created` arrived, so a late webhook could briefly show Free. GA4 `purchase` also always sent a fixed 4.99 (wrong for Family, yearly, and the $1 offer).

## Behavior

- New `POST /api/subscription/checkout/confirm` `{ sessionId }` (signed-in). It reads the Checkout Session from Stripe, requires `metadata.userId` to match the caller (else 404), and when the session is `complete` + paid and the subscription is active/trialing it applies the same `_apply_subscription_entitlement` path the webhooks use. Idempotent; never replaces a different linked active sub (PP-089 guard). Returns `confirmed`, `tier`, `amountTotal`, `currency`.
- Success page shows “Confirming your purchase…” and retries up to 4 times (1.5 s apart). It only says the plan is active, auto-redirects, and fires GA4 `purchase` after the backend confirms. `purchase.value` = Stripe `amount_total / 100`, currency from Stripe. If it cannot confirm, it says so and offers “Retry confirmation”.
- Bad session ids (not `cs_…`) are rejected before calling Stripe.

## Acceptance Criteria

- [x] Backend tests: paid → grants + amount; unpaid / incomplete → no grant; other user’s session → 404; bad id never calls Stripe; unknown id → 404; route error mapping
- [x] Vitest: confirming → active + purchase with real amount once; unconfirmed never claims active or redirects; no session id → no API call
- [ ] Live: next real Pro checkout shows the confirm step, then Pro in Settings with no Free flash
