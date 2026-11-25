# PP-166: Handle customer.subscription.created so the webhook can subscribe to it

**Status:** ✅ Done
**Updated:** 2026-11-24, 11:55 PM America/Chicago
**Priority:** P0 (billing / entitlement)
**Phase:** Production follow-up (GROWTH-001 / Remy)
**Created:** 2026-11-24
**Depends on:** PP-089, PP-090, PP-091, PP-094
**Source:** Remy asked to add `customer.subscription.created`, `charge.refunded`, and `charge.refund.updated` to the live Stripe webhook. Refund events already have a handler. `customer.subscription.created` does not, so this must ship before those events are enabled.

---

## Problem

`process_webhook` already handles `charge.refunded` and `charge.refund.updated` (PP-094). It does not handle `customer.subscription.created`. Enabling that event on the live endpoint before a handler exists would deliver events that are acknowledged and then ignored, leaving entitlement dependent on `checkout.session.completed` / `invoice.paid` only — the same single-event risk as Nov 21.

## Behavior

- On `customer.subscription.created`, grant Pro/Family only when the subscription is `active` or `trialing`, using the same `_apply_subscription_entitlement` path as `checkout.session.completed`.
- Do not replace a different already-linked active/trialing subscription (duplicate-sub guard from PP-089).
- Incomplete / unpaid created events are ignored; later `invoice.paid`, `checkout.session.completed`, or `customer.subscription.updated` still grant access.
- No emails from this handler (payment confirmation stays on `invoice.paid`).
- Existing event-id de-duplication in `stripe_webhook_events` still applies.

## Allowed paths

- `backend/services/stripe_service.py`
- `tests/test_stripe_checkout_guard.py`
- `.agents/tickets/PP-166-handle-subscription-created-webhook.md`
- `.agents/TICKET_STATUS.md`

No commits or pushes by coding agents, no secrets, no dependency changes.

## Acceptance Criteria

- [x] `customer.subscription.created` grants Pro for an active/trialing sub
- [x] Does not grant on incomplete
- [x] Does not replace a different linked active sub
- [x] Pytest coverage
- [x] Merged (PR #64, `0753f20`) and deployed; live build id `0753f20`
- [x] Then: added the three events to webhook endpoint `we_1Twvx9RHCLA4QETrTSnoc38P` only; existing events, URL, and signing secret unchanged; status enabled. Resent a historical `customer.subscription.created` for a canceled duplicate sub; 200 OK; entitlements unchanged.
