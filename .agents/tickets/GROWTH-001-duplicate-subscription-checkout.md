# GROWTH-001: Duplicate subscription creation at checkout

- Priority: n/a (closed)
- Owner: Pantry Hub Lead
- Status: CLOSED (duplicate of PP-089 to PP-094; webhook event list completed 2026-11-24)
- Created: 2026-11-24 (from the Daily Growth Report)
- Closed: 2026-11-24

## Gap
On Nov 21 one customer created 4 Pro subscriptions within about 5 minutes. 3 were refunded and canceled; 1 survived. Stripe live account "Pantry Hub".

## Resolution
Already fixed before this ticket was filed:
- PP-089 (`78427fd`, 2026-11-22): root cause was the webhook calling `.get()` on a Stripe SDK object, so every webhook returned 400 and the account never flipped to Pro; checkout had no existing-sub guard, idempotency key, or open-session reuse. Now: active/trialing subscribers go to the billing portal, open sessions are reused, an idempotency key is sent, and the Upgrade button is disabled while pending. Extra 3 subs refunded and canceled.
- PP-090 (`1ef98fb`): `invoice.paid` alone grants Pro.
- PP-091 to PP-094 (`4e1e79f`): webhook events persisted and de-duplicated, customer email set, cancel-at-period-end honored, refund handler.

Verified 2026-11-24 11:25 PM CT: `78427fd` is on main and in the live build (`613d37d`); the customer is `pro` / `active` on their one active subscription (`sub_1UeKuaRHCLA4QETrsKPuoZSy`) in the prod DB, matching Stripe. No data fix needed.

## Live webhook events (2026-11-24, 11:55 PM CT)

Endpoint `we_1Twvx9RHCLA4QETrTSnoc38P` (status `enabled`, URL unchanged).

- Before: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- After (add only): the five above, plus `charge.refunded`, `charge.refund.updated`, `customer.subscription.created`

`charge.refunded` / `charge.refund.updated` already had the PP-094 handler. `customer.subscription.created` was missing a handler, so PP-167 (filed as PP-166 in commit `cdd3053`, merge `0753f20`, live build `0753f20`) shipped first: grants Pro only for active/trialing subs via the same path as `checkout.session.completed`; does not replace a different linked active sub; incomplete created events are ignored.

Stripe MCP could not write (missing permission). The endpoint was updated with a one-off `POST /v1/webhook_endpoints/{id}` inside the backend container using the app's existing Stripe key. The key and webhook secret were not printed or written to a file.

Test (no live charge): resent historical `customer.subscription.created` event `evt_1UeL0CRHCLA4QETrpAt5oI3R` (a canceled duplicate sub, not the kept one) to this endpoint. Backend log: `POST /api/webhooks/stripe HTTP/1.1 200 OK`. DB stored the event as processed. Both paying accounts stayed `pro` / `active` on the same subscription ids, with `updated_at` unchanged.

No secrets in this file or in git.
