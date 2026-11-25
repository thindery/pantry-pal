# GROWTH-001: Duplicate subscription creation at checkout

- Priority: P0
- Owner: Pantry Hub Lead
- Status: CLOSED (duplicate of PP-089 to PP-094)
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

## Optional follow-ups noticed (not ticketed)
- The success page does not confirm the session with the backend; if a webhook is late, a payer briefly sees Free.
- The checkout idempotency key is static per user/tier/interval for 24h; a retry with different redirect URLs would error.
- The live Stripe webhook endpoint does not subscribe to `charge.refunded` / `charge.refund.updated` (PP-094 handler never fires) or `customer.subscription.created`. Adding them is a Stripe Dashboard change that needs Tylor's yes.

No secrets in this file or in git.
