# PP-247: Monthly-to-yearly switch offer for active Pro monthly subscribers

**Status:** ✅ Live Nov 27, ~6:20 PM CT, build `35f9a8f`, [#177](https://github.com/thindery/pantry-pal/pull/177)
**Priority:** P2
**Ship mode:** needs Tylor yes
**Phase:** Race to $50 / Revenue
**Created:** 2026-11-27, 5:35 PM America/Chicago
**Source:** Remy Grok relayed Tylor's race (Pantry Hub vs FlowRuns, first to $50 real revenue). Money-making work is pre-approved; customer emails, posts as Tylor, spend, and price/coupon changes still need Tylor's yes.
**Coding agent:** Grok Bot directly. Hermes, agy, and the Grok CLI are not used.
**Constraints:** $0 only. Never invent numbers, reviews or user counts. User-facing text says "AI", never a model name.

Baseline (2026-11-27, 5:14 PM CT, read-only prod DB + live Stripe via the server key): 1 paying subscriber (Pro monthly $4.99, full price), MRR $4.99, all-time net revenue $4.99 ($19.96 gross, $14.97 refunded duplicate checkouts), 0 trials, 3 user accounts total, $1 first-month coupon live with 0 redemptions, 0 yearly subscribers.

---

## Problem

The one paying customer pays $4.99/mo. Yearly is $39.99. A switch needs Customer Portal plan-switching enabled in Stripe (a Stripe configuration change) and must never change the existing subscriber's price without their own action.

## Acceptance Criteria

- [ ] Tylor approves enabling plan switching in the Stripe Customer Portal.
- [ ] Account page shows "Switch to yearly, save $19.89/yr" to active monthly Pro users; the switch happens only in the Stripe portal by the customer.
